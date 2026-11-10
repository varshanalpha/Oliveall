import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { STATIONS as DEFAULT_STATIONS } from '../../services/mock/stationMockData';

export default function StationSelector({ stations, selectedStation, onSelectStation }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const stationList = stations && stations.length > 0 ? stations : DEFAULT_STATIONS;

  if (!selectedStation) return null;

  return (
    <div className="relative w-full">
      {/* Selected Station Card */}
      <div
        onClick={() => setDropdownOpen((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setDropdownOpen((prev) => !prev);
          }
        }}
        className="relative flex items-center justify-between p-4 sm:p-5 rounded-3xl bg-[#120f22]/85 hover:bg-[#151129]/90 border border-white/[0.09] hover:border-purple-500/40 backdrop-blur-xl shadow-glass-card transition-all cursor-pointer select-none group"
      >
        <div className="flex items-center gap-3.5 sm:gap-4">
          {/* Station Image Thumbnail */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-[#181233] to-[#0d0a1a] border border-white/[0.08] flex items-center justify-center p-2 shrink-0">
            <div className="absolute inset-0 bg-purple-600/15 blur-lg pointer-events-none" />
            <img
              src={selectedStation.image}
              alt={selectedStation.name}
              className="w-full h-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]"
            />
          </div>

          {/* Station Metadata */}
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight group-hover:text-purple-200 transition-colors">
              {selectedStation.name}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
              {selectedStation.category}
            </p>


          </div>
        </div>

        {/* Right Station Category Pill & Dropdown Chevron */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="px-3 py-1 rounded-full bg-purple-600/30 border border-purple-400/40 text-purple-200 text-xs font-bold uppercase tracking-wider shadow-sm">
            {selectedStation.tag}
          </span>
          <div className="flex items-center gap-1 text-slate-400 text-xs font-medium group-hover:text-white transition">
            <span>Change</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {/* Station Switcher Dropdown Drawer */}
      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full mt-2 p-2 rounded-2xl bg-[#130f29]/95 border border-purple-500/30 backdrop-blur-2xl shadow-glass-card z-50 animate-fadeIn max-h-72 overflow-y-auto">
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-purple-300/80 border-b border-white/[0.08] mb-1">
              Select Station
            </div>
            {stationList.map((station) => {
              const isSelected = station.id === selectedStation.id;
              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => {
                    onSelectStation(station);
                    setDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition ${isSelected
                    ? 'bg-purple-600/30 text-white border border-purple-500/40'
                    : 'hover:bg-white/[0.06] text-slate-300 hover:text-white'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={station.image}
                      alt={station.name}
                      className="w-8 h-8 object-contain rounded-lg bg-[#0d091a] p-1 border border-white/10"
                    />
                    <div>
                      <span className="text-sm font-bold block leading-tight">{station.name}</span>
                      <span className="text-[11px] text-slate-400">{station.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.08] text-purple-200 font-semibold">
                      {station.tag}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
