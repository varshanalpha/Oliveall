import React, { useState } from 'react';
import { CreditCard, Info } from 'lucide-react';
import { formatCurrency } from '../../utils/pricingUtils';

/**
 * OLIVEAL GAMING ZONE — PAYMENT SUMMARY CARD SECTION
 * Displays:
 * - Header with "Payment Summary"
 * - Station Charge (X Minutes)
 * - Platform Fees with interactive info popover/tooltip
 * - Luminous divider line
 * - Total Amount with bold neon magenta/fuchsia glow
 */
export default function PaymentSummaryCard({
  stationCharge = 400,
  platformFee = 20,
  totalAmount = 420,
  durationMinutes = 90,
  asSection = false,
}) {
  const [showFeeInfo, setShowFeeInfo] = useState(false);

  const content = (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2 pb-1">
        <div className="w-7 h-7 rounded-lg bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-300">
          <CreditCard className="w-4 h-4 text-purple-400" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
          Payment Summary
        </h3>
      </div>

      {/* Pricing Breakdown Rows */}
      <div className="space-y-2.5 text-xs sm:text-sm">
        
        {/* Station Charge Row */}
        <div className="flex items-center justify-between text-slate-300">
          <span className="font-medium">
            Station Charge ({durationMinutes} Minutes)
          </span>
          <span className="text-white font-semibold font-mono tracking-tight text-sm sm:text-base">
            {formatCurrency(stationCharge)}
          </span>
        </div>

        {/* Platform Fees Row with Info Tooltip */}
        <div className="flex items-center justify-between text-slate-300 relative">
          <div className="flex items-center gap-1.5">
            <span className="font-medium">Platform Fees</span>
            <button
              type="button"
              onClick={() => setShowFeeInfo(!showFeeInfo)}
              onMouseEnter={() => setShowFeeInfo(true)}
              onMouseLeave={() => setShowFeeInfo(false)}
              aria-label="Platform Fee Information"
              className="text-purple-400 hover:text-purple-300 transition focus:outline-none"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            {/* Platform Fee Tooltip / Popover */}
            {showFeeInfo && (
              <div className="absolute left-0 bottom-full mb-2 w-56 p-2.5 rounded-xl bg-[#191338] border border-purple-500/40 text-[11px] text-slate-200 shadow-2xl z-20 backdrop-blur-lg">
                Fixed reservation & facility maintenance fee applied per booking.
              </div>
            )}
          </div>

          <span className="text-white font-semibold font-mono tracking-tight text-sm sm:text-base">
            {formatCurrency(platformFee)}
          </span>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent my-1" />

        {/* Total Amount Row */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-white font-bold text-sm sm:text-base tracking-wide">
            Total Amount
          </span>
          <span className="text-fuchsia-400 font-black text-xl sm:text-2xl font-mono tracking-tight drop-shadow-[0_0_14px_rgba(217,70,239,0.6)]">
            {formatCurrency(totalAmount)}
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
