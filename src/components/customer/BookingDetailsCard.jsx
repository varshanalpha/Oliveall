import React from 'react';
import { Calendar, Clock, Users, Edit3 } from 'lucide-react';

/**
 * OLIVEAL GAMING ZONE — BOOKING DETAILS CARD SECTION
 * Displays:
 * - Header with "Booking Details" and "Edit" button
 * - Date row with calendar icon
 * - Time row with clock icon + (X Minutes)
 * - Players row with users icon
 * Clicking Edit navigates back to /book-slot with selections preserved.
 */
export default function BookingDetailsCard({
  dateFormatted,
  timeRange,
  durationMinutes,
  players,
  onEdit,
  asSection = false,
}) {
  const content = (
    <div className="flex flex-col gap-3">
      {/* Section Header: Title & Edit Button */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
            Booking Details
          </h3>
        </div>

        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit booking details"
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/60 hover:bg-purple-900/70 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-semibold transition active:scale-95 shadow-[0_0_10px_rgba(168,85,247,0.15)]"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>
      </div>

      {/* Details Rows */}
      <div className="space-y-2.5 text-xs sm:text-sm">

        {/* Date Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <Calendar className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>Date</span>
          </div>
          <span className="text-white font-semibold text-right">
            {dateFormatted || '—'}
          </span>
        </div>

        {/* Time Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <Clock className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>Time</span>
          </div>
          <div className="text-right">
            <span className="text-white font-semibold">
              {timeRange || '—'}
            </span>
            {durationMinutes && (
              <span className="text-slate-400 text-xs font-normal ml-1.5">
                ({durationMinutes} Minutes)
              </span>
            )}
          </div>
        </div>

        {/* Players Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <Users className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>Players</span>
          </div>
          <span className="text-white font-semibold text-right">
            {players === 1 ? '1 Player' : `${players || 2} Players`}
          </span>
        </div>

      </div>
    </div>
  );

  if (asSection) {
    return content;
  }

  return (
    <div className="w-full rounded-2xl sm:rounded-3xl bg-[#110e24]/80 border border-purple-500/25 p-4 sm:p-5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      {content}
    </div>
  );
}
