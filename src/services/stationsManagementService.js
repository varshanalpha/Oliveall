/**
 * OLIVEAL GAMING ZONE — ADMIN STATIONS MANAGEMENT & SLOT RELEASE SERVICE
 * Strictly database-backed service layer for managing gaming stations, toggling
 * station availability, inspecting all bookings per station/date, and releasing slots.
 * Zero mock data; enforces server-side admin verification and preserves booking history.
 */

import { supabase } from '../lib/supabase';
import { verifyAdminSession } from './adminDashboardService';
import { clearAdminDashboardCache } from '../hooks/useAdminDashboard';
import {
  mapDbStationToUi,
  invalidateStationsCache,
  broadcastStationSync,
} from './stationService';
import { broadcastBookingSync } from './spotBookingService';
import { invalidateBookingCaches } from './bookingService';
import {
  getKolkataDayBounds,
  formatBookingTimesKolkata,
} from '../utils/bookingTimeUtils';
import {
  deriveBookingLifecycleStatus,
  getBusinessDayBoundsUtc,
  formatBookingDateIst,
} from '../utils/adminTimezoneUtils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATION_BOOKING_SELECT = `
  id,
  booking_number,
  user_id,
  station_id,
  customer_name,
  booking_source,
  start_at,
  end_at,
  duration_minutes,
  player_count,
  total_amount,
  status,
  checked_in_at,
  created_at,
  updated_at,
  profiles!user_id ( id, full_name, email ),
  stations ( id, slug, name, category, tag, station_type, image_url, max_players, is_active )
`;

async function assertAdminOrThrow() {
  const authCheck = await verifyAdminSession();
  if (!authCheck.authorized) {
    const err = new Error(
      authCheck.reason === 'unauthenticated'
        ? 'Your session has expired. Please sign in again.'
        : 'Administrative privileges required for Station Management.'
    );
    err.code = authCheck.reason;
    throw err;
  }
  return authCheck;
}

function getBookingReleasability(row, nowMs = Date.now()) {
  if (!row) {
    return { canRelease: false, nonReleasableReason: 'Booking record missing.' };
  }
  if (row.status === 'cancelled') {
    return {
      canRelease: false,
      nonReleasableReason: 'This booking has already been cancelled.',
    };
  }
  if (row.checked_in_at) {
    return {
      canRelease: false,
      nonReleasableReason: 'Customer has already checked in; this slot cannot be released.',
    };
  }
  if (row.status !== 'confirmed') {
    return {
      canRelease: false,
      nonReleasableReason: `Only confirmed bookings can be released (current status: ${row.status}).`,
    };
  }
  if (Date.parse(row.end_at) <= nowMs) {
    return {
      canRelease: false,
      nonReleasableReason: 'This session has already ended.',
    };
  }
  return { canRelease: true, nonReleasableReason: null };
}

function mapAdminStationBooking(row, nowMs = Date.now()) {
  const st = row.stations || {};
  const isSimulator =
    st.station_type === 'simulator' ||
    st.category === 'Racing Simulator' ||
    Number(st.max_players) === 1;
  const istTimes = formatBookingTimesKolkata(row.start_at, row.end_at);
  const releasability = getBookingReleasability(row, nowMs);

  return {
    id: row.id,
    bookingNumber: row.booking_number,
    customerName:
      row.customer_name?.trim() ||
      row.profiles?.full_name?.trim() ||
      (row.booking_source === 'spot' ? 'Walk-in Customer' : 'Customer'),
    customerEmail: row.profiles?.email || null,
    bookingSource: row.booking_source || (row.user_id ? 'online' : 'spot'),
    stationId: row.station_id,
    stationName: st.name || 'Station',
    stationType: st.station_type || (isSimulator ? 'simulator' : 'ps5'),
    stationCategory: st.category || (isSimulator ? 'Racing Simulator' : 'PS5 Console'),
    stationImage:
      st.image_url ||
      (isSimulator ? '/assets/images/racing-simulator.png' : '/assets/images/ps5-station.png'),
    dateLabel: istTimes.dateLabel || formatBookingDateIst(row.start_at),
    isoDate: istTimes.isoDate,
    timeRange: istTimes.isCrossMidnight
      ? `${istTimes.timeRange} (+1d)`
      : istTimes.timeRange,
    durationMinutes: row.duration_minutes,
    playerCount: row.player_count,
    totalAmount: row.total_amount ?? null,
    status: row.status,
    lifecycleStatus: deriveBookingLifecycleStatus(row, nowMs),
    checkedInAt: row.checked_in_at || null,
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    canRelease: releasability.canRelease,
    nonReleasableReason: releasability.nonReleasableReason,
  };
}

/**
 * Loads all gaming stations and real-time KPI summary counts from Supabase.
 */
export async function fetchAdminStationsOverview() {
  await assertAdminOrThrow();

  const now = new Date();
  const { startUtcIso, endUtcIso } = getBusinessDayBoundsUtc(now);

  const [stationsRes, releasedCountRes, activeCountByStationRes] = await Promise.all([
    supabase
      .from('stations')
      .select('*')
      .order('display_order', { ascending: true }),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'cancelled')
      .lt('start_at', endUtcIso)
      .gte('end_at', startUtcIso),
    supabase
      .from('bookings')
      .select('id, station_id')
      .eq('status', 'confirmed')
      .gt('end_at', now.toISOString()),
  ]);

  if (stationsRes.error) {
    throw new Error(stationsRes.error.message || 'Failed to load gaming stations from Supabase.');
  }
  if (releasedCountRes.error) {
    throw new Error(releasedCountRes.error.message || 'Failed to load released slot count.');
  }
  if (activeCountByStationRes.error) {
    throw new Error(activeCountByStationRes.error.message || 'Failed to load station booking counts.');
  }

  const upcomingCounts = new Map();
  for (const row of activeCountByStationRes.data || []) {
    upcomingCounts.set(row.station_id, (upcomingCounts.get(row.station_id) || 0) + 1);
  }

  const stations = (stationsRes.data || []).map((row) => ({
    ...mapDbStationToUi(row),
    upcomingConfirmedCount: upcomingCounts.get(row.id) || 0,
  }));

  const activeCount = stations.filter((s) => s.isActive).length;
  const disabledCount = stations.length - activeCount;

  return {
    stations,
    summary: {
      totalStations: stations.length,
      activeCount,
      disabledCount,
      releasedTodayCount: releasedCountRes.count ?? 0,
    },
  };
}

/**
 * Toggles a single station's is_active flag directly in Supabase.
 * Never deletes or cancels existing bookings.
 */
export async function toggleStationAvailability(stationId, nextIsActive) {
  await assertAdminOrThrow();

  if (!stationId) {
    throw new Error('Station ID is required.');
  }

  const { data, error } = await supabase
    .from('stations')
    .update({ is_active: Boolean(nextIsActive) })
    .eq('id', stationId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to update station status in Supabase.');
  }

  if (!data) {
    throw new Error('Station update was rejected or station could not be found.');
  }

  invalidateStationsCache();
  clearAdminDashboardCache();
  await broadcastStationSync(stationId);

  return mapDbStationToUi(data);
}

/**
 * Fetches authoritative station metadata from Supabase by UUID id or slug.
 */
export async function fetchStationByRef(stationRef) {
  await assertAdminOrThrow();

  const ref = decodeURIComponent(String(stationRef || '')).trim();
  if (!ref) {
    throw new Error('Station identifier is missing.');
  }

  const col = UUID_REGEX.test(ref) ? 'id' : 'slug';
  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .eq(col, col === 'slug' ? ref.toLowerCase() : ref)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load station details.');
  }
  if (!data) {
    const notFound = new Error('Gaming station not found.');
    notFound.code = 'NOT_FOUND';
    throw notFound;
  }

  return mapDbStationToUi(data);
}

/**
 * Retrieves ALL bookings for a specific station intersecting the selected IST date.
 * Includes full day (24/7 operation) with chronological sorting.
 */
export async function fetchStationBookingsForDate(stationId, isoDate) {
  await assertAdminOrThrow();

  if (!stationId || !isoDate) {
    return [];
  }

  const { rangeStart, rangeEnd } = getKolkataDayBounds(isoDate);

  const { data, error } = await supabase
    .from('bookings')
    .select(STATION_BOOKING_SELECT)
    .eq('station_id', stationId)
    .neq('status', 'expired')
    .lt('start_at', rangeEnd)
    .gt('end_at', rangeStart)
    .order('start_at', { ascending: true })
    .limit(200);

  if (error) {
    throw new Error(error.message || 'Failed to retrieve bookings for this station and date.');
  }

  const nowMs = Date.now();
  return (data || []).map((row) => mapAdminStationBooking(row, nowMs));
}

/**
 * Retrieves released / cancelled bookings preserved in Supabase history.
 */
export async function fetchReleasedBookingsHistory({ limit = 50 } = {}) {
  await assertAdminOrThrow();

  const { data, error } = await supabase
    .from('bookings')
    .select(STATION_BOOKING_SELECT)
    .eq('status', 'cancelled')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || 'Failed to load released slot history.');
  }

  const nowMs = Date.now();
  return (data || []).map((row) => mapAdminStationBooking(row, nowMs));
}

/**
 * Atomically releases an eligible booked slot in Supabase (status = 'cancelled'),
 * preserving full booking record & financials while freeing the slot interval for customers.
 */
export async function releaseStationBookedSlot({ bookingId, stationId, isoDate = null }) {
  await assertAdminOrThrow();

  if (!bookingId || !stationId) {
    throw new Error('Booking and station identifiers are required to release a slot.');
  }

  let updatedRow = null;
  let updatedStation = null;

  const { data, error } = await supabase.rpc('release_booked_slot', {
    p_booking_id: bookingId,
    p_station_id: stationId,
    p_booking_date: isoDate || null,
  });

  if (error) {
    const code = String(error.code || '');
    const msg = String(error.message || '');
    const missingRpc =
      code === 'PGRST202' ||
      code === '42883' ||
      (msg.includes('release_booked_slot') && msg.includes('schema cache'));

    if (!missingRpc) {
      throw new Error(msg || 'Failed to release the selected booking.');
    }

    // Fallback when migration 04 RPC has not been applied yet:
    // perform strict read-then-conditional update under admin RLS.
    const { data: current, error: readErr } = await supabase
      .from('bookings')
      .select(STATION_BOOKING_SELECT)
      .eq('id', bookingId)
      .maybeSingle();

    if (readErr) {
      throw new Error(readErr.message || 'Failed to verify booking state.');
    }
    if (!current) {
      throw new Error('Booking record no longer exists.');
    }
    if (current.station_id !== stationId) {
      throw new Error('Selected booking does not belong to this station.');
    }

    const guard = getBookingReleasability(current, Date.now());
    if (!guard.canRelease) {
      throw new Error(guard.nonReleasableReason);
    }

    const { data: fallbackUpdated, error: updErr } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .eq('station_id', stationId)
      .eq('status', 'confirmed')
      .is('checked_in_at', null)
      .select(STATION_BOOKING_SELECT)
      .maybeSingle();

    if (updErr) {
      throw new Error(updErr.message || 'Failed to release the selected booking.');
    }
    if (!fallbackUpdated) {
      throw new Error('Booking state changed concurrently. Please refresh and verify before retrying.');
    }

    updatedRow = fallbackUpdated;
    updatedStation = fallbackUpdated.stations || null;
  } else {
    updatedRow = data?.booking;
    updatedStation = data?.station || null;
  }

  invalidateBookingCaches();
  clearAdminDashboardCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('oliveal_booking_updated'));
  }
  await broadcastBookingSync(stationId);

  return mapAdminStationBooking(
    updatedRow?.stations ? updatedRow : { ...updatedRow, stations: updatedStation },
    Date.now()
  );
}

