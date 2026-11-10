/**
 * OLIVEAL GAMING ZONE — ADMIN SPOT BOOKING SERVICE
 * Strictly database-backed service layer using shared public.stations & public.bookings tables.
 * Enforces server-side admin verification, atomic PostgreSQL overlap checks, and Realtime sync.
 */

import { supabase } from '../lib/supabase';
import { verifyAdminSession } from './adminDashboardService';
import { invalidateBookingCaches } from './bookingService';
import {
  buildKolkataTimestamp,
  getKolkataDayBounds,
  formatBookingTimesKolkata,
} from '../utils/bookingTimeUtils';
import {
  validateSpotBookingInput,
  SPOT_CONFLICT_ERROR_MESSAGE,
} from '../utils/bookingValidation';

const SYNC_CHANNEL_NAME = 'oliveal-bookings-sync';

function normalizeSpotRpcError(error) {
  const msg = String(error?.message || '');
  const code = String(error?.code || '');

  if (
    code === 'PGRST202' ||
    code === '42883' ||
    msg.includes('create_spot_booking') && msg.includes('schema cache')
  ) {
    return new Error(
      'Database function create_spot_booking is not installed yet. Please execute supabase/migrations/03_spot_bookings.sql in Supabase SQL Editor.'
    );
  }

  if (
    code === '23P01' ||
    msg.includes('already booked') ||
    msg.includes('bookings_no_confirmed_overlap')
  ) {
    return new Error(SPOT_CONFLICT_ERROR_MESSAGE);
  }

  if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
    return new Error('Unable to reach Supabase right now. Check your connection and try again.');
  }

  return new Error(msg || 'Failed to create spot booking. Please try again.');
}

/**
 * Retrieves anonymized active/booked intervals for a station on an IST calendar date
 * via the shared get_station_booked_slots RPC (same source of truth as Customer Booking).
 */
export async function fetchStationBookedSlotsForDate(stationId, isoDate) {
  if (!stationId || !isoDate) return { slots: [], error: null };

  try {
    const { rangeStart, rangeEnd, dayStartMs } = getKolkataDayBounds(isoDate);

    const { data, error } = await supabase.rpc('get_station_booked_slots', {
      p_station_id: stationId,
      p_range_start: rangeStart,
      p_range_end: rangeEnd,
    });

    if (error) throw error;

    const slots = (data || []).map((slot) => {
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

    return { slots, error: null };
  } catch (err) {
    console.error('Error fetching station booked slots for date:', err);
    return { slots: [], error: err };
  }
}

/**
 * Broadcasts an anonymized availability-change pulse (no PII) across connected Admin
 * & Customer clients so station slots refresh immediately even across RLS boundaries.
 */
export async function broadcastBookingSync(stationId) {
  if (!stationId) return;
  try {
    const channel = supabase.channel(SYNC_CHANNEL_NAME);
    await channel.send({
      type: 'broadcast',
      event: 'booking_changed',
      payload: { station_id: stationId, ts: Date.now() },
    });
    supabase.removeChannel(channel);
  } catch {
    // Broadcast failure is non-fatal; DB triggers + focus refresh still protect integrity
  }
}

/**
 * Subscribes cleanly to booking table changes and anonymized sync broadcasts.
 * Always returns an unsubscribe cleanup callback for React useEffect.
 */
export function subscribeToBookingSync({ stationId = null, onBookingChange, onStatusChange }) {
  const channelKey = stationId
    ? `bookings-sync-${stationId}-${Math.random().toString(36).slice(2, 8)}`
    : `bookings-sync-all-${Math.random().toString(36).slice(2, 8)}`;

  const channel = supabase.channel(channelKey);

  const dbFilter = stationId
    ? { event: '*', schema: 'public', table: 'bookings', filter: `station_id=eq.${stationId}` }
    : { event: '*', schema: 'public', table: 'bookings' };

  channel.on('postgres_changes', dbFilter, (payload) => {
    const affectedStation = payload?.new?.station_id || payload?.old?.station_id || null;
    if (!stationId || !affectedStation || affectedStation === stationId) {
      onBookingChange?.(affectedStation);
    }
  });

  // Also listen on shared broadcast channel for immediate customer <-> admin sync without exposing PII
  const pulseChannel = supabase
    .channel(SYNC_CHANNEL_NAME)
    .on('broadcast', { event: 'booking_changed' }, (msg) => {
      const affectedStation = msg?.payload?.station_id || null;
      if (!stationId || !affectedStation || affectedStation === stationId) {
        onBookingChange?.(affectedStation);
      }
    });

  channel.subscribe((status) => {
    onStatusChange?.(status);
  });
  pulseChannel.subscribe();

  return () => {
    supabase.removeChannel(channel);
    supabase.removeChannel(pulseChannel);
  };
}

/**
 * Creates a confirmed Admin Spot Booking atomically in Supabase PostgreSQL.
 */
export async function createAdminSpotBooking({
  station,
  customerName,
  isoDate,
  startTime,
  durationMinutes,
  players,
  bookedSlots = [],
}) {
  // 1. Verify authenticated Admin session before mutation
  const authCheck = await verifyAdminSession();
  if (!authCheck.authorized) {
    throw new Error(
      authCheck.reason === 'unauthenticated'
        ? 'Your session has expired. Please sign in again.'
        : 'Administrative privileges required to create spot bookings.'
    );
  }

  // 2. Client-side guard before RPC
  const check = validateSpotBookingInput({
    customerName,
    selectedStation: station,
    isoDate,
    startTime,
    duration: durationMinutes,
    players,
    bookedSlots,
    referenceDate: new Date(),
  });

  if (!check.isValid) {
    throw new Error(check.firstError || 'Please review the booking fields and try again.');
  }

  const startAt = buildKolkataTimestamp(isoDate, startTime);

  const { data, error } = await supabase.rpc('create_spot_booking', {
    p_station_id: station.id,
    p_customer_name: check.trimmedName,
    p_start_at: startAt,
    p_duration_minutes: Number(durationMinutes),
    p_player_count: Number(players),
  });

  if (error) {
    throw normalizeSpotRpcError(error);
  }

  const row = data?.booking;
  const st = data?.station || station;
  if (!row) {
    throw new Error('Spot booking response was incomplete. Please verify Recent Bookings.');
  }

  const istTimes = formatBookingTimesKolkata(row.start_at, row.end_at);

  // Synchronize Customer & Admin views immediately
  invalidateBookingCaches();
  window.dispatchEvent(new Event('oliveal_booking_updated'));
  await broadcastBookingSync(st.id);

  return {
    id: row.id,
    bookingNumber: row.booking_number,
    customerName: row.customer_name || check.trimmedName,
    stationId: row.station_id,
    stationName: st.name || station.name,
    dateLabel: istTimes.dateLabel,
    timeRange: istTimes.isCrossMidnight
      ? `${istTimes.timeRange} (+1d)`
      : istTimes.timeRange,
    durationMinutes: row.duration_minutes,
    playerCount: row.player_count,
    status: row.status,
    bookingSource: row.booking_source || 'spot',
    createdAt: row.created_at,
  };
}

