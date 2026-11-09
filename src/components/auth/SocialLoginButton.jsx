import React from 'react';
import GoogleIcon from '../icons/GoogleIcon';

export default function SocialLoginButton({
  onClick,
  provider = 'Google',
  text = 'Continue with Google',
  disabled = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3.5 sm:py-4 px-5 sm:px-6 rounded-2xl bg-[#120f24]/80 hover:bg-[#1a1533] border border-white/15 hover:border-purple-400/50 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 text-sm sm:text-[15px] font-semibold text-white shadow-sm backdrop-blur-sm select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <GoogleIcon className="w-5 h-5 flex-shrink-0" />
      <span>{text}</span>
    </button>
  );
}

