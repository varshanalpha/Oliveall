import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AuthLayout({
  children,
  showBackButton = false,
  onBack,
  backTo = '/login',
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(backTo);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#07060e] text-white flex flex-col justify-between items-center overflow-x-hidden selection:bg-purple-600 selection:text-white">
      
      {/* ================= BACKGROUND GAMING ATMOSPHERE ================= */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Deep ambient dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0818] via-[#07060e] to-[#040308]" />

        {/* Ambient Top & Corner Violet Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/4 -right-36 w-96 h-96 bg-fuchsia-600/15 rounded-full blur-[140px]" />
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-purple-600/25 rounded-full blur-[130px]" />

        {/* Ambient Neon Arc (top right corner — stays far from center content) */}
        <svg
          className="absolute -top-6 right-0 w-[280px] h-[280px] opacity-35"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M20 180 A140 140 0 0 1 180 20"
            stroke="url(#arcGlow)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="arcGlow" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#c084fc" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#d946ef" stopOpacity="0.25" />
            </linearGradient>
          </defs>
        </svg>

        {/* Background Neon Controller Wall Silhouette (top-right ambient graphic) */}
        <div className="absolute top-32 right-6 sm:right-20 opacity-25">
          <svg className="w-24 h-18 text-purple-400" viewBox="0 0 100 70" fill="none">
            <path
              d="M28 14 C36 14 42 20 50 20 C58 20 64 14 72 14 C84 14 93 24 93 37 C93 47 87 63 76 63 C69 63 65 52 61 47 C57 42 54 41 50 41 C46 41 43 42 39 47 C35 52 31 63 24 63 C13 63 7 47 7 37 C7 24 16 14 28 14 Z"
              stroke="#a855f7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="4 2"
            />
          </svg>
        </div>

        {/* Subtle Room Wall Grid / Tech lines */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />

        {/* ================= BOTTOM ILLUMINATED CONTROLLER FIXTURE ================= */}
        {/* Renders the ambient glowing gamepad controller resting at the bottom surface */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-full max-w-[500px] flex flex-col items-center justify-end pointer-events-none select-none">
          {/* Surface Neon Glow Strip */}
          <div className="w-3/4 h-[3px] bg-gradient-to-r from-transparent via-purple-500 to-transparent blur-[1px] shadow-[0_0_20px_#a855f7]" />
          
          <div className="relative w-72 h-36 mt-[-10px] flex items-center justify-center">
            {/* Ambient backlight under controller */}
            <div className="absolute bottom-2 w-56 h-14 bg-gradient-to-t from-fuchsia-600/30 to-purple-600/20 blur-xl rounded-full" />
            
            {/* Gamepad silhouette with illuminated contours */}
            <svg
              className="w-full h-full drop-shadow-[0_-5px_15px_rgba(168,85,247,0.35)]"
              viewBox="0 0 300 150"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e1833" />
                  <stop offset="60%" stopColor="#110d20" />
                  <stop offset="100%" stopColor="#08060f" />
                </linearGradient>
                <linearGradient id="edgeNeon" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#9333ea" stopOpacity="0.2" />
                  <stop offset="25%" stopColor="#c084fc" />
                  <stop offset="50%" stopColor="#d946ef" />
                  <stop offset="75%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#9333ea" stopOpacity="0.2" />
                </linearGradient>
              </defs>

              {/* Gamepad Shell */}
              <path
                d="M75 35 C105 35 125 50 150 50 C175 50 195 35 225 35 C260 35 285 65 285 105 C285 130 265 145 240 145 C220 145 208 120 195 108 C180 95 170 92 150 92 C130 92 120 95 105 108 C92 120 80 145 60 145 C35 145 15 130 15 105 C15 65 40 35 75 35 Z"
                fill="url(#bodyGrad)"
                stroke="url(#edgeNeon)"
                strokeWidth="2"
              />

              {/* Thumbsticks Grips with subtle purple lighting */}
              <circle cx="112" cy="85" r="20" fill="#141124" stroke="#4c3575" strokeWidth="2.5" />
              <circle cx="112" cy="85" r="14" fill="#0d0b17" stroke="#9333ea" strokeWidth="1" />
              
              <circle cx="188" cy="85" r="20" fill="#141124" stroke="#4c3575" strokeWidth="2.5" />
              <circle cx="188" cy="85" r="14" fill="#0d0b17" stroke="#9333ea" strokeWidth="1" />

              {/* Touchpad / Lightbar strip */}
              <path
                d="M120 54 L180 54 L175 72 L125 72 Z"
                fill="#0d0a1a"
                stroke="#a855f7"
                strokeWidth="1.5"
                className="animate-pulse"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ================= TOP BAR (OPTIONAL BACK BUTTON) ================= */}
      <div className="relative z-20 w-full max-w-[465px] mx-auto pt-[max(env(safe-area-inset-top),0.85rem)] px-4 sm:px-5 flex items-center justify-between min-h-[44px]">
        {showBackButton ? (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go Back"
            className="w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 border border-white/10 flex items-center justify-center text-slate-200 hover:text-white transition-all backdrop-blur-md shadow-lg group"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>

      {/* ================= MAIN CONTENT CONTAINER ================= */}
      <main className="relative z-10 w-full max-w-[468px] mx-auto px-4 sm:px-5 pb-6 pt-0 flex-1 flex flex-col justify-center items-center">
        {children}
      </main>

    </div>
  );
}
