import React from 'react';

export default function AuthInput({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon: Icon,
  error,
  required = false,
  autoComplete,
  rightElement = null,
  disabled = false,
}) {
  return (
    <div className="w-full flex flex-col gap-1.5 mb-4">
      {label && (
        <label
          htmlFor={id || name}
          className="text-xs sm:text-sm font-medium text-slate-200 select-none flex items-center justify-between"
        >
          <span>{label}</span>
          {required && <span className="text-purple-400 text-xs">*</span>}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {Icon && (
          <div className="absolute left-3.5 sm:left-4 pointer-events-none text-slate-300 flex items-center justify-center z-10">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
          </div>
        )}

        <input
          id={id || name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`w-full py-2.5 sm:py-3 text-sm rounded-xl text-white placeholder-slate-400/90 bg-[#19152e]/90 border transition-all duration-200 outline-none backdrop-blur-sm ${
            Icon ? 'pl-10 sm:pl-11' : 'pl-4'
          } ${rightElement ? 'pr-11 sm:pr-12' : 'pr-4'} ${
            error
              ? 'border-red-500/70 focus:border-red-400 focus:ring-2 focus:ring-red-500/25'
              : 'border-white/10 hover:border-white/20 focus:border-purple-400 focus:bg-[#201b3b]/95 focus:ring-2 focus:ring-purple-500/30 focus:shadow-[0_0_15px_rgba(168,85,247,0.25)]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />

        {rightElement && (
          <div className="absolute right-3 sm:right-3.5 flex items-center justify-center z-10">
            {rightElement}
          </div>
        )}
      </div>

      {error && (
        <span className="text-xs text-red-400 font-medium mt-0.5 pl-1 animate-fadeIn">
          {error}
        </span>
      )}
    </div>
  );
}
