import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Calendar, Clock, Gamepad2, Loader2, Ticket, User } from 'lucide-react';

/**
 * Confirmation modal required before releasing any booked slot in Supabase.
 * Rendered via createPortal to sit cleanly above persistent AdminShell chrome.
 */
export default function ReleaseConfirmationModal({
  isOpen = false,
  booking = null,
  releasing = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !releasing) {
        onCancel?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, releasing, onCancel]);

  if (!isOpen || !booking) return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="release-booking-dialog-title"
      aria-describedby="release-booking-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080510]/85 backdrop-blur-md animate-fadeIn"
    >
      <div className="w-full max-w-md rounded-3xl bg-[#130B24] border border-purple-500/40 p-5 sm:p-6 shadow-[0_18px_48px_rgba(0,0,0,0.75),0_0_32px_rgba(124,58,237,0.28)] space-y-4 animate-scaleUp">
        {/* Top Icon + Title */}
        <div className="flex flex-col items-center text-center gap-2.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <AlertTriangle className="w-6 h-6 text-amber-300" aria-hidden="true" />
          </div>
          <h2
            id="release-booking-dialog-title"
            className="text-lg sm:text-xl font-extrabold text-white tracking-tight"
          >
            Release This Booking?
          </h2>
          <p
            id="release-booking-dialog-desc"
            className="text-xs sm:text-sm text-[#C4B5FD] leading-relaxed"
          >
            Are you sure you want to release this booked slot? The existing reservation will be
            cancelled and this time interval will become available for new customer bookings.
          </p>
        </div>

        {/* Selected Booking Snapshot */}
        <div className="rounded-2xl bg-[#0B0616]/90 border border-white/10 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.08]">
            <span className="inline-flex items-center gap-1.5 font-bold text-white">
              <Ticket className="w-3.5 h-3.5 text-[#C084FC]" aria-hidden="true" />
              {booking.bookingNumber}
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-[#D8B4FE]">
              <Gamepad2 className="w-3.5 h-3.5" aria-hidden="true" />
              {booking.stationName}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-[#E2DCF0]">
            <span className="inline-flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-[#A9A0BC] shrink-0" aria-hidden="true" />
              <span className="truncate font-semibold">{booking.customerName}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[#A9A0BC] shrink-0">
              <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {booking.dateLabel}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-[#E2DCF0]">
            <span className="inline-flex items-center gap-1.5 font-semibold text-white">
              <Clock className="w-3.5 h-3.5 text-[#C084FC] shrink-0" aria-hidden="true" />
              {booking.timeRange}
            </span>
            <span className="text-[#A9A0BC]">
              {booking.durationMinutes} min · {booking.playerCount}{' '}
              {booking.playerCount === 1 ? 'Player' : 'Players'}
            </span>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-3 py-2 text-xs text-rose-200 leading-snug"
          >
            {error}
          </div>
        )}

        {/* Dialog Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={onConfirm}
            disabled={releasing}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#9333EA] hover:brightness-110 active:scale-[0.99] text-sm font-bold text-white flex items-center justify-center gap-2 border border-purple-300/35 shadow-[0_8px_24px_rgba(124,58,237,0.45)] transition cursor-pointer disabled:opacity-60"
          >
            {releasing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Releasing Slot...</span>
              </>
            ) : (
              <span>Confirm Release</span>
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={releasing}
            className="w-full py-2.5 px-4 rounded-2xl bg-[#1A1030]/90 hover:bg-[#23163F] border border-purple-500/35 text-xs sm:text-sm font-semibold text-white transition cursor-pointer disabled:opacity-50"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}

