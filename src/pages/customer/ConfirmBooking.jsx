import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardCheck,
} from 'lucide-react';
import AuthBranding from '../../components/auth/AuthBranding';
import BookingProgress from '../../components/customer/BookingProgress';
import SelectedStationCard from '../../components/customer/SelectedStationCard';
import BookingDetailsCard from '../../components/customer/BookingDetailsCard';
import PaymentSummaryCard from '../../components/customer/PaymentSummaryCard';
import BookingTermsCheckbox from '../../components/customer/BookingTermsCheckbox';
import BookingTermsModal from '../../components/customer/BookingTermsModal';
import ConfirmBookingButton from '../../components/customer/ConfirmBookingButton';
import BookingSuccessModal from '../../components/customer/BookingSuccessModal';
import StatusMessage from '../../components/ui/StatusMessage';
import { STATIONS, getStationById } from '../../services/mock/stationMockData';
import {
  fetchAllStationsCatalog,
  resolveStationFromList,
  subscribeToStationSync,
} from '../../services/stationService';
import {
  createRazorpayBookingOrder,
  verifyRazorpayBookingPayment,
  releasePendingBookingHold,
} from '../../services/bookingService';
import { useAuth } from '../../context/AuthContext';
import { openRazorpayCheckout } from '../../utils/razorpayCheckout';
import {
  fetchAppSettings,
  getCachedAppSettings,
  subscribeToAppSettingsSync,
} from '../../services/appSettingsService';
import {
  calculateStationCharge,
  calculatePlatformFee,
  calculateTotalAmount,
} from '../../utils/pricingUtils';
import { formatDate, getKolkataTodayIso, isSlotStartInPast } from '../../utils/bookingTimeUtils';

/**
 * OLIVEAL GAMING ZONE — CONFIRM BOOKING PAGE
 * Dedicated step-3 booking confirmation screen wired to Supabase RPCs.
 */
export default function ConfirmBooking() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // State passed from BookSlot.jsx
  const incoming = location.state || {};

  // Resolve Station (from state, or hydrate live Supabase UUID if direct URL entry)
  const [selectedStation, setSelectedStation] = useState(() => {
    if (incoming.station) return incoming.station;
    if (incoming.stationId) return getStationById(incoming.stationId);
    return STATIONS[0];
  });

  useEffect(() => {
    let mounted = true;
    async function hydrateLiveStation() {
      const { stations } = await fetchAllStationsCatalog({ forceRefresh: true });
      if (!mounted || !stations?.length) return;
      const targetRef =
        incoming.station?.slug || incoming.station?.id || incoming.stationId || selectedStation?.slug || selectedStation?.id;
      const resolved = stations.find(
        (s) =>
          String(s.id).toLowerCase() === String(targetRef || '').toLowerCase() ||
          String(s.slug || '').toLowerCase() === String(targetRef || '').toLowerCase()
      ) || resolveStationFromList(stations, targetRef);
      if (resolved) setSelectedStation(resolved);
    }
    hydrateLiveStation();
    const unsub = subscribeToStationSync(hydrateLiveStation);
    return () => {
      mounted = false;
      unsub();
    };
  }, [incoming.station, incoming.stationId, selectedStation?.id, selectedStation?.slug]);

  const defaultToday = useMemo(() => formatDate(new Date()), []);

  // Resolve Date
  const bookingIsoDate = useMemo(() => {
    return incoming.date?.isoDate || defaultToday.isoDate;
  }, [incoming.date, defaultToday]);

  const bookingDate = useMemo(() => {
    if (incoming.date?.fullLabel) return incoming.date.fullLabel;
    if (incoming.dateFormatted?.fullLabel) return incoming.dateFormatted.fullLabel;
    if (typeof incoming.date === 'string') return incoming.date;
    return defaultToday.fullLabel;
  }, [incoming.date, incoming.dateFormatted, defaultToday]);

  // Check if station is a simulator
  const isSimulator =
    selectedStation?.type === 'simulator' ||
    selectedStation?.category === 'Racing Simulator' ||
    selectedStation?.maxPlayers === 1;

  // Resolve Time Range & Calculations
  const durationMinutes = incoming.duration || incoming.durationMinutes || 90;
  // Simulators strictly accommodate 1 player
  const players = isSimulator ? 1 : (incoming.players || 2);
  const startTime = incoming.startTime || '18:30';

  const timeRange = useMemo(() => {
    if (incoming.calculatedSlot?.displayRange) {
      return incoming.calculatedSlot.displayRange;
    }
    if (incoming.timeRange) {
      return incoming.timeRange;
    }
    return '06:30 PM – 08:00 PM';
  }, [incoming.calculatedSlot, incoming.timeRange]);

  // Dynamic Pricing Calculations
  const stationCharge = useMemo(() => {
    const category = selectedStation?.category || selectedStation?.type;
    return calculateStationCharge(category, players, durationMinutes);
  }, [selectedStation, players, durationMinutes]);

  const platformFee = calculatePlatformFee();
  const totalAmount = useMemo(() => {
    return calculateTotalAmount(stationCharge, platformFee);
  }, [stationCharge, platformFee]);

  // User Interactive Controls
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [globalSettings, setGlobalSettings] = useState(
    () =>
      getCachedAppSettings() || {
        bookingEnabled: true,
        advanceBookingEnabled: true,
      }
  );

  useEffect(() => {
    let mounted = true;
    const syncGlobalSettings = async () => {
      const settings = await fetchAppSettings({ forceRefresh: true });
      if (!mounted) return;
      setGlobalSettings({
        bookingEnabled: settings?.bookingEnabled !== false,
        advanceBookingEnabled: settings?.advanceBookingEnabled !== false,
      });
    };
    syncGlobalSettings();
    const unsubSettings = subscribeToAppSettingsSync(syncGlobalSettings);

    const updateNow = () => setNowMs(Date.now());
    const timer = setInterval(updateNow, 15000);
    window.addEventListener('focus', updateNow);
    return () => {
      mounted = false;
      unsubSettings();
      clearInterval(timer);
      window.removeEventListener('focus', updateNow);
    };
  }, []);

  const isPastSlot = useMemo(
    () => isSlotStartInPast(bookingIsoDate, startTime, nowMs),
    [bookingIsoDate, startTime, nowMs]
  );
  const isStationDisabled = selectedStation?.isActive === false;
  const isGlobalBookingDisabled = globalSettings.bookingEnabled === false;
  const isAdvanceDisabledForDate =
    globalSettings.advanceBookingEnabled === false &&
    Boolean(bookingIsoDate) &&
    bookingIsoDate > getKolkataTodayIso();

  // Navigate back to BookSlot preserving selections
  const handleEdit = () => {
    navigate('/book-slot', {
      state: {
        stationId: selectedStation?.id,
        stationSlug: selectedStation?.slug || selectedStation?.id,
        date: incoming.date,
        startTime: incoming.startTime || startTime,
        duration: durationMinutes,
        players,
      },
    });
  };

  // Reserve slot hold via Razorpay order Edge Function, open checkout modal, and verify payment server-side
  const handleConfirmAndPay = async () => {
    const latestGlobal = await fetchAppSettings({ forceRefresh: true });
    const latestBookingEnabled = latestGlobal?.bookingEnabled !== false;
    const latestAdvanceEnabled = latestGlobal?.advanceBookingEnabled !== false;
    setGlobalSettings({
      bookingEnabled: latestBookingEnabled,
      advanceBookingEnabled: latestAdvanceEnabled,
    });

    if (!latestBookingEnabled) {
      setSubmitError('Bookings are temporarily unavailable. Please try again later.');
      return;
    }

    if (!latestAdvanceEnabled && bookingIsoDate > getKolkataTodayIso()) {
      setSubmitError(
        'Advance bookings for future dates are currently disabled. Please select today for same-day booking.'
      );
      return;
    }

    if (isStationDisabled) {
      setSubmitError(
        `${selectedStation?.name || 'This station'} is currently disabled (Temporarily Unavailable). Please go back and select an active station.`
      );
      return;
    }

    const freshNowMs = Date.now();
    if (isSlotStartInPast(bookingIsoDate, startTime, freshNowMs)) {
      setNowMs(freshNowMs);
      setSubmitError('Selected start time has already passed. Please go back and choose an upcoming time.');
      return;
    }

    if (!agreedToTerms || isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);

    const { order, error: orderError } = await createRazorpayBookingOrder({
      station: selectedStation,
      isoDate: bookingIsoDate,
      startTime,
      durationMinutes,
      players,
      termsAccepted: agreedToTerms,
    });

    if (orderError || !order) {
      setIsSubmitting(false);
      setSubmitError(
        orderError?.message || 'Unable to initiate payment right now. Please verify slot availability and try again.'
      );
      return;
    }

    let rzpResponse;
    try {
      rzpResponse = await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amountPaise: order.amountPaise,
        currency: order.currency,
        name: 'Oliveal Gaming Zone',
        description: `${selectedStation?.name || 'Gaming Station'} · ${durationMinutes} Mins`,
        prefill: {
          name: profile?.full_name || user?.user_metadata?.full_name || '',
          email: user?.email || profile?.email || '',
        },
        notes: {
          booking_id: order.booking?.id || '',
          booking_number: order.booking?.bookingNumber || '',
        },
      });
    } catch (checkoutErr) {
      await releasePendingBookingHold(
        order.booking?.id,
        checkoutErr?.code === 'PAYMENT_FAILED' ? checkoutErr.message : 'checkout_cancelled'
      );
      setIsSubmitting(false);
      setSubmitError(
        checkoutErr?.message || 'Payment was cancelled before completion. Your selected slot has been released.'
      );
      return;
    }

    const { booking, error: verifyError } = await verifyRazorpayBookingPayment({
      bookingId: order.booking?.id,
      razorpay_order_id: rzpResponse?.razorpay_order_id,
      razorpay_payment_id: rzpResponse?.razorpay_payment_id,
      razorpay_signature: rzpResponse?.razorpay_signature,
      fallbackStation: selectedStation,
    });

    setIsSubmitting(false);

    if (verifyError || !booking) {
      setSubmitError(
        verifyError?.message ||
          'Payment could not be verified. If money was debited, it will reconcile automatically or be refunded.'
      );
      return;
    }

    setConfirmedBooking(booking);
  };

  return (
    <div className="min-h-screen w-full bg-[#07060e] text-white flex flex-col justify-between selection:bg-purple-600 selection:text-white relative overflow-x-hidden">
      
      {/* Background Ambience Aura */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-fuchsia-600/12 rounded-full blur-[140px]" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-[465px] sm:max-w-xl mx-auto px-4 sm:px-5 py-3 sm:py-5 flex-1 flex flex-col gap-3.5 sm:gap-4 pb-10">
        
        {/* 1. Header with Back Button and Centered Oliveal Branding */}
        <header className="flex items-center justify-between min-h-[96px] sm:min-h-[110px] relative pt-1">
          <button
            type="button"
            onClick={handleEdit}
            aria-label="Back to Slot Selection"
            className="w-10 h-10 rounded-2xl bg-[#130f28]/90 hover:bg-purple-900/40 active:scale-95 border border-purple-500/25 flex items-center justify-center text-slate-200 hover:text-white transition shadow-lg backdrop-blur-md z-10"
          >
            <ArrowLeft className="w-5 h-5 text-slate-200" />
          </button>

          {/* Centered Official Logo Branding */}
          <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none">
            <AuthBranding size="sm" />
          </div>

          {/* Spacer for symmetry */}
          <div className="w-10 h-10" />
        </header>

        {/* 2. Booking Progress Indicator (3 Steps) */}
        <BookingProgress currentStep={3} />

        {/* 3. Page Heading ("Confirm Booking" with icon badge) */}
        <div className="flex items-center gap-3 pt-0.5">
          <div className="w-11 h-11 rounded-2xl bg-[#140e2d] border border-purple-500/35 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.25)] flex-shrink-0">
            <ClipboardCheck className="w-6 h-6 text-fuchsia-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Confirm Booking
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Review your details and confirm your booking.
            </p>
          </div>
        </div>

        {/* 4. Unified Glassmorphic Master Card Container */}
        <div className="w-full rounded-3xl bg-[#110e24]/85 border border-purple-500/25 p-4 sm:p-5 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex flex-col gap-4 relative overflow-hidden">
          
          {/* Subtle Ambient Radial Highlight inside card */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* A. Selected Gaming Station Section */}
          <SelectedStationCard station={selectedStation} asSection={true} />

          {/* Divider */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-purple-500/25 to-transparent" />

          {/* B. Booking Details Section (with Edit button) */}
          <BookingDetailsCard
            dateFormatted={bookingDate}
            timeRange={timeRange}
            durationMinutes={durationMinutes}
            players={players}
            onEdit={handleEdit}
            asSection={true}
          />

          {/* Divider */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-purple-500/25 to-transparent" />

          {/* C. Payment Summary Section */}
          <PaymentSummaryCard
            stationCharge={stationCharge}
            platformFee={platformFee}
            totalAmount={totalAmount}
            durationMinutes={durationMinutes}
            asSection={true}
          />

        </div>

        {/* 5. Booking Terms & Conditions Checkbox */}
        <BookingTermsCheckbox
          checked={agreedToTerms}
          onChange={setAgreedToTerms}
          onOpenTerms={() => setShowTermsModal(true)}
        />

        {/* Server Validation / Conflict / Expired / Disabled Station Alert */}
        {(isGlobalBookingDisabled ||
          isAdvanceDisabledForDate ||
          isStationDisabled ||
          isPastSlot ||
          submitError) && (
          <StatusMessage
            type="error"
            message={
              isGlobalBookingDisabled
                ? 'Bookings are temporarily unavailable. Please try again later.'
                : isAdvanceDisabledForDate
                  ? 'Advance bookings for future dates are currently disabled. Please go back and select today.'
                  : isStationDisabled
                    ? `${selectedStation?.name || 'This station'} is currently disabled (Temporarily Unavailable). Please go back and choose another station.`
                    : submitError ||
                      'Selected start time has already passed. Please tap Edit above to choose an upcoming time slot.'
            }
            onClose={
              submitError &&
              !isStationDisabled &&
              !isGlobalBookingDisabled &&
              !isAdvanceDisabledForDate
                ? () => setSubmitError(null)
                : undefined
            }
          />
        )}

        {/* 6. Full-Width Confirm Booking & Pay CTA Button */}
        <div className="mt-1">
          <ConfirmBookingButton
            disabled={
              !agreedToTerms ||
              isPastSlot ||
              isStationDisabled ||
              isGlobalBookingDisabled ||
              isAdvanceDisabledForDate
            }
            loading={isSubmitting}
            onClick={handleConfirmAndPay}
          />
        </div>

      </div>

      {/* Terms & Conditions Modal */}
      <BookingTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      {/* Booking Confirmed Pass Modal with QR code option */}
      <BookingSuccessModal
        isOpen={Boolean(confirmedBooking)}
        booking={confirmedBooking}
        onClose={() => {
          setConfirmedBooking(null);
          navigate('/my-bookings');
        }}
      />

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-[11px] text-slate-500 border-t border-white/[0.06]">
        Oliveal Gaming Zone © 2026. All rights reserved.
      </footer>

    </div>
  );
}
