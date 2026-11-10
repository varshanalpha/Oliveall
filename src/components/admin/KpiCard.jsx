import React from 'react';

const THEME_STYLES = {
  purple: {
    card: 'bg-gradient-to-br from-[#231044]/95 via-[#180c2f]/95 to-[#120B20] border-purple-500/35 shadow-[0_6px_22px_rgba(124,58,237,0.16)]',
    iconBg: 'bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] shadow-[0_0_16px_rgba(124,58,237,0.55)]',
    glow: 'bg-purple-500/20',
  },
  blue: {
    card: 'bg-gradient-to-br from-[#0e2046]/95 via-[#0f1733]/95 to-[#120B20] border-blue-500/35 shadow-[0_6px_22px_rgba(37,99,235,0.16)]',
    iconBg: 'bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] shadow-[0_0_16px_rgba(37,99,235,0.55)]',
    glow: 'bg-blue-500/20',
  },
  green: {
    card: 'bg-gradient-to-br from-[#0a2c22]/95 via-[#0b1f1b]/95 to-[#120B20] border-emerald-500/35 shadow-[0_6px_22px_rgba(16,185,129,0.16)]',
    iconBg: 'bg-gradient-to-br from-[#10b981] to-[#059669] shadow-[0_0_16px_rgba(16,185,129,0.5)]',
    glow: 'bg-emerald-500/20',
  },
  amber: {
    card: 'bg-gradient-to-br from-[#2e1d0b]/95 via-[#1f1511]/95 to-[#120B20] border-amber-500/35 shadow-[0_6px_22px_rgba(245,158,11,0.16)]',
    iconBg: 'bg-gradient-to-br from-[#f59e0b] to-[#b45309] shadow-[0_0_16px_rgba(245,158,11,0.5)]',
    glow: 'bg-amber-500/20',
  },
};

export default function KpiCard({
  label,
  value,
  subtext,
  icon: Icon,
  theme = 'purple',
  loading = false,
  unavailable = false,
}) {
  const styles = THEME_STYLES[theme] || THEME_STYLES.purple;

  return (
    <div
      className={`relative rounded-2xl border p-3 sm:p-4 backdrop-blur-xl overflow-hidden flex items-start gap-2.5 sm:gap-3 transition-all duration-200 ${styles.card}`}
    >
      {/* Subtle bottom-left corner ambient highlight matching reference */}
      <div
        className={`absolute -bottom-6 -left-6 w-20 h-20 rounded-full blur-2xl pointer-events-none ${styles.glow}`}
      />

      {/* Left Circular Icon Badge */}
      <div
        className={`relative z-10 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${styles.iconBg}`}
      >
        {Icon && <Icon className="w-[17px] h-[17px] sm:w-5 sm:h-5 text-white stroke-[2]" />}
      </div>

      {/* Right Metric Text Stack */}
      <div className="relative z-10 min-w-0 flex-1">
        <p className="text-[11px] min-[390px]:text-xs font-medium text-[#d6cde8] leading-snug">
          {label}
        </p>

        {loading ? (
          <div className="mt-1.5 space-y-1.5">
            <div className="h-6 w-14 rounded-md bg-white/10 animate-pulse" />
            <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />
          </div>
        ) : (
          <>
            <p
              className={`text-[1.15rem] min-[390px]:text-[1.3rem] sm:text-[1.45rem] font-extrabold tracking-tight leading-tight mt-0.5 tabular-nums ${
                unavailable ? 'text-[#A9A0BC]' : 'text-white'
              }`}
            >
              {value}
            </p>
            {subtext && (
              <p className="text-[10px] sm:text-[11px] font-medium text-[#A9A0BC] mt-0.5 leading-snug break-words">
                {subtext}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
