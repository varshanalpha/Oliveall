import { Calendar, ArrowRight, AlertCircle } from 'lucide-react';

const STATUS_BADGE_STYLES = {
  purple: 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white border border-purple-400/35 shadow-[0_0_14px_rgba(124,58,237,0.45)]',
  amber: 'bg-gradient-to-r from-[#B45309]/90 to-[#92400E]/95 text-[#FDE68A] border border-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
  emerald: 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30',
  danger: 'bg-rose-500/15 text-rose-300 border border-rose-400/30',
  muted: 'bg-white/10 text-[#A9A0BC] border border-white/15',
};

function RecentBookingsSkeleton() {
  return (
    <div className="divide-y divide-white/[0.08]" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div key={index} className="py-3.5 flex items-center gap-3 animate-pulse">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="h-3.5 w-20 rounded bg-white/10" />
            <div className="h-3 w-16 rounded bg-white/[0.06]" />
          </div>
          <div className="h-3.5 w-14 rounded bg-white/10" />
          <div className="h-3.5 w-24 rounded bg-white/[0.08]" />
          <div className="h-6 w-16 rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  );
}

/**
 * Displays up to three most recent confirmed/completed/cancelled bookings from Supabase.
 * Matches the Oliveal Admin reference layout while preventing horizontal overflow on 360px screens.
 */
export default function RecentBookings({
  bookings = [],
  loading = false,
  error = null,
  onRetry,
  onViewAll,
}) {
  const visibleBookings = Array.isArray(bookings) ? bookings.slice(0, 3) : [];

  return (
    <section
      aria-labelledby="recent-bookings-heading"
      className="relative overflow-hidden rounded-2xl bg-[#120B20]/95 border border-purple-500/30 shadow-[0_8px_30px_rgba(0,0,0,0.45),0_0_26px_rgba(124,58,237,0.14)] backdrop-blur-md"
    >
      {/* Subtle bottom-center ambient neon highlight matching reference card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 w-56 h-16 rounded-full bg-[#9333EA]/25 blur-2xl"
      />

      <div className="relative px-4 pt-3.5 pb-3 sm:px-5 sm:pt-4 sm:pb-3.5">
        {/* Card Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5 min-w-0">
            <Calendar className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#C4B5FD] shrink-0" aria-hidden="true" />
            <h2
              id="recent-bookings-heading"
              className="text-sm sm:text-base font-bold text-white tracking-tight truncate"
            >
              Recent Bookings
            </h2>
          </div>

          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#C084FC] hover:text-[#D8B4FE] transition-colors cursor-pointer shrink-0 rounded-md px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <RecentBookingsSkeleton />
        ) : error ? (
          <div className="py-5 px-2 flex flex-col items-center text-center gap-2.5">
            <AlertCircle className="w-6 h-6 text-rose-400" aria-hidden="true" />
            <p className="text-xs sm:text-sm text-rose-200 max-w-xs">{error}</p>
            {typeof onRetry === 'function' && (
              <button
                type="button"
                onClick={onRetry}
                className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/45 border border-purple-400/35 text-xs font-medium text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                Retry
              </button>
            )}
          </div>
        ) : visibleBookings.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-[#A9A0BC]">No bookings yet</p>
            <p className="mt-1 text-xs text-[#7B7191]">
              Confirmed and completed customer bookings will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.08]">
            {visibleBookings.map((booking) => {
              const badgeVariant = booking.statusInfo?.variant || 'muted';
              const badgeClass = STATUS_BADGE_STYLES[badgeVariant] || STATUS_BADGE_STYLES.muted;

              return (
                <li
                  key={booking.id}
                  className="py-3 sm:py-3.5 grid grid-cols-[minmax(0,1fr)_52px_minmax(0,1.18fr)_68px] min-[390px]:grid-cols-[minmax(0,1.02fr)_56px_minmax(0,1.22fr)_72px] sm:grid-cols-[minmax(0,1.15fr)_72px_minmax(0,1.3fr)_82px] items-center gap-1.5 sm:gap-2.5"
                >
                  {/* Column 1: Booking ID + Customer Name */}
                  <div className="min-w-0 pr-1">
                    <p
                      className="text-[11px] min-[390px]:text-xs sm:text-sm font-bold text-white tracking-tight truncate"
                      title={booking.bookingNumber}
                    >
                      {booking.bookingNumber}
                    </p>
                    <p
                      className="text-[10.5px] min-[390px]:text-[11px] sm:text-xs text-[#A9A0BC] truncate"
                      title={booking.customerName}
                    >
                      {booking.customerName}
                    </p>
                  </div>

                  {/* Column 2: Station Name */}
                  <div className="px-1 sm:px-2 border-l border-white/[0.08] text-center">
                    <span className="block text-[10.5px] min-[390px]:text-[11px] sm:text-xs font-bold text-white tracking-wide truncate">
                      {booking.stationName}
                    </span>
                  </div>

                  {/* Column 3: IST Time Window */}
                  <div className="min-w-0 pl-1.5 sm:pl-2.5 border-l border-white/[0.08]">
                    <span className="block text-[10px] min-[390px]:text-[10.5px] sm:text-xs text-[#E2DCF0] font-medium leading-snug">
                      {booking.timeRange}
                    </span>
                  </div>

                  {/* Column 4: Lifecycle Status Badge */}
                  <div className="flex justify-end">
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-2 sm:px-2.5 py-1 text-[10px] min-[390px]:text-[10.5px] sm:text-xs font-semibold leading-none whitespace-nowrap ${badgeClass}`}
                    >
                      {booking.statusInfo?.label || 'Confirmed'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
