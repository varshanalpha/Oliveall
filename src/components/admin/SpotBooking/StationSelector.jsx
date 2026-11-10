import { Gamepad2, AlertCircle, RefreshCw } from 'lucide-react';
import StationCard from './StationCard';

/**
 * Displays active gaming stations from Supabase in a crisp 2-column mobile grid.
 * Never disables stations solely due to existing bookings on another time window.
 */
export default function StationSelector({
  stations = [],
  selectedStation = null,
  onSelectStation,
  loading = false,
  error = null,
  onRetry,
  selectionError = null,
  disabled = false,
}) {
  return (
    <section
      aria-labelledby="spot-select-station-heading"
      className="rounded-2xl bg-[#120B20]/95 border border-purple-500/30 p-4 shadow-[0_8px_28px_rgba(0,0,0,0.45),0_0_22px_rgba(124,58,237,0.1)] backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 min-w-0">
          <Gamepad2 className="w-4 h-4 text-[#C4B5FD] shrink-0" aria-hidden="true" />
          <h2
            id="spot-select-station-heading"
            className="text-sm sm:text-base font-bold text-white tracking-tight truncate"
          >
            Select Station
          </h2>
        </div>

        {onRetry && error && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C084FC] hover:text-white cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
            <span>Retry</span>
          </button>
        )}
      </div>

      <div className="pt-3.5">
        {loading && stations.length === 0 ? (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="h-[70px] rounded-xl bg-white/[0.04] border border-white/[0.06] animate-pulse"
              />
            ))}
          </div>
        ) : error && stations.length === 0 ? (
          <div className="py-5 text-center space-y-2">
            <AlertCircle className="w-5 h-5 text-rose-400 mx-auto" aria-hidden="true" />
            <p className="text-xs text-rose-200">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-3 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/45 border border-purple-400/35 text-xs font-semibold text-white cursor-pointer"
              >
                Reload Stations
              </button>
            )}
          </div>
        ) : stations.length === 0 ? (
          <p className="py-4 text-center text-xs text-[#A9A0BC]">
            No active gaming stations available.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3" role="radiogroup" aria-label="Gaming Stations">
            {stations.map((station) => (
              <StationCard
                key={station.id}
                station={station}
                isSelected={selectedStation?.id === station.id}
                onSelect={onSelectStation}
                disabled={disabled}
              />
            ))}
          </div>
        )}

        {selectionError && (
          <p
            role="alert"
            className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-300"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" aria-hidden="true" />
            <span>{selectionError}</span>
          </p>
        )}
      </div>
    </section>
  );
}

