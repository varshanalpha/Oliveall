import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode, Copy, Check, Calendar, Clock, Users, ShieldCheck } from 'lucide-react';

export default function BookingQrModal({ isOpen, booking, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !booking) return null;

  const passCode = `OGZ-${booking.stationName || 'STN'}-${booking.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`;

  // QR Code payload formatted for oliveal desk scanner verification
  const qrPayload = JSON.stringify({
    passId: passCode,
    bookingId: booking.id,
    station: booking.stationName,
    date: booking.dateLabel,
    time: booking.timeRange,
    players: booking.players,
    status: booking.status,
    issuer: 'Oliveal Gaming Zone',
  });

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(passCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Dark Blur Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-sm rounded-3xl bg-[#120f26]/95 border border-purple-500/40 p-5 sm:p-6 backdrop-blur-2xl shadow-[0_0_50px_rgba(168,85,247,0.35)] text-center z-10 animate-scaleUp overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-28 bg-purple-600/30 blur-3xl pointer-events-none" />

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-2.5 text-left">
            <img
              src="/assets/images/oliveal-logo.png"
              alt="Oliveal Gaming Zone"
              className="w-9 h-9 object-contain filter drop-shadow-[0_0_10px_rgba(168,85,247,0.7)]"
            />
            <div>
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight leading-tight">
                Check-In QR Pass
              </h3>
              <p className="text-[10.5px] text-purple-300 font-medium">
                Oliveal Gaming Zone
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR Modal"
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Station Identity Pill */}
        <div className="mt-4 flex items-center justify-between p-2.5 rounded-2xl bg-[#181233] border border-white/[0.08] text-left">
          <div className="flex items-center gap-2.5">
            <div className="relative w-10 h-10 rounded-xl bg-[#0e0a1e] border border-purple-500/25 flex items-center justify-center p-1 overflow-hidden shrink-0">
              <img
                src={booking.image}
                alt={booking.stationName}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h4 className="text-sm font-black text-white leading-tight">
                {booking.stationName}
              </h4>
              <p className="text-[11px] text-slate-400">{booking.category}</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10.5px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Confirmed</span>
          </span>
        </div>

        {/* High-Contrast QR Code Card */}
        <div className="my-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-white text-slate-900 shadow-[0_0_25px_rgba(255,255,255,0.15)] relative">
          <QRCodeSVG
            value={qrPayload}
            size={180}
            bgColor="#ffffff"
            fgColor="#0c0a1a"
            level="H"
            includeMargin={false}
          />
          <p className="mt-2 text-[10px] font-semibold text-slate-500 tracking-wider uppercase">
            Scan at Gaming Desk
          </p>
        </div>

        {/* Pass Code Bar with Copy Action */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs">
          <div className="text-left">
            <span className="text-[9px] uppercase tracking-wider text-purple-300/80 font-bold block">
              Pass ID
            </span>
            <span className="font-mono font-bold text-white tracking-widest text-[13px]">
              {passCode}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center gap-1 text-[11px] font-bold text-purple-300 hover:text-white px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] transition active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Booking Details Micro-Table */}
        <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-left space-y-1.5 text-[11.5px] text-slate-300">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-slate-200 font-medium">{booking.dateLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-slate-200 font-medium">
              {booking.timeRange} ({booking.durationLabel})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-slate-200 font-medium">
              {booking.players} {booking.players === 1 ? 'Player' : 'Players'}
            </span>
          </div>
        </div>

        {/* Verification Safety Note */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10.5px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          <span>Present this pass to activate your gaming session</span>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-[0.98] transition"
        >
          Close Pass
        </button>

      </div>
    </div>
  );
}

