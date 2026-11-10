/**
 * OLIVEAL GAMING ZONE — ADMIN DASHBOARD SUPABASE SERVICE
 * Strictly database-backed service layer (zero mock data, zero fake fallbacks).
 * 
 * Verified Live Schema Dependencies:
 * - public.profiles (id, full_name, email, role, avatar_url)
 * - public.stations (id, name, is_active, display_order)
 * - public.bookings (id, booking_number, user_id, station_id, start_at, end_at, status, created_at)
 * - public.payments / public.notifications: Not yet present in DB; handled gracefully as unavailable/empty.
 */

import { supabase } from '../lib/supabase';
import {
  getBusinessDayBoundsUtc,
  formatBookingTimeRangeIst,
  formatBookingDateIst,
  deriveBookingLifecycleStatus,
} from '../utils/adminTimezoneUtils';

const VALID_BOOKING_STATUSES = ['confirmed', 'completed'];
const RECENT_VISIBLE_STATUSES = ['confirmed', 'completed'];
const RECENT_DASHBOARD_FETCH_LIMIT = 20;

function mapBookingRecord(row, nowMs = Date.now()) {
  return {
    id: row.id,
    bookingNumber: row.booking_number,
    customerName: row.profiles?.full_name || 'Customer',
    stationName: row.stations?.name || '—',
    dateLabel: formatBookingDateIst(row.start_at),
    timeRange: formatBookingTimeRangeIst(row.start_at, row.end_at),
    durationMinutes: row.duration_minutes,
    playerCount: row.player_count,
    totalAmount: row.total_amount ?? null,
    statusInfo: deriveBookingLifecycleStatus(row, nowMs),
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
  };
}

/**
 * Counts distinct customers who have at least one valid (confirmed/completed) booking.
 * Returns 0 immediately when bookings are deleted in Supabase.
 */
async function fetchUniqueBookedCustomersCount() {
  const uniqueUserIds = new Set();
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('bookings')
      .select('user_id')
      .in('status', VALID_BOOKING_STATUSES)
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const batch = data || [];
    for (const row of batch) {
      if (row.user_id) {
        uniqueUserIds.add(row.user_id);
      }
    }

    if (batch.length < pageSize) {
      break;
    }
    offset += pageSize;
  }

  return uniqueUserIds.size;
}

function isMissingRelationError(err) {
  if (!err) return false;
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    err.message?.includes('does not exist') ||
    err.message?.includes('schema cache')
  );
}

/**
 * Verifies admin identity & role via Supabase Auth + public.profiles before loading dashboard metrics
 */
export async function verifyAdminSession() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { authorized: false, reason: 'unauthenticated', user: null, profile: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile || profile.role !== 'admin') {
    return { authorized: false, reason: 'forbidden', user, profile };
  }

  return { authorized: true, reason: null, user, profile };
}

/**
 * Payment schema inspection verified that no `payments`, `razorpay_orders`, or
 * verified `payment_status` source exists in the database yet.
 * Returns an explicit unavailable state without inventing figures or issuing failing 404 queries.
 */
function getRevenueSchemaUnavailableState() {
  return {
    available: false,
    amount: null,
    reason: 'Awaiting payment records',
  };
}

/**
 * Loads all Admin Dashboard metrics and latest 3 bookings from Supabase
 */
export async function fetchAdminDashboardData() {
  // 1. Strict server-backed Admin verification
  const authCheck = await verifyAdminSession();
  if (!authCheck.authorized) {
    return {
      unauthorized: true,
      reason: authCheck.reason,
      adminProfile: authCheck.profile,
    };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const { startUtcIso, endUtcIso } = getBusinessDayBoundsUtc(now);

  // 2. Parallel Supabase queries using verified tables & FK joins
  const [
    todayBookingsRes,
    totalUniqueCustomers,
    stationsRes,
    activeNowBookingsRes,
    recentBookingsRes,
  ] = await Promise.all([
    // Card 1: Today's Bookings (confirmed + completed in Asia/Kolkata current day)
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .gte('start_at', startUtcIso)
      .lt('start_at', endUtcIso)
      .in('status', VALID_BOOKING_STATUSES),

    // Card 3: Unique customers derived directly from valid bookings in Supabase
    fetchUniqueBookedCustomersCount(),

    // Card 4a: Stations catalog
    supabase
      .from('stations')
      .select('id, name, is_active, display_order')
      .order('display_order', { ascending: true }),

    // Card 4b: Bookings currently occupying stations right now
    supabase
      .from('bookings')
      .select('station_id')
      .lte('start_at', nowIso)
      .gt('end_at', nowIso)
      .in('status', ['confirmed']),

    // Recent Bookings (up to 20 latest so dashboard dynamically fills height down to bottom nav)
    supabase
      .from('bookings')
      .select(
        `
        id,
        booking_number,
        user_id,
        station_id,
        start_at,
        end_at,
        duration_minutes,
        player_count,
        total_amount,
        status,
        created_at,
        profiles ( id, full_name ),
        stations ( id, name )
      `,
        { count: 'exact' }
      )
      .in('status', RECENT_VISIBLE_STATUSES)
      .order('created_at', { ascending: false })
      .limit(RECENT_DASHBOARD_FETCH_LIMIT),
  ]);

  const revenueRes = getRevenueSchemaUnavailableState();

  // Surface genuine RLS / query failures loudly without substituting fake data
  if (todayBookingsRes.error) throw todayBookingsRes.error;
  if (recentBookingsRes.error) throw recentBookingsRes.error;

  // Compute Active Stations KPI gracefully
  let stationsMetric;
  if (stationsRes.error) {
    if (isMissingRelationError(stationsRes.error)) {
      stationsMetric = {
        available: false,
        inUseCount: null,
        totalCount: null,
        freeCount: null,
        reason: 'Stations data unavailable',
      };
    } else {
      throw stationsRes.error;
    }
  } else {
    if (activeNowBookingsRes.error) throw activeNowBookingsRes.error;

    const allStations = stationsRes.data || [];
    const enabledStations = allStations.filter((s) => s.is_active === true);
    const enabledIds = new Set(enabledStations.map((s) => s.id));

    const occupiedIds = new Set();
    for (const b of activeNowBookingsRes.data || []) {
      if (enabledIds.has(b.station_id)) {
        occupiedIds.add(b.station_id);
      }
    }

    const totalCount = enabledStations.length;
    const inUseCount = occupiedIds.size;
    const freeCount = Math.max(0, totalCount - inUseCount);

    stationsMetric = {
      available: true,
      inUseCount,
      totalCount,
      freeCount,
      reason: null,
    };
  }

  // Transform Recent Bookings rows for UI
  const nowMs = now.getTime();
  const recentBookings = (recentBookingsRes.data || []).map((row) => mapBookingRecord(row, nowMs));
  const totalBookingsCount = recentBookingsRes.count ?? recentBookings.length;

  return {
    unauthorized: false,
    adminProfile: authCheck.profile,
    kpis: {
      todayBookings: todayBookingsRes.count ?? 0,
      todayRevenue: revenueRes,
      totalCustomers: totalUniqueCustomers ?? 0,
      activeStations: stationsMetric,
    },
    recentBookings,
    totalBookingsCount,
    notifications: {
      count: 0, // No notifications table in current schema; never show fake badge count
      items: [],
    },
    fetchedAt: nowIso,
  };
}

/**
 * Fetches paginated bookings across all dates for the Admin "View All Bookings" view
 */
export async function fetchAllAdminBookings({ limit = 50, offset = 0 } = {}) {
  const authCheck = await verifyAdminSession();
  if (!authCheck.authorized) {
    throw new Error('Administrative privileges required to view all bookings.');
  }

  const { data, error, count } = await supabase
    .from('bookings')
    .select(
      `
      id,
      booking_number,
      user_id,
      station_id,
      start_at,
      end_at,
      duration_minutes,
      player_count,
      total_amount,
      status,
      created_at,
      profiles ( id, full_name ),
      stations ( id, name )
    `,
      { count: 'exact' }
    )
    .in('status', RECENT_VISIBLE_STATUSES)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const nowMs = Date.now();
  const bookings = (data || []).map((row) => mapBookingRecord(row, nowMs));
  const totalCount = count ?? bookings.length;

  return {
    bookings,
    totalCount,
    hasMore: offset + bookings.length < totalCount,
  };
}
