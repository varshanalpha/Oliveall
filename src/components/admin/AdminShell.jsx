import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Info, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clearAdminDashboardCache } from '../../hooks/useAdminDashboard';
import AdminHeader from './AdminHeader';
import BottomNavigation from './BottomNavigation';

function getRouteOrderIndex(pathname) {
  if (pathname.startsWith('/admin/check-in')) return 2;
  if (pathname.startsWith('/admin/spot-booking/details')) return 1.5;
  if (pathname.startsWith('/admin/spot-booking')) return 1;
  return 0;
}

function getActiveTabId(pathname) {
  if (pathname.startsWith('/admin/check-in')) return 'check-in';
  if (pathname.startsWith('/admin/spot-booking')) return 'spot-booking';
  return 'dashboard';
}

/**
 * Shared persistent layout shell for Admin pages (/admin/dashboard, /admin/spot-booking,
 * /admin/spot-booking/details/:bookingRef). Keeps AdminHeader & BottomNavigation stationary
 * while smoothly animating tab content left or right based on navigation direction.
 */
export default function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const [navNotice, setNavNotice] = useState(null);
  const [refreshState, setRefreshState] = useState({ refreshing: false });
  const refreshHandlerRef = useRef(null);

  const isBookingDetailsRoute = location.pathname.startsWith('/admin/spot-booking/details');
  const currentIdx = getRouteOrderIndex(location.pathname);
  const prevIdxRef = useRef(currentIdx);
  const [transitionClass, setTransitionClass] = useState('animate-fadeIn');

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    const rafId = requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));

    const prevIdx = prevIdxRef.current;
    if (currentIdx > prevIdx) {
      setTransitionClass('animate-tab-from-right');
    } else if (currentIdx < prevIdx) {
      setTransitionClass('animate-tab-from-left');
    } else {
      setTransitionClass('animate-fadeIn');
    }
    prevIdxRef.current = currentIdx;
    return () => cancelAnimationFrame(rafId);
  }, [location.pathname, currentIdx]);

  useEffect(() => {
    if (!navNotice) return undefined;
    const timer = setTimeout(() => setNavNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [navNotice]);

  const handleSignOut = useCallback(async () => {
    clearAdminDashboardCache();
    try {
      await signOut();
    } finally {
      navigate('/login', { replace: true });
    }
  }, [signOut, navigate]);

  const registerRefreshHandler = useCallback((fn, isRefreshing = false) => {
    refreshHandlerRef.current = fn;
    setRefreshState({ refreshing: Boolean(isRefreshing) });
  }, []);

  const handleHeaderRefresh = useCallback(() => {
    refreshHandlerRef.current?.();
  }, []);

  const handleSelectUpcomingTab = useCallback((tabLabel) => {
    setNavNotice(`${tabLabel} module will be implemented in an upcoming step.`);
  }, []);

  return (
    <div className="min-h-[100dvh] w-full bg-[#080510] text-white relative overflow-x-hidden flex flex-col">
      {/* Persistent controlled ambient radial purple lighting */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[540px] h-[340px] rounded-full bg-[#7C3AED]/14 blur-[120px]" />
        <div className="absolute top-[42%] left-1/2 -translate-x-1/2 w-[420px] h-[280px] rounded-full bg-[#D946EF]/[0.06] blur-[120px]" />
      </div>

      {!isBookingDetailsRoute && (
        <AdminHeader
          adminProfile={profile}
          notificationCount={0}
          notifications={[]}
          onSignOut={handleSignOut}
          onRefresh={handleHeaderRefresh}
          refreshing={refreshState.refreshing}
        />
      )}

      {/* Animated Route Content Stage */}
      <div
        key={location.pathname}
        className={`relative z-10 flex-1 flex flex-col w-full ${transitionClass}`}
      >
        <Outlet context={{ registerRefreshHandler }} />
      </div>

      {/* Non-blocking status notice for upcoming navigation tabs */}
      {navNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm rounded-xl bg-[#1A0C2E]/95 border border-purple-400/40 px-3.5 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.6),0_0_20px_rgba(124,58,237,0.3)] backdrop-blur-xl flex items-center justify-between gap-2.5"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Info className="w-4 h-4 text-[#C084FC] shrink-0" aria-hidden="true" />
            <p className="text-xs text-white font-medium leading-snug">{navNotice}</p>
          </div>
          <button
            type="button"
            onClick={() => setNavNotice(null)}
            aria-label="Dismiss notice"
            className="text-[#A9A0BC] hover:text-white p-0.5 rounded cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <BottomNavigation
        activeTab={getActiveTabId(location.pathname)}
        onSelectUpcomingTab={handleSelectUpcomingTab}
      />
    </div>
  );
}

