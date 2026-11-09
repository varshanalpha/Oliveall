import React from 'react';

/**
 * OLIVEAL GAMING ZONE — OFFICIAL BRANDING COMPONENT
 * Renders the high-contrast, premium saturated crest logo.
 * 
 * Props:
 * - size: 'xs' | 'sm' | 'md' | 'lg'
 * - className: additional wrapper classes
 */
export default function AuthBranding({ size = 'md', className = '' }) {
  const sizeMap = {
    xs: {
      img: 'h-10 sm:h-12',
      shadow: 'drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)] drop-shadow-[0_0_6px_rgba(168,85,247,0.25)]',
    },
    sm: {
      img: 'h-[72px] sm:h-[84px]',
      shadow: 'drop-shadow-[0_6px_16px_rgba(0,0,0,0.85)] drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]',
    },
    md: {
      img: 'h-36 sm:h-44',
      shadow: 'drop-shadow-[0_10px_24px_rgba(0,0,0,0.9)] drop-shadow-[0_0_14px_rgba(168,85,247,0.35)]',
    },
    lg: {
      img: 'h-48 sm:h-56',
      shadow: 'drop-shadow-[0_14px_32px_rgba(0,0,0,0.95)] drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]',
    },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      <div className="relative flex items-center justify-center group">
        {/* Subtle, tight ambient violet backlight (controlled, not hazy) */}
        <div
          className="absolute inset-0 bg-purple-700/15 blur-md rounded-full pointer-events-none transition-all duration-300 group-hover:bg-purple-700/25 scale-105"
        />

        {/* Official Oliveal Gaming Zone Crest Logo — High Contrast & Saturation */}
        <img
          src="/assets/images/oliveal-logo.png"
          alt="Oliveal Gaming Zone"
          className={`relative z-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105 filter ${currentSize.shadow} ${currentSize.img}`}
          loading="eager"
        />
      </div>
    </div>
  );
}
