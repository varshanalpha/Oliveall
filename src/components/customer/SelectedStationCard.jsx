import React from 'react';
import { Gamepad2, Award } from 'lucide-react';

/**
 * OLIVEAL GAMING ZONE — SELECTED GAMING STATION CARD SECTION
 * Matches visual reference:
 * - Square photorealistic equipment thumbnail with purple ambient background glow
 * - Station Name (e.g. ALPHA, RS 1)
 * - Category subtitle (e.g. PS5 Console, Racing Simulator)
 * - Category badge with icon (e.g. [🎮 PS5] or [🏎 RACING SIM])
 */
export default function SelectedStationCard({ station, asSection = false }) {
  if (!station) return null;

  const isSimulator =
    station.category === 'Racing Simulator' ||
    station.type === 'simulator' ||
    station.name?.startsWith('RS');

  const content = (
    <div className="flex items-center gap-4 relative">
      {/* Equipment Image Container */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#241752] via-[#170e37] to-[#0c081e] border border-purple-500/35 flex items-center justify-center p-2 flex-shrink-0 overflow-hidden shadow-inner group">
        <div className="absolute inset-0 bg-radial-gradient from-purple-500/25 via-transparent to-transparent pointer-events-none" />
        <img
          src={station.image || (isSimulator ? '/assets/images/racing-simulator.png' : '/assets/images/ps5-station.png')}
          alt={station.name}
          className="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(168,85,247,0.4)]"
        />
      </div>

      {/* Equipment Information */}
      <div className="flex-1 min-w-0">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase truncate">
          {station.name}
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5">
          {station.category || (isSimulator ? 'Racing Simulator' : 'PS5 Console')}
        </p>

        {/* Category Badge */}
        <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/35 border border-purple-500/40 text-purple-300 text-[11px] sm:text-xs font-semibold shadow-[0_0_12px_rgba(168,85,247,0.2)]">
          {isSimulator ? (
            <>
              <Award className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>RACING SIM</span>
            </>
          ) : (
            <>
              <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
              <span>PS5</span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (asSection) {
    return content;
  }

  return (
    <div className="w-full rounded-2xl sm:rounded-3xl bg-[#110e24]/80 border border-purple-500/25 p-3.5 sm:p-4 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      {content}
    </div>
  );
}
