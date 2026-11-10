import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { fetchSpotBookingByRef } from '../../services/spotBookingService';
import BookingDetailReceipt from '../../components/admin/SpotBooking/BookingDetailReceipt';

/**
 * Decorative celebratory confetti strokes + glowing check circle
 * matching the Spot Booking confirmation reference graphic.
 */
function SuccessCheckHero() {
  return (
    <div className="flex flex-col items-center text-center pt-1 pb-2 animate-scaleUp">
      <div className="relative flex items-center justify-center w-28 h-24">
        {/* Confetti accents radially arranged around checkmark ring */}
        <span aria-hidden="true" className="absolute top-1.5 left-5 w-2.5 h-1 rounded-full bg-rose-400 rotate-[35deg] opacity-90" />
        <span aria-hidden="true" className="absolute top-2.5 right-6 w-2.5 h-1 rounded-full bg-emerald-400 -rotate-[35deg] opacity-90" />
        <span aria-hidden="true" className="absolute top-10 left-1 w-3 h-1 rounded-full bg-amber-400 rotate-[25deg] opacity-95" />
        <span aria-hidden="true" className="absolute top-9 right-1 w-3 h-1 rounded-full bg-fuchsia-400 -rotate-[25deg] opacity-95" />
        <span aria-hidden="true" className="absolute bottom-2 left-4 w-2 h-0.5 rounded-full bg-cyan-400 -rotate-[25deg] opacity-85" />
        <span aria-hidden="true" className="absolute bottom-2.5 right-4 w-2 h-0.5 rounded-full bg-teal-300 rotate-[30deg] opacity-85" />

        {/* Glowing emerald circular ring */}
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-[2.5px] border-[#4ADE80] flex items-center justify-center shadow-[0_0_32px_rgba(34,197,94,0.45),inset_0_0_16px_rgba(34,197,94,0.2)]">
          <Check className="w-8 h-8 text-white stroke-[3]" aria-hidden="true" />
        </div>
      </div>

      <h2 className="text-xl sm:text-[1.45rem] font-extrabold text-white tracking-tight mt-1">
        Spot Booking Created!
      </h2>
      <p className="text-xs sm:text-sm text-[#A9A0BC] mt-1 font-medium">
        The booking has been successfully added.
      </p>
    </div>
  );
}

/**
 * Oliveal Gaming Zone — Admin Spot Booking Confirmation / Booking Details Page.
 * Displays strictly verified booking data returned by Supabase and recovers cleanly
 * via booking_number or UUID query on page refresh.
 * Contains strictly two navigation actions and zero QR code controls.
 */
export default function SpotBookingDetails() {
  const { bookingRef } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const initialBookingFromState = location.state?.booking || null;
  const fromHistory = Boolean(location.state?.fromHistory);

  const [booking, setBooking] = useState(initialBookingFromState);
  const [loading, setLoading] = useState(!initialBookingFromState);
  const [error, setError] = useState(null);

  const loadFromDatabase = useCallback(async () => {
    if (!bookingRef) {
      setError('Booking reference is missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const record = await fetchSpotBookingByRef(bookingRef);
      setBooking(record);
    } catch (err) {
      if (err?.code === 'unauthenticated') {
        navigate('/login', { replace: true });
        return;
      }
      if (err?.code === 'forbidden') {
        navigate('/dashboard', { replace: true });
        return;
      }
      setError(err?.message || 'Unable to load booking details from Supabase.');
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [bookingRef, navigate]);

  useEffect(() => {
    // Verify state matches current URL param; otherwise retrieve live from Supabase
    const matchesState =
      initialBookingFromState &&
      (String(initialBookingFromState.bookingNumber) === decodeURIComponent(String(bookingRef || '')) ||
        String(initialBookingFromState.id) === decodeURIComponent(String(bookingRef || '')));

    if (matchesState) {
      setBooking(initialBookingFromState);
      setLoading(false);
      setError(null);
    } else {
      loadFromDatabase();
    }
  }, [bookingRef, initialBookingFromState, loadFromDatabase]);

  const handleCreateAnother = () => {
    navigate('/admin/spot-booking', {
      state: { resetForm: Date.now() },
    });
  };

  const handleBackToSpotBooking = () => {
    navigate('/admin/spot-booking');
  };

  return (
    <div className="flex-1 flex flex-col w-full">
      {/* Contextual Top Header matching visual reference */}
      <header className="relative z-20 w-full pt-[max(env(safe-area-inset-top),0.875rem)] pb-3 px-4 sm:px-6 bg-[#080510]/90 backdrop-blur-xl border-b border-purple-500/15">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackToSpotBooking}
            aria-label="Back to Spot Booking"
            className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-tight">
              Booking Details
            </h1>
            <p className="text-[11px] sm:text-xs text-[#A9A0BC] font-medium leading-tight">
              {fromHistory ? 'Spot booking history record' : 'Spot booking created successfully'}
            </p>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-28 space-y-4">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <Loader2 className="w-7 h-7 text-purple-400 animate-spin" aria-hidden="true" />
            <p className="text-xs sm:text-sm text-[#A9A0BC]">
              Retrieving booking record from Supabase...
            </p>
          </div>
        ) : error || !booking ? (
          <div
            role="alert"
            className="mt-4 rounded-2xl bg-rose-500/10 border border-rose-500/35 p-5 text-center space-y-3"
          >
            <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" aria-hidden="true" />
            <p className="text-sm font-bold text-white">Booking Record Unavailable</p>
            <p className="text-xs text-rose-200 max-w-sm mx-auto">
              {error || 'No booking details were found for this reference.'}
            </p>
            <div className="pt-1 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={loadFromDatabase}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-xs font-semibold text-white cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Retry</span>
              </button>
              <button
                type="button"
                onClick={handleBackToSpotBooking}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-semibold text-white cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Back to Spot Booking</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {!fromHistory && <SuccessCheckHero />}

            <BookingDetailReceipt booking={booking} />

            {/* Strictly TWO Action Buttons Only (Zero QR buttons) */}
            <div className="pt-1 space-y-3">
              <button
                type="button"
                onClick={handleCreateAnother}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A855F7] hover:brightness-110 active:scale-[0.99] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 border border-purple-300/35 shadow-[0_8px_28px_rgba(124,58,237,0.45),0_0_18px_rgba(217,70,239,0.2)] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
              >
                <CalendarPlus className="w-5 h-5" aria-hidden="true" />
                <span>Create Another Spot Booking</span>
              </button>

              <button
                type="button"
                onClick={handleBackToSpotBooking}
                className="w-full py-3 px-5 rounded-2xl bg-[#120B20]/85 hover:bg-[#1B1030] active:scale-[0.99] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border border-purple-500/35 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Back to Spot Booking</span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

