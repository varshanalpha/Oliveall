import {
  calculateEndTime,
  isDateBeforeTodayIst,
  isSpotSlotInPast,
} from './bookingTimeUtils.js';
import { validateSlotAvailability } from './bookingAvailability.js';

export const ALLOWED_DURATIONS = [60, 90, 120];
export const SPOT_CONFLICT_ERROR_MESSAGE =
  'This station is already booked during the selected time. Please choose another time.';

/**
 * Validates all Admin Spot Booking inputs before RPC submission and during live UI editing.
 * Reuses half-open [start, end) interval collision checks against live Supabase booked slots.
 */
export function validateSpotBookingInput({
  customerName,
  selectedStation,
  isoDate,
  startTime,
  duration,
  players,
  bookedSlots = [],
  referenceDate = new Date(),
}) {
  const errors = {};
  const trimmedName = typeof customerName === 'string' ? customerName.trim() : '';

  if (!trimmedName) {
    errors.customerName = 'Please enter customer full name.';
  }

  if (!selectedStation || !selectedStation.id) {
    errors.station = 'Please select an active gaming station.';
  } else if (selectedStation.isActive === false) {
    errors.station = `${selectedStation.name} is currently inactive.`;
  }

  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate))) {
    errors.date = 'Please choose a valid booking date.';
  } else if (isDateBeforeTodayIst(isoDate, referenceDate)) {
    errors.date = 'Past dates are not allowed. Choose today or a future date.';
  }

  if (!startTime || !/^\d{2}:\d{2}$/.test(String(startTime))) {
    errors.startTime = 'Please select a valid start time.';
  }

  const numericDuration = Number(duration);
  if (!ALLOWED_DURATIONS.includes(numericDuration)) {
    errors.duration = 'Duration must be 60, 90, or 120 minutes.';
  }

  const calculatedSlot =
    !errors.startTime && !errors.duration ? calculateEndTime(startTime, numericDuration) : null;

  if (!calculatedSlot || calculatedSlot.endMinutes <= calculatedSlot.startMinutes) {
    errors.endTime = 'Calculated end time is invalid.';
  }

  const maxCapacity = selectedStation?.maxPlayers ?? (selectedStation?.type === 'simulator' ? 1 : 2);
  const numericPlayers = Number(players);
  if (!Number.isInteger(numericPlayers) || numericPlayers < 1) {
    errors.players = 'Player count must be at least 1.';
  } else if (numericPlayers > maxCapacity) {
    errors.players = `${selectedStation?.name || 'Station'} accommodates up to ${maxCapacity} ${
      maxCapacity === 1 ? 'player' : 'players'
    }.`;
  }

  // Spot past-time validation (allow active walk-in 15m desk grace, block earlier crossed hours)
  if (!errors.date && calculatedSlot && isSpotSlotInPast(isoDate, startTime, numericDuration, referenceDate)) {
    errors.slotTime = 'This time slot has already passed. Please choose an upcoming time.';
  }

  // Half-open [start, end) conflict validation against existing station bookings on selected date
  if (!errors.date && !errors.slotTime && calculatedSlot && Array.isArray(bookedSlots)) {
    const overlapCheck = validateSlotAvailability(
      calculatedSlot.startMinutes,
      calculatedSlot.endMinutes,
      bookedSlots
    );
    if (overlapCheck.hasOverlap) {
      errors.overlap = SPOT_CONFLICT_ERROR_MESSAGE;
    }
  }

  const firstError =
    errors.customerName ||
    errors.station ||
    errors.date ||
    errors.startTime ||
    errors.duration ||
    errors.endTime ||
    errors.players ||
    errors.slotTime ||
    errors.overlap ||
    null;

  return {
    isValid: Object.keys(errors).length === 0,
    trimmedName,
    calculatedSlot,
    errors,
    firstError,
  };
}

