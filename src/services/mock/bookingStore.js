/**
 * OLIVEAL GAMING ZONE — CLIENT BOOKING STORE
 * Temporary client-side store synchronized with localStorage until Supabase integration is connected.
 * Starts completely clean with zero pre-seeded mock bookings.
 */

import { INITIAL_STATION_SLOTS, INITIAL_CUSTOMER_BOOKINGS } from './bookingMockData';
import {
  calculateStationCharge,
  calculatePlatformFee,
  calculateTotalAmount,
} from '../../utils/pricingUtils';

const STORAGE_KEYS = {
  SLOTS: 'oliveal_station_slots_v3',
  BOOKINGS: 'oliveal_customer_bookings_v3',
};

// Clear any legacy pre-seeded v1/v2 mock caches from browser storage
(function purgeLegacyMockData() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('oliveal_mock_station_slots_v1');
      localStorage.removeItem('oliveal_mock_customer_bookings_v1');
      localStorage.removeItem('oliveal_mock_station_slots_v2');
      localStorage.removeItem('oliveal_mock_customer_bookings_v2');
    }
  } catch (e) {
    // ignore storage access issues
  }
})();

// Retrieve station booked slots (starts empty)
export function getStoredStationSlots() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SLOTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read stored slots:', e);
  }
  try {
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(INITIAL_STATION_SLOTS));
  } catch (e) {
    console.error('Failed to initialize slots:', e);
  }
  return INITIAL_STATION_SLOTS;
}

// Get booked slots for a specific station on a specific date
export function getBookedSlotsForStation(stationId, isoDate = '') {
  const allSlots = getStoredStationSlots();
  const stationSlots = allSlots[stationId.toLowerCase()] || [];

  return stationSlots.filter((slot) => !slot.isoDate || slot.isoDate === isoDate);
}

// Retrieve customer bookings list (starts empty)
export function getCustomerBookings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read customer bookings:', e);
  }
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(INITIAL_CUSTOMER_BOOKINGS));
  } catch (e) {
    console.error('Failed to initialize customer bookings:', e);
  }
  return INITIAL_CUSTOMER_BOOKINGS;
}

// Create and store a new customer booking
export function createCustomerBooking({
  station,
  dateFormatted,
  startTimeFormatted,
  endTimeFormatted,
  startMinutes,
  endMinutes,
  durationMinutes,
  durationLabel,
  players,
  totalPrice,
}) {
  const newBookingId = `bk-${Date.now()}`;
  const computedCharge = calculateStationCharge(station.category || station.type, players, durationMinutes);
  const computedTotal = totalPrice ?? calculateTotalAmount(computedCharge, calculatePlatformFee());

  const newBooking = {
    id: newBookingId,
    stationId: station.id,
    stationName: station.name,
    category: station.category,
    image: station.image,
    dateLabel: dateFormatted.fullLabel,
    isoDate: dateFormatted.isoDate,
    timeRange: `${startTimeFormatted} – ${endTimeFormatted}`,
    durationLabel,
    durationMinutes,
    players,
    status: 'Confirmed',
    isUpcoming: true,
    totalPrice: computedTotal,
    createdAt: new Date().toISOString(),
  };

  // 1. Add to customer's personal bookings
  const currentBookings = getCustomerBookings();
  const updatedBookings = [newBooking, ...currentBookings];
  localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updatedBookings));

  // 2. Add to station's booked slots to immediately block overlap for future bookings
  const allSlots = getStoredStationSlots();
  const stationSlots = allSlots[station.id.toLowerCase()] || [];

  const newStationSlot = {
    id: `slot-${Date.now()}`,
    isoDate: dateFormatted.isoDate,
    startTime: startTimeFormatted,
    endTime: endTimeFormatted,
    startMinutes,
    endMinutes,
    durationMinutes,
    players,
  };

  allSlots[station.id.toLowerCase()] = [...stationSlots, newStationSlot];
  localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(allSlots));

  // Dispatch custom event for reactive component listening
  window.dispatchEvent(new Event('oliveal_booking_updated'));

  return newBooking;
}

// Helper to clear all booking data cleanly
export function clearAllBookings() {
  localStorage.removeItem(STORAGE_KEYS.SLOTS);
  localStorage.removeItem(STORAGE_KEYS.BOOKINGS);
  window.dispatchEvent(new Event('oliveal_booking_updated'));
}

export function resetMockStore() {
  clearAllBookings();
}
