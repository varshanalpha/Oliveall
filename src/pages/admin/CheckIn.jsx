import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ScanLine, Search, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { lookupBookingForCheckIn, confirmBookingCheckIn } from '../../services/checkInService';
import QrCameraScanner from '../../components/admin/CheckIn/QrCameraScanner';
import CheckInBookingDetails from '../../components/admin/CheckIn/CheckInBookingDetails';

/**
 * Oliveal Gaming Zone — Admin QR Check-In Page (rendered inside persistent AdminShell).
 * Uses all available screen space down to the bottom navigation bar across the live
 * QR Camera Scanner and Manual Booking / Pass ID entry options.
 */
export default function CheckIn() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const registerRefreshHandler = outletContext?.registerRefreshHandler;

  const [manualCode, setManualCode] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [scannedBooking, setScannedBooking] = useState(null);

  const [confirmingCheckIn, setConfirmingCheckIn] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const handleLookup = useCallback(
    async (rawQrOrCode) => {
      setLookingUp(true);
      setLookupError(null);
      setActionMessage(null);

      try {
        const record = await lookupBookingForCheckIn(rawQrOrCode);
        setScannedBooking(record);
      } catch (err) {
        if (err?.code === 'unauthenticated') {
          navigate('/login', { replace: true });
          return;
        }
        if (err?.code === 'forbidden') {
          navigate('/dashboard', { replace: true });
          return;
        }
        setLookupError(err?.message || 'Unable to verify scanned booking pass.');
      } finally {
        setLookingUp(false);
      }
    },
    [navigate]
  );

  const handleRefreshCurrent = useCallback(async () => {
    if (!scannedBooking?.id) return;
    await handleLookup(scannedBooking.id);
  }, [scannedBooking?.id, handleLookup]);

  useEffect(() => {
    registerRefreshHandler?.(handleRefreshCurrent, lookingUp);
  }, [registerRefreshHandler, handleRefreshCurrent, lookingUp]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualCode.trim() || lookingUp) return;
    await handleLookup(manualCode);
  };

  const handleConfirmCheckIn = async (bookingId) => {
    if (confirmingCheckIn) return;
    setConfirmingCheckIn(true);
    setActionMessage(null);

    try {
      const res = await confirmBookingCheckIn(bookingId);
      setScannedBooking(res.booking);
      setActionMessage({
        type: 'success',
        text: res.alreadyCheckedIn
          ? 'This customer was already checked in.'
          : `${res.booking.customerName} checked in successfully for ${res.booking.stationName}!`,
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err?.message || 'Failed to confirm check-in.',
      });
    } finally {
      setConfirmingCheckIn(false);
    }
  };

  const handleScanAnother = () => {
    setScannedBooking(null);
    setLookupError(null);
    setActionMessage(null);
    setManualCode('');
  };

  const scannerActive = !scannedBooking && !lookingUp;

  return (
    <main
      className={`relative z-10 flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-4 sm:pt-5 flex flex-col ${
        scannedBooking ? 'pb-28 space-y-4' : 'pb-[84px] gap-3.5 sm:gap-4'
      }`}
    >
      {/* Page Heading */}
      <header className="px-0.5 flex items-start justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <ScanLine className="w-6 h-6 text-[#C4B5FD] shrink-0" aria-hidden="true" />
            <h1 className="text-[1.6rem] sm:text-[1.75rem] font-extrabold text-white tracking-tight leading-tight">
              Check In
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#A9A0BC] mt-1 font-medium leading-snug">
            {scannedBooking
              ? 'Verified booking details from scanned pass'
              : 'Scan customer QR pass via camera to view booking details'}
          </p>
        </div>

        {scannedBooking && (
          <button
            type="button"
            onClick={handleScanAnother}
            className="shrink-0 mt-0.5 inline-flex items-center gap-1.5 rounded-xl bg-[#160F26]/95 hover:bg-[#21153B] border border-purple-500/35 px-3 py-2 text-xs font-semibold text-[#E2DCF0] hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#C084FC]" aria-hidden="true" />
            <span>Scanner</span>
          </button>
        )}
      </header>

      {/* Camera Scanner + Manual Pass ID Backup (fills full available viewport down to nav) */}
      {!scannedBooking && (
        <div className="flex-1 min-h-0 flex flex-col gap-3.5 sm:gap-4">
          <QrCameraScanner
            active={scannerActive}
            onScanSuccess={handleLookup}
            busy={lookingUp}
          />

          {/* Lookup Loading State */}
          {lookingUp && (
            <div
              role="status"
              className="shrink-0 rounded-2xl bg-[#120B20]/95 border border-purple-500/30 p-4 flex items-center justify-center gap-2.5 text-xs sm:text-sm font-semibold text-[#D6CFE6]"
            >
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" aria-hidden="true" />
              <span>Verifying booking pass in Supabase...</span>
            </div>
          )}

          {/* Scan / Lookup Error Banner */}
          {lookupError && (
            <div
              role="alert"
              className="shrink-0 rounded-2xl bg-rose-500/15 border border-rose-500/40 p-3.5 flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs text-rose-200 leading-snug">{lookupError}</p>
              </div>
              <button
                type="button"
                onClick={handleScanAnother}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-[11px] font-bold text-white cursor-pointer"
              >
                Scan Again
              </button>
            </div>
          )}

          {/* Manual Booking Code Fallback Card */}
          <form
            onSubmit={handleManualSubmit}
            className="shrink-0 rounded-2xl bg-[#120B20]/95 border border-purple-500/25 p-4 space-y-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
          >
            <label
              htmlFor="checkin-manual-pass-id"
              className="block text-xs sm:text-sm font-semibold text-[#D6CFE6]"
            >
              Or enter Booking / Pass ID manually
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-[#A9A0BC] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="checkin-manual-pass-id"
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  disabled={lookingUp}
                  placeholder="Enter ID (e.g. OGZ-ALPHA-8F3A21)"
                  className="w-full rounded-xl bg-[#19102C]/90 border border-purple-500/25 focus:border-[#C084FC] focus:ring-2 focus:ring-purple-500/25 pl-9 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder-[#7B7191] outline-none transition uppercase placeholder:normal-case"
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim() || lookingUp}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-xs sm:text-sm font-bold text-white transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                Lookup
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Scanned Booking Details View */}
      {scannedBooking && (
        <CheckInBookingDetails
          booking={scannedBooking}
          onConfirmCheckIn={handleConfirmCheckIn}
          onScanAnother={handleScanAnother}
          confirming={confirmingCheckIn}
          actionMessage={actionMessage}
        />
      )}
    </main>
  );
}
