import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Calendar, ArrowRight, AlertCircle } from 'lucide-react';

export const STATUS_BADGE_STYLES = {
  purple: 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white border border-purple-400/35 shadow-[0_0_14px_rgba(124,58,237,0.45)]',
  amber: 'bg-gradient-to-r from-[#B45309]/90 to-[#92400E]/95 text-[#FDE68A] border border-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
  emerald: 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30',
  danger: 'bg-rose-500/15 text-rose-300 border border-rose-400/30',
  muted: 'bg-white/10 text-[#A9A0BC] border border-white/15',
};

const GAP_ABOVE_NAV_PX = 14;
// Exact footer height reservation: mt-1 (4px) + border-t (1px) + pt-2 (8px) + button/line (22px)
const FOOTER_RESERVE_PX = 35;

function RecentBookingsSkeleton({ rows = 5 }) {
  return (
    <div className="divide-y divide-white/[0.08] overflow-hidden" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="py-2.5 sm:py-3 flex items-center gap-3 animate-pulse">
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
 * Displays live recent bookings from Supabase, sized dynamically so its bottom outline
 * stops cleanly just above the fixed bottom navigation bar without overlapping it.
 * Measures actual rendered DOM row heights to pack maximum bookings cleanly into all
 * available vertical space, showing View All only when bookings exceed capacity.
 */
export default function RecentBookings({
  bookings = [],
  totalBookingsCount = null,
  loading = false,
  error = null,
  onRetry,
  onViewAll,
}) {
  const cardRef = useRef(null);
  const bodyRef = useRef(null);
  const headerRef = useRef(null);
  const listRef = useRef(null);
  const probeKeyRef = useRef('');

  const allBookings = Array.isArray(bookings) ? bookings : [];
  const effectiveTotal = Math.max(allBookings.length, Number(totalBookingsCount ?? 0));
  const bookingsSignature = allBookings
    .map((b) => `${b.id}:${b.timeRange?.length ?? 0}`)
    .join('|');

  const [cardHeight, setCardHeight] = useState(320);
  const [visibleCount, setVisibleCount] = useState(allBookings.length);
  const [isProbing, setIsProbing] = useState(true);
  const [measureTick, setMeasureTick] = useState(0);

  useEffect(() => {
    const triggerMeasure = () => setMeasureTick((t) => t + 1);

    window.addEventListener('resize', triggerMeasure);
    window.visualViewport?.addEventListener('resize', triggerMeasure);

    let observer = null;
    if (typeof ResizeObserver !== 'undefined' && cardRef.current?.parentElement) {
      observer = new ResizeObserver(triggerMeasure);
      observer.observe(cardRef.current.parentElement);
    }

    if (document?.fonts?.ready) {
      document.fonts.ready.then(triggerMeasure).catch(() => {});
    }

    return () => {
      window.removeEventListener('resize', triggerMeasure);
      window.visualViewport?.removeEventListener('resize', triggerMeasure);
      observer?.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const cardEl = cardRef.current;
    if (!cardEl) return;

    const cardRect = cardEl.getBoundingClientRect();
    const cardDocTop = cardRect.top + window.scrollY;
    const navEl =
      document.querySelector('nav[aria-label="Admin bottom navigation"] > div') ||
      document.querySelector('nav[aria-label="Admin bottom navigation"]');

    const viewportH = window.visualViewport?.height || window.innerHeight;
    const navTop = navEl ? navEl.getBoundingClientRect().top : viewportH - 76;

    const availableCardHeight = Math.max(
      210,
      Math.floor(navTop - cardDocTop - GAP_ABOVE_NAV_PX)
    );

    if (cardHeight !== availableCardHeight) {
      setCardHeight(availableCardHeight);
      return;
    }

    if (loading || error || allBookings.length === 0) {
      probeKeyRef.current = '';
      if (visibleCount !== allBookings.length) {
        setVisibleCount(allBookings.length);
      }
      if (isProbing) setIsProbing(false);
      return;
    }

    const bodyEl = bodyRef.current;
    const headerEl = headerRef.current;
    const listEl = listRef.current;
    if (!bodyEl || !headerEl || !listEl) return;

    const cardWidth = Math.round(cardRect.width);
    const targetProbeKey = `${bookingsSignature}|${effectiveTotal}|${availableCardHeight}|${cardWidth}`;

    if (probeKeyRef.current !== targetProbeKey) {
      if (visibleCount !== allBookings.length || !isProbing) {
        setIsProbing(true);
        setVisibleCount(allBookings.length);
        return;
      }

      const cardBorderY = cardEl.offsetHeight - cardEl.clientHeight;
      const bodyStyle = getComputedStyle(bodyEl);
      const bodyPadY =
        parseFloat(bodyStyle.paddingTop || '0') + parseFloat(bodyStyle.paddingBottom || '0');
      const headerH = Math.ceil(headerEl.getBoundingClientRect().height);

      const listBudgetNoFooter = Math.max(
        72,
        availableCardHeight - cardBorderY - bodyPadY - headerH
      );
      const listBudgetWithFooter = Math.max(60, listBudgetNoFooter - FOOTER_RESERVE_PX);

      const rowEls = Array.from(listEl.children);
      let fitWithoutFooter = 0;
      let fitWithFooter = 0;
      let runningH = 0;

      for (let i = 0; i < rowEls.length; i++) {
        runningH += rowEls[i].getBoundingClientRect().height;
        if (runningH <= listBudgetNoFooter) {
          fitWithoutFooter = i + 1;
        }
        if (runningH <= listBudgetWithFooter) {
          fitWithFooter = i + 1;
        }
      }

      fitWithoutFooter = Math.max(1, fitWithoutFooter);
      fitWithFooter = Math.max(1, fitWithFooter);

      const fitsAllWithoutFooter =
        allBookings.length <= fitWithoutFooter && effectiveTotal <= fitWithoutFooter;

      const nextVisibleCount = fitsAllWithoutFooter ? allBookings.length : fitWithFooter;

      probeKeyRef.current = targetProbeKey;
      setIsProbing(false);
      setVisibleCount(nextVisibleCount);
    }
  }, [
    allBookings.length,
    bookingsSignature,
    effectiveTotal,
    loading,
    error,
    cardHeight,
    visibleCount,
    isProbing,
    measureTick,
  ]);

  const visibleBookings = allBookings.slice(0, Math.min(allBookings.length, Math.max(1, visibleCount)));
  const hiddenCount = Math.max(0, effectiveTotal - visibleBookings.length);
  const stretchRowsToFill = !isProbing && hiddenCount > 0 && visibleBookings.length > 0;

  return (
    <section
      ref={cardRef}
      aria-labelledby="recent-bookings-heading"
      style={{ height: `${cardHeight}px` }}
      className="relative shrink-0 flex flex-col overflow-hidden rounded-2xl bg-[#120B20]/95 border border-purple-500/30 shadow-[0_8px_30px_rgba(0,0,0,0.45),0_0_26px_rgba(124,58,237,0.14)] backdrop-blur-md"
    >
      {/* Subtle bottom-center ambient neon highlight matching reference card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 w-56 h-16 rounded-full bg-[#9333EA]/25 blur-2xl"
      />

      <div
        ref={bodyRef}
        className="relative flex-1 min-h-0 flex flex-col px-4 pt-3.5 pb-2.5 sm:px-5 sm:pt-4 sm:pb-3"
      >
        {/* Card Header */}
        <div
          ref={headerRef}
          className="flex items-center justify-between gap-3 pb-2.5 border-b border-white/[0.08] shrink-0 min-h-[32px]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Calendar className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#C4B5FD] shrink-0" aria-hidden="true" />
            <h2
              id="recent-bookings-heading"
              className="text-sm sm:text-base font-bold text-white tracking-tight truncate"
            >
              Recent Bookings
            </h2>
            {effectiveTotal > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-purple-500/20 border border-purple-400/30 px-2 py-0.5 text-[10px] font-bold text-[#D8B4FE] tabular-nums">
                {effectiveTotal}
              </span>
            )}
          </div>

          {!loading && !error && hiddenCount > 0 && (
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#C084FC] hover:text-[#D8B4FE] transition-colors cursor-pointer shrink-0 rounded-md px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Content Body */}
        {loading ? (
          <RecentBookingsSkeleton rows={5} />
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-5 px-2 text-center gap-2.5">
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
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
            <p className="text-sm font-medium text-[#A9A0BC]">No bookings yet</p>
            <p className="mt-1 text-xs text-[#7B7191] max-w-[260px]">
              Confirmed and completed customer bookings will appear here.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <ul
              ref={listRef}
              className={`divide-y divide-white/[0.08] overflow-hidden ${
                stretchRowsToFill ? 'flex-1 min-h-0 flex flex-col' : ''
              }`}
            >
              {visibleBookings.map((booking) => {
                const badgeVariant = booking.statusInfo?.variant || 'muted';
                const badgeClass = STATUS_BADGE_STYLES[badgeVariant] || STATUS_BADGE_STYLES.muted;

                return (
                  <li
                    key={booking.id}
                    className={`${
                      stretchRowsToFill ? 'grow shrink-0 basis-auto ' : ''
                    }py-2.5 sm:py-3 grid grid-cols-[minmax(0,1fr)_52px_minmax(0,1.18fr)_68px] min-[390px]:grid-cols-[minmax(0,1.02fr)_56px_minmax(0,1.22fr)_72px] sm:grid-cols-[minmax(0,1.15fr)_72px_minmax(0,1.3fr)_82px] items-center gap-1.5 sm:gap-2.5`}
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

            {hiddenCount > 0 && (
              <div className="pt-2 mt-1 border-t border-white/[0.08] flex items-center justify-between gap-2 shrink-0 leading-4">
                <span className="text-[11px] text-[#A9A0BC]">
                  Showing {visibleBookings.length} of {effectiveTotal} bookings
                </span>
                <button
                  type="button"
                  onClick={onViewAll}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C084FC] hover:text-white transition-colors cursor-pointer rounded px-1.5 py-0.5 leading-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                >
                  <span>+{hiddenCount} more</span>
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
