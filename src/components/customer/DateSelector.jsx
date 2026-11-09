import React from 'react';
import { Calendar, Lock } from 'lucide-react';

export default function DateSelector({ eligibleDates, selectedDate, onSelectDate }) {
  return (
    <div className="w-full">
      {/* Label */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <Calendar className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-bold text-white tracking-tight">Select Date</span>
      </div>

      {/* Date Cards Grid (2 Columns: Today vs Advance) */}
      <div className="grid grid-cols-2 gap-3">
        {eligibleDates.map((item) => {
          const isSelected = selectedDate.isoDate === item.isoDate;
          const isAvailable = item.isAvailable;

          if (!isAvailable) {
            return (
              <div
                key={item.isoDate}
                title={item.tooltip}
                className="relative flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-[#110e20]/60 border border-white/[0.05] opacity-50 cursor-not-allowed select-none text-center"
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm sm:text-base font-bold text-slate-400">
                    {item.dayName}
                  </span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <span className="text-base sm:text-lg font-black text-slate-300">
                  {item.dayNum} {item.dateObj.toLocaleString('default', { month: 'short' })}
                </span>

                <span className="mt-1 text-[10px] font-semibold text-fuchsia-400/80 uppercase tracking-wider">
                  Unlocks at 8:00 PM
                </span>
              </div>
            );
          }

          return (
            <button
              key={item.isoDate}
              type="button"
              onClick={() => onSelectDate(item)}
              className={`relative flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl transition-all duration-300 text-center select-none active:scale-[0.98] ${
                isSelected
                  ? 'bg-gradient-to-br from-[#9333ea] via-[#a855f7] to-[#c084fc] border border-purple-300/40 text-white shadow-[0_0_24px_rgba(168,85,247,0.55)] scale-[1.02]'
                  : 'bg-[#120f22]/85 hover:bg-[#16122a]/90 border border-white/[0.09] hover:border-purple-500/40 text-slate-300 hover:text-white backdrop-blur-xl shadow-glass-card'
              }`}
            >
              <span className={`text-xs sm:text-sm font-bold block ${isSelected ? 'text-purple-100' : 'text-slate-400'}`}>
                {item.dayName}
              </span>

              <span className="text-base sm:text-lg font-black tracking-tight leading-snug">
                {item.dayNum} {item.dateObj.toLocaleString('default', { month: 'short' })}
              </span>

              <span
                className={`mt-1 text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isSelected
                    ? 'bg-black/25 text-white'
                    : 'bg-white/[0.06] text-purple-300'
                }`}
              >
                ({item.tag})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

