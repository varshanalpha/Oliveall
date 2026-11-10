/**
 * OLIVEAL GAMING ZONE — SUPABASE STATIONS SERVICE
 * Fetches active gaming stations, capacity limits, and rates from public.stations.
 * Gracefully handles pre-migration state if 02_stations_and_bookings.sql has not been applied yet.
 */

import { supabase } from '../lib/supabase';
import { STATIONS as DEFAULT_STATIONS } from './mock/stationMockData';

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

/**
 * Loads all active stations ordered by display_order from Supabase
 */
export async function fetchActiveStations() {
  try {
    const { data, error } = await supabase
      .from('stations')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      // Detect missing table / schema cache before migration is applied
      const isMissingSchema =
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('schema cache');

      if (isMissingSchema) {
        console.warn(
          'Supabase public.stations table not found yet. Using static station catalog until migration 02_stations_and_bookings.sql is executed.'
        );
        return {
          stations: getDefaultStationsMapped(),
          isFallback: true,
          error: null,
        };
      }

      throw error;
    }

    if (!data || data.length === 0) {
      return {
        stations: [],
        isFallback: false,
        error: null,
      };
    }

    return {
      stations: data.map(mapDbStationToUi),
      isFallback: false,
      error: null,
    };
  } catch (err) {
    console.error('Error loading stations from Supabase:', err);
    return {
      stations: getDefaultStationsMapped(),
      isFallback: true,
      error: err,
    };
  }
}

/**
 * Matches a station from a list by either UUID id or URL slug (e.g. 'alpha', 'rs-2')
 */
export function resolveStationFromList(stations, param) {
  if (!stations || stations.length === 0) return null;
  if (!param) return stations[0];
  const lower = String(param).toLowerCase();
  return (
    stations.find(
      (s) =>
        String(s.id).toLowerCase() === lower ||
        String(s.slug || '').toLowerCase() === lower ||
        String(s.name || '').toLowerCase() === lower
    ) || stations[0]
  );
}

