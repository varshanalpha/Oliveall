import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Gamepad2,
  Power,
  CalendarX2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  fetchAdminStationsOverview,
  toggleStationAvailability,
  fetchReleasedBookingsHistory,
} from '../../services/stationsManagementService';
import { subscribeToStationSync } from '../../services/stationService';
import { subscribeToBookingSync } from '../../services/spotBookingService';
import StationManagementCard from '../../components/admin/Stations/StationManagementCard';
import ReleasedSlotsTab from '../../components/admin/Stations/ReleasedSlotsTab';

function StationsListSkeleton() {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {[1, 2, 3, 4, 5, 6].map((idx) => (
        <div
          key={idx}
          className="h-[74px] rounded-2xl bg-[#120B20]/90 border border-purple-500/20 p-3 flex items-center justify-between gap-3 animate-pulse"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-11 rounded-xl bg-white/10" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-24 rounded bg-white/10" />
              <div className="h-3 w-28 rounded bg-white/[0.06]" />
            </div>
          </div>
          <div className="h-6 w-16 rounded-full bg-white/10" />
          <div className="h-6 w-12 rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  );
}

/**
 * Oliveal Gaming Zone — Admin Stations Management Page (rendered inside AdminShell).
 * Controls live station enable/disable states in Supabase and routes into per-station
 * Close Slot management views.
 */
export default function Stations() {
  const navigate = useNavigate();
  const outletContext = useOutletContext();
  const registerRefreshHandler = outletContext?.registerRefreshHandler;

  const [activeSubTab, setActiveSubTab] = useState('stations'); // stations | closed
  const [stations, setStations] = useState([]);
  const [summary, setSummary] = useState({
    totalStations: 0,
    activeCount: 0,
    disabledCount: 0,
    releasedTodayCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [releasedBookings, setReleasedBookings] = useState([]);
  const [releasedLoading, setReleasedLoading] = useState(false);
  const [releasedError, setReleasedError] = useState(null);

  const loadStations = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await fetchAdminStationsOverview();
        setStations(result.stations);
        setSummary(result.summary);
      } catch (err) {
        if (err?.code === 'unauthenticated') {
          navigate('/login', { replace: true });
          return;
        }
        if (err?.code === 'forbidden') {
          navigate('/dashboard', { replace: true });
          return;
        }
        setError(err?.message || 'Unable to load gaming stations from Supabase.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );

  const loadReleasedSlots = useCallback(async () => {
    setReleasedLoading(true);
    setReleasedError(null);
    try {
      const items = await fetchReleasedBookingsHistory({ limit: 50 });
      setReleasedBookings(items);
    } catch (err) {
      setReleasedError(err?.message || 'Failed to load released slot records.');
    } finally {
      setReleasedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  useEffect(() => {
    if (activeSubTab === 'closed') {
      loadReleasedSlots();
    }
  }, [activeSubTab, loadReleasedSlots]);

  useEffect(() => {
    const onStationUpdate = () => loadStations({ silent: true });
    const unsubStations = subscribeToStationSync(onStationUpdate);
    const unsubBookings = subscribeToBookingSync({
      onBookingChange: () => {
        loadStations({ silent: true });
        if (activeSubTab === 'closed') loadReleasedSlots();
      },
    });
    return () => {
      unsubStations();
      unsubBookings();
    };
  }, [loadStations, loadReleasedSlots, activeSubTab]);

  const handleManualRefresh = useCallback(async () => {
    await loadStations({ silent: true });
    if (activeSubTab === 'closed') {
      await loadReleasedSlots();
    }
  }, [loadStations, loadReleasedSlots, activeSubTab]);

  useEffect(() => {
    registerRefreshHandler?.(handleManualRefresh, refreshing || releasedLoading);
  }, [registerRefreshHandler, handleManualRefresh, refreshing, releasedLoading]);

  useEffect(() => {
    if (!feedback) return undefined;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const handleToggleStation = async (station) => {
    if (!station?.id || togglingId) return;
    const nextIsActive = !station.isActive;
    setTogglingId(station.id);
    setFeedback(null);

    try {
      const updated = await toggleStationAvailability(station.id, nextIsActive);
      setStations((prev) => {
        const nextList = prev.map((s) =>
          s.id === station.id ? { ...s, isActive: updated.isActive } : s
        );
        const activeCount = nextList.filter((s) => s.isActive).length;
        setSummary((prevSum) => ({
          ...prevSum,
          activeCount,
          disabledCount: nextList.length - activeCount,
        }));
        return nextList;
      });
      setFeedback({
        type: 'success',
        text: updated.isActive
          ? `${station.name} is now Active and open for customer bookings.`
          : `${station.name} has been Disabled (Temporarily Unavailable for new bookings). Existing bookings remain preserved.`,
      });
    } catch (err) {
      if (err?.code === 'unauthenticated') {
        navigate('/login', { replace: true });
        return;
      }
      if (err?.code === 'forbidden') {
        navigate('/dashboard', { replace: true });
        return;
      }
      // Preserve current DB-synced UI state on failure
      setFeedback({
        type: 'error',
        text: err?.message || `Failed to update ${station.name}. Current status preserved.`,
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenCloseSlots = (station) => {
    if (!station) return;
    const targetRef = station.slug || station.id;
    navigate(`/admin/stations/${encodeURIComponent(targetRef)}/close-slots`, {
      state: { station },
    });
  };

  return (
    <main
      className={`relative z-10 flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-2.5 sm:pt-4 flex flex-col ${
        activeSubTab === 'stations' ? 'pb-[84px] gap-2 sm:gap-2.5' : 'pb-28 space-y-3.5 sm:space-y-4'
      }`}
    >
      {/* Page Heading */}
      <header className="px-0.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <Gamepad2 className="w-6 h-6 sm:w-7 sm:h-7 text-[#C4B5FD] shrink-0" aria-hidden="true" />
          <h1 className="text-[1.5rem] sm:text-[1.75rem] font-extrabold text-white tracking-tight leading-tight">
            Stations
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#A9A0BC] mt-0.5 font-medium leading-snug">
          Manage gaming stations, availability and slot closures
        </p>
      </header>

      {/* 2-Column Live Station Status Summary Bar (Active vs Disabled, full width) */}
      <section
        aria-label="Stations overview metrics"
        className="shrink-0 rounded-2xl bg-[#120B20]/95 border border-purple-500/30 px-2 sm:px-4 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.45),0_0_20px_rgba(124,58,237,0.12)] backdrop-blur-md grid grid-cols-2 divide-x divide-white/[0.08]"
      >
        <div className="flex items-center justify-center gap-2.5 sm:gap-3 px-2 py-0.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center shrink-0">
            <Power className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-emerald-300" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-extrabold text-white leading-none tabular-nums">
              {loading ? '—' : summary.activeCount}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-emerald-300/90 leading-none">
              Active
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2.5 sm:gap-3 px-2 py-0.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-rose-500/15 border border-rose-400/35 flex items-center justify-center shrink-0">
            <Power className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-rose-300" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-extrabold text-white leading-none tabular-nums">
              {loading ? '—' : summary.disabledCount}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-rose-300/90 leading-none">
              Disabled
            </span>
          </div>
        </div>
      </section>

      {/* Segmented Tab Control matching Reference */}
      <div
        role="tablist"
        aria-label="Stations views"
        className="shrink-0 rounded-full bg-[#120B20]/95 border border-purple-500/30 p-1 grid grid-cols-2 shadow-[0_6px_20px_rgba(0,0,0,0.4)]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'stations'}
          onClick={() => setActiveSubTab('stations')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'stations'
              ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-[0_0_20px_rgba(124,58,237,0.5)] border border-purple-300/30'
              : 'text-[#A9A0BC] hover:text-white'
          }`}
        >
          <Gamepad2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Stations</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'closed'}
          onClick={() => setActiveSubTab('closed')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'closed'
              ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-[0_0_20px_rgba(124,58,237,0.5)] border border-purple-300/30'
              : 'text-[#A9A0BC] hover:text-white'
          }`}
        >
          <CalendarX2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Closed Slots</span>
        </button>
      </div>

      {/* Action / Mutation Feedback Toast */}
      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`shrink-0 rounded-2xl px-3.5 py-2.5 text-xs font-semibold border flex items-start gap-2.5 ${
            feedback.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
              : 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
          }`}
        >
          {feedback.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <span className="leading-snug">{feedback.text}</span>
        </div>
      )}

      {/* Main Tab Body */}
      {activeSubTab === 'stations' ? (
        loading ? (
          <StationsListSkeleton />
        ) : error ? (
          <div
            role="alert"
            className="rounded-2xl bg-rose-500/15 border border-rose-500/40 p-5 text-center space-y-3"
          >
            <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" aria-hidden="true" />
            <p className="text-xs sm:text-sm text-rose-200">{error}</p>
            <button
              type="button"
              onClick={() => loadStations()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 text-xs font-bold text-white cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>
        ) : stations.length === 0 ? (
          <div className="rounded-2xl bg-[#120B20]/95 border border-purple-500/25 p-7 text-center space-y-1.5">
            <p className="text-sm font-bold text-white">No stations configured in database</p>
            <p className="text-xs text-[#A9A0BC]">
              Run migration 02_stations_and_bookings.sql to seed the 6 gaming stations.
            </p>
          </div>
        ) : (
          <section
            aria-label="Gaming stations list"
            className="flex-1 min-h-0 flex flex-col gap-1.5 sm:gap-2"
          >
            {stations.map((station) => (
              <StationManagementCard
                key={station.id}
                station={station}
                toggling={togglingId === station.id}
                onToggleStatus={handleToggleStation}
                onOpenCloseSlots={handleOpenCloseSlots}
              />
            ))}
          </section>
        )
      ) : (
        <ReleasedSlotsTab
          bookings={releasedBookings}
          loading={releasedLoading}
          error={releasedError}
          onRetry={loadReleasedSlots}
        />
      )}
    </main>
  );
}
