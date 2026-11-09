import React from 'react';
import { Users, Check } from 'lucide-react';

export default function PlayerSelector({ players, onSelectPlayers }) {
  return (
    <div className="w-full">
      {/* Label */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <Users className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-bold text-white tracking-tight">Select Number of Players</span>
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

        {/* 2 Players */}
        <button
          type="button"
          onClick={() => onSelectPlayers(2)}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 select-none ${
            players === 2
              ? 'bg-gradient-to-r from-[#9333ea] via-[#a855f7] to-[#c084fc] text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] border border-purple-300/30'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <span>2 Players</span>
          {players === 2 && <Check className="w-4 h-4 text-white" />}
        </button>

      </div>
    </div>
  );
}

