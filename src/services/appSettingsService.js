/**
 * OLIVEAL GAMING ZONE — GLOBAL APPLICATION SETTINGS SERVICE
 * Persistent global booking controls backed by public.app_settings in Supabase:
 * - booking_enabled (boolean): Global gate across ALL stations (Customer Online + Admin Spot)
 * - advance_booking_enabled (boolean): Blocks future-date customer bookings when false
 *
 * Enforces admin authorization on mutations and provides Realtime synchronization.
 */

import { supabase } from '../lib/supabase';
import { verifyAdminSession } from './adminDashboardService';
import { invalidateBookingCaches } from './bookingService';

export const SETTING_KEYS = {
  BOOKING_ENABLED: 'booking_enabled',
  ADVANCE_BOOKING_ENABLED: 'advance_booking_enabled',
};

const CACHE_KEY = 'oliveal_app_settings_v1';
const CACHE_TTL_MS = 15 * 1000;
const SYNC_CHANNEL_NAME = 'oliveal-bookings-sync';

let memorySettings = null;
let memoryFetchedAt = 0;

function parseBooleanValue(rawValue, fallback = true) {
  if (typeof rawValue === 'boolean') return rawValue;
  if (typeof rawValue === 'string') {
    const clean = rawValue.trim().toLowerCase();
    if (clean === 'false') return false;
    if (clean === 'true') return true;
  }
  if (rawValue && typeof rawValue === 'object' && typeof rawValue.enabled === 'boolean') {
    return rawValue.enabled;
  }
  return fallback;
}

function normalizeSettingsRows(rows = []) {
  const byKey = new Map();
  for (const row of rows || []) {
    if (row?.key) {
      byKey.set(row.key, row);
    }
  }

  const bookingRow = byKey.get(SETTING_KEYS.BOOKING_ENABLED);
  const advanceRow = byKey.get(SETTING_KEYS.ADVANCE_BOOKING_ENABLED);

  const bookingEnabled = bookingRow ? parseBooleanValue(bookingRow.value, true) : true;
  const advanceBookingEnabled = advanceRow ? parseBooleanValue(advanceRow.value, true) : true;

  return {
    bookingEnabled,
    advanceBookingEnabled,
    disableBookings: !bookingEnabled,
    disableAdvanceBookings: !advanceBookingEnabled,
    updatedAt: bookingRow?.updated_at || advanceRow?.updated_at || null,
  };
}

export function getCachedAppSettings() {
  if (memorySettings) return memorySettings;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.settings) {
        memorySettings = parsed.settings;
        memoryFetchedAt = parsed.timestamp || 0;
        return memorySettings;
      }
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function saveCachedAppSettings(settings) {
  memorySettings = settings;
  memoryFetchedAt = Date.now();
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ settings, timestamp: memoryFetchedAt })
    );
  } catch {
    // ignore storage errors
  }
}

export function invalidateAppSettingsCache() {
  memorySettings = null;
  memoryFetchedAt = 0;
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore storage errors
  }
}

function isMissingSettingsTableError(error) {
  const code = String(error?.code || '');
  const msg = String(error?.message || '');
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('app_settings') ||
    msg.includes('schema cache')
  );
}

/**
 * Loads global booking settings from Supabase `public.app_settings`.
 * Set `strict: true` (for Admin Settings) to surface errors loudly instead of silently
 * falling back to defaults.
 */
export async function fetchAppSettings({ forceRefresh = false, strict = false } = {}) {
  const cached = getCachedAppSettings();
  if (!forceRefresh && !strict && cached && Date.now() - memoryFetchedAt < CACHE_TTL_MS) {
    return {
      ...cached,
      error: null,
    };
  }

  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value, updated_at, updated_by')
    .in('key', [SETTING_KEYS.BOOKING_ENABLED, SETTING_KEYS.ADVANCE_BOOKING_ENABLED]);

  if (error) {
    if (isMissingSettingsTableError(error) && !strict) {
      return {
        bookingEnabled: true,
        advanceBookingEnabled: true,
        disableBookings: false,
        disableAdvanceBookings: false,
        updatedAt: null,
        error: null,
      };
    }

    if (strict) {
      if (isMissingSettingsTableError(error)) {
        throw new Error(
          'Global settings table (public.app_settings) is missing. Please run supabase/migrations/05_app_settings_and_profiles.sql in Supabase SQL Editor.'
        );
      }
      throw new Error(error.message || 'Unable to load application settings from Supabase.');
    }

    return {
      ...(cached || {
        bookingEnabled: true,
        advanceBookingEnabled: true,
        disableBookings: false,
        disableAdvanceBookings: false,
        updatedAt: null,
      }),
      error,
    };
  }

  const normalized = normalizeSettingsRows(data || []);
  saveCachedAppSettings(normalized);
  return {
    ...normalized,
    error: null,
  };
}

/**
 * Loads global settings with strict authenticated admin verification (used on Admin Settings page).
 */
export async function fetchAdminAppSettings() {
  const authCheck = await verifyAdminSession();
  if (!authCheck.authorized) {
    const err = new Error(
      authCheck.reason === 'unauthenticated'
        ? 'Your session has expired. Please sign in again.'
        : 'Administrative privileges required to access Settings.'
    );
    err.code = authCheck.reason;
    throw err;
  }

  const settings = await fetchAppSettings({ forceRefresh: true, strict: true });
  return {
    ...settings,
    profile: authCheck.profile,
  };
}

/**
 * Persists a single global booking setting in Supabase `public.app_settings`.
 * Never resolves unless Supabase confirms the update. Broadcasts live Realtime sync.
 */
export async function updateGlobalBookingSetting(key, boolValue) {
  const authCheck = await verifyAdminSession();
  if (!authCheck.authorized) {
    const err = new Error(
      authCheck.reason === 'unauthenticated'
        ? 'Your session has expired. Please sign in again.'
        : 'Administrative privileges required to update global settings.'
    );
    err.code = authCheck.reason;
    throw err;
  }

  if (
    key !== SETTING_KEYS.BOOKING_ENABLED &&
    key !== SETTING_KEYS.ADVANCE_BOOKING_ENABLED
  ) {
    throw new Error(`Unsupported setting key "${key}".`);
  }

  const payload = {
    value: Boolean(boolValue),
    updated_by: authCheck.user.id,
  };

  let updatedRow = null;

  const { data: updData, error: updErr } = await supabase
    .from('app_settings')
    .update(payload)
    .eq('key', key)
    .select('key, value, updated_at, updated_by')
    .maybeSingle();

  if (updErr) {
    if (isMissingSettingsTableError(updErr)) {
      throw new Error(
        'Database migration required: please execute supabase/migrations/05_app_settings_and_profiles.sql in Supabase SQL Editor.'
      );
    }
    throw new Error(updErr.message || 'Failed to update global setting in Supabase.');
  }

  updatedRow = updData;

  if (!updatedRow) {
    const { data: insData, error: insErr } = await supabase
      .from('app_settings')
      .upsert(
        {
          key,
          value: Boolean(boolValue),
          updated_by: authCheck.user.id,
        },
        { onConflict: 'key' }
      )
      .select('key, value, updated_at, updated_by')
      .maybeSingle();

    if (insErr) {
      throw new Error(insErr.message || 'Failed to save global setting in Supabase.');
    }
    if (!insData) {
      throw new Error('Setting update was rejected by Supabase security policy.');
    }
    updatedRow = insData;
  }

  invalidateAppSettingsCache();
  invalidateBookingCaches();

  const refreshed = await fetchAppSettings({ forceRefresh: true, strict: true });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('oliveal_settings_updated', {
        detail: { key, value: Boolean(boolValue) },
      })
    );
    window.dispatchEvent(new Event('oliveal_booking_updated'));
  }

  try {
    const ch = supabase.channel(SYNC_CHANNEL_NAME);
    await ch.send({
      type: 'broadcast',
      event: 'settings_changed',
      payload: { key, value: Boolean(boolValue), updatedAt: Date.now() },
    });
  } catch {
    // Realtime broadcast is best-effort
  }

  return refreshed;
}

/**
 * Subscribes to live changes on public.app_settings via Supabase Realtime + local events.
 */
export function subscribeToAppSettingsSync(onSettingsChange) {
  const handleLocal = () => {
    invalidateAppSettingsCache();
    onSettingsChange?.();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('oliveal_settings_updated', handleLocal);
  }

  let channel = null;
  try {
    channel = supabase
      .channel(`app-settings-sync-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        () => {
          invalidateAppSettingsCache();
          onSettingsChange?.();
        }
      )
      .on('broadcast', { event: 'settings_changed' }, () => {
        invalidateAppSettingsCache();
        onSettingsChange?.();
      })
      .subscribe();
  } catch {
    // ignore subscription errors
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('oliveal_settings_updated', handleLocal);
    }
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}

