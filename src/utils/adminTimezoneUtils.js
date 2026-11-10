/**
 * OLIVEAL GAMING ZONE — ADMIN TIMEZONE & LIFECYCLE UTILITIES
 * All business calculations operate in the Asia/Kolkata IANA timezone
 * via native Intl.DateTimeFormat APIs (zero hardcoded UTC offsets).
 */

export const BUSINESS_TIMEZONE = 'Asia/Kolkata';

/**
 * Extracts numeric calendar & wall-clock components for a Date in Asia/Kolkata
 */
export function getBusinessDateParts(referenceDate = new Date(), timeZone = BUSINESS_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(referenceDate));
  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) === 24 ? 0 : Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/**
 * Computes the exact UTC Date instant corresponding to 00:00:00 of the given
 * calendar date inside `timeZone`, dynamically resolving offset via Intl.
 */
export function getZonedMidnightUtc(year, month, day, timeZone = BUSINESS_TIMEZONE) {
  const approxUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const tzParts = getBusinessDateParts(approxUtc, timeZone);

  const tzAsUtcMs = Date.UTC(
    tzParts.year,
    tzParts.month - 1,
    tzParts.day,
    tzParts.hour,
    tzParts.minute,
    tzParts.second,
    0
  );

  const dynamicOffsetMs = tzAsUtcMs - approxUtc.getTime();
  return new Date(approxUtc.getTime() - dynamicOffsetMs);
}

/**
 * Computes [startUtc, endUtc) bounds for the current business calendar day in Asia/Kolkata
 */
export function getBusinessDayBoundsUtc(referenceDate = new Date(), timeZone = BUSINESS_TIMEZONE) {
  const today = getBusinessDateParts(referenceDate, timeZone);
  const startUtc = getZonedMidnightUtc(today.year, today.month, today.day, timeZone);

  // Advance safely to next calendar day (Date.UTC handles month/year rollover cleanly)
  const nextCal = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));
  const endUtc = getZonedMidnightUtc(
    nextCal.getUTCFullYear(),
    nextCal.getUTCMonth() + 1,
    nextCal.getUTCDate(),
    timeZone
  );

  return {
    startUtcIso: startUtc.toISOString(),
    endUtcIso: endUtc.toISOString(),
    startMs: startUtc.getTime(),
    endMs: endUtc.getTime(),
  };
}

/**
 * Formats a booking [start_at, end_at] timestamptz range into 12-hour AM/PM strings in Asia/Kolkata
 */
export function formatBookingTimeRangeIst(startAtIso, endAtIso) {
  if (!startAtIso || !endAtIso) return '—';

  const start = new Date(startAtIso);
  const end = new Date(endAtIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—';

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const startParts = getBusinessDateParts(start, BUSINESS_TIMEZONE);
  const endParts = getBusinessDateParts(end, BUSINESS_TIMEZONE);
  const isCrossMidnight =
    startParts.year !== endParts.year ||
    startParts.month !== endParts.month ||
    startParts.day !== endParts.day;

  const formatted = `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
  return isCrossMidnight ? `${formatted} (+1d)` : formatted;
}

/**
 * Formats a timestamptz ISO value into compact IST calendar date (e.g. "10 Nov 2026")
 */
export function formatBookingDateIst(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats a timestamptz ISO value into a 12-hour IST clock time (e.g. "04:32 PM")
 */
export function formatTimeIst(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Derives accurate operational booking badge from BOTH database status and actual timestamps.
 * Never relies solely on a static stored status if the live time window has elapsed or begun.
 */
export function deriveBookingLifecycleStatus(booking, nowMs = Date.now()) {
  const rawStatus = String(booking?.status || '').toLowerCase();

  if (rawStatus === 'cancelled') {
    return { key: 'cancelled', label: 'Cancelled', variant: 'danger' };
  }
  if (rawStatus === 'failed') {
    return { key: 'failed', label: 'Failed', variant: 'danger' };
  }
  if (rawStatus === 'expired') {
    return { key: 'expired', label: 'Expired', variant: 'muted' };
  }
  if (rawStatus === 'pending_payment') {
    return { key: 'pending', label: 'Pending', variant: 'muted' };
  }

  const startMs = new Date(booking?.start_at).getTime();
  const endMs = new Date(booking?.end_at).getTime();

  if (rawStatus === 'completed' || (!Number.isNaN(endMs) && nowMs >= endMs)) {
    return { key: 'completed', label: 'Completed', variant: 'emerald' };
  }

  if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && nowMs >= startMs && nowMs < endMs) {
    return { key: 'in_use', label: 'In Use', variant: 'purple' };
  }

  return { key: 'upcoming', label: 'Upcoming', variant: 'amber' };
}

