/**
 * OLIVEAL GAMING ZONE — TIME & DURATION UTILITIES
 * Pure JavaScript date/time calculations supporting 24/7 operating hours
 * and cross-midnight booking intervals.
 */

export const DURATION_OPTIONS = [
  { value: 60, label: '60 Minutes', durationHours: 1 },
  { value: 90, label: '90 Minutes', durationHours: 1.5 },
  { value: 120, label: '120 Minutes', durationHours: 2 },
];

/**
 * Generates all 96 fifteen-minute start times across 24 hours
 * Returns an array of { value: 'HH:mm', label: 'hh:mm A' }
 */
export function generateStartTimeOptions() {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h24 = String(hour).padStart(2, '0');
      const m24 = String(minute).padStart(2, '0');
      const value = `${h24}:${m24}`;

      const period = hour >= 12 ? 'PM' : 'AM';
      const h12 = hour % 12 === 0 ? 12 : hour % 12;
      const h12Pad = String(h12).padStart(2, '0');
      const label = `${h12Pad}:${m24} ${period}`;

      options.push({ value, label, minutesFromMidnight: hour * 60 + minute });
    }
  }
  return options;
}

/**
 * Converts a 24h 'HH:mm' string or minutes into 12h 'hh:mm AM/PM'
 */
export function formatTo12Hour(time24OrMinutes) {
  let minutes = 0;
  if (typeof time24OrMinutes === 'number') {
    minutes = time24OrMinutes;
  } else if (typeof time24OrMinutes === 'string') {
    const [h, m] = time24OrMinutes.split(':').map(Number);
    minutes = (h || 0) * 60 + (m || 0);
  }

  // Handle cross-midnight roll-over modulo 1440
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const min = normalized % 60;

  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const h12Pad = String(h12).padStart(2, '0');
  const minPad = String(min).padStart(2, '0');

  const isNextDay = minutes >= 1440;
  return {
    formatted: `${h12Pad}:${minPad} ${period}`,
    isNextDay,
    labelWithDay: isNextDay ? `${h12Pad}:${minPad} ${period} (+1 Day)` : `${h12Pad}:${minPad} ${period}`,
  };
}

/**
 * Calculates the exact end time from a 24h start time and duration in minutes
 * Form: END TIME = START TIME + DURATION
 */
export function calculateEndTime(startTime24, durationMinutes) {
  if (!startTime24) return null;
  const [h, m] = startTime24.split(':').map(Number);
  const startTotalMinutes = (h || 0) * 60 + (m || 0);
  const endTotalMinutes = startTotalMinutes + Number(durationMinutes);

  const startFormatted = formatTo12Hour(startTotalMinutes);
  const endFormatted = formatTo12Hour(endTotalMinutes);

  return {
    startMinutes: startTotalMinutes,
    endMinutes: endTotalMinutes,
    startTimeFormatted: startFormatted.formatted,
    endTimeFormatted: endFormatted.formatted,
    isCrossMidnight: endTotalMinutes >= 1440,
    displayRange: `${startFormatted.formatted} – ${endFormatted.formatted}`,
  };
}

/**
 * Formats a Date object (using its calendar Y/M/D in local or IST) into human-readable strings
 */
export function formatDate(dateObj) {
  const d = new Date(dateObj);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const dayName = days[d.getDay()];
  const monthName = months[d.getMonth()];
  const dayNum = d.getDate();
  const monthNum = d.getMonth() + 1;
  const year = d.getFullYear();

  const isoDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

  return {
    isoDate, // 'YYYY-MM-DD'
    shortLabel: `${dayName} ${dayNum} ${monthName}`, // 'Tue 10 Nov'
    fullLabel: `${dayName}, ${dayNum} ${monthName} ${year}`, // 'Tue, 10 Nov 2026'
    dayNum,
    dayName,
  };
}

/**
 * Extracts calendar parts in Asia/Kolkata timezone for a Date
 */
export function getKolkataParts(referenceDate = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(referenceDate));
  const map = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  const hourNum = Number(map.hour) === 24 ? 0 : Number(map.hour);
  const minuteNum = Number(map.minute);
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: hourNum,
    minute: minuteNum,
    isoDate: `${map.year}-${map.month}-${map.day}`,
  };
}

/**
 * Builds an ISO-8601 timestamp string in Asia/Kolkata (+05:30) from date 'YYYY-MM-DD' and time 'HH:mm'
 */
export function buildKolkataTimestamp(isoDate, time24 = '00:00') {
  const [h = '00', m = '00'] = String(time24).split(':');
  return `${isoDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+05:30`;
}

/**
 * Returns [startIso, endIso) UTC/offset strings covering the full 24h Asia/Kolkata day
 */
export function getKolkataDayBounds(isoDate) {
  const startStr = `${isoDate}T00:00:00+05:30`;
  const startDate = new Date(startStr);
  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  return {
    rangeStart: startDate.toISOString(),
    rangeEnd: endDate.toISOString(),
    dayStartMs: startDate.getTime(),
  };
}

/**
 * Formats a start_at / end_at timestamptz pair in Asia/Kolkata (12h AM/PM + readable date)
 */
export function formatBookingTimesKolkata(startAtIso, endAtIso) {
  const start = new Date(startAtIso);
  const end = new Date(endAtIso);

  const dateFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const startParts = getKolkataParts(start);
  const endParts = getKolkataParts(end);
  const isCrossMidnight = endParts.isoDate !== startParts.isoDate;

  return {
    dateLabel: dateFmt.format(start),
    isoDate: startParts.isoDate,
    startTimeFormatted: timeFmt.format(start),
    endTimeFormatted: timeFmt.format(end),
    timeRange: `${timeFmt.format(start)} – ${timeFmt.format(end)}`,
    isCrossMidnight,
  };
}

