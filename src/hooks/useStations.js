import { useState, useEffect, useCallback } from 'react';
import { fetchActiveStations, getCachedStations } from '../services/stationService';

/**
 * Retrieves active gaming stations from Supabase public.stations cleanly.
 * Filters strictly to active live DB stations for Admin operations.
 */
export function useStations() {
  const [stations, setStations] = useState(() => {
    const cached = getCachedStations();
    return Array.isArray(cached)
      ? cached.filter((s) => s.isActive !== false && s.isLiveDb !== false)
      : [];
  });
  const [loading, setLoading] = useState(() => stations.length === 0);
  const [error, setError] = useState(null);

  const loadStations = useCallback(async ({ forceRefresh = true } = {}) => {
    setError(null);
    try {
      const { stations: list, isFallback, error: fetchErr } = await fetchActiveStations({
        forceRefresh,
      });

      if (fetchErr) {
        throw fetchErr;
      }

      if (isFallback) {
        throw new Error(
          'Unable to load live stations from Supabase. Verify your connection and active stations table.'
        );
      }

      const activeList = (list || []).filter((s) => s.isActive !== false);
      setStations(activeList);
    } catch (err) {
      setError(err?.message || 'Failed to load active stations from Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStations({ forceRefresh: true });
  }, [loadStations]);

  return {
    stations,
    loading,
    error,
    reloadStations: () => loadStations({ forceRefresh: true }),
  };
}

