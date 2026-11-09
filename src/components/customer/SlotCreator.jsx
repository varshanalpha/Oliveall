import React from 'react';
import { Clock, Calendar, AlertCircle } from 'lucide-react';
import { DURATION_OPTIONS, generateStartTimeOptions } from '../../utils/bookingTimeUtils';

export default function SlotCreator({
  startTime,
  onSelectStartTime,
  duration,
  onSelectDuration,
  calculatedSlot,
  players,
  overlapError,
}) {
  const startTimeOptions = generateStartTimeOptions();

  return (
    <div className="w-full">
      {/* Header Label */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <Clock className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-bold text-white tracking-tight">Create Your Slot</span>
      </div>

      {/* Inputs Grid (2 Columns: Start Time & Duration) */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        
        {/* 1. Start Time Dropdown */}
        <div>
          <label htmlFor="startTimeSelect" className="block text-xs font-semibold text-slate-300 mb-1.5 px-0.5">
            Start Time
          </label>
          <div className="relative">
            <select
              id="startTimeSelect"
              value={startTime}
              onChange={(e) => onSelectStartTime(e.target.value)}
              className="w-full py-3.5 pl-3.5 pr-8 rounded-2xl bg-[#141026] text-white border border-white/10 hover:border-purple-500/40 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 text-xs sm:text-sm font-bold appearance-none transition-all outline-none cursor-pointer shadow-inner"
            >
              {startTimeOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#120f22] text-white py-1">
                  {opt.label}
                </option>
              ))}
            </select>
            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 pointer-events-none" />
          </div>
        </div>

        {/* 2. Duration Dropdown (Strictly 60, 90, 120 minutes) */}
        <div>
          <label htmlFor="durationSelect" className="block text-xs font-semibold text-slate-300 mb-1.5 px-0.5">
            Duration
          </label>
          <div className="relative">
            <select
              id="durationSelect"
              value={duration}
              onChange={(e) => onSelectDuration(Number(e.target.value))}
              className="w-full py-3.5 pl-3.5 pr-8 rounded-2xl bg-[#141026] text-white border border-white/10 hover:border-purple-500/40 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 text-xs sm:text-sm font-bold appearance-none transition-all outline-none cursor-pointer shadow-inner"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#120f22] text-white py-1">
                  {opt.label}
                </option>
              ))}
            </select>
            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 pointer-events-none" />
          </div>
        </div>

      </div>

      {/* Live Calculated Slot Display Pill */}
      {calculatedSlot && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-2xl backdrop-blur-md transition-all ${
            overlapError
              ? 'bg-rose-950/40 border border-rose-500/50 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
              : 'bg-[#141028]/90 border border-purple-500/30 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Calendar className={`w-4 h-4 ${overlapError ? 'text-rose-400' : 'text-purple-400'} shrink-0`} />
            <span className="text-xs sm:text-sm font-bold tracking-tight">
              Your Slot: {calculatedSlot.startTimeFormatted} – {calculatedSlot.endTimeFormatted}
              {calculatedSlot.isCrossMidnight && <span className="text-[10.5px] text-fuchsia-300 ml-1">(+1 Day)</span>}
              {' '}({players} {players === 1 ? 'Player' : 'Players'})
            </span>
          </div>
        </div>
      )}

      {/* Overlap Error Alert */}
      {overlapError && (
        <div className="mt-2.5 flex items-center gap-2 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-semibold animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>This time slot is unavailable. Please choose another time.</span>
        </div>
      )}
    </div>
  );
}

