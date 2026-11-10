import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';

/**
 * Confirmation dialog shown before enabling global booking restrictions in Admin Settings.
 * Rendered via createPortal so it overlays AdminHeader and BottomNavigation cleanly.
 */
export default function SettingConfirmationModal({
  isOpen = false,
  title = '',
  description = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger', // danger | warning
  updating = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !updating) {
        onCancel?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, updating, onCancel]);

  if (!isOpen) return null;

  const isDanger = tone === 'danger';

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="setting-confirm-title"
      aria-describedby="setting-confirm-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080510]/85 backdrop-blur-md animate-fadeIn"
    >
      <div className="w-full max-w-md rounded-3xl bg-[#130B24] border border-purple-500/40 p-5 sm:p-6 shadow-[0_18px_48px_rgba(0,0,0,0.75),0_0_32px_rgba(124,58,237,0.28)] space-y-4 animate-scaleUp">
        <div className="flex flex-col items-center text-center gap-2.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
              isDanger
                ? 'bg-rose-500/15 border-rose-400/40 shadow-[0_0_20px_rgba(244,63,94,0.22)]'
                : 'bg-amber-500/15 border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
            }`}
          >
            <AlertTriangle
              className={`w-6 h-6 ${isDanger ? 'text-rose-300' : 'text-amber-300'}`}
              aria-hidden="true"
            />
          </div>

          <h2
            id="setting-confirm-title"
            className="text-lg sm:text-xl font-extrabold text-white tracking-tight"
          >
            {title}
          </h2>

          <p
            id="setting-confirm-desc"
            className="text-xs sm:text-sm text-[#C4B5FD] leading-relaxed"
          >
            {description}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl bg-rose-500/15 border border-rose-500/40 px-3 py-2 text-xs text-rose-200 leading-snug"
          >
            {error}
          </div>
        )}

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={onConfirm}
            disabled={updating}
            className={`w-full py-3 px-4 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 border transition cursor-pointer disabled:opacity-60 ${
              isDanger
                ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:brightness-110 border-rose-300/35 shadow-[0_8px_24px_rgba(225,29,72,0.4)]'
                : 'bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#9333EA] hover:brightness-110 border-purple-300/35 shadow-[0_8px_24px_rgba(124,58,237,0.45)]'
            }`}
          >
            {updating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Updating Setting...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={updating}
            className="w-full py-2.5 px-4 rounded-2xl bg-[#1A1030]/90 hover:bg-[#23163F] border border-purple-500/35 text-xs sm:text-sm font-semibold text-white transition cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modal, document.body);
  }
  return modal;
}

