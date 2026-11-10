/**
 * OLIVEAL GAMING ZONE — DATE ELIGIBILITY UTILITY
 * 
 * Rules:
 * 1. Gaming zone operates 24/7.
 * 2. Today (Asia/Kolkata) is always eligible for booking.
 * 3. Tomorrow (Asia/Kolkata) is eligible strictly from 8:00 PM (20:00 IST) onwards.
 * 4. Dates beyond tomorrow are disabled.
 */

import { formatDate, getKolkataParts } from './bookingTimeUtils.js';

export function getEligibleBookingDates(referenceDate = new Date(), options = {}) {
  const { advanceBookingEnabled = true } = options;
  const ist = getKolkataParts(referenceDate);

  // Advance booking rule: Tomorrow unlocks strictly from 8:00 PM (20:00 IST) onwards,
  // and only when admin global advance_booking_enabled is true.
  const isTomorrowUnlocked = advanceBookingEnabled && ist.hour >= 20;

  // Build IST Today & Tomorrow safely as noon UTC+0 dates or local Y/M/D objects so weekday/month match IST
  const todayLocal = new Date(ist.year, ist.month - 1, ist.day, 12, 0, 0);
  const todayFormatted = formatDate(todayLocal);

  const tomorrowLocal = new Date(ist.year, ist.month - 1, ist.day + 1, 12, 0, 0);
  const tomorrowFormatted = formatDate(tomorrowLocal);

  const advanceDisabled = advanceBookingEnabled === false;

  return [
    {
      dateObj: todayLocal,
      isoDate: todayFormatted.isoDate,
      dayName: todayFormatted.dayName,
      dayNum: todayFormatted.dayNum,
      shortLabel: todayFormatted.shortLabel,
      fullLabel: todayFormatted.fullLabel,
      tag: 'Today',
      isAvailable: true,
      unlockTime: null,
      unlockLabel: null,
      tooltip: 'Available for immediate 24/7 booking',
    },
    {
      dateObj: tomorrowLocal,
      isoDate: tomorrowFormatted.isoDate,
      dayName: tomorrowFormatted.dayName,
      dayNum: tomorrowFormatted.dayNum,
      shortLabel: tomorrowFormatted.shortLabel,
      fullLabel: tomorrowFormatted.fullLabel,
      tag: 'Advance',
      isAvailable: isTomorrowUnlocked,
      unlockTime: advanceDisabled ? null : '8:00 PM',
      unlockLabel: advanceDisabled ? 'Advance Disabled' : 'Unlocks at 8:00 PM',
      tooltip: advanceDisabled
        ? 'Advance bookings are currently disabled. Only today bookings are allowed.'
        : isTomorrowUnlocked
        ? 'Advance booking unlocked'
        : 'Tomorrow opens for booking daily at 8:00 PM',
    },
  ];
}

/**
 * Validates whether a given ISO date string ('YYYY-MM-DD') is currently eligible
 */
export function isDateEligible(isoDateStr, referenceDate = new Date(), options = {}) {
  const eligibleList = getEligibleBookingDates(referenceDate, options);
  const match = eligibleList.find((d) => d.isoDate === isoDateStr);
  return match ? match.isAvailable : false;
}
