import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Info, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import AdminHeader from '../../components/admin/AdminHeader';
import DashboardHeading from '../../components/admin/DashboardHeading';
import KpiGrid from '../../components/admin/KpiGrid';
import RecentBookings from '../../components/admin/RecentBookings';
import BottomNavigation from '../../components/admin/BottomNavigation';

/**
 * Oliveal Gaming Zone — Admin Dashboard
 * Connects KPI metrics, active station occupancy, and recent bookings directly to Supabase.
 */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { data, loading, refreshing, error, refresh } = useAdminDashboard();
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => {
      setNotice(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } finally {
      navigate('/login', { replace: true });
    }
  }, [signOut, navigate]);

  const handleViewAllBookings = useCallback(() => {
    setNotice('Full booking management views will be added in the upcoming admin steps.');
  }, []);

  const handleSelectUpcomingTab = useCallback((tabLabel) => {
    setNotice(`${tabLabel} module will be implemented in an upcoming step.`);
  }, []);

  const activeAdminProfile = data?.adminProfile || profile;

  return (
    <div className="min-h-screen w-full bg-[#080510] text-white relative overflow-x-hidden flex flex-col">
      {/* Subtle controlled ambient radial purple lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[540px] h-[340px] rounded-full bg-[#7C3AED]/14 blur-[120px]" />
        <div className="absolute top-[42%] left-1/2 -translate-x-1/2 w-[420px] h-[280px] rounded-full bg-[#D946EF]/[0.06] blur-[120px]" />
      </div>

      <AdminHeader
        adminProfile={activeAdminProfile}
        notificationCount={data?.notifications?.count ?? 0}
        notifications={data?.notifications?.items ?? []}
        onSignOut={handleSignOut}
        onRefresh={refresh}
        refreshing={refreshing}
      />

      <main className="relative z-10 flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-28 space-y-5">
        <DashboardHeading
          title="Admin Dashboard"
          subtitle="Manage spot bookings, check-ins and stations"
        />

        {error && (
          <div
            role="alert"
            className="rounded-2xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
              <p className="text-xs sm:text-sm text-rose-200 truncate">{error}</p>
            </div>
            <button
              type="button"
              onClick={refresh}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-xs font-semibold text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              Retry
            </button>
          </div>
        )}

        <KpiGrid kpis={data?.kpis} loading={loading} />

        <RecentBookings
          bookings={data?.recentBookings ?? []}
          loading={loading}
          error={error && !data ? error : null}
          onRetry={refresh}
          onViewAll={handleViewAllBookings}
        />
      </main>

      {/* Non-blocking status notice for out-of-scope navigation tabs / View All */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm rounded-xl bg-[#1A0C2E]/95 border border-purple-400/40 px-3.5 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.6),0_0_20px_rgba(124,58,237,0.3)] backdrop-blur-xl flex items-center justify-between gap-2.5"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Info className="w-4 h-4 text-[#C084FC] shrink-0" aria-hidden="true" />
            <p className="text-xs text-white font-medium leading-snug">{notice}</p>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notice"
            className="text-[#A9A0BC] hover:text-white p-0.5 rounded cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <BottomNavigation
        activeTab="dashboard"
        onSelectUpcomingTab={handleSelectUpcomingTab}
      />
    </div>
  );
}

