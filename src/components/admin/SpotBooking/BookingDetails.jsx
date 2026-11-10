import { useRef } from 'react';
import {
  Calendar,
  Clock,
  Hourglass,
  Users,
  Minus,
  Plus,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import {
  DURATION_OPTIONS,
  generateStartTimeOptions,
  getKolkataTodayIso,
  formatSpotDateLabel,
  isSpotSlotInPast,
} from '../../../utils/bookingTimeUtils';

const START_TIME_OPTIONS = generateStartTimeOptions();

/**
 * Booking Details card for Admin Spot Booking.
 * Supports IST today + unlimited future dates, 24/7 15-min start times in 12h AM/PM format,
 * read-only automatic end time calculation, strict 60/90/120 min durations,
 * station-capacity-aware player stepper, and live booked slot visibility.
 */
export default function BookingDetails({
  selectedDateIso,
  onChangeDate,
  startTime,
  onChangeStartTime,
  calculatedSlot,
  duration,
  onChangeDuration,
  players,
  maxPlayers = 2,
  onDecrementPlayers,
  onIncrementPlayers,
  bookedSlots = [],
  slotsLoading = false,
  selectedStationName = '',
  errors = {},
  disabled = false,
}) {
  const dateInputRef = useRef(null);
  const todayIso = getKolkataTodayIso();
  const formattedDateText = formatSpotDateLabel(selectedDateIso);

  const conflictOrTimeError =
    errors.date ||
    errors.startTime ||
    errors.duration ||
    errors.endTime ||
    errors.players ||
    errors.slotTime ||
    errors.overlap ||
    null;

  const openDatePicker = () => {
    if (disabled || !dateInputRef.current) return;
    try {
      dateInputRef.current.showPicker?.();
    } catch {
      dateInputRef.current.focus();
    }
  };

  return (
    <section
      aria-labelledby="spot-booking-details-heading"
      className="rounded-2xl bg-[#120B20]/95 border border-purple-500/30 p-4 shadow-[0_8px_28px_rgba(0,0,0,0.45),0_0_22px_rgba(124,58,237,0.1)] backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="w-4 h-4 text-[#C4B5FD] shrink-0" aria-hidden="true" />
          <h2
            id="spot-booking-details-heading"
            className="text-sm sm:text-base font-bold text-white tracking-tight"
          >
            Booking Details
          </h2>
        </div>

        {selectedStationName && (
          <span className="text-[11px] font-medium text-[#A9A0BC] truncate">
            {selectedStationName} • Max {maxPlayers}P
          </span>
        )}
      </div>

      <div className="pt-3.5 space-y-3.5">
        {/* 1. Date Picker (Default Today IST, supports future dates, blocks past dates) */}
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="spot-booking-date"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#D6CFE6] shrink-0"
          >
            <Calendar className="w-4 h-4 text-[#A9A0BC]" aria-hidden="true" />
            <span>Date</span>
          </label>

          <div
            onClick={openDatePicker}
            className="relative flex-1 max-w-[235px] sm:max-w-[260px] rounded-xl bg-[#19102C]/90 border border-purple-500/25 hover:border-purple-400/50 focus-within:border-[#C084FC] focus-within:ring-2 focus-within:ring-purple-500/25 px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors"
          >
            <span className="text-xs sm:text-sm font-semibold text-white truncate">
              {formattedDateText}
            </span>
            <ChevronDown className="w-4 h-4 text-[#A9A0BC] shrink-0 pointer-events-none" aria-hidden="true" />
            <input
              ref={dateInputRef}
              id="spot-booking-date"
              type="date"
              min={todayIso}
              value={selectedDateIso}
              disabled={disabled}
              onChange={(e) => {
                if (e.target.value) onChangeDate(e.target.value);
              }}
              aria-label="Booking Date"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* 2. Start Time & Automatic Read-Only End Time */}
        <div className="grid grid-cols-2 gap-3">
          {/* Start Time */}
          <div>
            <label
              htmlFor="spot-start-time"
              className="block text-[11px] font-medium text-[#A9A0BC] mb-1.5 pl-6"
            >
              Start Time
            </label>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#A9A0BC] shrink-0" aria-hidden="true" />
              <div className="relative flex-1 min-w-0">
                <select
                  id="spot-start-time"
                  value={startTime}
                  disabled={disabled}
                  onChange={(e) => onChangeStartTime(e.target.value)}
                  className="w-full rounded-xl bg-[#19102C]/90 border border-purple-500/25 hover:border-purple-400/50 focus:border-[#C084FC] focus:ring-2 focus:ring-purple-500/25 py-2.5 pl-3 pr-7 text-xs sm:text-sm font-semibold text-white appearance-none outline-none cursor-pointer transition-colors"
                >
                  {START_TIME_OPTIONS.map((opt) => {
                    const expired = isSpotSlotInPast(selectedDateIso, opt.value, duration);
                    return (
                      <option
                        key={opt.value}
                        value={opt.value}
                        className={`bg-[#120B20] ${expired ? 'text-slate-500' : 'text-white'}`}
                      >
                        {expired ? `${opt.label} (Passed)` : opt.label}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown
                  className="w-3.5 h-3.5 text-[#A9A0BC] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          {/* End Time (Read-Only Automatic Calculation) */}
          <div>
            <span className="block text-[11px] font-medium text-[#A9A0BC] mb-1.5 pl-6">
              End Time
            </span>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#A9A0BC] shrink-0" aria-hidden="true" />
              <div
                role="textbox"
                aria-readonly="true"
                aria-label="Calculated End Time"
                title="Automatically calculated from Start Time + Duration"
                className="flex-1 min-w-0 rounded-xl bg-[#140D24]/90 border border-white/[0.1] py-2.5 px-3 flex items-center justify-between gap-1 text-xs sm:text-sm font-semibold text-[#E2DCF0] select-none"
              >
                <span className="truncate">
                  {calculatedSlot?.endTimeFormatted || '—'}
                  {calculatedSlot?.isCrossMidnight && (
                    <span className="text-[10px] text-fuchsia-300 ml-1">(+1d)</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Duration & Players Stepper */}
        <div className="grid grid-cols-2 gap-3 pt-0.5">
          {/* Duration */}
          <div>
            <label
              htmlFor="spot-duration"
              className="flex items-center gap-1.5 text-[11px] font-medium text-[#A9A0BC] mb-1.5"
            >
              <Hourglass className="w-3.5 h-3.5 text-[#A9A0BC] shrink-0" aria-hidden="true" />
              <span>Duration</span>
            </label>
            <div className="relative">
              <select
                id="spot-duration"
                value={duration}
                disabled={disabled}
                onChange={(e) => onChangeDuration(Number(e.target.value))}
                className="w-full rounded-xl bg-[#19102C]/90 border border-purple-500/25 hover:border-purple-400/50 focus:border-[#C084FC] focus:ring-2 focus:ring-purple-500/25 py-2.5 pl-3 pr-7 text-xs sm:text-sm font-semibold text-white appearance-none outline-none cursor-pointer transition-colors"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#120B20] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="w-3.5 h-3.5 text-[#A9A0BC] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Players Stepper */}
          <div>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#A9A0BC] mb-1.5">
              <Users className="w-3.5 h-3.5 text-[#A9A0BC] shrink-0" aria-hidden="true" />
              <span>Players</span>
            </span>

            <div className="h-[40px] sm:h-[42px] rounded-xl bg-[#19102C]/90 border border-purple-500/25 px-1.5 flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={onDecrementPlayers}
                disabled={disabled || players <= 1}
                aria-label="Decrease players"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.06] hover:bg-purple-500/25 border border-white/[0.08] flex items-center justify-center text-white transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                <Minus className="w-3.5 h-3.5" aria-hidden="true" />
              </button>

              <span
                aria-live="polite"
                className="text-xs sm:text-sm font-extrabold text-white tabular-nums px-1"
              >
                {players}
              </span>

              <button
                type="button"
                onClick={onIncrementPlayers}
                disabled={disabled || players >= maxPlayers}
                aria-label="Increase players"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.06] hover:bg-purple-500/25 border border-white/[0.08] flex items-center justify-center text-white transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Live Availability Context for Selected Station & Date */}
        {(slotsLoading || bookedSlots.length > 0) && (
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] px-3 py-2 text-[11px] text-[#A9A0BC]">
            {slotsLoading ? (
              <span>Checking booked intervals on {selectedStationName || 'station'}...</span>
            ) : (
              <div className="space-y-1">
                <p className="font-semibold text-[#D6CFE6]">
                  Booked intervals ({selectedStationName}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {bookedSlots.map((slot, idx) => (
                    <span
                      key={slot.id || idx}
                      className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 border border-rose-400/25 px-2 py-0.5 text-[10.5px] font-medium text-rose-200"
                    >
                      {slot.startTime} – {slot.endTime} ({slot.players}P)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Inline Validation / Overlap Conflict Error */}
        {conflictOrTimeError && (
          <div
            role="alert"
            className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-3 py-2.5 flex items-start gap-2 text-xs font-medium text-rose-200"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{conflictOrTimeError}</span>
          </div>
        )}
      </div>
    </section>
  );
}

