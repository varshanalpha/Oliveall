import { Calendar, IndianRupee, Users, Gamepad2 } from 'lucide-react';
import KpiCard from './KpiCard';

/**
 * Formats an INR currency figure cleanly using Indian digit grouping.
 *
 * @param {number} amount
 * @returns {string}
 */
function formatInr(amount) {
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return `₹${safeAmount.toLocaleString('en-IN', {
    maximumFractionDigits: Number.isInteger(safeAmount) ? 0 : 2,
  })}`;
}

/**
 * Responsive 2-column mobile (4-column desktop) grid for the four core Admin KPI cards.
 * Displays strictly verified database-backed metrics or explicit unavailable states.
 */
export default function KpiGrid({ kpis, loading = false }) {
  const todayBookingsCount = kpis?.todayBookings ?? 0;

  const revenueAvailable = Boolean(kpis?.todayRevenue?.available);
  const revenueValue = revenueAvailable ? formatInr(kpis.todayRevenue.amount ?? 0) : '—';
  const revenueSubtext = revenueAvailable ? undefined : kpis?.todayRevenue?.reason || 'Awaiting payment records';

  const totalCustomersCount = kpis?.totalCustomers ?? 0;

  const stationsAvailable = Boolean(kpis?.activeStations?.available);
  const inUseCount = kpis?.activeStations?.inUseCount ?? 0;
  const totalStationsCount = kpis?.activeStations?.totalCount ?? 0;
  const freeStationsCount = kpis?.activeStations?.freeCount ?? 0;

  const stationsValue = stationsAvailable ? `${inUseCount} / ${totalStationsCount}` : '—';
  const stationsSubtext = stationsAvailable
    ? `${freeStationsCount} ${freeStationsCount === 1 ? 'station' : 'stations'} available`
    : kpis?.activeStations?.reason || 'Unavailable';

  return (
    <section aria-label="Dashboard Key Performance Indicators" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <KpiCard
        label="Today's Bookings"
        value={Number(todayBookingsCount).toLocaleString('en-IN')}
        icon={Calendar}
        theme="purple"
        loading={loading}
      />

      <KpiCard
        label="Today's Revenue"
        value={revenueValue}
        subtext={revenueSubtext}
        icon={IndianRupee}
        theme="blue"
        loading={loading}
        unavailable={!loading && !revenueAvailable}
      />

      <KpiCard
        label="Total Customers"
        value={Number(totalCustomersCount).toLocaleString('en-IN')}
        icon={Users}
        theme="green"
        loading={loading}
      />

      <KpiCard
        label="Active Stations"
        value={stationsValue}
        subtext={stationsSubtext}
        icon={Gamepad2}
        theme="amber"
        loading={loading}
        unavailable={!loading && !stationsAvailable}
      />
    </section>
  );
}

