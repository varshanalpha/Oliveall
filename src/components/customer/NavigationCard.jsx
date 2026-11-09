import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Calendar, ArrowRight } from 'lucide-react';

export default function NavigationCard() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 gap-3.5 w-full">
      
      {/* ── CARD 1: BOOK YOUR SLOT (HIGHLIGHTED NEON PURPLE) ── */}
      <button
        type="button"
        onClick={() => navigate('/book-slot')}
        className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#1a1236]/90 via-[#1e133d]/90 to-[#29144d]/85 border border-purple-500/50 hover:border-purple-400/80 backdrop-blur-xl shadow-[0_0_25px_rgba(168,85,247,0.25)] hover:shadow-[0_0_35px_rgba(168,85,247,0.45)] transition-all duration-300 text-left active:scale-[0.98] overflow-hidden"
      >
        {/* Ambient Corner Glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/30 transition-all" />

        <div className="relative z-10">
          {/* Gamepad Icon in glowing square */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-fuchsia-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(168,85,247,0.6)] mb-3 group-hover:scale-110 transition-transform">
            <Gamepad2 className="w-5 h-5" />
          </div>

          <h3 className="text-base sm:text-lg font-black text-white leading-tight tracking-tight">
            Book Your<br />Slot
          </h3>
        </div>

        {/* Circular Arrow Button at bottom right */}
        <div className="relative z-10 mt-4 flex justify-end">
          <div className="w-8 h-8 rounded-full bg-purple-500/30 border border-purple-400/40 flex items-center justify-center text-purple-200 group-hover:bg-purple-500 group-hover:text-white transition-all shadow-md">
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </button>

      {/* ── CARD 2: MY BOOKINGS (DARK GLASSMORPHIC) ── */}
      <button
        type="button"
        onClick={() => navigate('/my-bookings')}
        className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-3xl bg-[#120f22]/85 hover:bg-[#16132b]/90 border border-white/[0.09] hover:border-purple-500/40 backdrop-blur-xl shadow-glass-card hover:shadow-[0_0_25px_rgba(168,85,247,0.2)] transition-all duration-300 text-left active:scale-[0.98] overflow-hidden"
      >
        {/* Subtle Ambient Hover Glow */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-fuchsia-600/10 rounded-full blur-xl pointer-events-none group-hover:bg-fuchsia-600/20 transition-all" />

        <div className="relative z-10">
          {/* Calendar Icon in dark glass container */}
          <div className="w-10 h-10 rounded-2xl bg-[#1d1736] border border-white/10 flex items-center justify-center text-purple-400 shadow-inner mb-3 group-hover:scale-110 group-hover:text-purple-300 transition-all">
            <Calendar className="w-5 h-5" />
          </div>

          <h3 className="text-base sm:text-lg font-black text-white leading-tight tracking-tight">
            My<br />Bookings
          </h3>
        </div>

        {/* Circular Arrow Button at bottom right */}
        <div className="relative z-10 mt-4 flex justify-end">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-300 group-hover:bg-white/[0.14] group-hover:text-white transition-all shadow-md">
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </button>

    </div>
  );
}

