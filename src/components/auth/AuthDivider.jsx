import React from 'react';

export default function AuthDivider({ text = 'or continue with' }) {
  return (
    <div className="flex items-center my-5 w-full select-none">
      <div className="flex-grow h-[1px] bg-gradient-to-r from-transparent via-white/15 to-white/10" />
      <span className="px-3 text-xs text-slate-400 font-medium tracking-wide">
        {text}
      </span>
      <div className="flex-grow h-[1px] bg-gradient-to-l from-transparent via-white/15 to-white/10" />
    </div>
  );
}

