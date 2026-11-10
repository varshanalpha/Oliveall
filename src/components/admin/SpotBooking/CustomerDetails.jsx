import { Users, User, AlertCircle } from 'lucide-react';

/**
 * Walk-in Customer Details card for Admin Spot Booking.
 * Strictly captures Customer Full Name only (no email, phone, or account creation required).
 */
export default function CustomerDetails({
  customerName,
  onChangeCustomerName,
  onBlurCustomerName,
  error = null,
  disabled = false,
}) {
  return (
    <section
      aria-labelledby="spot-customer-details-heading"
      className="rounded-2xl bg-[#120B20]/95 border border-purple-500/30 p-4 shadow-[0_8px_28px_rgba(0,0,0,0.45),0_0_22px_rgba(124,58,237,0.1)] backdrop-blur-md"
    >
      <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
        <Users className="w-4 h-4 text-[#C4B5FD] shrink-0" aria-hidden="true" />
        <h2
          id="spot-customer-details-heading"
          className="text-sm sm:text-base font-bold text-white tracking-tight"
        >
          Customer Details
        </h2>
      </div>

      <div className="pt-3">
        <label
          htmlFor="spot-customer-full-name"
          className="block text-xs font-semibold text-white mb-2"
        >
          Customer Full Name <span className="text-[#D946EF]" aria-hidden="true">*</span>
        </label>

        <div
          className={`flex items-center gap-2.5 rounded-xl bg-[#19102C]/90 border px-3.5 py-2.5 transition-colors ${
            error
              ? 'border-rose-500/70 focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-500/25'
              : 'border-purple-500/25 hover:border-purple-400/45 focus-within:border-[#C084FC] focus-within:ring-2 focus-within:ring-purple-500/25'
          }`}
        >
          <User className="w-4 h-4 text-[#A9A0BC] shrink-0" aria-hidden="true" />
          <input
            id="spot-customer-full-name"
            type="text"
            value={customerName}
            onChange={(e) => onChangeCustomerName(e.target.value)}
            onBlur={onBlurCustomerName}
            disabled={disabled}
            required
            autoComplete="off"
            placeholder="Enter customer full name"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'spot-customer-name-error' : undefined}
            className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-[#7B7191] outline-none disabled:opacity-60"
          />
        </div>

        {error && (
          <p
            id="spot-customer-name-error"
            role="alert"
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-300"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </section>
  );
}

