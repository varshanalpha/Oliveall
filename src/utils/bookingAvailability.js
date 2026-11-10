/**
 * OLIVEAL GAMING ZONE — BOOKING AVAILABILITY & INTERVAL OVERLAP ENGINE
 * 
 * Mathematical Formulation:
 * 1. Future time guard (in Asia/Kolkata): slot start must be strictly in the future (> now)
 * 2. Half-open intervals [start, end): Collision condition newStart < existingEnd && newEnd > existingStart
 */

import { isSlotStartInPast } from './bookingTimeUtils.js';

/**
 * Checks whether [newStartMinutes, newEndMinutes) is in the future and free of collisions.
 * 
 * @param {number} newStartMinutes - Start minutes from 00:00 on the booking date
 * @param {number} newEndMinutes - End minutes (can exceed 1440 if crossing midnight)
 * @param {Array} existingBookedSlots - Array of { startMinutes, endMinutes, startTime, endTime, players }
 * @param {Object} options - Optional { bookingIsoDate: 'YYYY-MM-DD', referenceDate: Date|number }
 * @returns {Object} { isValid: boolean, isPastTime: boolean, hasOverlap: boolean, conflictingSlot?: Object, errorMessage?: string }
 */
export function validateSlotAvailability(
  newStartMinutes,
  newEndMinutes,
  existingBookedSlots = [],
  options = {}
) {
  if (newStartMinutes === undefined || newEndMinutes === undefined || newEndMinutes <= newStartMinutes) {
    return {
      isValid: false,
      isPastTime: false,
      hasOverlap: false,
      conflictingSlot: null,
      errorMessage: 'Please select a valid start time and duration.',
    };
  }

  const { bookingIsoDate = null, referenceDate = new Date() } = options;

  if (bookingIsoDate && isSlotStartInPast(bookingIsoDate, newStartMinutes, referenceDate)) {
    return {
      isValid: false,
      isPastTime: true,
      hasOverlap: false,
      conflictingSlot: null,
      errorMessage: 'This time slot has already passed. Please choose an upcoming time.',
    };
  }

  for (const existing of existingBookedSlots) {
    const existingStart = existing.startMinutes;
    const existingEnd = existing.endMinutes;

    // Strict half-open interval overlap check:
    // [newStart, newEnd) overlaps with [existingStart, existingEnd) iff:
    // newStart < existingEnd && newEnd > existingStart
    const isOverlapping = newStartMinutes < existingEnd && newEndMinutes > existingStart;

    if (isOverlapping) {
      return {
        isValid: false,
        isPastTime: false,
        hasOverlap: true,
        conflictingSlot: existing,
        errorMessage: 'This time slot is unavailable. Please choose another time.',
      };
    }
  }

  return {
    isValid: true,
    isPastTime: false,
    hasOverlap: false,
    conflictingSlot: null,
    errorMessage: null,
  };
}

/**
 * Tests an array of test cases to verify complete mathematical rigor
 */
export function runOverlapSelfTest() {
  const existing = [
    { startMinutes: 600, endMinutes: 690, label: '10:00 AM - 11:30 AM' }, // 10:00 - 11:30
    { startMinutes: 960, endMinutes: 1080, label: '04:00 PM - 06:00 PM' }, // 16:00 - 18:00
    { startMinutes: 1380, endMinutes: 1500, label: '11:00 PM - 01:00 AM (+1)' }, // 23:00 - 25:00
  ];

  const results = {
    // 1. New starts inside existing: 11:00 AM - 12:00 PM (660 - 720) -> OVERLAP (rejected)
    test1_startInside: validateSlotAvailability(660, 720, existing).hasOverlap === true,
    
    // 2. Adjacent interval: 11:30 AM - 12:30 PM (690 - 750) -> NO OVERLAP (allowed)
    test2_adjacentAfter: validateSlotAvailability(690, 750, existing).hasOverlap === false,

    // 3. Adjacent before: 09:00 AM - 10:00 AM (540 - 600) -> NO OVERLAP (allowed)
    test3_adjacentBefore: validateSlotAvailability(540, 600, existing).hasOverlap === false,

    // 4. Exact duplicate: 10:00 AM - 11:30 AM (600 - 690) -> OVERLAP (rejected)
    test4_duplicate: validateSlotAvailability(600, 690, existing).hasOverlap === true,

    // 5. Engulfs existing: 09:30 AM - 12:00 PM (570 - 720) -> OVERLAP (rejected)
    test5_engulfs: validateSlotAvailability(570, 720, existing).hasOverlap === true,

    // 6. Cross-midnight collision: 11:30 PM - 12:30 AM (1410 - 1470) -> OVERLAP (rejected)
    test6_crossMidnightCollision: validateSlotAvailability(1410, 1470, existing).hasOverlap === true,

    // 7. Clear cross-midnight slot: 01:00 AM - 02:00 AM (+1) (1500 - 1560) -> NO OVERLAP (allowed)
    test7_clearCrossMidnight: validateSlotAvailability(1500, 1560, existing).hasOverlap === false,
  };

  const allPassed = Object.values(results).every(Boolean);
  return { allPassed, results };
}

