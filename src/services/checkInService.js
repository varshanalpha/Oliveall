/**
 * OLIVEAL GAMING ZONE — ADMIN CHECK-IN & QR PASS VERIFICATION SERVICE
 * Parses customer Check-In QR payloads (from BookingQrModal.jsx) or plain booking codes,
 * verifies authoritative booking state live against Supabase PostgreSQL,
 * and records check-in timestamps securely.
 */

import { supabase } from '../lib/supabase';
import { verifyAdminSession } from './adminDashboardService';
import { broadcastBookingSync } from './spotBookingService';
import { formatBookingTimesKolkata } from '../utils/bookingTimeUtils';
import { deriveBookingLifecycleStatus, formatTimeIst } from '../utils/adminTimezoneUtils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOOKING_CODE_REGEX = /^[A-Z0-9][A-Z0-9-]{3,40}$/i;

/**
 * Parses a raw QR code string or manually entered pass code into structured Supabase lookup parameters.
 * Supports:
 * 1) Oliveal JSON QR payload: { passId, bookingId, issuer, ... }
 * 2) Plain booking number: "OGZ-ALPHA-8F3A21" or "SPOT-ALPHA-..."
 * 3) Raw booking UUID
 * 4) URL ending with booking UUID or booking number
 */
export function parseScannedQrPayload(rawText) {
  const trimmed = String(rawText ?? '').trim();
  if (!trimmed) {
    throw new Error('Scanned QR code is empty. Please scan a valid Oliveal pass.');
  }

  // 1. JSON QR payload from BookingQrModal
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (
        parsed?.issuer &&
        typeof parsed.issuer === 'string' &&
        !parsed.issuer.toLowerCase().includes('oliveal')
      ) {
        throw new Error('This QR code does not belong to Oliveal Gaming Zone.');
      }

      const bookingId = parsed?.bookingId ? String(parsed.bookingId).trim() : null;
      const passId = parsed?.passId ? String(parsed.passId).trim() : null;

      if (bookingId && UUID_REGEX.test(bookingId)) {
        return {
          lookupType: 'id',
          lookupValue: bookingId,
          bookingId,
          passId,
          rawText: trimmed,
        };
      }

      if (passId && BOOKING_CODE_REGEX.test(passId)) {
        return {
          lookupType: 'booking_number',
          lookupValue: passId.toUpperCase(),
          bookingId: null,
          passId: passId.toUpperCase(),
          rawText: trimmed,
        };
      }

      throw new Error('QR payload is missing booking identification.');
    } catch (err) {
      if (err?.message?.includes('Oliveal') || err?.message?.includes('missing')) {
        throw err;
      }
      throw new Error('Unrecognized QR code format. Please scan a valid Oliveal pass.');
    }
  }

  // 2. Deep URL ending with pass code or booking UUID
  let candidate = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsedUrl = new URL(trimmed);
      const lastSeg = parsedUrl.pathname.split('/').filter(Boolean).pop();
      candidate = decodeURIComponent(lastSeg || '');
    } catch {
      candidate = trimmed;
    }
  }

  // 3. UUID or booking_number string
  if (UUID_REGEX.test(candidate)) {
    return {
      lookupType: 'id',
      lookupValue: candidate,
      bookingId: candidate,
      passId: null,
      rawText: trimmed,
    };
  }

  const normalizedCode = candidate.toUpperCase();
  if (BOOKING_CODE_REGEX.test(normalizedCode)) {
    return {
      lookupType: 'booking_number',
      lookupValue: normalizedCode,
      bookingId: null,
      passId: normalizedCode,
      rawText: trimmed,
    };
  }

  throw new Error('Unrecognized QR pass format. Please scan an Oliveal Gaming Zone QR code.');
}

function mapCheckInBookingRow(row, nowMs = Date.now()) {
  const st = row.stations || {};
  const isSimulator =
    st.station_type === 'simulator' ||
    st.category === 'Racing Simulator' ||
    Number(st.max_players) === 1;

  const istTimes = formatBookingTimesKolkata(row.start_at, row.end_at);
  const lifecycleStatus = deriveBookingLifecycleStatus(row, nowMs);

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
    dateLabel: istTimes.dateLabel,
    timeRange: istTimes.isCrossMidnight
      ? `${istTimes.timeRange} (+1d)`
      : istTimes.timeRange,
    durationMinutes: row.duration_minutes,
    playerCount: row.player_count,
    totalAmount: row.total_amount ?? null,
    status: row.status,
    lifecycleStatus,
    checkedInAt: row.checked_in_at || null,
    checkedInTimeIst: row.checked_in_at ? formatTimeIst(row.checked_in_at) : null,
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
  };
}

const BOOKING_CHECKIN_SELECT = `
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
  profiles!user_id ( id, full_name, email ),
  stations ( id, slug, name, category, tag, station_type, image_url, max_players )
`;

/**
 * Fetches authoritative booking details from Supabase matching a scanned QR payload or code.
 */
export async function lookupBookingForCheckIn(rawQrOrCode) {
  const authCheck = await verifyAdminSession();
  if (!authCheck.authorized) {
    const err = new Error(
      authCheck.reason === 'unauthenticated'
        ? 'Your session has expired. Please sign in again.'
        : 'Administrative privileges required for Check-In.'
    );
    err.code = authCheck.reason;
    throw err;
  }

  const parsed = parseScannedQrPayload(rawQrOrCode);

  let { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_CHECKIN_SELECT)
    .eq(parsed.lookupType, parsed.lookupValue)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to look up booking in Supabase.');
  }

  // Fallback by passId if QR had both bookingId and passId
  if (!data && parsed.lookupType === 'id' && parsed.passId) {
    const fallbackRes = await supabase
      .from('bookings')
      .select(BOOKING_CHECKIN_SELECT)
      .eq('booking_number', parsed.passId.toUpperCase())
      .maybeSingle();

    if (fallbackRes.error) {
      throw new Error(fallbackRes.error.message || 'Failed to look up booking in Supabase.');
    }
    data = fallbackRes.data;
  }

  if (!data) {
    throw new Error(
      `No booking found matching "${parsed.passId || parsed.lookupValue}".`
    );
  }

  return mapCheckInBookingRow(data);
}

/**
 * Marks a confirmed booking as checked in (sets checked_in_at timestamp in Supabase).
 */
export async function confirmBookingCheckIn(bookingId) {
  const authCheck = await verifyAdminSession();
  if (!authCheck.authorized) {
    throw new Error(
      authCheck.reason === 'unauthenticated'
        ? 'Your session has expired. Please sign in again.'
        : 'Administrative privileges required to confirm check-in.'
    );
  }

  if (!bookingId) {
    throw new Error('Booking ID is required to check in.');
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('bookings')
    .update({ checked_in_at: nowIso })
    .eq('id', bookingId)
    .eq('status', 'confirmed')
    .is('checked_in_at', null)
    .select(BOOKING_CHECKIN_SELECT)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to update check-in status.');
  }

  if (!data) {
    // Re-read authoritative row to provide exact feedback (already checked in or not confirmed)
    const { data: currentRow, error: readErr } = await supabase
      .from('bookings')
      .select(BOOKING_CHECKIN_SELECT)
      .eq('id', bookingId)
      .maybeSingle();

    if (readErr) throw new Error(readErr.message);
    if (!currentRow) throw new Error('Booking record no longer exists.');
    if (currentRow.checked_in_at) {
      return {
        booking: mapCheckInBookingRow(currentRow),
        alreadyCheckedIn: true,
      };
    }
    throw new Error(`Cannot check in booking with status "${currentRow.status}".`);
  }

  window.dispatchEvent(new Event('oliveal_booking_updated'));
  await broadcastBookingSync(data.station_id);

  return {
    booking: mapCheckInBookingRow(data),
    alreadyCheckedIn: false,
  };
}

