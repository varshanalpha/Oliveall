import React from 'react';

export default function AuthBranding({ size = 'md' }) {
  const isSmall = size === 'sm';

  return (
    <div className="flex flex-col items-center justify-center text-center select-none">
      {/* Controller Icon — clean, floating, no container box */}
      <div className={`relative flex items-center justify-center ${isSmall ? 'mb-1' : 'mb-2'}`}>
        {/* Soft purple glow halo behind the controller */}
        <div className={`absolute inset-0 bg-purple-500/35 blur-xl rounded-full scale-140 pointer-events-none`} />

        <svg
          className={`${
            isSmall ? 'w-9 h-6 sm:w-10 sm:h-7' : 'w-[52px] h-[38px] sm:w-[58px] sm:h-[42px]'
          } relative z-10 drop-shadow-[0_0_15px_rgba(192,132,252,0.7)] transition-transform duration-300 hover:scale-105`}
          viewBox="0 0 100 70"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id={`ctrl-glow-${size}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id={`ctrlGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0abfc" />
              <stop offset="45%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
          </defs>

          {/* Sparkle plus signs */}
          <path d="M12 20 L16 20 M14 18 L14 22" stroke="#e9d5ff" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M84 18 L88 18 M86 16 L86 20" stroke="#e9d5ff" strokeWidth="1.8" strokeLinecap="round" />

          {/* Controller body outline — purple gradient stroke, no fill */}
          <path
            d="M28 14 C36 14 42 20 50 20 C58 20 64 14 72 14 C84 14 93 24 93 37 C93 47 87 63 76 63 C69 63 65 52 61 47 C57 42 54 41 50 41 C46 41 43 42 39 47 C35 52 31 63 24 63 C13 63 7 47 7 37 C7 24 16 14 28 14 Z"
            stroke={`url(#ctrlGrad-${size})`}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#ctrl-glow-${size})`}
          />

          {/* D-Pad */}
          <path
            d="M26 29 L26 39 M21 34 L31 34"
            stroke="#ffffff"
            strokeWidth="2.6"
            strokeLinecap="round"
          />

          {/* Action buttons (4 dots) */}
          <circle cx="74" cy="29" r="2" fill="#ffffff" />
          <circle cx="69" cy="34" r="2" fill="#ffffff" />
          <circle cx="79" cy="34" r="2" fill="#ffffff" />
          <circle cx="74" cy="39" r="2" fill="#ffffff" />

          {/* Center touchpad rectangle */}
          <rect
            x="44"
            y="23"
            width="12"
            height="8"
            rx="2.5"
            stroke="#e9d5ff"
            strokeWidth="1.6"
          />
        </svg>
      </div>

      {/* "Oliveal" wordmark — italic, white, bold */}
      <h1
        className={`font-black italic tracking-tight text-white leading-none ${
          isSmall
            ? 'text-xl sm:text-[1.35rem]'
            : 'text-[2rem] sm:text-[2.3rem]'
        } drop-shadow-[0_2px_14px_rgba(255,255,255,0.2)]`}
      >
        Oliveal
      </h1>

      {/* "GAMING ZONE" subtitle */}
      <p
        className={`font-bold uppercase tracking-[0.32em] text-slate-300 ${
          isSmall ? 'text-[8.5px] sm:text-[9.5px] mt-0.5' : 'text-[10px] sm:text-[11px] mt-1'
        }`}
      >
        GAMING ZONE
      </p>
    </div>
  );
}
