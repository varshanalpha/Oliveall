import { Check, Disc } from 'lucide-react';

/**
 * Individual selectable gaming station card for Admin Spot Booking.
 * Displays official PlayStation logo + PS5 visual for console stations,
 * and Racing Simulator visual for simulator rigs while keeping all active stations selectable.
 */
export default function StationCard({ station, isSelected = false, onSelect, disabled = false }) {
  const isSimulator =
    station?.type === 'simulator' ||
    station?.category === 'Racing Simulator' ||
    Number(station?.maxPlayers) === 1;

  const visualSrc = isSimulator
    ? station?.image || '/assets/images/racing-simulator.png'
    : station?.image || '/assets/images/ps5-station.png';

  const categoryText = isSimulator ? 'Racing Simulator' : 'PS5';

  return (
    <button
      type="button"
      onClick={() => onSelect(station)}
      disabled={disabled}
      aria-pressed={isSelected}
      className={`group relative w-full text-left rounded-xl p-3 flex items-center justify-between gap-2 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C084FC] disabled:opacity-60 ${
        isSelected
          ? 'border-[1.5px] border-[#C084FC] bg-gradient-to-br from-[#2C1256]/95 via-[#1C0E39]/95 to-[#140A28] shadow-[0_0_20px_rgba(168,85,247,0.42)]'
          : 'border border-purple-500/20 bg-[#160F26]/90 hover:border-purple-400/45 hover:bg-[#1D1333]/90'
      }`}
    >
      {/* Selected Check Badge */}
      {isSelected && (
        <span
          aria-hidden="true"
          className="absolute -top-2 -right-1.5 w-5 h-5 rounded-full bg-[#A855F7] border border-purple-200/80 flex items-center justify-center text-white shadow-[0_0_12px_rgba(168,85,247,0.85)] z-10"
        >
          <Check className="w-3 h-3 stroke-[3]" />
        </span>
      )}

      {/* Left: Station Name & Brand Category */}
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm font-extrabold text-white tracking-tight uppercase truncate">
          {station.name}
        </p>

        <div className="mt-1 flex items-center gap-1.5 min-w-0">
          {isSimulator ? (
            <Disc className="w-3.5 h-3.5 text-[#A9A0BC] shrink-0" aria-hidden="true" />
          ) : (
            <img
              src="/assets/images/ps5-logo.png"
              alt=""
              aria-hidden="true"
              className="w-4 h-3.5 object-contain shrink-0 select-none"
            />
          )}
          <span
            className={`text-[10.5px] sm:text-[11px] font-medium leading-tight truncate ${
              isSelected ? 'text-[#E9D5FF]' : 'text-[#A9A0BC]'
            }`}
          >
            {categoryText}
          </span>
        </div>
      </div>

      {/* Right: Hardware Artwork (aspect-ratio preserved) */}
      <div className="shrink-0 flex items-center justify-center">
        <img
          src={visualSrc}
          alt={station.name}
          loading="lazy"
          className={`${
            isSimulator ? 'w-12 h-11 sm:w-14 sm:h-12' : 'w-10 h-12 sm:w-12 sm:h-14'
          } object-contain select-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.65)]`}
        />
      </div>
    </button>
  );
}

