/**
 * OLIVEAL GAMING ZONE — SUPABASE BOOKINGS SERVICE
 * Handles live slot availability checks, atomic booking creation,
 * and customer booking retrieval backed by PostgreSQL + RLS + RPCs.
 */

import { supabase } from '../lib/supabase';
import {
  buildKolkataTimestamp,
  getKolkataDayBounds,
  formatBookingTimesKolkata,
} from '../utils/bookingTimeUtils';

const STATUS_LABELS = {
  pending_payment: 'Pending Payment',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

// In-memory route caches to prevent skeleton flashes on Back/route transitions
const bookedSlotsCache = new Map();
const customerBookingsCache = new Map();

export function getCachedBookedSlots(station, isoDate) {
  if (!station?.id || !isoDate) return null;
  const key = `${station.id}_${isoDate}`;
  return bookedSlotsCache.has(key) ? bookedSlotsCache.get(key) : null;
}

export function getCachedCustomerBookings(userId) {
  if (!userId) return null;
  return customerBookingsCache.has(userId) ? customerBookingsCache.get(userId) : null;
}

export function invalidateBookingCaches() {
  bookedSlotsCache.clear();
  customerBookingsCache.clear();
}

/**
 * Maps a Supabase bookings + joined stations row to UI card/modal structure
 */
export function mapDbBookingToUi(row, fallbackStation = null) {
  if (!row) return null;
  const st = row.stations || fallbackStation || {};
  const isSimulator = st.station_type === 'simulator' || st.type === 'simulator';
  const istTimes = formatBookingTimesKolkata(row.start_at, row.end_at);

  const endMs = new Date(row.end_at).getTime();
  const isUpcoming =
    (row.status === 'confirmed' || row.status === 'pending_payment') &&
    endMs > Date.now();

  const displayStatus =
    row.status === 'confirmed' && endMs <= Date.now()
      ? 'Completed'
      : STATUS_LABELS[row.status] || row.status || 'Confirmed';

  return {
    id: row.id,
    bookingNumber: row.booking_number,
    stationId: row.station_id,
    stationSlug: st.slug || '',
    stationName: st.name || 'Station',
    category: st.category || (isSimulator ? 'Racing Simulator' : 'PS5 Console'),
    image:
      st.image_url ||
      st.image ||
      (isSimulator ? '/assets/images/racing-simulator.png' : '/assets/images/ps5-station.png'),
    dateLabel: istTimes.dateLabel,
    isoDate: istTimes.isoDate,
    timeRange: istTimes.isCrossMidnight
      ? `${istTimes.timeRange} (+1 Day)`
      : istTimes.timeRange,
    durationLabel: `${row.duration_minutes} Minutes`,
    durationMinutes: row.duration_minutes,
    players: row.player_count,
    stationCharge: Number(row.station_charge || 0),
    platformFee: Number(row.platform_fee || 20),
    totalPrice: Number(row.total_amount || 0),
    status: displayStatus,
    rawStatus: row.status,
    isUpcoming,
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
  };
}

/**
 * Fetches anonymized active/booked slot intervals for a station on an IST calendar date
 */
export async function fetchBookedSlotsForStation(station, isoDate) {
  if (!station?.id || !isoDate) return { slots: [], error: null };

  // Skip RPC if running on pre-migration fallback station catalog
  if (station.isLiveDb === false) {
    return { slots: [], error: null };
  }

  try {
    const { rangeStart, rangeEnd, dayStartMs } = getKolkataDayBounds(isoDate);

    const { data, error } = await supabase.rpc('get_station_booked_slots', {
      p_station_id: station.id,
      p_range_start: rangeStart,
      p_range_end: rangeEnd,
    });

    if (error) throw error;

    const mappedSlots = (data || []).map((slot) => {
      const startMs = new Date(slot.start_at).getTime();
      const endMs = new Date(slot.end_at).getTime();
      const startMinutes = Math.round((startMs - dayStartMs) / 60000);
      const endMinutes = Math.round((endMs - dayStartMs) / 60000);
      const istTimes = formatBookingTimesKolkata(slot.start_at, slot.end_at);

      return {
        id: slot.id,
        startTime: startMinutes < 0 ? `${istTimes.startTimeFormatted} (Prev)` : istTimes.startTimeFormatted,
        endTime: istTimes.endTimeFormatted,
        startMinutes,
        endMinutes,
        durationMinutes: slot.duration_minutes,
        players: slot.player_count,
        status: slot.status,
      };
    });

    bookedSlotsCache.set(`${station.id}_${isoDate}`, mappedSlots);
    return { slots: mappedSlots, error: null };
  } catch (err) {
    console.error('Error fetching station booked slots:', err);
    return { slots: getCachedBookedSlots(station, isoDate) || [], error: err };
  }
}

/**
 * Fetches all non-expired bookings belonging to the signed-in customer
 */
export async function fetchCustomerBookings(userId) {
  if (!userId) return { bookings: [], error: null };

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        user_id,
        station_id,
        start_at,
        end_at,
        duration_minutes,
        player_count,
        station_charge,
        platform_fee,
        total_amount,
        status,
        terms_accepted,
        hold_expires_at,
        checked_in_at,
        created_at,
        stations (
          id,
          slug,
          name,
          category,
          tag,
          station_type,
          image_url
        )
      `)
      .eq('user_id', userId)
      .neq('status', 'expired')
      .order('start_at', { ascending: false });

    if (error) throw error;

    const bookings = (data || []).map((row) => mapDbBookingToUi(row));
    customerBookingsCache.set(userId, bookings);
    return { bookings, error: null };
  } catch (err) {
    console.error('Error fetching customer bookings:', err);
    return { bookings: getCachedCustomerBookings(userId) || [], error: err };
  }
}

/**
 * Atomically creates a customer booking via PostgreSQL RPC with server-side validation
 */
export async function createSupabaseBooking({
  station,
  isoDate,
  startTime,
  durationMinutes,
  players,
  termsAccepted = true,
}) {
  try {
    if (!station?.id || station.isLiveDb === false) {
      throw new Error(
        'Database tables not initialized yet. Please run migration 02_stations_and_bookings.sql in Supabase first.'
      );
    }

    const startAt = buildKolkataTimestamp(isoDate, startTime);

    const { data, error } = await supabase.rpc('create_customer_booking', {
      p_station_id: station.id,
      p_start_at: startAt,
      p_duration_minutes: Number(durationMinutes),
      p_player_count: Number(players),
      p_terms_accepted: Boolean(termsAccepted),
    });

    if (error) throw error;

    const bookingRow = data?.booking;
    const stationRow = data?.station || station;
    const mapped = mapDbBookingToUi(bookingRow, stationRow);

    invalidateBookingCaches();
    window.dispatchEvent(new Event('oliveal_booking_updated'));
    return { booking: mapped, error: null };
  } catch (err) {
    console.error('Error creating Supabase booking:', err);
    return { booking: null, error: err };
  }
}

