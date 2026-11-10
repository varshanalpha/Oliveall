import { useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  Copy,
  Check,
  User,
  Gamepad2,
  Calendar,
  Clock,
  Hourglass,
  Users,
  ShieldCheck,
  CheckCircle2,
  Disc,
} from 'lucide-react';

const STATUS_DISPLAY_MAP = {
  confirmed: {
    label: 'Confirmed',
    badgeClass: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
    showCheckIcon: true,
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-sky-500/15 border-sky-400/40 text-sky-300',
    showCheckIcon: true,
  },
  pending_payment: {
    label: 'Pending Payment',
    badgeClass: 'bg-amber-500/15 border-amber-400/40 text-amber-200',
    showCheckIcon: false,
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'bg-rose-500/15 border-rose-400/40 text-rose-300',
    showCheckIcon: false,
  },
  expired: {
    label: 'Expired',
    badgeClass: 'bg-white/10 border-white/20 text-[#A9A0BC]',
    showCheckIcon: false,
  },
};

function getStatusBadgeMeta(rawStatus) {
  const normalized = String(rawStatus || '').trim().toLowerCase();
  return (
    STATUS_DISPLAY_MAP[normalized] || {
      label: rawStatus || 'Unknown',
      badgeClass: 'bg-white/10 border-white/20 text-[#D6CFE6]',
      showCheckIcon: false,
    }
  );
}

/**
 * Structured Booking Details receipt card displaying verified Supabase booking & station data.
 */
export default function BookingDetailReceipt({ booking }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopyBookingNumber = useCallback(async () => {
    const value = String(booking?.bookingNumber || '').trim();
    if (!value) return;

    const fallbackCopy = () => {
      const el = document.createElement('textarea');
      el.value = value;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.top = '-9999px';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        return;
      }
      if (fallbackCopy()) setCopied(true);
    } catch {
      try {
        if (fallbackCopy()) setCopied(true);
      } catch {
        // Ignore if clipboard access is completely blocked
      }
    }
  }, [booking?.bookingNumber]);

  const isSimulator =
    booking?.stationType === 'simulator' ||
    booking?.stationCategory === 'Racing Simulator';

  const stationCategoryLabel = isSimulator ? 'Racing Simulator' : 'PS5';
  const stationVisual =
    booking?.stationImage ||
    (isSimulator ? '/assets/images/racing-simulator.png' : '/assets/images/ps5-station.png');

  const statusMeta = getStatusBadgeMeta(booking?.status);
  const playerCountNum = Number(booking?.playerCount ?? 1);

  return (
    <section
      aria-label="Confirmed booking summary"
      className="rounded-2xl bg-[#120B20]/95 border border-purple-500/35 shadow-[0_10px_35px_rgba(0,0,0,0.5),0_0_25px_rgba(124,58,237,0.14)] backdrop-blur-md overflow-hidden"
    >
      {/* 1. Highlighted Header Row: Booking Number + Copy */}
      <div className="bg-[#1D1036]/95 border-b border-purple-500/25 px-3.5 sm:px-4 py-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <Ticket className="w-4 h-4 text-[#C4B5FD] shrink-0" aria-hidden="true" />
          <span className="text-xs sm:text-sm font-medium text-[#D6CFE6] whitespace-nowrap">
            Booking Number
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 justify-end">
          <span className="text-xs sm:text-base font-extrabold text-white tracking-wide truncate">
            {booking?.bookingNumber}
          </span>
          <button
            type="button"
            onClick={handleCopyBookingNumber}
            aria-label={copied ? 'Booking number copied' : 'Copy booking number'}
            title={copied ? 'Copied!' : 'Copy booking number'}
            className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-purple-500/25 border border-white/10 text-[#C4B5FD] hover:text-white transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
          <span className="sr-only" aria-live="polite">
            {copied ? `Copied booking number ${booking?.bookingNumber}` : ''}
          </span>
        </div>
      </div>

      {/* 2-8. Booking Fields */}
      <div className="px-4 divide-y divide-white/[0.08]">
        {/* Customer Name */}
        <div className="py-3 grid grid-cols-[126px_1fr] sm:grid-cols-[150px_1fr] items-center gap-3">
          <div className="flex items-center gap-2.5 text-[#A9A0BC]">
            <User className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-medium">Customer Name</span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-white truncate">
            {booking?.customerName}
          </span>
        </div>

        {/* Station */}
        <div className="py-3 grid grid-cols-[126px_1fr] sm:grid-cols-[150px_1fr] items-center gap-3">
          <div className="flex items-center gap-2.5 text-[#A9A0BC]">
            <Gamepad2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-medium">Station</span>
          </div>

          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-tight truncate">
                {booking?.stationName}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
                {isSimulator ? (
                  <Disc className="w-3.5 h-3.5 text-[#A9A0BC] shrink-0" aria-hidden="true" />
                ) : (
                  <img
                    src="/assets/images/ps5-logo.png"
                    alt="PlayStation"
                    className="w-3.5 h-3 object-contain shrink-0 select-none"
                  />
                )}
                <span className="text-[11px] font-medium text-[#C4B5FD] truncate">
                  {stationCategoryLabel}
                </span>
              </div>
            </div>

            <img
              src={stationVisual}
              alt={booking?.stationName || stationCategoryLabel}
              className={`${
                isSimulator ? 'w-12 h-11 sm:w-14 sm:h-12' : 'w-10 h-12 sm:w-12 sm:h-14'
              } object-contain shrink-0 select-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.65)]`}
            />
          </div>
        </div>

        {/* Date */}
        <div className="py-3 grid grid-cols-[126px_1fr] sm:grid-cols-[150px_1fr] items-center gap-3">
          <div className="flex items-center gap-2.5 text-[#A9A0BC]">
            <Calendar className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-medium">Date</span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-white">
            {booking?.dateLabel}
          </span>
        </div>

        {/* Time (IST) */}
        <div className="py-3 grid grid-cols-[126px_1fr] sm:grid-cols-[150px_1fr] items-center gap-3">
          <div className="flex items-center gap-2.5 text-[#A9A0BC]">
            <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-medium">Time</span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-white">
            {booking?.timeRange}
          </span>
        </div>

        {/* Duration */}
        <div className="py-3 grid grid-cols-[126px_1fr] sm:grid-cols-[150px_1fr] items-center gap-3">
          <div className="flex items-center gap-2.5 text-[#A9A0BC]">
            <Hourglass className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-medium">Duration</span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-white">
            {booking?.durationMinutes} Minutes
          </span>
        </div>

        {/* Players */}
        <div className="py-3 grid grid-cols-[126px_1fr] sm:grid-cols-[150px_1fr] items-center gap-3">
          <div className="flex items-center gap-2.5 text-[#A9A0BC]">
            <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-medium">Players</span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-white">
            {playerCountNum} {playerCountNum === 1 ? 'Player' : 'Players'}
          </span>
        </div>

        {/* Status (strictly from Supabase booking status) */}
        <div className="py-3 grid grid-cols-[126px_1fr] sm:grid-cols-[150px_1fr] items-center gap-3">
          <div className="flex items-center gap-2.5 text-[#A9A0BC]">
            <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-medium">Status</span>
          </div>
          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold leading-none ${statusMeta.badgeClass}`}
            >
              {statusMeta.showCheckIcon && (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>{statusMeta.label}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
