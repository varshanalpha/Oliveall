import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  CalendarPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSpotBooking } from '../../hooks/useSpotBooking';
import AdminHeader from '../../components/admin/AdminHeader';
import BottomNavigation from '../../components/admin/BottomNavigation';
import CustomerDetails from '../../components/admin/SpotBooking/CustomerDetails';
import StationSelector from '../../components/admin/SpotBooking/StationSelector';
import BookingDetails from '../../components/admin/SpotBooking/BookingDetails';

/**
 * Oliveal Gaming Zone — Admin Spot Booking Page
 * Enables authorized admins to create on-spot walk-in bookings for active stations
 * backed by atomic Supabase PostgreSQL overlap prevention & real-time customer sync.
 */
export default function SpotBooking() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [navNotice, setNavNotice] = useState(null);
  const feedbackRef = useRef(null);

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
    submitting,
    feedback,
    clearFeedback,
  } = useSpotBooking();

  useEffect(() => {
    if (!navNotice) return undefined;
    const timer = setTimeout(() => setNavNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [navNotice]);

  useEffect(() => {
    if (feedback && feedbackRef.current) {
      feedbackRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [feedback]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } finally {
      navigate('/login', { replace: true });
    }
  }, [signOut, navigate]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    await onSubmit();
  };

  const handleUpcomingTab = useCallback((tabLabel) => {
    setNavNotice(`${tabLabel} module will be implemented in an upcoming step.`);
  }, []);

  const showCustomerNameError =
    (customerNameTouched || showAllErrors) && validation.errors?.customerName
      ? validation.errors.customerName
      : null;

  return (
    <div className="min-h-[100dvh] w-full bg-[#080510] text-white relative overflow-x-hidden flex flex-col">
      {/* Subtle controlled ambient radial purple lighting */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[540px] h-[340px] rounded-full bg-[#7C3AED]/14 blur-[120px]" />
        <div className="absolute top-[45%] left-1/2 -translate-x-1/2 w-[420px] h-[300px] rounded-full bg-[#D946EF]/[0.07] blur-[125px]" />
      </div>

      <AdminHeader
        adminProfile={profile}
        notificationCount={0}
        notifications={[]}
        onSignOut={handleSignOut}
        onRefresh={refreshBookedSlots}
        refreshing={slotsLoading}
      />

      <main className="relative z-10 flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-28 space-y-4">
        {/* Page Heading */}
        <header className="px-0.5">
          <div className="flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-[#C4B5FD] shrink-0" aria-hidden="true" />
            <h1 className="text-[1.6rem] sm:text-[1.75rem] font-extrabold text-white tracking-tight leading-tight">
              Spot Booking
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#A9A0BC] mt-1 font-medium leading-snug">
            Create a new on-spot booking for walk-in customers
          </p>
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
      </main>

      {/* Non-blocking status notice for out-of-scope bottom navigation tabs */}
      {navNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm rounded-xl bg-[#1A0C2E]/95 border border-purple-400/40 px-3.5 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.6),0_0_20px_rgba(124,58,237,0.3)] backdrop-blur-xl flex items-center justify-between gap-2.5"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Info className="w-4 h-4 text-[#C084FC] shrink-0" aria-hidden="true" />
            <p className="text-xs text-white font-medium leading-snug">{navNotice}</p>
          </div>
          <button
            type="button"
            onClick={() => setNavNotice(null)}
            aria-label="Dismiss notice"
            className="text-[#A9A0BC] hover:text-white p-0.5 rounded cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <BottomNavigation
        activeTab="spot-booking"
        onSelectUpcomingTab={handleUpcomingTab}
      />
    </div>
  );
}

