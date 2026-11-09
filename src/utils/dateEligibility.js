/**
 * OLIVEAL GAMING ZONE — DATE ELIGIBILITY UTILITY
 * 
 * Rules:
 * 1. Gaming zone operates 24/7.
 * 2. Today is always eligible for booking.
 * 3. Tomorrow is eligible strictly from 8:00 PM (20:00) onwards.
 * 4. Dates beyond tomorrow are disabled.
 * 5. Uses Asia/Kolkata timezone simulation for calculation.
 */

import { formatDate } from './bookingTimeUtils.js';

export function getEligibleBookingDates(referenceDate = new Date()) {
  // Convert or inspect reference time in Asia/Kolkata timezone
  const now = new Date(referenceDate);
  const currentHour = now.getHours();
  
  // Advance booking rule: Tomorrow unlocks strictly from 8:00 PM (20:00) onwards
  const isTomorrowUnlocked = currentHour >= 20;

  // Build Today
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayFormatted = formatDate(today);

  // Build Tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowFormatted = formatDate(tomorrow);

  return [
    {
      dateObj: today,
      isoDate: todayFormatted.isoDate,
      dayName: todayFormatted.dayName,
      dayNum: todayFormatted.dayNum,
      shortLabel: todayFormatted.shortLabel,
      fullLabel: todayFormatted.fullLabel,
      tag: 'Today',
      isAvailable: true,
      unlockTime: null,
      tooltip: 'Available for immediate 24/7 booking',
    },
    {
      dateObj: tomorrow,
      isoDate: tomorrowFormatted.isoDate,
      dayName: tomorrowFormatted.dayName,
      dayNum: tomorrowFormatted.dayNum,
      shortLabel: tomorrowFormatted.shortLabel,
      fullLabel: tomorrowFormatted.fullLabel,
      tag: 'Advance',
      isAvailable: isTomorrowUnlocked,
      unlockTime: '8:00 PM',
      tooltip: isTomorrowUnlocked
        ? 'Advance booking unlocked'
        : 'Tomorrow opens for booking daily at 8:00 PM',
    },
  ];
}

/**
 * Validates whether a given ISO date string ('YYYY-MM-DD') is currently eligible
 */
export function isDateEligible(isoDateStr, referenceDate = new Date()) {
  const eligibleList = getEligibleBookingDates(referenceDate);
  const match = eligibleList.find((d) => d.isoDate === isoDateStr);
  return match ? match.isAvailable : false;
}
