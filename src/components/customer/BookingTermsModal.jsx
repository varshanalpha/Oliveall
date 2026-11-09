import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

/**
 * OLIVEAL GAMING ZONE — TERMS & CONDITIONS MODAL
 * Displays clear guidelines for slot check-in, equipment care, and cancellations.
 */
export default function BookingTermsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-3xl bg-[#120e29] border border-purple-500/35 p-6 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-10 flex flex-col gap-4 text-xs text-slate-300">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-900/50 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Booking Terms & Conditions
              </h3>
              <p className="text-[11px] text-slate-400">Oliveal Gaming Zone Policies</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/15">
            <h4 className="font-bold text-white text-xs mb-1">1. Check-In & Arrival</h4>
            <p className="text-slate-300">
              Please arrive at least 10 minutes prior to your scheduled slot. Show your dynamic check-in QR code at the reception desk for instant station access.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/15">
            <h4 className="font-bold text-white text-xs mb-1">2. Station Capacity</h4>
            <p className="text-slate-300">
              PS5 battle stations accommodate up to 2 active players. Racing Simulators are single-seater cockpits designed strictly for 1 player at a time.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/15">
            <h4 className="font-bold text-white text-xs mb-1">3. Equipment Responsibility</h4>
            <p className="text-slate-300">
              Players are expected to handle DualSense controllers, virtual reality gear, and racing cockpits with care. Any deliberate physical damage may incur repair charges.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/15">
            <h4 className="font-bold text-white text-xs mb-1">4. Extension & Cross-Midnight Play</h4>
            <p className="text-slate-300">
              Slot extensions are subject to availability. You can book subsequent slots 24/7 if unreserved.
            </p>
          </div>
        </div>

        {/* Action */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-lg transition active:scale-95"
        >
          I Understand & Agree
        </button>

      </div>
    </div>
  );
}

