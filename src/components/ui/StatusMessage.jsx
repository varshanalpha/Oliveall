import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export default function StatusMessage({ type = 'info', message, onClose }) {
  if (!message) return null;

  const isError = type === 'error';
  const isSuccess = type === 'success';

  return (
    <div
      className={`w-full p-3.5 mb-4 rounded-xl text-xs sm:text-sm font-medium flex items-start gap-2.5 backdrop-blur-md transition-all duration-300 animate-fadeIn ${
        isError
          ? 'bg-red-500/15 border border-red-500/30 text-red-300'
          : isSuccess
          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
          : 'bg-purple-500/15 border border-purple-500/30 text-purple-200'
      }`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {isError && <AlertCircle className="w-4 h-4 text-red-400" />}
        {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        {!isError && !isSuccess && <Info className="w-4 h-4 text-purple-400" />}
      </div>
      <div className="flex-1 leading-snug">{message}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xs ml-1"
        >
          ✕
        </button>
      )}
    </div>
  );
}

