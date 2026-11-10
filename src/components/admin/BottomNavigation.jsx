import { House, Zap, ScanLine, Gamepad2, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: House },
  { id: 'spot-booking', label: 'Spot Booking', icon: Zap },
  { id: 'check-in', label: 'Check In', icon: ScanLine },
  { id: 'stations', label: 'Stations', icon: Gamepad2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

/**
 * Persistent mobile-first bottom navigation bar for the Admin section.
 * Strictly locks Dashboard as the active tab during Admin Dashboard implementation;
 * upcoming tabs invoke onSelectUpcomingTab without navigating away.
 */
export default function BottomNavigation({ activeTab = 'dashboard', onSelectUpcomingTab }) {
  return (
    <nav
      aria-label="Admin bottom navigation"
      className="fixed bottom-0 inset-x-0 z-40 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)]"
    >
      <div className="max-w-md sm:max-w-xl mx-auto rounded-2xl bg-[#110822]/95 border border-purple-500/30 shadow-[0_-8px_32px_rgba(0,0,0,0.65),0_0_24px_rgba(124,58,237,0.18)] backdrop-blur-xl px-1.5 py-1.5">
        <div className="grid grid-cols-5 items-stretch gap-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;

            const handleClick = () => {
              if (!isActive && typeof onSelectUpcomingTab === 'function') {
                onSelectUpcomingTab(label);
              }
            };

            return (
              <button
                key={id}
                type="button"
                onClick={handleClick}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                  isActive
                    ? 'bg-gradient-to-b from-[#9333EA] to-[#6D28D9] text-white border border-purple-300/40 shadow-[0_0_20px_rgba(147,51,234,0.45)]'
                    : 'text-[#A9A0BC] hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] sm:w-5 sm:h-5 transition-colors ${
                    isActive ? 'text-white' : 'text-[#A9A0BC] group-hover:text-white'
                  }`}
                  strokeWidth={isActive ? 2.1 : 1.8}
                  aria-hidden="true"
                />
                <span className="text-[10px] sm:text-[11px] font-medium leading-none tracking-tight whitespace-nowrap">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

