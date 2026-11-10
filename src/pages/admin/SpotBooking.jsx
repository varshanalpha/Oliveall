import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Zap,
  CalendarPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  History,
  X,
} from 'lucide-react';
import { useSpotBooking } from '../../hooks/useSpotBooking';
import CustomerDetails from '../../components/admin/SpotBooking/CustomerDetails';
import StationSelector from '../../components/admin/SpotBooking/StationSelector';
import BookingDetails from '../../components/admin/SpotBooking/BookingDetails';
import SpotBookingHistoryModal from '../../components/admin/SpotBooking/SpotBookingHistoryModal';

/**
 * Oliveal Gaming Zone — Admin Spot Booking View (rendered inside persistent AdminShell).
 * Enables authorized admins to create on-spot walk-in bookings for active stations
 * backed by atomic Supabase PostgreSQL overlap prevention & real-time customer sync.
 */
export default function SpotBooking() {
  const navigate = useNavigate();
  const location = useLocation();
  const outletContext = useOutletContext();
  const registerRefreshHandler = outletContext?.registerRefreshHandler;
  const feedbackRef = useRef(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const {
    stations,
    stationsLoading,
    stationsError,
    reloadStations,
    selectedStation,
    maxPlayers,
    customerName,
    setCustomerName,
    customerNameTouched,
    markCustomerNameTouched,
    selectedDateIso,
    startTime,
    duration,
    players,
    bookedSlots,
    slotsLoading,
    refreshBookedSlots,
    validation,
    showAllErrors,
    calculatedSlot,
    onSelectStation,
    onChangeDate,
    onChangeStartTime,
    onChangeDuration,
    onDecrementPlayers,
    onIncrementPlayers,
    onSubmit,
    resetForm,
    submitting,
    feedback,
    clearFeedback,
  } = useSpotBooking();

  useEffect(() => {
    if (location.state?.resetForm) {
      resetForm();
    }
  }, [location.state?.resetForm, resetForm]);

  useEffect(() => {
    registerRefreshHandler?.(refreshBookedSlots, slotsLoading);
  }, [registerRefreshHandler, refreshBookedSlots, slotsLoading]);

  useEffect(() => {
    if (feedback && feedbackRef.current) {
      feedbackRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [feedback]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const res = await onSubmit();
    if (res?.ok && res?.booking) {
      const refSlug = encodeURIComponent(res.booking.bookingNumber || res.booking.id);
      navigate(`/admin/spot-booking/details/${refSlug}`, {
        state: { booking: res.booking },
      });
    }
  };

  const showCustomerNameError =
    (customerNameTouched || showAllErrors) && validation.errors?.customerName
      ? validation.errors.customerName
      : null;

  return (
    <main className="relative z-10 flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-28 space-y-4">
      {/* Page Heading with History Option */}
      <header className="px-0.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-[#C4B5FD] shrink-0" aria-hidden="true" />
            <h1 className="text-[1.6rem] sm:text-[1.75rem] font-extrabold text-white tracking-tight leading-tight">
              Spot Booking
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#A9A0BC] mt-1 font-medium leading-snug">
            Create a new on-spot booking for walk-in customers
          </p>
        </div>

        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          aria-label="View spot booking history"
          className="shrink-0 mt-0.5 inline-flex items-center gap-1.5 rounded-xl bg-[#160F26]/95 hover:bg-[#21153B] border border-purple-500/35 hover:border-purple-400/60 px-3 py-2 text-xs font-semibold text-[#E2DCF0] hover:text-white shadow-[0_4px_16px_rgba(124,58,237,0.18)] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          <History className="w-3.5 h-3.5 text-[#C084FC]" aria-hidden="true" />
          <span>History</span>
        </button>
      </header>

      <form noValidate onSubmit={handleFormSubmit} className="space-y-4">
        {/* 1. Customer Details (Walk-in full name only) */}
        <CustomerDetails
          customerName={customerName}
          onChangeCustomerName={setCustomerName}
          onBlurCustomerName={markCustomerNameTouched}
          error={showCustomerNameError}
          disabled={submitting}
        />

        {/* 2. Select Station */}
        <StationSelector
          stations={stations}
          selectedStation={selectedStation}
          onSelectStation={onSelectStation}
          loading={stationsLoading}
          error={stationsError}
          onRetry={reloadStations}
          selectionError={showAllErrors ? validation.errors?.station : null}
          disabled={submitting}
        />

        {/* 3. Booking Details */}
        <BookingDetails
          selectedDateIso={selectedDateIso}
          onChangeDate={onChangeDate}
          startTime={startTime}
          onChangeStartTime={onChangeStartTime}
          calculatedSlot={calculatedSlot}
          duration={duration}
          onChangeDuration={onChangeDuration}
          players={players}
          maxPlayers={maxPlayers}
          onDecrementPlayers={onDecrementPlayers}
          onIncrementPlayers={onIncrementPlayers}
          bookedSlots={bookedSlots}
          slotsLoading={slotsLoading}
          selectedStationName={selectedStation?.name || ''}
          errors={validation.errors}
          disabled={submitting}
        />

        {/* 4. Submission Feedback Alert */}
        {feedback && (
          <div
            ref={feedbackRef}
            role={feedback.type === 'error' ? 'alert' : 'status'}
            className={`rounded-2xl p-3.5 border flex items-start justify-between gap-3 backdrop-blur-md ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100'
                : 'bg-rose-500/15 border-rose-400/40 text-rose-100'
            }`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white">{feedback.title}</p>
                <p className="text-xs mt-0.5 leading-snug opacity-90">{feedback.message}</p>
                {feedback.booking?.bookingNumber && (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-black/25 border border-emerald-400/30 px-2 py-0.5 text-[11px] font-bold text-emerald-200 tracking-wide">
                    Ref: {feedback.booking.bookingNumber}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={clearFeedback}
              aria-label="Dismiss notification"
              className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* 5. Primary CTA Button (No Payment Summary per spec) */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={submitting || stationsLoading}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A855F7] hover:brightness-110 active:scale-[0.99] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 border border-purple-300/35 shadow-[0_8px_28px_rgba(124,58,237,0.45),0_0_20px_rgba(217,70,239,0.2)] transition-all cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                <span>Creating Spot Booking...</span>
              </>
            ) : (
              <>
                <CalendarPlus className="w-5 h-5" aria-hidden="true" />
                <span>Create Spot Booking</span>
              </>
            )}
          </button>
        </div>
      </form>

      <SpotBookingHistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectBooking={(booking) => {
          setHistoryOpen(false);
          const refSlug = encodeURIComponent(booking.bookingNumber || booking.id);
          navigate(`/admin/spot-booking/details/${refSlug}`, {
            state: { booking, fromHistory: true },
          });
        }}
      />
    </main>
  );
}
