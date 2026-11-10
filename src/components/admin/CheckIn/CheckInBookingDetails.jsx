import {
  Ticket,
  User,
  Mail,
  Gamepad2,
  Calendar,
  Clock,
  Hourglass,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ScanLine,
  Loader2,
  Disc,
  IndianRupee,
} from 'lucide-react';
import { STATUS_BADGE_STYLES } from '../RecentBookings';

/**
 * Displays verified Supabase booking details after a QR pass is scanned,
 * along with explicit check-in status and desk check-in confirmation CTA.
 */
export default function CheckInBookingDetails({
  booking,
  onConfirmCheckIn,
  onScanAnother,
  confirming = false,
  actionMessage = null,
}) {
  if (!booking) return null;

  const isSimulator =
    booking.stationType === 'simulator' ||
    booking.stationCategory === 'Racing Simulator';
  const categoryLabel = isSimulator ? 'Racing Simulator' : 'PS5';
  const stationVisual =
    booking.stationImage ||
    (isSimulator ? '/assets/images/racing-simulator.png' : '/assets/images/ps5-station.png');

  const isConfirmed = booking.status === 'confirmed';
  const isCheckedIn = Boolean(booking.checkedInAt);
  const canCheckIn = isConfirmed && !isCheckedIn;

  const lifecycleVariant = booking.lifecycleStatus?.variant || 'muted';
  const badgeClass = STATUS_BADGE_STYLES[lifecycleVariant] || STATUS_BADGE_STYLES.muted;

  return (
    <div className="space-y-4 animate-scaleUp">
      {/* Top Verification Status Strip */}
      {isCheckedIn ? (
        <div
          role="status"
          className="rounded-2xl bg-emerald-500/15 border border-emerald-400/45 p-3.5 flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.18)]"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/25 border border-emerald-400/50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-white">Customer Checked In</p>
            <p className="text-xs text-emerald-200">
              Checked in at {booking.checkedInTimeIst || 'confirmed desk time'} IST
            </p>
          </div>
        </div>
      ) : isConfirmed ? (
        <div
          role="status"
          className="rounded-2xl bg-purple-600/15 border border-purple-400/45 p-3.5 flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(124,58,237,0.18)]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-purple-500/25 border border-purple-400/50 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#D8B4FE]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-white">Booking Pass Verified</p>
              <p className="text-xs text-[#D6CFE6]">
                Review details below and confirm check-in.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-white/[0.08] border border-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#C4B5FD]">
            {booking.bookingSource === 'spot' ? 'Spot' : 'Online'}
          </span>
        </div>
      ) : (
        <div
          role="alert"
          className="rounded-2xl bg-rose-500/15 border border-rose-400/45 p-3.5 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-400/45 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-300" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-white">Pass Not Eligible for Check-In</p>
            <p className="text-xs text-rose-200">
              Current booking status is &ldquo;{booking.lifecycleStatus?.label || booking.status}&rdquo;.
            </p>
          </div>
        </div>
      )}

      {/* Main Booking Details Card */}
      <section
        aria-label="Scanned booking details"
        className="rounded-2xl bg-[#120B20]/95 border border-purple-500/35 shadow-[0_10px_35px_rgba(0,0,0,0.5),0_0_25px_rgba(124,58,237,0.14)] backdrop-blur-md overflow-hidden"
      >
        <div className="bg-[#1D1036]/95 border-b border-purple-500/25 px-3.5 sm:px-4 py-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <Ticket className="w-4 h-4 text-[#C4B5FD]" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-medium text-[#D6CFE6] whitespace-nowrap">
              Booking Number
            </span>
          </div>

          <span className="text-xs sm:text-base font-extrabold text-white tracking-wide whitespace-nowrap">
            {booking.bookingNumber}
          </span>
        </div>

        <div className="px-4 divide-y divide-white/[0.08]">
          {/* Customer Name */}
          <div className="py-3 grid grid-cols-[126px_1fr] sm:grid-cols-[150px_1fr] items-center gap-3">
            <div className="flex items-center gap-2.5 text-[#A9A0BC]">
              <User className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-medium">Customer Name</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-white truncate">
              {booking.customerName}
            </span>
          </div>

          {/* Customer Email (Online Accounts) */}
          {booking.customerEmail && (
            <div className="py-3 grid grid-cols-[126px_1fr] sm:grid-cols-[150px_1fr] items-center gap-3">
              <div className="flex items-center gap-2.5 text-[#A9A0BC]">
                <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="text-xs sm:text-sm font-medium">Email</span>
              </div>
              <span className="text-xs sm:text-sm font-medium text-[#D6CFE6] truncate">
                {booking.customerEmail}
              </span>
            </div>
          )}

          {/* Station */}
          <div className="py-3 grid grid-cols-[126px_1fr] sm:grid-cols-[150px_1fr] items-center gap-3">
            <div className="flex items-center gap-2.5 text-[#A9A0BC]">
              <Gamepad2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-medium">Station</span>
            </div>

            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-tight truncate">
                  {booking.stationName}
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
                    {categoryLabel}
                  </span>
                </div>
              </div>

              <img
                src={stationVisual}
                alt={booking.stationName}
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
            <span className="text-xs sm:text-sm font-bold text-white">{booking.dateLabel}</span>
          </div>

          {/* Time */}
          <div className="py-3 grid grid-cols-[126px_1fr] sm:grid-cols-[150px_1fr] items-center gap-3">
            <div className="flex items-center gap-2.5 text-[#A9A0BC]">
              <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-medium">Time</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-white">{booking.timeRange}</span>
          </div>

          {/* Duration & Players */}
          <div className="py-3 grid grid-cols-[126px_1fr] sm:grid-cols-[150px_1fr] items-center gap-3">
            <div className="flex items-center gap-2.5 text-[#A9A0BC]">
              <Hourglass className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-medium">Duration</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-white">
              {booking.durationMinutes} Minutes
            </span>
          </div>

          <div className="py-3 grid grid-cols-[126px_1fr] sm:grid-cols-[150px_1fr] items-center gap-3">
            <div className="flex items-center gap-2.5 text-[#A9A0BC]">
              <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-medium">Players</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-white">
              {booking.playerCount} {booking.playerCount === 1 ? 'Player' : 'Players'}
            </span>
          </div>

          {booking.totalAmount !== null && booking.totalAmount !== undefined && (
            <div className="py-3 grid grid-cols-[126px_1fr] sm:grid-cols-[150px_1fr] items-center gap-3">
              <div className="flex items-center gap-2.5 text-[#A9A0BC]">
                <IndianRupee className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="text-xs sm:text-sm font-medium">Booking Amount</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-white tabular-nums">
                ₹{Number(booking.totalAmount).toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {/* Lifecycle Status */}
          <div className="py-3 grid grid-cols-[126px_1fr] sm:grid-cols-[150px_1fr] items-center gap-3">
            <div className="flex items-center gap-2.5 text-[#A9A0BC]">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-medium">Status</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold leading-none ${badgeClass}`}
              >
                {booking.lifecycleStatus?.label || booking.status}
              </span>
              {isCheckedIn && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 leading-none">
                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                  Checked In
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {actionMessage && (
        <div
          role={actionMessage.type === 'error' ? 'alert' : 'status'}
          className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold border ${
            actionMessage.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
              : 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Action Controls */}
      <div className="space-y-2.5 pt-1">
        {canCheckIn && (
          <button
            type="button"
            onClick={() => onConfirmCheckIn?.(booking.id)}
            disabled={confirming}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A855F7] hover:brightness-110 active:scale-[0.99] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 border border-purple-300/35 shadow-[0_8px_28px_rgba(124,58,237,0.45)] transition-all cursor-pointer disabled:opacity-55"
          >
            {confirming ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                <span>Checking In Customer...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                <span>Confirm Check-In</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onScanAnother}
          disabled={confirming}
          className={`w-full py-3 px-5 rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            canCheckIn
              ? 'bg-[#120B20]/85 hover:bg-[#1B1030] border border-purple-500/35 text-white'
              : 'bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:brightness-110 border border-purple-300/35 text-white font-bold text-sm shadow-[0_8px_24px_rgba(124,58,237,0.4)]'
          }`}
        >
          <ScanLine className="w-4 h-4" aria-hidden="true" />
          <span>Scan Another QR</span>
        </button>
      </div>
    </div>
  );
}
