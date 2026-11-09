import React from 'react';

export default function AuthBranding({ size = 'md' }) {
  const isSmall = size === 'sm';

  return (
    <div className="flex flex-col items-center justify-center text-center select-none">
      {/* Controller Icon — clean, floating, no container box */}
      <div className="relative mb-2 flex items-center justify-center">
        {/* Soft purple glow halo behind the controller */}
        <div className="absolute inset-0 bg-purple-500/40 blur-2xl rounded-full scale-150 pointer-events-none" />

        <svg
          className={`${
            isSmall ? 'w-11 h-8' : 'w-[52px] h-[38px] sm:w-[58px] sm:h-[42px]'
          } relative z-10 drop-shadow-[0_0_18px_rgba(192,132,252,0.75)] transition-transform duration-300 hover:scale-105`}
          viewBox="0 0 100 70"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="ctrl-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="ctrlGrad" x1="0%" y1="0%" x2="100%" y2="100%">
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
            stroke="url(#ctrlGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#ctrl-glow)"
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
        className={`font-extrabold italic tracking-tight text-white leading-none ${
          isSmall
            ? 'text-2xl'
            : 'text-[2rem] sm:text-[2.3rem]'
        } drop-shadow-[0_2px_18px_rgba(255,255,255,0.18)]`}
      >
        Oliveal
      </h1>

      {/* "GAMING ZONE" subtitle */}
      <p
        className={`font-bold uppercase tracking-[0.35em] text-slate-300 mt-0.5 ${
          isSmall ? 'text-[9px]' : 'text-[10px] sm:text-[11px]'
        }`}
      >
        GAMING ZONE
      </p>
    </div>
  );
}
