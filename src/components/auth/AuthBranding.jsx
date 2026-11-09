import React from 'react';

export default function AuthBranding({ size = 'md' }) {
  const isSmall = size === 'sm';

  return (
    <div className="flex flex-col items-center justify-center text-center select-none">
      {/* Neon Controller Icon */}
      <div className="relative mb-1 flex items-center justify-center">
        {/* Ambient Glow behind controller */}
        <div className="absolute inset-0 bg-purple-500/35 blur-xl rounded-full scale-125 pointer-events-none" />
        
        <svg
          className={`${isSmall ? 'w-11 h-8' : 'w-14 h-10'} text-purple-400 relative z-10 transition-transform duration-300 hover:scale-105`}
          viewBox="0 0 100 70"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="logo-glow" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="controllerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e9d5ff" />
              <stop offset="40%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
          </defs>

          {/* Sparkles / Plus signs */}
          <path d="M12 20 L16 20 M14 18 L14 22" stroke="#d8b4fe" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M84 18 L88 18 M86 16 L86 20" stroke="#d8b4fe" strokeWidth="1.5" strokeLinecap="round" />

          {/* Main Controller Body */}
          <path
            d="M28 14 C36 14 42 20 50 20 C58 20 64 14 72 14 C84 14 93 24 93 37 C93 47 87 63 76 63 C69 63 65 52 61 47 C57 42 54 41 50 41 C46 41 43 42 39 47 C35 52 31 63 24 63 C13 63 7 47 7 37 C7 24 16 14 28 14 Z"
            stroke="url(#controllerGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#logo-glow)"
          />

          {/* D-Pad (Left) */}
          <path
            d="M26 29 L26 39 M21 34 L31 34"
            stroke="#ffffff"
            strokeWidth="2.4"
            strokeLinecap="round"
          />

          {/* Action Buttons (Right) */}
          <circle cx="74" cy="29" r="1.8" fill="#ffffff" />
          <circle cx="69" cy="34" r="1.8" fill="#ffffff" />
          <circle cx="79" cy="34" r="1.8" fill="#ffffff" />
          <circle cx="74" cy="39" r="1.8" fill="#ffffff" />

          {/* Touchpad / Center Outline */}
          <rect
            x="44"
            y="23"
            width="12"
            height="8"
            rx="2.5"
            stroke="#d8b4fe"
            strokeWidth="1.6"
          />
        </svg>
      </div>

      {/* Brand Title */}
      <h1 className="font-extrabold tracking-tight text-white italic text-2xl sm:text-3xl drop-shadow-[0_2px_12px_rgba(255,255,255,0.2)]">
        Oliveal
      </h1>

      {/* Subtitle */}
      <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.3em] text-slate-300 uppercase mt-0.5">
        GAMING ZONE
      </p>
    </div>
  );
}
