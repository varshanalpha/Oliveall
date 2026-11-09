import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Calendar, Clock, Users, Gamepad2, ArrowRight } from 'lucide-react';
import PrimaryButton from '../auth/PrimaryButton';

export default function BookingSuccessModal({ isOpen, booking, onClose }) {
  const navigate = useNavigate();

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark Blur Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-sm rounded-3xl bg-[#130f26] border border-purple-500/40 p-6 sm:p-7 backdrop-blur-2xl shadow-[0_0_50px_rgba(168,85,247,0.35)] text-center z-10 animate-scaleUp">
        
        {/* Animated Checkmark Emblem */}
        <div className="relative mb-4 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.5)]">
            <CheckCircle2 className="w-9 h-9 text-emerald-400 animate-bounce" />
          </div>
        </div>

        {/* Headings */}
        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Booking Confirmed!
        </h3>
        <p className="text-xs text-slate-300 mt-1">
          Your slot at Oliveal Gaming Zone is locked and confirmed.
        </p>

        {/* Booking Details Ticket Card */}
        <div className="my-5 p-4 rounded-2xl bg-[#191333] border border-white/[0.08] text-left space-y-2 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-white text-sm">{booking.stationName}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
              CONFIRMED
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-300 pt-1">
            <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="font-medium">{booking.dateLabel}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="font-medium">{booking.timeRange} ({booking.durationLabel})</span>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="font-medium">{booking.players} {booking.players === 1 ? 'Player' : 'Players'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <PrimaryButton
            type="button"
            onClick={() => {
              onClose();
              navigate('/my-bookings');
            }}
          >
            <span>View in My Bookings</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </PrimaryButton>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white font-semibold text-xs transition"
          >
            Book Another Slot
          </button>
        </div>

      </div>
    </div>
  );
}

