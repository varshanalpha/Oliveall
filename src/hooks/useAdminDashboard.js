import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAdminDashboardData } from '../services/adminDashboardService';
import { subscribeToBookingSync } from '../services/spotBookingService';

const FOCUS_REFRESH_THROTTLE_MS = 15000;

// In-memory cache so switching back from Spot Booking to Dashboard renders instantaneously without skeleton flash
let memoryDashboardCache = null;

export function clearAdminDashboardCache() {
  memoryDashboardCache = null;
}

export function useAdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(() => memoryDashboardCache);
  const [loading, setLoading] = useState(() => !memoryDashboardCache);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const lastFetchedMsRef = useRef(0);

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const result = await fetchAdminDashboardData();
        if (!mountedRef.current) return;

        if (result?.unauthorized) {
          memoryDashboardCache = null;
          if (result.reason === 'unauthenticated') {
            navigate('/login', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
          return;
        }

        lastFetchedMsRef.current = Date.now();
        memoryDashboardCache = result;
        setData(result);
      } catch (err) {
        if (!mountedRef.current) return;
        console.error('Admin dashboard fetch error:', err);
        setError(
          err?.message || 'Failed to load dashboard metrics from Supabase. Please try again.'
        );
      } finally {
        inFlightRef.current = false;
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [navigate]
  );

  useEffect(() => {
    mountedRef.current = true;
    loadDashboard({ silent: Boolean(memoryDashboardCache) });

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'hidden') return;
      const elapsed = Date.now() - lastFetchedMsRef.current;
      if (elapsed >= FOCUS_REFRESH_THROTTLE_MS) {
        loadDashboard({ silent: true });
      }
    };

    const handleBookingUpdated = () => {
      loadDashboard({ silent: true });
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('oliveal_booking_updated', handleBookingUpdated);
    const unsubRealtime = subscribeToBookingSync({
      stationId: null,
      onBookingChange: handleBookingUpdated,
    });

    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('oliveal_booking_updated', handleBookingUpdated);
      unsubRealtime();
    };
  }, [loadDashboard]);

  const refresh = useCallback(() => {
    loadDashboard({ silent: Boolean(data) });
  }, [loadDashboard, data]);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh,
  };
}
