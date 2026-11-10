import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useStations } from './useStations';
import {
  fetchStationBookedSlotsForDate,
  createAdminSpotBooking,
  subscribeToBookingSync,
} from '../services/spotBookingService';
import {
  getKolkataTodayIso,
  getDefaultStartTimeForDate,
} from '../utils/bookingTimeUtils';
import { validateSpotBookingInput } from '../utils/bookingValidation';

/**
 * Manages full Admin Spot Booking workflow state, capacity enforcement, live Supabase availability,
 * real-time sync across admin & customer screens, and atomic RPC booking creation.
 */
export function useSpotBooking() {
  const { stations, loading: stationsLoading, error: stationsError, reloadStations } = useStations();

  const [customerName, setCustomerName] = useState('');
  const [customerNameTouched, setCustomerNameTouched] = useState(false);

  const [selectedStationId, setSelectedStationId] = useState(null);
  const [selectedDateIso, setSelectedDateIso] = useState(() => getKolkataTodayIso());
  const [startTime, setStartTime] = useState(() => getDefaultStartTimeForDate(getKolkataTodayIso()));
  const [duration, setDuration] = useState(60);
  const [players, setPlayers] = useState(1);

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [bookedSlots, setBookedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(null);

  const [showAllErrors, setShowAllErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const inFlightSubmitRef = useRef(false);

  // Select first active station automatically once live stations finish loading
  useEffect(() => {
    if (!stations.length) return;
    setSelectedStationId((prev) => {
      if (prev && stations.some((s) => s.id === prev)) return prev;
      return stations[0].id;
    });
  }, [stations]);

  const selectedStation = useMemo(
    () => stations.find((s) => s.id === selectedStationId) || null,
    [stations, selectedStationId]
  );

  // Enforce station max player capacity automatically (e.g. simulator -> strictly 1)
  const maxPlayers = selectedStation?.maxPlayers ?? (selectedStation?.type === 'simulator' ? 1 : 2);
  useEffect(() => {
    if (players > maxPlayers) {
      setPlayers(maxPlayers);
    } else if (players < 1) {
      setPlayers(1);
    }
  }, [maxPlayers, players]);

  // Keep local IST time check current while form remains open
  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    const timer = setInterval(tick, 15000);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tick);
    };
  }, []);

  const refreshBookedSlots = useCallback(async () => {
    if (!selectedStation?.id || !selectedDateIso) {
      setBookedSlots([]);
      return;
    }

    setSlotsLoading(true);
    setSlotsError(null);
    const { slots, error } = await fetchStationBookedSlotsForDate(
      selectedStation.id,
      selectedDateIso
    );
    if (error) {
      setSlotsError('Unable to check live station availability. Try refreshing.');
    }
    setBookedSlots(slots);
    setSlotsLoading(false);
  }, [selectedStation?.id, selectedDateIso]);

  useEffect(() => {
    refreshBookedSlots();
  }, [refreshBookedSlots]);

  // Real-time synchronization with online customer bookings & other admin sessions
  useEffect(() => {
    if (!selectedStation?.id) return undefined;
    const handleSync = () => {
      refreshBookedSlots();
    };
    window.addEventListener('oliveal_booking_updated', handleSync);
    const unsub = subscribeToBookingSync({
      stationId: selectedStation.id,
      onBookingChange: handleSync,
    });
    return () => {
      window.removeEventListener('oliveal_booking_updated', handleSync);
      unsub();
    };
  }, [selectedStation?.id, refreshBookedSlots]);

  const validation = useMemo(
    () =>
      validateSpotBookingInput({
        customerName,
        selectedStation,
        isoDate: selectedDateIso,
        startTime,
        duration,
        players,
        bookedSlots,
        referenceDate: nowMs,
      }),
    [customerName, selectedStation, selectedDateIso, startTime, duration, players, bookedSlots, nowMs]
  );

  const handleSelectStation = useCallback((station) => {
    setSelectedStationId(station.id);
    setFeedback(null);
    const nextMax = station.maxPlayers ?? (station.type === 'simulator' ? 1 : 2);
    setPlayers((prev) => Math.max(1, Math.min(prev, nextMax)));
  }, []);

  const handleChangeDate = useCallback((nextIsoDate) => {
    setNowMs(Date.now());
    setSelectedDateIso(nextIsoDate);
    setFeedback(null);
  }, []);

  const handleChangeStartTime = useCallback((nextStart) => {
    setNowMs(Date.now());
    setStartTime(nextStart);
    setFeedback(null);
  }, []);

  const handleChangeDuration = useCallback((nextDuration) => {
    setDuration(Number(nextDuration));
    setFeedback(null);
  }, []);

  const handleDecrementPlayers = useCallback(() => {
    setPlayers((prev) => Math.max(1, prev - 1));
    setFeedback(null);
  }, []);

  const handleIncrementPlayers = useCallback(() => {
    setPlayers((prev) => Math.min(maxPlayers, prev + 1));
    setFeedback(null);
  }, [maxPlayers]);

  const handleSubmit = useCallback(async () => {
    if (inFlightSubmitRef.current || submitting) return { ok: false };

    setShowAllErrors(true);
    setCustomerNameTouched(true);
    setFeedback(null);

    const freshNowMs = Date.now();
    setNowMs(freshNowMs);

    const latestCheck = validateSpotBookingInput({
      customerName,
      selectedStation,
      isoDate: selectedDateIso,
      startTime,
      duration,
      players,
      bookedSlots,
      referenceDate: freshNowMs,
    });

    if (!latestCheck.isValid) {
      setFeedback({
        type: 'error',
        title: 'Cannot Create Spot Booking',
        message: latestCheck.firstError,
      });
      return { ok: false, error: latestCheck.firstError };
    }

    inFlightSubmitRef.current = true;
    setSubmitting(true);

    try {
      const createdBooking = await createAdminSpotBooking({
        station: selectedStation,
        customerName: latestCheck.trimmedName,
        isoDate: selectedDateIso,
        startTime,
        durationMinutes: duration,
        players,
        bookedSlots,
      });

      // Reset customer input for next walk-in, keep station/date handy, reload live slots
      setCustomerName('');
      setCustomerNameTouched(false);
      setShowAllErrors(false);
      setFeedback({
        type: 'success',
        title: 'Spot Booking Confirmed!',
        message: `${createdBooking.stationName} booked for ${createdBooking.customerName} (${createdBooking.timeRange}).`,
        booking: createdBooking,
      });

      await refreshBookedSlots();
      return { ok: true, booking: createdBooking };
    } catch (err) {
      setFeedback({
        type: 'error',
        title: 'Booking Failed',
        message: err?.message || 'Unable to create spot booking right now.',
      });
      // Refresh slots on conflict so admin immediately sees newly colliding slot
      await refreshBookedSlots();
      return { ok: false, error: err?.message };
    } finally {
      inFlightSubmitRef.current = false;
      setSubmitting(false);
    }
  }, [
    submitting,
    customerName,
    selectedStation,
    selectedDateIso,
    startTime,
    duration,
    players,
    bookedSlots,
    refreshBookedSlots,
  ]);

  return {
    // Catalog
    stations,
    stationsLoading,
    stationsError,
    reloadStations,
    selectedStation,
    maxPlayers,

    // Form state
    customerName,
    setCustomerName: (val) => {
      setCustomerName(val);
      if (feedback?.type === 'error') setFeedback(null);
    },
    customerNameTouched,
    markCustomerNameTouched: () => setCustomerNameTouched(true),
    selectedDateIso,
    startTime,
    duration,
    players,

    // Availability & Validation
    bookedSlots,
    slotsLoading,
    slotsError,
    refreshBookedSlots,
    validation,
    showAllErrors,
    calculatedSlot: validation.calculatedSlot,

    // Handlers
    onSelectStation: handleSelectStation,
    onChangeDate: handleChangeDate,
    onChangeStartTime: handleChangeStartTime,
    onChangeDuration: handleChangeDuration,
    onDecrementPlayers: handleDecrementPlayers,
    onIncrementPlayers: handleIncrementPlayers,
    onSubmit: handleSubmit,

    // Submission feedback
    submitting,
    feedback,
    clearFeedback: () => setFeedback(null),
  };
}

