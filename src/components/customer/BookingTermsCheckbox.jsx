import React from 'react';
import { Check } from 'lucide-react';

/**
 * OLIVEAL GAMING ZONE — BOOKING TERMS CHECKBOX
 * Custom interactive checkbox matching the reference image.
 * Displays:
 * "I confirm that the details are correct and I agree to the Booking Terms & Conditions."
 * Clicking "Booking Terms & Conditions" opens the terms modal.
 */
export default function BookingTermsCheckbox({
  checked,
  onChange,
  onOpenTerms,
}) {
  return (
    <div className="flex items-start gap-3 px-1 py-1 select-none">
      
      {/* Custom Checkbox */}
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-5 h-5 rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center transition-all border ${
          checked
            ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.6)]'
            : 'bg-[#15102a] border-purple-500/40 text-transparent hover:border-purple-400'
        }`}
      >
        <Check className={`w-3.5 h-3.5 stroke-[3] transition-transform ${checked ? 'scale-100' : 'scale-0'}`} />
      </button>

      {/* Label Text */}
      <p className="text-xs sm:text-[13px] text-slate-300 leading-snug">
        <span>I confirm that the details are correct and I agree to the </span>
        <button
          type="button"
          onClick={onOpenTerms}
          className="text-fuchsia-400 hover:text-fuchsia-300 font-semibold underline underline-offset-2 transition focus:outline-none drop-shadow-[0_0_6px_rgba(217,70,239,0.3)]"
        >
          Booking Terms & Conditions.
        </button>
      </p>

    </div>
  );
}

