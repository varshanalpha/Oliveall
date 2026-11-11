/**
 * OLIVEAL GAMING ZONE — SUPABASE BOOKINGS SERVICE
 * Handles live slot availability checks, atomic booking creation,
 * and customer booking retrieval backed by PostgreSQL + RLS + RPCs.
 */

import { supabase } from '../lib/supabase';
import {
  buildKolkataTimestamp,
  getKolkataDayBounds,
  getKolkataTodayIso,
  formatBookingTimesKolkata,
  isSlotStartInPast,
} from '../utils/bookingTimeUtils';
import { fetchAppSettings } from './appSettingsService';

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
      .in('status', ['confirmed', 'completed', 'cancelled'])
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

async function validateCustomerBookingPrechecks({ station, isoDate, startTime }) {
  if (!station?.id || station.isLiveDb === false) {
    throw new Error(
      'Database tables not initialized yet. Please run migration 02_stations_and_bookings.sql in Supabase first.'
    );
  }

  if (station.isActive === false) {
    throw new Error(
      `${station.name || 'This station'} is currently disabled (Temporarily Unavailable). Please select an active station.`
    );
  }

  const latestSettings = await fetchAppSettings({ forceRefresh: true });
  if (latestSettings.bookingEnabled === false) {
    throw new Error('Bookings are temporarily unavailable. Please try again later.');
  }
  if (
    latestSettings.advanceBookingEnabled === false &&
    isoDate > getKolkataTodayIso()
  ) {
    throw new Error(
      'Advance bookings for future dates are currently disabled. Same-day bookings remain available.'
    );
  }

  const startAt = buildKolkataTimestamp(isoDate, startTime);

  if (!isoDate || !startTime || Number.isNaN(Date.parse(startAt)) || isSlotStartInPast(isoDate, startTime, Date.now())) {
    throw new Error('This time slot has already passed. Please choose an upcoming time.');
  }

  return startAt;
}

function mapBookingRpcError(error, station) {
  const msg = String(error?.message || error || '');
  const lower = msg.toLowerCase();
  if (lower.includes('temporarily unavailable') && lower.includes('try again later')) {
    return new Error('Bookings are temporarily unavailable. Please try again later.');
  }
  if (lower.includes('advance bookings for future dates')) {
    return new Error(
      'Advance bookings for future dates are currently disabled. Same-day bookings remain available.'
    );
  }
  if (lower.includes('currently inactive') || lower.includes('temporarily unavailable')) {
    return new Error(
      `${station?.name || 'Selected station'} is currently disabled and temporarily unavailable.`
    );
  }
  return error instanceof Error ? error : new Error(msg || 'Unable to process booking request.');
}

async function broadcastBookingsSync(stationId = null) {
  invalidateBookingCaches();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('oliveal_booking_updated'));
  }
  try {
    const ch = supabase.channel('oliveal-bookings-sync');
    await ch.send({
      type: 'broadcast',
      event: 'booking_changed',
      payload: { station_id: stationId, ts: Date.now() },
    });
    supabase.removeChannel(ch);
  } catch {
    // Non-fatal sync notification
  }
}

async function extractEdgeFunctionErrorMessage(error, data, fallbackMessage) {
  if (data?.error) {
    return String(data.error);
  }

  const context = error?.context;
  if (context && typeof context.json === 'function') {
    try {
      const payload = await context.json();
      if (payload?.error) {
        return String(payload.error);
      }
    } catch {
      // Fall back cleanly when error context body is not JSON
    }
  }

  if (
    error?.name === 'FunctionsFetchError' ||
    String(error?.message || '').includes('Failed to send a request to the Edge Function')
  ) {
    return 'Unable to reach the Razorpay payment service. Please check your internet connection or ensure Supabase Edge Functions are deployed.';
  }

  return error?.message || fallbackMessage;
}

/**
 * Atomically reserves a 10-minute payment hold and creates a Razorpay Order via Edge Function.
 */
export async function createRazorpayBookingOrder({
  station,
  isoDate,
  startTime,
  durationMinutes,
  players,
  termsAccepted = true,
}) {
  try {
    const startAt = await validateCustomerBookingPrechecks({ station, isoDate, startTime });

    const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
      body: {
        stationId: station.id,
        startAt,
        durationMinutes: Number(durationMinutes),
        playerCount: Number(players),
        termsAccepted: Boolean(termsAccepted),
      },
    });

    if (error || !data?.orderId || !data?.booking || !data?.keyId) {
      const rawMessage = await extractEdgeFunctionErrorMessage(
        error,
        data,
        'Unable to initialize Razorpay payment. Please verify Edge Function setup and try again.'
      );
      throw mapBookingRpcError(new Error(rawMessage), station);
    }

    const mappedBooking = mapDbBookingToUi(data.booking, data.station || station);
    await broadcastBookingsSync(station.id);

    return {
      order: {
        orderId: data.orderId,
        amountPaise: Number(data.amountPaise),
        currency: data.currency || 'INR',
        keyId: data.keyId,
        booking: mappedBooking,
        rawBooking: data.booking,
        station: data.station || station,
      },
      error: null,
    };
  } catch (err) {
    console.error('Error creating Razorpay booking order:', err);
    return { order: null, error: err };
  }
}

/**
 * Verifies Razorpay HMAC signature and payment capture server-side, then promotes booking to confirmed.
 */
export async function verifyRazorpayBookingPayment({
  bookingId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  fallbackStation = null,
}) {
  try {
    const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
      body: {
        bookingId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      },
    });

    if (error || !data?.verified || !data?.booking) {
      const msg = await extractEdgeFunctionErrorMessage(
        error,
        data,
        'Payment could not be verified. If money was debited, it will reconcile automatically or be refunded.'
      );
      throw new Error(msg);
    }

    const mappedBooking = mapDbBookingToUi(data.booking, data.station || fallbackStation);
    await broadcastBookingsSync(data.booking.station_id || fallbackStation?.id || null);

    return {
      booking: mappedBooking,
      payment: data.payment || null,
      error: null,
    };
  } catch (err) {
    console.error('Error verifying Razorpay payment:', err);
    return { booking: null, payment: null, error: err };
  }
}

/**
 * Releases an unpaid pending_payment slot hold immediately when checkout is dismissed or fails.
 */
export async function releasePendingBookingHold(bookingId, reason = 'checkout_cancelled') {
  if (!bookingId) return { released: false, error: null };

  try {
    const { data, error } = await supabase.rpc('release_pending_booking_hold', {
      p_booking_id: bookingId,
      p_reason: reason,
    });

    await broadcastBookingsSync(null);
    return { released: Boolean(data?.released), error: error || null };
  } catch (err) {
    console.error('Error releasing pending booking hold:', err);
    return { released: false, error: err };
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
    const startAt = await validateCustomerBookingPrechecks({ station, isoDate, startTime });

    const { data, error } = await supabase.rpc('create_customer_booking', {
      p_station_id: station.id,
      p_start_at: startAt,
      p_duration_minutes: Number(durationMinutes),
      p_player_count: Number(players),
      p_terms_accepted: Boolean(termsAccepted),
    });

    if (error) {
      throw mapBookingRpcError(error, station);
    }

    const bookingRow = data?.booking;
    const stationRow = data?.station || station;
    const mapped = mapDbBookingToUi(bookingRow, stationRow);

    await broadcastBookingsSync(station.id);
    return { booking: mapped, error: null };
  } catch (err) {
    console.error('Error creating Supabase booking:', err);
    return { booking: null, error: err };
  }
}

