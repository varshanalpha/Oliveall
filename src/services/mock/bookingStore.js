/**
 * OLIVEAL GAMING ZONE — REACTIVE BOOKING STORE
 * Persistent client-side store maintaining booked station slots and customer bookings.
 * Automatically synchronizes with localStorage and dispatches storage change events.
 */

import { INITIAL_STATION_SLOTS, INITIAL_CUSTOMER_BOOKINGS } from './bookingMockData';

const STORAGE_KEYS = {
  SLOTS: 'oliveal_mock_station_slots_v1',
  BOOKINGS: 'oliveal_mock_customer_bookings_v1',
};

// Retrieve or initialize station booked slots
export function getStoredStationSlots() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SLOTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read stored slots:', e);
  }
  // Initialize with seed data
  try {
    localStorage.setItem(STORAGE_KEYS.SLOTS, JSON.stringify(INITIAL_STATION_SLOTS));
  } catch (e) {
    console.error('Failed to write initial slots:', e);
  }
  return INITIAL_STATION_SLOTS;
}

// Get booked slots for a specific station on a specific date
export function getBookedSlotsForStation(stationId, isoDate = '') {
  const allSlots = getStoredStationSlots();
  const stationSlots = allSlots[stationId.toLowerCase()] || [];
  
  // Filter by date if present on the slot; default slots apply to today/tomorrow
  return stationSlots.filter((slot) => !slot.isoDate || slot.isoDate === isoDate);
}

// Retrieve or initialize customer bookings list
export function getCustomerBookings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read customer bookings:', e);
  }
  // Initialize with seed data
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(INITIAL_CUSTOMER_BOOKINGS));
  } catch (e) {
    console.error('Failed to write initial customer bookings:', e);
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
}) {
  const newBookingId = `bk-${Date.now()}`;
  
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
    totalPrice: Math.round((station.pricePerHour * durationMinutes) / 60),
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

// Helper to reset mock data back to defaults if needed
export function resetMockStore() {
  localStorage.removeItem(STORAGE_KEYS.SLOTS);
  localStorage.removeItem(STORAGE_KEYS.BOOKINGS);
  window.dispatchEvent(new Event('oliveal_booking_updated'));
}

