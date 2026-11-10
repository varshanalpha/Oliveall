import { CalendarX2, Clock, Gamepad2, User, AlertCircle, RefreshCw } from 'lucide-react';
import { STATUS_BADGE_STYLES } from '../RecentBookings';

/**
 * Displays real released/cancelled booking records preserved in Supabase history
 * when viewing the "Closed Slots" tab inside Admin Stations Management.
 */
export default function ReleasedSlotsTab({
  bookings = [],
  loading = false,
  error = null,
  onRetry,
}) {
  if (loading) {
    return (
      <div className="space-y-2.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 rounded-2xl bg-[#120B20]/90 border border-purple-500/20 p-3.5 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl bg-rose-500/15 border border-rose-500/35 p-4 text-center space-y-2.5"
      >
        <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" aria-hidden="true" />
        <p className="text-xs sm:text-sm text-rose-200">{error}</p>
        {typeof onRetry === 'function' && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 text-xs font-semibold text-white cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="rounded-2xl bg-[#120B20]/95 border border-purple-500/25 p-7 text-center space-y-2">
        <CalendarX2 className="w-7 h-7 text-[#A9A0BC] mx-auto" aria-hidden="true" />
        <p className="text-sm font-bold text-white">No released bookings yet</p>
        <p className="text-xs text-[#A9A0BC] max-w-xs mx-auto leading-relaxed">
          Bookings released from Close Slots are preserved here for audit tracking while their time intervals become bookable again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {bookings.map((b) => (
        <article
          key={b.id}
          className="rounded-2xl bg-[#120B20]/95 border border-purple-500/25 p-3.5 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-extrabold text-white tracking-tight truncate">
                {b.bookingNumber}
              </p>
              <p className="text-[11px] text-[#A9A0BC] flex items-center gap-1 mt-0.5 truncate">
                <User className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{b.customerName}</span>
              </p>
            </div>
            <span
              className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold leading-none ${STATUS_BADGE_STYLES.danger}`}
            >
              Cancelled
            </span>
          </div>

          <div className="pt-2 border-t border-white/[0.08] flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#D6CFE6]">
            <span className="inline-flex items-center gap-1 font-bold text-white">
              <Gamepad2 className="w-3.5 h-3.5 text-[#C084FC]" aria-hidden="true" />
              {b.stationName}
            </span>
            <span>{b.dateLabel}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#A9A0BC]" aria-hidden="true" />
              {b.timeRange} ({b.durationMinutes}m)
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

