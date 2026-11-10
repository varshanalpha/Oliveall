/**
 * OLIVEAL GAMING ZONE — SUPABASE STATIONS SERVICE
 * Fetches active gaming stations, capacity limits, and rates from public.stations.
 * Implements memory + sessionStorage caching (stale-while-revalidate) so navigating
 * between /dashboard, /book-slot, and /confirm-booking never reloads skeletons.
 */

import { supabase } from '../lib/supabase';
import { STATIONS as DEFAULT_STATIONS } from './mock/stationMockData';

const CACHE_KEY = 'oliveal_stations_cache_v1';
const CACHE_TTL_MS = 60 * 1000; // 1 minute fresh window

let memoryStationsCache = null;
let memoryCacheTimestamp = 0;
let memoryIsFallback = false;
let inFlightStationsPromise = null;

export function mapDbStationToUi(row) {
  if (!row) return null;
  const isSimulator = row.station_type === 'simulator';
  return {
    id: row.id,
    slug: row.slug || String(row.id).toLowerCase(),
    name: row.name,
    category: row.category,
    tag: row.tag || (isSimulator ? 'Racing Sim' : 'PS5'),
    type: row.station_type || (isSimulator ? 'simulator' : 'ps5'),
    image:
      row.image_url ||
      (isSimulator ? '/assets/images/racing-simulator.png' : '/assets/images/ps5-station.png'),
    description: row.description || '',
    maxPlayers: row.max_players ?? (isSimulator ? 1 : 2),
    hourlyRate1p: row.hourly_rate_1p ?? (isSimulator ? 200 : 150),
    hourlyRate2p: row.hourly_rate_2p ?? (isSimulator ? null : 200),
    pricePerHour: row.hourly_rate_1p ?? (isSimulator ? 200 : 150),
    displayOrder: row.display_order ?? 0,
    isActive: row.is_active !== false,
    isLiveDb: true,
  };
}

function getDefaultStationsMapped() {
  return DEFAULT_STATIONS.map((s, idx) => ({
    ...s,
    slug: s.id,
    hourlyRate1p: s.type === 'simulator' ? 200 : 150,
    hourlyRate2p: s.type === 'simulator' ? null : 200,
    displayOrder: idx + 1,
    isActive: true,
    isLiveDb: false,
  }));
}

const SYNC_CHANNEL_NAME = 'oliveal-bookings-sync';

export function invalidateStationsCache() {
  memoryStationsCache = null;
  memoryCacheTimestamp = 0;
  memoryIsFallback = false;
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore storage access issues
  }
}

export async function broadcastStationSync(stationId = null) {
  invalidateStationsCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('oliveal_stations_updated', { detail: { stationId } }));
    window.dispatchEvent(new Event('oliveal_booking_updated'));
  }
  try {
    const ch = supabase.channel(SYNC_CHANNEL_NAME);
    await ch.send({
      type: 'broadcast',
      event: 'station_changed',
      payload: { stationId, updatedAt: Date.now() },
    });
  } catch {
    // Realtime broadcast is best-effort
  }
}

export function subscribeToStationSync(onStationChange) {
  const handleLocal = () => {
    invalidateStationsCache();
    onStationChange?.();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('oliveal_stations_updated', handleLocal);
  }

  let channel = null;
  try {
    channel = supabase
      .channel(`stations-sync-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stations' },
        () => {
          invalidateStationsCache();
          onStationChange?.();
        }
      )
      .on('broadcast', { event: 'station_changed' }, () => {
        invalidateStationsCache();
        onStationChange?.();
      })
      .subscribe();
  } catch {
    // ignore realtime subscribe errors
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('oliveal_stations_updated', handleLocal);
    }
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}

/**
 * Synchronously retrieves cached stations (memory first, then sessionStorage)
 * so components render immediately on mount with zero skeleton flash.
 */
export function getCachedStations({ activeOnly = false } = {}) {
  let list = null;
  if (memoryStationsCache && memoryStationsCache.length > 0) {
    list = memoryStationsCache;
  } else {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.stations) && parsed.stations.length > 0) {
          memoryStationsCache = parsed.stations;
          memoryCacheTimestamp = parsed.timestamp || 0;
          memoryIsFallback = false;
          list = memoryStationsCache;
        }
      }
    } catch {
      // ignore storage access issues
    }
  }

  if (!list) return null;
  return activeOnly ? list.filter((s) => s.isActive !== false) : list;
}

function saveStationsToCache(stations, isFallback = false) {
  memoryStationsCache = stations;
  memoryCacheTimestamp = Date.now();
  memoryIsFallback = isFallback;

  if (!isFallback && stations.length > 0) {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ stations, timestamp: memoryCacheTimestamp })
      );
    } catch {
      // ignore storage errors
    }
  }
}

/**
 * Loads ALL stations (active + disabled) ordered by display_order from Supabase.
 * Used by both Admin Stations Management and Customer UI (to display disabled status clearly).
 */
export async function fetchAllStationsCatalog({ forceRefresh = false } = {}) {
  const cached = getCachedStations();
  const isCacheFresh =
    cached &&
    !memoryIsFallback &&
    Date.now() - memoryCacheTimestamp < CACHE_TTL_MS;

  if (!forceRefresh && isCacheFresh) {
    return {
      stations: cached,
      isFallback: false,
      error: null,
    };
  }

  if (inFlightStationsPromise && !forceRefresh) {
    return inFlightStationsPromise;
  }

  inFlightStationsPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        const isMissingSchema =
          error.code === '42P01' ||
          error.code === 'PGRST205' ||
          error.message?.includes('does not exist') ||
          error.message?.includes('schema cache');

        if (isMissingSchema) {
          console.warn(
            'Supabase public.stations table not found yet. Using static station catalog until migration 02_stations_and_bookings.sql is executed.'
          );
          const fallback = getDefaultStationsMapped();
          saveStationsToCache(fallback, true);
          return {
            stations: fallback,
            isFallback: true,
            error: null,
          };
        }

        throw error;
      }

      if (!data || data.length === 0) {
        saveStationsToCache([], false);
        return {
          stations: [],
          isFallback: false,
          error: null,
        };
      }

      const mapped = data.map(mapDbStationToUi);
      saveStationsToCache(mapped, false);

      return {
        stations: mapped,
        isFallback: false,
        error: null,
      };
    } catch (err) {
      console.error('Error loading stations from Supabase:', err);
      const fallback = getCachedStations() || getDefaultStationsMapped();
      saveStationsToCache(fallback, !fallback[0]?.isLiveDb);
      return {
        stations: fallback,
        isFallback: !fallback[0]?.isLiveDb,
        error: err,
      };
    } finally {
      inFlightStationsPromise = null;
    }
  })();

  return inFlightStationsPromise;
}

/**
 * Loads strictly active stations (is_active = true) ordered by display_order.
 */
export async function fetchActiveStations({ forceRefresh = false } = {}) {
  const result = await fetchAllStationsCatalog({ forceRefresh });
  return {
    ...result,
    stations: (result.stations || []).filter((s) => s.isActive !== false),
  };
}

/**
 * Matches a station from a list by either UUID id, URL slug, or name.
 * Defaults to the first ACTIVE station when no explicit param matches.
 */
export function resolveStationFromList(stations, param) {
  if (!stations || stations.length === 0) return null;
  if (param) {
    const lower = String(param).toLowerCase();
    const match = stations.find(
      (s) =>
        String(s.id).toLowerCase() === lower ||
        String(s.slug || '').toLowerCase() === lower ||
        String(s.name || '').toLowerCase() === lower
    );
    if (match) return match;
  }
  return stations.find((s) => s.isActive !== false) || stations[0];
}
