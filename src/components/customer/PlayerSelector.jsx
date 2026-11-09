import React from 'react';
import { Users, Check, Lock } from 'lucide-react';

/**
 * OLIVEAL GAMING ZONE — PLAYER SELECTOR
 * Segmented control for player count:
 * - PS5: 1 Player or 2 Players
 * - Racing Simulator: Strictly 1 Player (2 Players blocked and locked)
 */
export default function PlayerSelector({
  players,
  onSelectPlayers,
  maxPlayers = 2,
}) {
  const isTwoPlayersBlocked = maxPlayers < 2;

  return (
    <div className="w-full">
      {/* Label with Solo indicator when locked */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-bold text-white tracking-tight">
            Select Number of Players
          </span>
        </div>

        {isTwoPlayersBlocked && (
          <span className="text-[10px] sm:text-[11px] font-semibold text-fuchsia-300 bg-fuchsia-950/60 border border-fuchsia-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-[0_0_8px_rgba(217,70,239,0.25)]">
            <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-fuchsia-400" />
            <span>1 Seat Cockpit</span>
          </span>
        )}
      </div>

      {/* Segmented Pill Selector (1 Player vs 2 Players) */}
      <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-[#100d22]/90 border border-white/[0.08] backdrop-blur-md">
        
        {/* 1 Player */}
        <button
          type="button"
          onClick={() => onSelectPlayers(1)}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 select-none ${
            players === 1
              ? 'bg-gradient-to-r from-[#9333ea] via-[#a855f7] to-[#c084fc] text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] border border-purple-300/30'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>1 Player</span>
          {players === 1 && <Check className="w-4 h-4 text-white" />}
        </button>

        {/* 2 Players (Blocked for Simulators) */}
        <button
          type="button"
          disabled={isTwoPlayersBlocked}
          onClick={() => {
            if (!isTwoPlayersBlocked) {
              onSelectPlayers(2);
            }
          }}
          title={isTwoPlayersBlocked ? 'Racing Simulator cockpits only support 1 player at a time' : ''}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 select-none relative ${
            isTwoPlayersBlocked
              ? 'opacity-35 cursor-not-allowed text-slate-500 bg-white/[0.02]'
              : players === 2
              ? 'bg-gradient-to-r from-[#9333ea] via-[#a855f7] to-[#c084fc] text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] border border-purple-300/30'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>2 Players</span>
          {isTwoPlayersBlocked ? (
            <Lock className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            players === 2 && <Check className="w-4 h-4 text-white" />
          )}
        </button>

      </div>
    </div>
  );
}
