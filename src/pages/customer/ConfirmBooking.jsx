import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardCheck,
  Gamepad2,
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
import { STATIONS, getStationById } from '../../services/mock/stationMockData';
import { createCustomerBooking } from '../../services/mock/bookingStore';
import {
  calculateStationCharge,
  calculatePlatformFee,
  calculateTotalAmount,
} from '../../utils/pricingUtils';

/**
 * OLIVEAL GAMING ZONE — CONFIRM BOOKING PAGE
 * Dedicated step-3 booking confirmation screen matching the approved visual reference.
 * 
 * Sections:
 * 1. Top Header with Back button and centered Oliveal branding
 * 2. 3-Step Booking Progress Indicator
 * 3. Page Heading ("Confirm Booking" with checklist icon)
 * 4. Master Card Container:
 *    - Selected Gaming Station Section
 *    - Divider
 *    - Booking Details Section (with Edit button)
 *    - Divider
 *    - Payment Summary Section (dynamic station charge, platform fee, total amount)
 * 5. Booking Terms & Conditions checkbox
 * 6. Full-width Confirm Booking & Pay CTA button
 */
export default function ConfirmBooking() {
  const location = useLocation();
  const navigate = useNavigate();

  // State passed from BookSlot.jsx
  const incoming = location.state || {};

  // Resolve Station (from state or default fallback)
  const selectedStation = useMemo(() => {
    if (incoming.station) return incoming.station;
    if (incoming.stationId) return getStationById(incoming.stationId);
    return STATIONS[0]; // ALPHA by default
  }, [incoming.station, incoming.stationId]);

  // Resolve Date
  const bookingDate = useMemo(() => {
    if (incoming.date?.fullLabel) return incoming.date.fullLabel;
    if (incoming.dateFormatted?.fullLabel) return incoming.dateFormatted.fullLabel;
    if (typeof incoming.date === 'string') return incoming.date;
    return 'Tue, 10 Nov 2026';
  }, [incoming.date, incoming.dateFormatted]);

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
    const category = selectedStation.category || selectedStation.type;
    return calculateStationCharge(category, players, durationMinutes);
  }, [selectedStation, players, durationMinutes]);

  const platformFee = calculatePlatformFee();
  const totalAmount = useMemo(() => {
    return calculateTotalAmount(stationCharge, platformFee);
  }, [stationCharge, platformFee]);

  // User Interactive Controls
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Navigate back to BookSlot preserving selections
  const handleEdit = () => {
    navigate('/book-slot', {
      state: {
        stationId: selectedStation.id,
        date: incoming.date,
        startTime: incoming.startTime || startTime,
        duration: durationMinutes,
        players: players,
      },
    });
  };

  // Submit and confirm booking
  const handleConfirmAndPay = () => {
    if (!agreedToTerms) return;

    setIsSubmitting(true);

    setTimeout(() => {
      const startParts = timeRange.split(' – ');
      const startFormatted = startParts[0] || '06:30 PM';
      const endFormatted = startParts[1] || '08:00 PM';

      const newBooking = createCustomerBooking({
        station: selectedStation,
        dateFormatted: incoming.date || {
          fullLabel: bookingDate,
          isoDate: '2026-11-10',
        },
        startTimeFormatted: startFormatted,
        endTimeFormatted: endFormatted,
        startMinutes: incoming.calculatedSlot?.startMinutes || 1110,
        endMinutes: incoming.calculatedSlot?.endMinutes || 1200,
        durationMinutes,
        durationLabel: `${durationMinutes} Minutes`,
        players,
      });

      setIsSubmitting(false);
      setConfirmedBooking(newBooking);
    }, 700);
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

        {/* 6. Full-Width Confirm Booking & Pay CTA Button */}
        <div className="mt-1">
          <ConfirmBookingButton
            disabled={!agreedToTerms}
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
