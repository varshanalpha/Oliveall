import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CalendarX2,
  Check,
  ChevronDown,
  Clock,
  Disc,
  Hourglass,
  Users,
  User,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Ticket,
  Ban,
} from 'lucide-react';
import {
  fetchStationByRef,
  fetchStationBookingsForDate,
  releaseStationBookedSlot,
} from '../../services/stationsManagementService';
import { subscribeToStationSync } from '../../services/stationService';
import { subscribeToBookingSync } from '../../services/spotBookingService';
import { getKolkataTodayIso, formatSpotDateLabel } from '../../utils/bookingTimeUtils';
import { STATUS_BADGE_STYLES } from '../../components/admin/RecentBookings';
import ReleaseConfirmationModal from '../../components/admin/Stations/ReleaseConfirmationModal';

/**
 * Oliveal Gaming Zone — Close Slot Page (/admin/stations/:stationId/close-slots).
 * Allows admins to choose a date for a specific station, inspect ALL bookings
 * recorded on that date in Supabase, select a confirmed slot, and release it
 * with explicit confirmation so the interval becomes available again.
 */
export default function CloseSlot() {
  const navigate = useNavigate();
  const { stationId: stationParam } = useParams();
  const location = useLocation();
  const outletContext = useOutletContext();
  const registerRefreshHandler = outletContext?.registerRefreshHandler;

  const dateInputRef = useRef(null);

  const [station, setStation] = useState(() => location.state?.station || null);
  const [stationLoading, setStationLoading] = useState(() => !location.state?.station);
  const [stationError, setStationError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(() => getKolkataTodayIso());
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState(null);

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const loadStation = useCallback(async () => {
    setStationLoading((prev) => prev || !station);
    setStationError(null);
    try {
      const liveStation = await fetchStationByRef(stationParam);
      setStation(liveStation);
      return liveStation;
    } catch (err) {
      if (err?.code === 'unauthenticated') {
        navigate('/login', { replace: true });
        return null;
      }
      if (err?.code === 'forbidden') {
        navigate('/dashboard', { replace: true });
        return null;
      }
      setStationError(err?.message || 'Unable to load station information.');
      return null;
    } finally {
      setStationLoading(false);
    }
  }, [stationParam, navigate]);

  const loadBookings = useCallback(
    async (targetStationId, isoDate) => {
      if (!targetStationId || !isoDate) return;
      setBookingsLoading(true);
      setBookingsError(null);

      try {
        const list = await fetchStationBookingsForDate(targetStationId, isoDate);
        setBookings(list);
        setSelectedBooking((prev) => {
          if (!prev) return null;
          const match = list.find((b) => b.id === prev.id);
          return match && match.canRelease ? match : null;
        });
      } catch (err) {
        if (err?.code === 'unauthenticated') {
          navigate('/login', { replace: true });
          return;
        }
        if (err?.code === 'forbidden') {
          navigate('/dashboard', { replace: true });
          return;
        }
        setBookingsError(err?.message || 'Unable to load bookings for the selected date.');
      } finally {
        setBookingsLoading(false);
      }
    },
    [navigate]
  );

  // Hydrate live station details from Supabase on mount / param change
  useEffect(() => {
    let active = true;
    (async () => {
      const st = await loadStation();
      if (active && st?.id) {
        await loadBookings(st.id, selectedDate);
      }
    })();
    return () => {
      active = false;
    };
  }, [stationParam]);

  // Reload all bookings whenever selected date changes
  useEffect(() => {
    if (!station?.id) return;
    setSelectedBooking(null);
    loadBookings(station.id, selectedDate);
  }, [station?.id, selectedDate, loadBookings]);

  // Live Realtime synchronization for station activation & booking updates
  useEffect(() => {
    if (!station?.id) return undefined;
    const unsubStations = subscribeToStationSync(() => {
      loadStation();
    });
    const unsubBookings = subscribeToBookingSync({
      stationId: station.id,
      onBookingChange: () => {
        loadBookings(station.id, selectedDate);
      },
    });
    return () => {
      unsubStations();
      unsubBookings();
    };
  }, [station?.id, selectedDate, loadStation, loadBookings]);

  const handleRefresh = useCallback(async () => {
    const st = await loadStation();
    const sid = st?.id || station?.id;
    if (sid) {
      await loadBookings(sid, selectedDate);
    }
  }, [loadStation, loadBookings, station?.id, selectedDate]);

  useEffect(() => {
    registerRefreshHandler?.(handleRefresh, stationLoading || bookingsLoading);
  }, [registerRefreshHandler, handleRefresh, stationLoading, bookingsLoading]);

  const handleCardSelect = (booking) => {
    if (!booking.canRelease) {
      setFeedback({
        type: 'error',
        text: booking.nonReleasableReason || 'This booking cannot be released.',
      });
      return;
    }
    setFeedback(null);
    setSelectedBooking((prev) => (prev?.id === booking.id ? null : booking));
  };

  const handleOpenConfirm = () => {
    if (!selectedBooking || !selectedBooking.canRelease || releasing) return;
    setReleaseError(null);
    setConfirmOpen(true);
  };

  const handleConfirmRelease = async () => {
    if (!selectedBooking || !station?.id || releasing) return;
    setReleasing(true);
    setReleaseError(null);

    try {
      const released = await releaseStationBookedSlot({
        bookingId: selectedBooking.id,
        stationId: station.id,
        isoDate: selectedDate,
      });

      setConfirmOpen(false);
      setSelectedBooking(null);
      await loadBookings(station.id, selectedDate);

      setFeedback({
        type: 'success',
        text: `Booking ${released.bookingNumber || selectedBooking.bookingNumber} (${selectedBooking.timeRange}) was released. This time interval is now open for new bookings.`,
      });
    } catch (err) {
      if (err?.code === 'unauthenticated') {
        navigate('/login', { replace: true });
        return;
      }
      if (err?.code === 'forbidden') {
        navigate('/dashboard', { replace: true });
        return;
      }
      setReleaseError(
        err?.message || 'Unable to release this booked slot. Current booking state preserved.'
      );
    } finally {
      setReleasing(false);
    }
  };

  const isSimulator =
    station?.type === 'simulator' ||
    station?.category === 'Racing Simulator' ||
    Number(station?.maxPlayers) === 1;
  const stationCategoryLabel = isSimulator ? 'Racing Simulator' : 'PS5';
  const stationVisual =
    station?.image ||
    (isSimulator ? '/assets/images/racing-simulator.png' : '/assets/images/ps5-station.png');

  const activeBookedCount = bookings.filter((b) => b.status === 'confirmed').length;

  return (
    <main className="relative z-10 flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-3.5 sm:pt-4 pb-28 space-y-3.5 sm:space-y-4">
      {/* Header matching Close Slot reference */}
      <header className="flex items-center gap-3 px-0.5">
        <button
          type="button"
          onClick={() => navigate('/admin/stations')}
          aria-label="Back to Stations"
          className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-purple-500/20 border border-white/10 flex items-center justify-center text-white transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
            Close Slot
          </h1>
          <p className="text-xs sm:text-sm text-[#A9A0BC] font-medium mt-0.5 leading-snug">
            Manage bookings for this station
          </p>
        </div>
      </header>

      {/* Station Info Error Fallback */}
      {stationError && !station ? (
        <div
          role="alert"
          className="rounded-2xl bg-rose-500/15 border border-rose-500/40 p-5 text-center space-y-3"
        >
          <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" aria-hidden="true" />
          <p className="text-xs sm:text-sm text-rose-200">{stationError}</p>
          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={loadStation}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 text-xs font-bold text-white cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/stations')}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-white cursor-pointer"
            >
              Back to Stations
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Selected Station Summary Card */}
          <section
            aria-label="Selected station information"
            className="rounded-2xl bg-[#120B20]/95 border border-purple-500/30 p-3 sm:p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.45),0_0_20px_rgba(124,58,237,0.12)] backdrop-blur-md flex items-center justify-between gap-3"
          >
            {stationLoading && !station ? (
              <div className="w-full h-12 animate-pulse rounded-xl bg-white/[0.06]" />
            ) : (
              <>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-16 h-12 rounded-xl bg-[#090512] border border-purple-500/25 p-1 flex items-center justify-center shrink-0">
                    <img
                      src={stationVisual}
                      alt={station?.name || 'Station'}
                      className="w-full h-full object-contain select-none drop-shadow-[0_3px_8px_rgba(0,0,0,0.75)]"
                    />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight uppercase truncate">
                      {station?.name}
                    </h2>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] sm:text-xs text-[#C4B5FD]">
                      {isSimulator ? (
                        <Disc className="w-3.5 h-3.5 text-[#A9A0BC] shrink-0" aria-hidden="true" />
                      ) : (
                        <img
                          src="/assets/images/ps5-logo.png"
                          alt="PlayStation"
                          className="w-3.5 h-3 object-contain shrink-0 select-none"
                        />
                      )}
                      <span className="truncate font-medium">
                        {stationCategoryLabel} <span className="text-white/30 mx-0.5">|</span> Max{' '}
                        {station?.maxPlayers}P
                      </span>
                    </div>
                  </div>
                </div>

                <span
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] sm:text-xs font-bold leading-none border ${
                    station?.isActive !== false
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-400/40 text-rose-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      station?.isActive !== false
                        ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                        : 'bg-rose-400'
                    }`}
                  />
                  <span>{station?.isActive !== false ? 'Active' : 'Disabled'}</span>
                </span>
              </>
            )}
          </section>

          {/* Action Feedback Alert / Success Toast */}
          {feedback && (
            <div
              role={feedback.type === 'error' ? 'alert' : 'status'}
              className={`rounded-2xl px-3.5 py-2.5 text-xs font-semibold border flex items-start gap-2.5 ${
                feedback.type === 'error'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                  : 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
              }`}
            >
              {feedback.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <span className="leading-snug">{feedback.text}</span>
            </div>
          )}

          {/* Main Date Picker + Booked Slots Container matching Reference */}
          <section
            aria-label="Date and station bookings"
            className="rounded-2xl bg-[#120B20]/95 border border-purple-500/30 p-3.5 sm:p-4 shadow-[0_8px_28px_rgba(0,0,0,0.45),0_0_24px_rgba(124,58,237,0.12)] backdrop-blur-md space-y-4"
          >
            {/* 1. Date Picker (24/7 operation — unrestricted date management) */}
            <div className="space-y-2">
              <label
                htmlFor="close-slot-date"
                className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white"
              >
                <Calendar className="w-4 h-4 text-[#C4B5FD]" aria-hidden="true" />
                <span>
                  Select Date <span className="text-fuchsia-400">*</span>
                </span>
              </label>

              <div
                onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()}
                className="relative rounded-xl bg-[#1A1030]/95 border border-purple-500/30 hover:border-[#C084FC] px-3.5 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition"
              >
                <span className="text-xs sm:text-sm font-semibold text-white">
                  {formatSpotDateLabel(selectedDate)}
                </span>
                <ChevronDown className="w-4 h-4 text-[#A9A0BC] shrink-0" aria-hidden="true" />

                <input
                  ref={dateInputRef}
                  id="close-slot-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDate(e.target.value);
                  }}
                  aria-label="Select date to manage bookings"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* 2. ALL Bookings for Station + Selected Date */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#C4B5FD]" aria-hidden="true" />
                  <h2 className="text-xs sm:text-sm font-bold text-white">
                    Select Booked Slot to Release <span className="text-fuchsia-400">*</span>
                  </h2>
                </div>
                {!bookingsLoading && !bookingsError && (
                  <span className="rounded-full bg-purple-500/20 border border-purple-400/30 px-2.5 py-0.5 text-[10px] font-bold text-[#D8B4FE] tabular-nums">
                    {activeBookedCount} Active / {bookings.length} Total
                  </span>
                )}
              </div>

              {bookingsLoading ? (
                <div className="space-y-2" aria-hidden="true">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-20 rounded-xl bg-[#19102C]/90 border border-purple-500/20 animate-pulse"
                    />
                  ))}
                </div>
              ) : bookingsError ? (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-500/15 border border-rose-500/40 p-4 text-center space-y-2"
                >
                  <p className="text-xs text-rose-200">{bookingsError}</p>
                  <button
                    type="button"
                    onClick={() => loadBookings(station?.id, selectedDate)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/25 hover:bg-rose-500/35 text-xs font-bold text-white cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Retry</span>
                  </button>
                </div>
              ) : bookings.length === 0 ? (
                <div className="rounded-xl bg-[#0D071A]/90 border border-white/[0.08] py-7 px-4 text-center space-y-1.5">
                  <CalendarX2 className="w-7 h-7 text-[#A9A0BC] mx-auto" aria-hidden="true" />
                  <p className="text-xs sm:text-sm font-bold text-white">
                    No bookings found for {station?.name || 'this station'} on{' '}
                    {formatSpotDateLabel(selectedDate)}
                  </p>
                  <p className="text-[11px] text-[#7B7191] max-w-xs mx-auto">
                    All intervals on this date are completely free for new bookings.
                  </p>
                </div>
              ) : (
                <div
                  role="listbox"
                  aria-label="Station booked slots"
                  className="max-h-[380px] overflow-y-auto pt-2 pr-2.5 pb-1 pl-0.5 space-y-2.5"
                >
                  {bookings.map((booking) => {
                    const isSelected = selectedBooking?.id === booking.id;
                    const badgeVariant = booking.lifecycleStatus?.variant || 'muted';
                    const badgeClass =
                      STATUS_BADGE_STYLES[badgeVariant] || STATUS_BADGE_STYLES.muted;

                    return (
                      <button
                        key={booking.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleCardSelect(booking)}
                        className={`relative w-full text-left rounded-xl p-3 transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-gradient-to-br from-purple-700/35 via-[#1C1036] to-[#170C2B] border-[#C084FC] shadow-[0_0_20px_rgba(168,85,247,0.42)]'
                            : booking.canRelease
                            ? 'bg-[#19102C]/90 hover:bg-[#22163A] border-purple-500/25 hover:border-purple-400/50'
                            : 'bg-[#120B20]/70 border-white/[0.08] opacity-65'
                        }`}
                      >
                        {/* Neon Circular Checkmark Badge matching Close Slot reference */}
                        {isSelected && (
                          <span
                            aria-hidden="true"
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-[#A855F7] to-[#7C3AED] border border-purple-200/70 shadow-[0_0_12px_rgba(168,85,247,0.8)] flex items-center justify-center text-white z-10"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        )}

                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Ticket className="w-3.5 h-3.5 text-[#C084FC] shrink-0" aria-hidden="true" />
                              <span className="text-xs sm:text-sm font-extrabold text-white tracking-tight truncate">
                                {booking.bookingNumber}
                              </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-[#D6CFE6] flex items-center gap-1.5 truncate">
                              <User className="w-3 h-3 text-[#A9A0BC] shrink-0" aria-hidden="true" />
                              <span className="truncate font-medium">{booking.customerName}</span>
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-bold leading-none ${badgeClass}`}
                            >
                              {booking.lifecycleStatus?.label || booking.status}
                            </span>
                            {booking.checkedInAt && (
                              <span className="text-[10px] font-semibold text-emerald-300">
                                Checked In
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <span className="inline-flex items-center gap-1.5 font-bold text-white">
                            <Clock className="w-3.5 h-3.5 text-[#C084FC] shrink-0" aria-hidden="true" />
                            <span>{booking.timeRange}</span>
                          </span>

                          <div className="flex items-center gap-2.5 text-[#A9A0BC]">
                            <span className="inline-flex items-center gap-1">
                              <Hourglass className="w-3 h-3" aria-hidden="true" />
                              {booking.durationMinutes}m
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3 h-3" aria-hidden="true" />
                              {booking.playerCount}P
                            </span>
                            {!booking.canRelease && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-rose-300 font-semibold">
                                <Ban className="w-3 h-3" aria-hidden="true" />
                                Locked
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Action Buttons matching Close Slot reference */}
          <div className="space-y-2.5 pt-0.5">
            <button
              type="button"
              onClick={handleOpenConfirm}
              disabled={!selectedBooking || !selectedBooking.canRelease || releasing}
              className="w-full py-3.5 px-5 rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#9333EA] hover:brightness-110 active:scale-[0.99] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 border border-purple-300/35 shadow-[0_8px_28px_rgba(124,58,237,0.45)] transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <CalendarX2 className="w-5 h-5" aria-hidden="true" />
              <span>Close Selected Slot</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin/stations')}
              disabled={releasing}
              className="w-full py-3 px-5 rounded-full bg-[#120B20]/90 hover:bg-[#1B1030] border border-purple-500/35 text-xs sm:text-sm font-semibold text-white transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Explicit Release Confirmation Dialog */}
      <ReleaseConfirmationModal
        isOpen={confirmOpen}
        booking={selectedBooking}
        releasing={releasing}
        error={releaseError}
        onConfirm={handleConfirmRelease}
        onCancel={() => {
          if (!releasing) {
            setConfirmOpen(false);
            setReleaseError(null);
          }
        }}
      />
    </main>
  );
}
