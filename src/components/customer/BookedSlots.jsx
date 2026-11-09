import React, { useState } from 'react';
import { Calendar, Users } from 'lucide-react';

export default function BookedSlots({
  bookedSlots = [],
  stationName = 'ALPHA',
  dateLabel = 'Today',
}) {
  const [showAll, setShowAll] = useState(false);

  const hasMultiple = bookedSlots.length > 2;
  const displayedSlots = showAll ? bookedSlots : bookedSlots.slice(0, 2);

  return (
    <div className="w-full">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-purple-400" />
          <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-[240px] sm:max-w-none">
            Booked Slots — {dateLabel} ({stationName})
          </span>
        </div>

        {hasMultiple && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors ml-2 shrink-0"
          >
            {showAll ? 'Show Less' : 'View All →'}
          </button>
        )}
      </div>

      {/* Booked Slots List */}
      {bookedSlots.length === 0 ? (
        <div className="p-3.5 rounded-2xl bg-[#120f22]/60 border border-white/[0.06] text-center text-xs text-slate-400">
          No bookings yet for this date. All hours are currently available!
        </div>
      ) : (
        <div className="space-y-2">
          {displayedSlots.map((slot, index) => (
            <div
              key={slot.id || index}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-rose-950/30 border border-rose-500/35 backdrop-blur-md text-rose-200 animate-fadeIn"
            >
              {/* Left: Time Range with Calendar Icon */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold tracking-tight text-white">
                  {slot.startTime} – {slot.endTime}
                </span>
              </div>

              {/* Right: Player count with red dot */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span>{slot.players} {slot.players === 1 ? 'Player' : 'Players'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

