import React from 'react';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';

/**
 * OLIVEAL GAMING ZONE — CONFIRM BOOKING & PAY BUTTON
 * Matches the reference design:
 * - Neon purple / fuchsia luminous gradient
 * - Padlock icon on the left
 * - "Confirm Booking & Pay" title
 * - ArrowRight icon on the right
 * - Interactive disabled state when terms are unconfirmed
 */
export default function ConfirmBookingButton({
  disabled,
  loading,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full py-3.5 sm:py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 font-bold text-sm sm:text-base tracking-wide relative overflow-hidden group ${
        disabled
          ? 'bg-purple-950/40 border border-purple-500/20 text-slate-500 cursor-not-allowed opacity-50 shadow-none'
          : 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-purple-500 text-white shadow-[0_0_25px_rgba(168,85,247,0.45)] hover:shadow-[0_0_35px_rgba(217,70,239,0.6)] active:scale-[0.99] border border-fuchsia-400/40'
      }`}
    >
      {/* Background Sheen on hover */}
      {!disabled && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 pointer-events-none" />
      )}

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-white" />
      ) : (
        <>
          <div className="w-6 h-6 rounded-lg bg-black/20 flex items-center justify-center flex-shrink-0">
            <Lock className="w-3.5 h-3.5 text-white stroke-[2.5]" />
          </div>

          <span className="flex-1 text-center font-bold">
            Confirm Booking & Pay
          </span>

          <ArrowRight className="w-4 h-4 text-white stroke-[2.5] group-hover:translate-x-1 transition-transform flex-shrink-0" />
        </>
      )}
    </button>
  );
}

