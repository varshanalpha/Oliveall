import React from 'react';
import { Calendar, Clock, Users, CheckCircle2, QrCode } from 'lucide-react';

export default function BookingCard({ booking, onShowQr }) {
  const isConfirmed = booking.status === 'Confirmed';

  return (
    <div className="relative w-full p-4 sm:p-5 rounded-3xl bg-[#120f22]/85 hover:bg-[#15112a]/90 border border-white/[0.09] hover:border-purple-500/35 backdrop-blur-xl shadow-glass-card transition-all duration-300 overflow-hidden">
      
      {/* Top Row: Station Thumbnail, Name, Category, Confirmed Badge */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          {/* Station Image */}
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-b from-[#140e2b]/90 via-[#0e0a1e]/90 to-[#090715] border border-purple-500/20 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.25)_0%,_transparent_75%)] pointer-events-none" />
            <img
              src={booking.image}
              alt={booking.stationName}
              className="relative z-10 w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
            />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
              {booking.stationName}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5">
              {booking.category}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isConfirmed ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Confirmed</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-slate-300 text-xs font-bold">
              <span>{booking.status}</span>
            </div>
          )}
        </div>
      </div>

      {/* Booking Details Rows */}
      <div className="pt-3.5 space-y-2 text-xs sm:text-sm text-slate-300">
        
        {/* Date Row */}
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="font-medium text-slate-200">{booking.dateLabel}</span>
        </div>

        {/* Time & Duration Row */}
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="font-medium text-slate-200">
            {booking.timeRange} ({booking.durationLabel})
          </span>
        </div>

        {/* Players Row */}
        <div className="flex items-center gap-2.5">
          <Users className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="font-medium text-slate-200">
            {booking.players} {booking.players === 1 ? 'Player' : 'Players'}
          </span>
        </div>

      </div>

      {/* Show Booking QR Code Action */}
      <div className="mt-3.5 pt-3 border-t border-white/[0.07]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onShowQr?.(booking);
          }}
          className="w-full py-2.5 px-4 rounded-2xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 hover:border-purple-400/60 text-purple-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] shadow-sm group"
        >
          <QrCode className="w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
          <span>Show Booking QR</span>
        </button>
      </div>

    </div>
  );
}

