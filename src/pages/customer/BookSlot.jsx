import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Info, HelpCircle } from 'lucide-react';
import CustomerHeader from '../../components/customer/CustomerHeader';
import StationSelector from '../../components/customer/StationSelector';
import DateSelector from '../../components/customer/DateSelector';
import PlayerSelector from '../../components/customer/PlayerSelector';
import BookedSlots from '../../components/customer/BookedSlots';
import SlotCreator from '../../components/customer/SlotCreator';
import BookingSuccessModal from '../../components/customer/BookingSuccessModal';
import PrimaryButton from '../../components/auth/PrimaryButton';
import { STATIONS, getStationById } from '../../services/mock/stationMockData';
import { getEligibleBookingDates } from '../../utils/dateEligibility';
import { calculateEndTime, generateStartTimeOptions } from '../../utils/bookingTimeUtils';
import { validateSlotAvailability } from '../../utils/bookingAvailability';
import { getBookedSlotsForStation, createCustomerBooking } from '../../services/mock/bookingStore';

export default function BookSlot() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 1. Station State (Preselect from URL query e.g. /book-slot?station=alpha)
  const stationParam = searchParams.get('station');
  const [selectedStation, setSelectedStation] = useState(() => getStationById(stationParam));

  // If query param changes, sync station
  useEffect(() => {
    if (stationParam) {
      setSelectedStation(getStationById(stationParam));
    }
  }, [stationParam]);

  // 2. Date State (Calculate eligible dates: Today vs Tomorrow 8 PM rule)
  const eligibleDates = useMemo(() => getEligibleBookingDates(), []);
  const [selectedDate, setSelectedDate] = useState(() => eligibleDates[0]);

  // 3. Player Count State (Strictly 1 or 2)
  const [players, setPlayers] = useState(2);

  // 4. Time Selection State (15-min intervals, strictly 60, 90, 120 min)
  const [startTime, setStartTime] = useState('18:30'); // Default 06:30 PM matching reference
  const [duration, setDuration] = useState(90); // Default 90 min matching reference

  // 5. Existing Booked Slots for Station & Date
  const [bookedSlots, setBookedSlots] = useState([]);

  // 6. UI & Modal States
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load booked slots whenever station or date changes
  const refreshSlots = () => {
    const slots = getBookedSlotsForStation(selectedStation.id, selectedDate.isoDate);
    setBookedSlots(slots);
  };

  useEffect(() => {
    refreshSlots();
  }, [selectedStation.id, selectedDate.isoDate]);

  // Listen for storage updates
  useEffect(() => {
    window.addEventListener('oliveal_booking_updated', refreshSlots);
    return () => window.removeEventListener('oliveal_booking_updated', refreshSlots);
  }, [selectedStation.id, selectedDate.isoDate]);

  // 7. Automatic End Time Calculation (Customers NEVER edit end time manually)
  const calculatedSlot = useMemo(() => {
    return calculateEndTime(startTime, duration);
  }, [startTime, duration]);

  // 8. Overlap Validation Engine (half-open [start, end) interval collisions)
  const validation = useMemo(() => {
    if (!calculatedSlot) return { isValid: false, hasOverlap: false };
    return validateSlotAvailability(
      calculatedSlot.startMinutes,
      calculatedSlot.endMinutes,
      bookedSlots
    );
  }, [calculatedSlot, bookedSlots]);

  // Handle Confirm Booking Submission
  const handleConfirmBooking = () => {
    if (!validation.isValid) return;

    setIsSubmitting(true);

    setTimeout(() => {
      const newBooking = createCustomerBooking({
        station: selectedStation,
        dateFormatted: selectedDate,
        startTimeFormatted: calculatedSlot.startTimeFormatted,
        endTimeFormatted: calculatedSlot.endTimeFormatted,
        startMinutes: calculatedSlot.startMinutes,
        endMinutes: calculatedSlot.endMinutes,
        durationMinutes: duration,
        durationLabel: `${duration} Minutes`,
        players,
      });

      setIsSubmitting(false);
      setConfirmedBooking(newBooking);
    }, 600);
  };

  return (
    <div className="min-h-screen w-full bg-[#07060e] text-white flex flex-col justify-between selection:bg-purple-600 selection:text-white relative overflow-x-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-fuchsia-600/12 rounded-full blur-[130px]" />
      </div>

      {/* Header */}
      <CustomerHeader activeRoute="book-slot" />

      {/* Main Booking Container */}
      <main className="relative z-10 w-full max-w-[465px] sm:max-w-xl mx-auto px-4 sm:px-5 py-4 flex-1 flex flex-col gap-4">
        
        {/* Top Navigation Bar: Back Button, Title, Info Icon */}
        <div className="flex items-center justify-between min-h-[44px]">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            aria-label="Back to Customer Home"
            className="w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 border border-white/10 flex items-center justify-center text-slate-200 hover:text-white transition backdrop-blur-md shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
            Book Your Slot
          </h1>

          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            aria-label="Booking Rules Information"
            className="w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 border border-white/10 flex items-center justify-center text-slate-200 hover:text-white transition backdrop-blur-md shadow-lg"
          >
            <Info className="w-5 h-5 text-purple-300" />
          </button>
        </div>

        {/* 1. Selected Station Hero with Switcher */}
        <StationSelector
          selectedStation={selectedStation}
          onSelectStation={(station) => setSelectedStation(station)}
        />

        {/* 2. Select Date (Today vs Tomorrow with 8 PM advance rule) */}
        <DateSelector
          eligibleDates={eligibleDates}
          selectedDate={selectedDate}
          onSelectDate={(date) => setSelectedDate(date)}
        />

        {/* 3. Select Number of Players (1 Player vs 2 Players) */}
        <PlayerSelector
          players={players}
          onSelectPlayers={(num) => setPlayers(num)}
        />

        {/* 4. Booked Slots (Red/Pink list with View All toggle) */}
        <BookedSlots
          bookedSlots={bookedSlots}
          stationName={selectedStation.name}
          dateLabel={selectedDate.shortLabel}
        />

        {/* 5. Create Your Slot (Start Time + Duration + Automatic End-Time) */}
        <SlotCreator
          startTime={startTime}
          onSelectStartTime={(val) => setStartTime(val)}
          duration={duration}
          onSelectDuration={(val) => setDuration(val)}
          calculatedSlot={calculatedSlot}
          players={players}
          overlapError={validation.hasOverlap}
        />

        {/* 6. Confirm Booking CTA */}
        <div className="mt-2 mb-6">
          <PrimaryButton
            type="button"
            onClick={handleConfirmBooking}
            loading={isSubmitting}
            disabled={!validation.isValid}
          >
            Confirm Booking
          </PrimaryButton>
        </div>

      </main>

      {/* Info Modal describing rules */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowInfoModal(false)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-[#130f28] border border-purple-500/30 p-6 backdrop-blur-2xl shadow-2xl z-10 text-xs text-slate-300 space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-400" />
              <span>Booking Policies</span>
            </h3>
            <ul className="list-disc pl-4 space-y-1.5 text-slate-300">
              <li><strong>24/7 Operation:</strong> Slots can be booked across any hour day or night.</li>
              <li><strong>Advance Bookings:</strong> Tomorrow's slots unlock daily at 8:00 PM.</li>
              <li><strong>Capacity:</strong> Each station accommodates a maximum of 2 players.</li>
              <li><strong>Durations:</strong> Choose 60, 90, or 120 minutes. End times calculate automatically.</li>
            </ul>
            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="w-full mt-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Success Celebration Modal */}
      <BookingSuccessModal
        isOpen={Boolean(confirmedBooking)}
        booking={confirmedBooking}
        onClose={() => setConfirmedBooking(null)}
      />

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-[11px] text-slate-500 border-t border-white/[0.06]">
        Oliveal Gaming Zone © 2026. All rights reserved.
      </footer>
    </div>
  );
}

