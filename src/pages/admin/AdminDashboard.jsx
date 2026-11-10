import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import DashboardHeading from '../../components/admin/DashboardHeading';
import KpiGrid from '../../components/admin/KpiGrid';
import RecentBookings from '../../components/admin/RecentBookings';
import AllBookingsModal from '../../components/admin/AllBookingsModal';

/**
 * Oliveal Gaming Zone — Admin Dashboard View (rendered inside persistent AdminShell).
 * Connects KPI metrics, active station occupancy, and recent bookings directly to Supabase.
 */
export default function AdminDashboard() {
  const outletContext = useOutletContext();
  const registerRefreshHandler = outletContext?.registerRefreshHandler;
  const { data, loading, refreshing, error, refresh } = useAdminDashboard();
  const [allBookingsOpen, setAllBookingsOpen] = useState(false);

  useEffect(() => {
    registerRefreshHandler?.(refresh, refreshing);
  }, [registerRefreshHandler, refresh, refreshing]);

  const handleViewAllBookings = useCallback(() => {
    setAllBookingsOpen(true);
  }, []);

  return (
    <>
      <main className="relative z-10 flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-4 sm:pt-5 pb-[88px] flex flex-col gap-4 sm:gap-5">
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
          totalBookingsCount={data?.totalBookingsCount ?? null}
          loading={loading}
          error={error && !data ? error : null}
          onRetry={refresh}
          onViewAll={handleViewAllBookings}
        />
      </main>

      <AllBookingsModal
        isOpen={allBookingsOpen}
        onClose={() => setAllBookingsOpen(false)}
        initialBookings={data?.recentBookings ?? []}
        totalCount={data?.totalBookingsCount ?? 0}
      />
    </>
  );
}
