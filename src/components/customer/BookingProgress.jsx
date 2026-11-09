import React from 'react';
import { Check } from 'lucide-react';

/**
 * OLIVEAL GAMING ZONE — 3-STEP BOOKING PROGRESS INDICATOR
 * Perfectly aligned with the visual reference:
 * - Connecting neon track runs directly through the centers of the circles
 * - Step 1: Select Station (Completed ✓)
 * - Step 2: Choose Slot (Completed ✓)
 * - Step 3: Confirm Booking (Active 3 with vibrant neon magenta glow)
 */
export default function BookingProgress({ currentStep = 3 }) {
  const steps = [
    { number: 1, label: 'Select Station' },
    { number: 2, label: 'Choose Slot' },
    { number: 3, label: 'Confirm Booking' },
  ];

  return (
    <div className="w-full px-1 py-2 select-none">
      <div className="relative max-w-sm mx-auto flex items-start justify-between">
        
        {/* Continuous neon connecting track running through circle centers */}
        <div className="absolute top-3.5 sm:top-4 left-6 right-6 h-[2px] -translate-y-1/2 bg-gradient-to-r from-purple-500 via-purple-500 to-fuchsia-500 shadow-[0_0_10px_rgba(168,85,247,0.85)] z-0" />

        {/* Step 1 */}
        <div className="flex flex-col items-center z-10 relative">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-600 border border-purple-400/80 flex items-center justify-center text-white shadow-[0_0_12px_rgba(168,85,247,0.6)]">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span className="text-[11px] sm:text-xs font-medium text-slate-300 mt-1.5 text-center">
            {steps[0].label}
          </span>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col items-center z-10 relative">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-600 border border-purple-400/80 flex items-center justify-center text-white shadow-[0_0_12px_rgba(168,85,247,0.6)]">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span className="text-[11px] sm:text-xs font-medium text-slate-300 mt-1.5 text-center">
            {steps[1].label}
          </span>
        </div>

        {/* Step 3 (Active) */}
        <div className="flex flex-col items-center z-10 relative">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 border-2 border-fuchsia-300 flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-[0_0_18px_rgba(217,70,239,0.95)]">
            3
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-white mt-1.5 text-center tracking-tight drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]">
            {steps[2].label}
          </span>
        </div>

      </div>
    </div>
  );
}
