import { useNavigate } from 'react-router-dom';
import { House, Zap, ScanLine, Gamepad2, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: House, route: '/admin/dashboard' },
  { id: 'spot-booking', label: 'Spot Booking', icon: Zap, route: '/admin/spot-booking' },
  { id: 'check-in', label: 'Check In', icon: ScanLine, route: null },
  { id: 'stations', label: 'Stations', icon: Gamepad2, route: null },
  { id: 'settings', label: 'Settings', icon: Settings, route: null },
];

/**
 * Persistent mobile-first bottom navigation bar for the Admin section.
 * Features a smooth GPU-composited sliding active neon highlight pill across tabs.
 */
export default function BottomNavigation({ activeTab = 'dashboard', onSelectUpcomingTab }) {
  const navigate = useNavigate();
  const activeIndex = Math.max(
    0,
    NAV_ITEMS.findIndex((item) => item.id === activeTab)
  );

  return (
    <nav
      aria-label="Admin bottom navigation"
      className="fixed bottom-0 inset-x-0 z-40 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)]"
    >
      <div className="max-w-md sm:max-w-xl mx-auto rounded-2xl bg-[#110822]/95 border border-purple-500/30 shadow-[0_-8px_32px_rgba(0,0,0,0.65),0_0_24px_rgba(124,58,237,0.18)] backdrop-blur-xl p-1.5">
        <div className="relative grid grid-cols-5 items-stretch">
          {/* Smooth sliding neon-purple active indicator pill */}
          <div
            aria-hidden="true"
            style={{ transform: `translate3d(${activeIndex * 100}%, 0, 0)` }}
            className="pointer-events-none absolute top-0 bottom-0 left-0 w-1/5 px-0.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none will-change-transform"
          >
            <div className="w-full h-full rounded-xl bg-gradient-to-b from-[#9333EA] to-[#6D28D9] border border-purple-300/40 shadow-[0_0_20px_rgba(147,51,234,0.45)]" />
          </div>

          {NAV_ITEMS.map(({ id, label, icon: Icon, route }) => {
            const isActive = activeTab === id;

            const handleClick = () => {
              if (isActive) return;
              if (route) {
                navigate(route);
              } else if (typeof onSelectUpcomingTab === 'function') {
                onSelectUpcomingTab(label);
              }
            };

            return (
              <button
                key={id}
                type="button"
                onClick={handleClick}
                aria-current={isActive ? 'page' : undefined}
                className={`relative z-10 group flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                  isActive
                    ? 'text-white'
                    : 'text-[#A9A0BC] hover:text-white'
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] sm:w-5 sm:h-5 transition-transform duration-200 ${
                    isActive ? 'text-white scale-105' : 'text-[#A9A0BC] group-hover:text-white'
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
