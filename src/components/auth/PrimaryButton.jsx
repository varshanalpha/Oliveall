import React from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

export default function PrimaryButton({
  children,
  onClick,
  type = 'submit',
  disabled = false,
  loading = false,
  showArrow = true,
  className = '',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative w-full py-3.5 sm:py-4 px-6 rounded-2xl sm:rounded-full font-bold text-sm sm:text-base text-white tracking-wide flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 select-none ${
        disabled
          ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
          : 'bg-gradient-to-r from-[#8b5cf6] via-[#a855f7] to-[#d946ef] hover:from-[#7c3aed] hover:via-[#9333ea] hover:to-[#c084fc] active:scale-[0.98] shadow-[0_4px_24px_rgba(168,85,247,0.5)] hover:shadow-[0_6px_30px_rgba(168,85,247,0.65)] border border-purple-300/30'
      } ${className}`}
    >
      {/* Light sheen overlay */}
      <span className="absolute inset-0 bg-gradient-to-t from-transparent via-white/[0.08] to-transparent pointer-events-none" />

      {loading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Processing...</span>
        </span>
      ) : (
        <span className="relative z-10 flex items-center justify-center gap-2 group">
          <span>{children}</span>
          {showArrow && (
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:translate-x-1" />
          )}
        </span>
      )}
    </button>
  );
}

