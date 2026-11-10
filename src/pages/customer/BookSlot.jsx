import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Info, HelpCircle } from 'lucide-react';
import CustomerHeader from '../../components/customer/CustomerHeader';
import StationSelector from '../../components/customer/StationSelector';
import DateSelector from '../../components/customer/DateSelector';
import PlayerSelector from '../../components/customer/PlayerSelector';
import BookedSlots from '../../components/customer/BookedSlots';
import SlotCreator from '../../components/customer/SlotCreator';
import PrimaryButton from '../../components/auth/PrimaryButton';
import { getStationById, STATIONS as DEFAULT_STATIONS } from '../../services/mock/stationMockData';
import { fetchActiveStations, getCachedStations, resolveStationFromList } from '../../services/stationService';
import { fetchBookedSlotsForStation, getCachedBookedSlots } from '../../services/bookingService';
import { getEligibleBookingDates } from '../../utils/dateEligibility';
import { calculateEndTime, getDefaultStartTimeForDate, isSlotStartInPast } from '../../utils/bookingTimeUtils';
import { validateSlotAvailability } from '../../utils/bookingAvailability';

export default function BookSlot() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const editState = location.state || {};
  const stationParam = editState.stationSlug || editState.stationId || searchParams.get('station');

  // 1. Live Stations Catalog & Selected Station (initialized synchronously from cache)
  const [stations, setStations] = useState(() => getCachedStations() || DEFAULT_STATIONS);
  const [selectedStation, setSelectedStation] = useState(() => {
    const cached = getCachedStations();
    if (cached && cached.length > 0) {
      return resolveStationFromList(cached, stationParam);
    }
    return getStationById(stationParam);
  });

  useEffect(() => {
    let mounted = true;
    async function loadStations() {
      const { stations: liveList } = await fetchActiveStations();
      if (!mounted || !liveList || liveList.length === 0) return;
      setStations((prev) =>
        JSON.stringify(prev) === JSON.stringify(liveList) ? prev : liveList
      );
      setSelectedStation((prev) => {
        const next = resolveStationFromList(liveList, stationParam || prev?.slug || prev?.id);
        return prev?.id === next?.id && prev?.isLiveDb === next?.isLiveDb ? prev : next;
      });
    }
    loadStations();
    return () => {
      mounted = false;
    };
  }, [stationParam]);

  // 2. Date State (Calculate eligible dates: Today vs Tomorrow 8 PM rule in Asia/Kolkata)
  const eligibleDates = useMemo(() => getEligibleBookingDates(), []);
  const [selectedDate, setSelectedDate] = useState(() => {
    if (editState.date?.isoDate) {
      const match = eligibleDates.find((d) => d.isoDate === editState.date.isoDate);
      if (match) return match;
    }
    return eligibleDates[0];
  });

  // 3. Player Count State (Strictly 1 or 2; Racing Simulators are strictly 1)
  const isSimulator =
    selectedStation?.type === 'simulator' ||
    selectedStation?.category === 'Racing Simulator' ||
    selectedStation?.maxPlayers === 1;

  const [players, setPlayers] = useState(() => {
    if (isSimulator) return 1;
    return editState.players || 2;
  });

  // Automatically enforce 1 player whenever a racing simulator is selected
  useEffect(() => {
    if (isSimulator && players !== 1) {
      setPlayers(1);
    }
  }, [selectedStation?.id, isSimulator, players]);

  // 4. Live Clock & Time Selection State (15-min intervals, strictly 60, 90, 120 min)
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [startTime, setStartTime] = useState(
    () => editState.startTime || getDefaultStartTimeForDate(selectedDate?.isoDate)
  );
  const [duration, setDuration] = useState(() => editState.duration || 90);

  useEffect(() => {
    const updateNow = () => setNowMs(Date.now());
    const interval = setInterval(updateNow, 15000);
    window.addEventListener('focus', updateNow);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', updateNow);
    };
  }, []);

  // 5. Live Booked Slots for Station & Date (anonymized from Supabase RPC)
  const [bookedSlots, setBookedSlots] = useState(
    () => getCachedBookedSlots(selectedStation, selectedDate?.isoDate) || []
  );
  const [loadingSlots, setLoadingSlots] = useState(false);

  // 6. UI & Modal States
  const [showInfoModal, setShowInfoModal] = useState(false);

  const refreshSlots = useCallback(async () => {
    if (!selectedStation || !selectedDate?.isoDate) return;
    const cached = getCachedBookedSlots(selectedStation, selectedDate.isoDate);
    if (cached) {
      setBookedSlots(cached);
    } else if (selectedStation.isLiveDb !== false) {
      setLoadingSlots(true);
    }
    const { slots } = await fetchBookedSlotsForStation(selectedStation, selectedDate.isoDate);
    setBookedSlots(slots);
    setLoadingSlots(false);
  }, [selectedStation, selectedDate?.isoDate]);

  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);

  useEffect(() => {
    window.addEventListener('oliveal_booking_updated', refreshSlots);
    return () => window.removeEventListener('oliveal_booking_updated', refreshSlots);
  }, [refreshSlots]);

  // 7. Automatic End Time Calculation (Customers NEVER edit end time manually)
  const calculatedSlot = useMemo(() => {
    return calculateEndTime(startTime, duration);
  }, [startTime, duration]);

  // 8. Overlap & Future-Time Validation Engine
  const validation = useMemo(() => {
    if (!calculatedSlot) return { isValid: false, isPastTime: false, hasOverlap: false, errorMessage: null };
    return validateSlotAvailability(
      calculatedSlot.startMinutes,
      calculatedSlot.endMinutes,
      bookedSlots,
      {
        bookingIsoDate: selectedDate?.isoDate,
        referenceDate: nowMs,
      }
    );
  }, [calculatedSlot, bookedSlots, selectedDate?.isoDate, nowMs]);

  // Handle Confirm Booking Submission — Route to Confirm Booking Page
  const handleConfirmBooking = () => {
    const freshNowMs = Date.now();
    if (isSlotStartInPast(selectedDate?.isoDate, startTime, freshNowMs)) {
      setNowMs(freshNowMs);
      return;
    }
    if (!validation.isValid) return;

    navigate('/confirm-booking', {
      state: {
        station: selectedStation,
        date: selectedDate,
        startTime,
        duration,
        players,
        calculatedSlot,
      },
    });
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
          stations={stations}
          selectedStation={selectedStation}
          onSelectStation={(station) => setSelectedStation(station)}
        />

        {/* 2. Select Date (Today vs Tomorrow with 8 PM advance rule) */}
        <DateSelector
          eligibleDates={eligibleDates}
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setNowMs(Date.now());
            setSelectedDate(date);
          }}
        />

        {/* 3. Select Number of Players (1 Player vs 2 Players; Racing Simulator is strictly 1) */}
        <PlayerSelector
          players={players}
          maxPlayers={isSimulator ? 1 : 2}
          onSelectPlayers={(num) => setPlayers(num)}
        />

        {/* 4. Booked Slots (Red/Pink list with View All toggle) */}
        <BookedSlots
          bookedSlots={bookedSlots}
          stationName={selectedStation?.name || 'Station'}
          dateLabel={selectedDate.shortLabel}
          loading={loadingSlots}
        />

        {/* 5. Create Your Slot (Start Time + Duration + Automatic End-Time) */}
        <SlotCreator
          startTime={startTime}
          onSelectStartTime={(val) => {
            setNowMs(Date.now());
            setStartTime(val);
          }}
          duration={duration}
          onSelectDuration={(val) => setDuration(val)}
          calculatedSlot={calculatedSlot}
          players={players}
          overlapError={validation.hasOverlap}
          errorMessage={validation.errorMessage}
          selectedDateIso={selectedDate?.isoDate}
          nowMs={nowMs}
        />

        {/* 6. Confirm Booking CTA */}
        <div className="mt-2 mb-6">
          <PrimaryButton
            type="button"
            onClick={handleConfirmBooking}
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
              <li><strong>Advance Bookings:</strong> Tomorrow's slots unlock daily at 8:00 PM IST.</li>
              <li><strong>Capacity:</strong> PS5 stations accommodate up to 2 players; Racing Simulators are strictly 1 player per cockpit.</li>
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

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-[11px] text-slate-500 border-t border-white/[0.06]">
        Oliveal Gaming Zone © 2026. All rights reserved.
      </footer>
    </div>
  );
}
