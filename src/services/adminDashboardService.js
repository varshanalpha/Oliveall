/**
 * OLIVEAL GAMING ZONE — ADMIN DASHBOARD SUPABASE SERVICE
 * Strictly database-backed service layer (zero mock data, zero fake fallbacks).
 * 
 * Verified Live Schema Dependencies:
 * - public.profiles (id, full_name, email, role, avatar_url)
 * - public.stations (id, name, is_active, display_order)
 * - public.bookings (id, booking_number, user_id, station_id, start_at, end_at, status, booking_source, total_amount, created_at)
 * - public.payments (id, booking_id, amount_paise, amount_inr, status, verified_at)
 * - public.notifications: Not yet present in DB; handled gracefully as empty.
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

let spotMetadataColumnsSupported = null;

function isMissingColumnError(err) {
  return err?.code === '42703' || err?.message?.includes('does not exist');
}

function mapBookingRecord(row, nowMs = Date.now()) {
  const resolvedCustomerName =
    row.customer_name?.trim() ||
    row.profiles?.full_name?.trim() ||
    (row.booking_source === 'spot' ? 'Walk-in Customer' : 'Customer');

  return {
    id: row.id,
    bookingNumber: row.booking_number,
    customerName: resolvedCustomerName,
    stationName: row.stations?.name || '—',
    dateLabel: formatBookingDateIst(row.start_at),
    timeRange: formatBookingTimeRangeIst(row.start_at, row.end_at),
    durationMinutes: row.duration_minutes,
    playerCount: row.player_count,
    totalAmount: row.total_amount ?? null,
    bookingSource: row.booking_source || (row.user_id ? 'online' : 'spot'),
    statusInfo: deriveBookingLifecycleStatus(row, nowMs),
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
  };
}

/**
 * Counts distinct customers who have at least one valid (confirmed/completed) booking.
 * Supports both registered profile bookings and walk-in spot bookings (where user_id is NULL).
 * Drops cleanly to 0 if bookings are deleted in Supabase.
 */
async function fetchUniqueBookedCustomersCount() {
  const uniqueCustomers = new Set();
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const selectFields = spotMetadataColumnsSupported === false ? 'id, user_id' : 'id, user_id, customer_name';
    const { data, error } = await supabase
      .from('bookings')
      .select(selectFields)
      .in('status', VALID_BOOKING_STATUSES)
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      if (spotMetadataColumnsSupported !== false && isMissingColumnError(error)) {
        spotMetadataColumnsSupported = false;
        continue;
      }
      throw error;
    }

    if (spotMetadataColumnsSupported === null) {
      spotMetadataColumnsSupported = true;
    }

    const batch = data || [];
    for (const row of batch) {
      if (row.user_id) {
        uniqueCustomers.add(`user:${row.user_id}`);
      } else if (row.customer_name?.trim()) {
        uniqueCustomers.add(`spot:${row.customer_name.trim().toLowerCase()}`);
      } else if (row.id) {
        uniqueCustomers.add(`booking:${row.id}`);
      }
    }

    if (batch.length < pageSize) {
      break;
    }
    offset += pageSize;
  }

  return uniqueCustomers.size;
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
    onlineAmount: 0,
    spotAmount: 0,
    subtext: null,
    reason: 'Awaiting payment records',
  };
}

function roundCurrency(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function formatRevenueSubtext(onlineAmount, spotAmount) {
  return `Online ₹${Number(onlineAmount || 0).toLocaleString('en-IN')} · Spot ₹${Number(spotAmount || 0).toLocaleString('en-IN')}`;
}

/**
 * Computes Today's Revenue combining:
 * 1) Captured online Razorpay payments verified today (public.payments)
 * 2) Walk-in desk Spot Bookings created today (public.bookings with booking_source = 'spot')
 */
async function fetchTodayRevenueMetrics(startUtcIso, endUtcIso) {
  const spotPromise =
    spotMetadataColumnsSupported === false
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from('bookings')
          .select('id, total_amount, status, booking_source')
          .eq('booking_source', 'spot')
          .in('status', VALID_BOOKING_STATUSES)
          .gte('created_at', startUtcIso)
          .lt('created_at', endUtcIso)
          .limit(1000);

  const paymentsPromise = supabase
    .from('payments')
    .select('id, booking_id, amount_inr, amount_paise, bookings ( id, status )')
    .eq('status', 'captured')
    .gte('verified_at', startUtcIso)
    .lt('verified_at', endUtcIso)
    .limit(1000);

  const [paymentsRes, spotRes] = await Promise.all([paymentsPromise, spotPromise]);

  let spotRows = [];
  if (spotRes.error) {
    if (isMissingColumnError(spotRes.error)) {
      spotMetadataColumnsSupported = false;
    } else {
      throw spotRes.error;
    }
  } else {
    spotRows = spotRes.data || [];
  }

  const countedPaymentBookingIds = new Set();
  let onlineAmount = 0;

  if (paymentsRes.error) {
    if (!isMissingRelationError(paymentsRes.error)) {
      throw paymentsRes.error;
    }

    const fallbackSpotAmount = roundCurrency(
      spotRows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0)
    );
    if (fallbackSpotAmount > 0) {
      return {
        available: true,
        amount: fallbackSpotAmount,
        onlineAmount: 0,
        spotAmount: fallbackSpotAmount,
        subtext: `Spot ₹${fallbackSpotAmount.toLocaleString('en-IN')}`,
        reason: null,
      };
    }

    return getRevenueSchemaUnavailableState();
  }

  for (const row of paymentsRes.data || []) {
    if (row.bookings?.status === 'cancelled') continue;
    if (row.booking_id) {
      countedPaymentBookingIds.add(row.booking_id);
    }
    const rowInr =
      row.amount_inr !== null && row.amount_inr !== undefined
        ? Number(row.amount_inr)
        : Number(row.amount_paise || 0) / 100;
    if (Number.isFinite(rowInr)) {
      onlineAmount += rowInr;
    }
  }

  let spotAmount = 0;
  for (const row of spotRows) {
    if (row.id && countedPaymentBookingIds.has(row.id)) continue;
    const rowTotal = Number(row.total_amount || 0);
    if (Number.isFinite(rowTotal)) {
      spotAmount += rowTotal;
    }
  }

  onlineAmount = roundCurrency(onlineAmount);
  spotAmount = roundCurrency(spotAmount);
  const totalAmount = roundCurrency(onlineAmount + spotAmount);

  return {
    available: true,
    amount: totalAmount,
    onlineAmount,
    spotAmount,
    subtext: formatRevenueSubtext(onlineAmount, spotAmount),
    reason: null,
  };
}

async function queryAdminBookingsRange({ offset = 0, limit = 20, withCount = true } = {}) {
  const to = offset + limit - 1;
  const buildQuery = (includeSpotCols) => {
    const baseCols = `
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
      ${includeSpotCols ? 'customer_name, booking_source,' : ''}
      created_at,
      profiles!user_id ( id, full_name ),
      stations ( id, name )
    `;
    return supabase
      .from('bookings')
      .select(baseCols, withCount ? { count: 'exact' } : undefined)
      .in('status', RECENT_VISIBLE_STATUSES)
      .order('created_at', { ascending: false })
      .range(offset, to);
  };

  let res = await buildQuery(spotMetadataColumnsSupported !== false);
  if (res.error && spotMetadataColumnsSupported !== false && isMissingColumnError(res.error)) {
    spotMetadataColumnsSupported = false;
    res = await buildQuery(false);
  } else if (!res.error && spotMetadataColumnsSupported === null) {
    spotMetadataColumnsSupported = true;
  }

  return res;
}

/**
 * Loads all Admin Dashboard metrics and latest bookings from Supabase
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
    revenueRes,
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

    // Card 2: Today's Revenue combining Spot Bookings + captured Online Razorpay payments
    fetchTodayRevenueMetrics(startUtcIso, endUtcIso),

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
    queryAdminBookingsRange({ offset: 0, limit: RECENT_DASHBOARD_FETCH_LIMIT, withCount: true }),
  ]);

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

  const { data, error, count } = await queryAdminBookingsRange({
    offset,
    limit,
    withCount: true,
  });

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
