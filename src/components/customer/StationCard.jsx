import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function StationCard({ station }) {
  const navigate = useNavigate();
  const isDisabled = station?.isActive === false;

  const handleClick = () => {
    if (isDisabled) return;
    navigate(`/book-slot?station=${station.slug || station.id}`);
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled ? 'true' : undefined}
      onKeyDown={(e) => {
        if (isDisabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      className={`group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-3xl backdrop-blur-xl shadow-glass-card transition-all duration-300 overflow-hidden border ${
        isDisabled
          ? 'bg-[#120f22]/55 border-rose-500/25 opacity-75 cursor-not-allowed'
          : 'bg-[#120f22]/85 hover:bg-[#16122d]/90 border-white/[0.09] hover:border-purple-500/40 hover:shadow-[0_0_24px_rgba(168,85,247,0.22)] cursor-pointer active:scale-[0.98]'
      }`}
    >
      {/* 1. Top Card Bar: Disabled Pill or Category Pill Tag */}
      <div className="flex items-center justify-between gap-1.5 w-full mb-1">
        {isDisabled ? (
          <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-400/35 text-[9.5px] sm:text-[10px] font-bold text-rose-300 uppercase tracking-wider">
            Disabled
          </span>
        ) : (
          <span />
        )}
        <span className="px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-400/35 text-[9.5px] sm:text-[10px] font-bold text-purple-200 uppercase tracking-wider backdrop-blur-md shadow-sm">
          {station.tag}
        </span>
      </div>

      {/* 2. Graphic Stage: Photorealistic Equipment */}
      <div className="relative w-full h-28 sm:h-32 rounded-2xl overflow-hidden flex items-center justify-center mb-1.5">
        {/* Soft Ambient Purple Environmental Backlight */}
        {!isDisabled && (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,_rgba(168,85,247,0.22)_0%,_transparent_70%)] pointer-events-none" />
        )}

        {/* Grounding Contact Shadow at the Base */}
        <div className="absolute bottom-0 inset-x-4 h-4 bg-black/60 blur-md rounded-full pointer-events-none" />

        {/* Photorealistic Product Image */}
        <img
          src={station.image}
          alt={station.name}
          className={`relative z-10 w-full h-full object-contain p-0.5 transition-transform duration-300 drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] ${
            isDisabled ? 'grayscale-[55%] opacity-55' : 'group-hover:scale-105'
          }`}
        />
      </div>

      {/* 3. Station Name & Category / Temporarily Unavailable */}
      <div className="pt-1">
        <h4
          className={`text-base sm:text-lg font-black tracking-tight leading-tight transition-colors ${
            isDisabled ? 'text-slate-300' : 'text-white group-hover:text-purple-200'
          }`}
        >
          {station.name}
        </h4>
        <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 font-medium">
          {station.category}
        </p>
        {isDisabled && (
          <p className="text-[10.5px] sm:text-[11px] text-rose-300 font-semibold mt-1 leading-tight">
            Temporarily Unavailable
          </p>
        )}
      </div>

    </div>
  );
}
