import React from 'react';

export default function HeroSection() {
  return (
    <div className="relative w-full rounded-3xl bg-gradient-to-r from-[#170e2b]/90 via-[#130f25]/85 to-[#1c0f33]/90 border border-white/[0.08] backdrop-blur-xl p-5 sm:p-6 overflow-hidden shadow-glass-card">
      
      {/* Background Neon Glow Behind Controller */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 bg-fuchsia-600/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute left-1/3 top-0 w-36 h-36 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        
        {/* Left Copy */}
        <div className="max-w-[62%] sm:max-w-xs">
          <h1 className="text-2xl sm:text-[1.85rem] font-black tracking-tight text-white leading-tight">
            Ready to <span className="bg-gradient-to-r from-[#c084fc] via-[#e879f9] to-[#f43f5e] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(232,121,249,0.5)]">Play?</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed font-medium">
            Book your gaming slot and experience next-level gaming.
          </p>
        </div>

        {/* Right Illuminated PS5 Gamepad Visual */}
        <div className="relative w-32 h-26 sm:w-40 sm:h-30 flex items-center justify-center shrink-0">
          {/* Subtle Ambient Backlight Halo */}
          <div className="absolute inset-0 bg-purple-500/30 blur-2xl rounded-full scale-110 pointer-events-none" />

          {/* Contact shadow beneath controller */}
          <div className="absolute -bottom-1 w-24 h-5 bg-black/60 blur-md rounded-full pointer-events-none" />

          <img
            src="/assets/images/hero-controller.png"
            alt="PlayStation 5 Wireless Controller"
            className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_8px_24px_rgba(0,0,0,0.85)] transform hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

      </div>
    </div>
  );
}

