import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function StationCard({ station }) {
  const navigate = useNavigate();

  const isAvailable = station.isAvailable;

  const handleClick = () => {
    navigate(`/book-slot?station=${station.id}`);
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-3xl bg-[#120f22]/85 hover:bg-[#16122d]/90 border border-white/[0.09] hover:border-purple-500/40 backdrop-blur-xl shadow-glass-card hover:shadow-[0_0_24px_rgba(168,85,247,0.22)] transition-all duration-300 cursor-pointer active:scale-[0.98] overflow-hidden"
    >
      {/* Top Graphic Area */}
      <div className="relative w-full h-28 sm:h-32 rounded-2xl bg-gradient-to-b from-[#181233] to-[#0d0a1a] border border-white/[0.06] overflow-hidden flex items-center justify-center mb-3">
        {/* Subtle Ambient Glow behind Station */}
        <div className="absolute inset-0 bg-purple-600/15 blur-xl pointer-events-none" />

        <img
          src={station.image}
          alt={station.name}
          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
        />

        {/* Category Pill Tag top right */}
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-400/30 text-[10px] font-bold text-purple-200 uppercase tracking-wider backdrop-blur-md">
          {station.tag}
        </span>
      </div>

      {/* Station Name & Category */}
      <div className="mb-2.5">
        <h4 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight group-hover:text-purple-200 transition-colors">
          {station.name}
        </h4>
        <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 font-medium">
          {station.category}
        </p>
      </div>

      {/* Bottom Status Pill */}
      <div>
        {isAvailable ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Available</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10.5px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span className="truncate max-w-[120px]">{station.badgeText}</span>
          </div>
        )}
      </div>

    </div>
  );
}

