import { CalendarX2, Disc, Loader2 } from 'lucide-react';

/**
 * Station management row card reproducing the Oliveal Stations Management UI.
 * Displays real station asset, name, category + max capacity, live Active/Disabled pill,
 * interactive Supabase toggle switch, and Close Slots navigation button.
 */
export default function StationManagementCard({
  station,
  toggling = false,
  onToggleStatus,
  onOpenCloseSlots,
}) {
  if (!station) return null;

  const isSimulator =
    station.type === 'simulator' ||
    station.category === 'Racing Simulator' ||
    Number(station.maxPlayers) === 1;
  const shortCategory = isSimulator ? 'Racing Simulator' : 'PS5';
  const stationVisual =
    station.image ||
    (isSimulator ? '/assets/images/racing-simulator.png' : '/assets/images/ps5-station.png');

  const isActive = station.isActive !== false;

  return (
    <article
      aria-label={`${station.name} station`}
      className={`flex-1 min-h-[58px] rounded-2xl border px-3 py-1.5 sm:px-3.5 sm:py-2 transition-all backdrop-blur-md flex items-center justify-between gap-2 sm:gap-3 ${
        isActive
          ? 'bg-[#120B20]/95 border-purple-500/30 shadow-[0_6px_22px_rgba(0,0,0,0.45),0_0_18px_rgba(124,58,237,0.1)]'
          : 'bg-[#120B20]/80 border-rose-500/25 shadow-[0_6px_18px_rgba(0,0,0,0.4)]'
      }`}
    >
      {/* Left: Station Image + Name + Category/Players */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <div
          className={`w-10 h-10 sm:w-12 sm:h-11 rounded-xl bg-[#090512] border border-purple-500/25 p-1 flex items-center justify-center shrink-0 transition-opacity ${
            isActive ? 'opacity-100' : 'opacity-60 grayscale-[35%]'
          }`}
        >
          <img
            src={stationVisual}
            alt={station.name}
            className="w-full h-full object-contain select-none drop-shadow-[0_3px_8px_rgba(0,0,0,0.75)]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight uppercase truncate leading-tight">
            {station.name}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 min-w-0 text-[9.5px] sm:text-xs text-[#C4B5FD] leading-tight">
            {isSimulator ? (
              <Disc className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#A9A0BC] shrink-0" aria-hidden="true" />
            ) : (
              <img
                src="/assets/images/ps5-logo.png"
                alt="PlayStation"
                className="w-3.5 h-3 object-contain shrink-0 select-none"
              />
            )}
            <span className="font-medium whitespace-nowrap">{shortCategory}</span>
            <span className="text-white/30" aria-hidden="true">|</span>
            <span className="font-medium whitespace-nowrap">Max {station.maxPlayers}P</span>
          </div>
        </div>
      </div>

      {/* Middle: Active / Disabled Status Badge */}
      <div className="shrink-0">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold leading-none border whitespace-nowrap ${
            isActive
              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'bg-rose-500/15 border-rose-400/40 text-rose-300'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isActive
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                : 'bg-rose-400'
            }`}
          />
          <span>{isActive ? 'Active' : 'Disabled'}</span>
        </span>
      </div>

      {/* Right: Enable/Disable Switch + Close Slots Action */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          aria-label={`Toggle ${station.name} station ${isActive ? 'off' : 'on'}`}
          disabled={toggling}
          onClick={() => onToggleStatus?.(station)}
          className={`relative inline-flex items-center w-11 h-6 rounded-full p-0.5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:opacity-60 disabled:cursor-wait ${
            isActive
              ? 'bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] shadow-[0_0_14px_rgba(168,85,247,0.55)] border border-purple-300/40'
              : 'bg-[#1F1635] border border-white/15'
          }`}
        >
          <span
            className={`flex items-center justify-center w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
              isActive ? 'translate-x-5' : 'translate-x-0'
            }`}
          >
            {toggling && (
              <Loader2 className="w-3 h-3 text-[#7C3AED] animate-spin" aria-hidden="true" />
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onOpenCloseSlots?.(station)}
          className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-[#D6CFE6] hover:text-[#C084FC] transition-colors whitespace-nowrap cursor-pointer rounded px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
        >
          <CalendarX2 className="w-3.5 h-3.5 text-[#C084FC] shrink-0" aria-hidden="true" />
          <span>Close Slots</span>
        </button>
      </div>
    </article>
  );
}
