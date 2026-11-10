import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  User,
  Crown,
  Mail,
  Pencil,
  Calendar,
  CalendarX2,
  Layers,
  LogOut,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clearAdminDashboardCache } from '../../hooks/useAdminDashboard';
import {
  SETTING_KEYS,
  fetchAdminAppSettings,
  updateGlobalBookingSetting,
  subscribeToAppSettingsSync,
  invalidateAppSettingsCache,
} from '../../services/appSettingsService';
import { fetchAuthenticatedAdminProfile } from '../../services/adminProfileService';
import SettingConfirmationModal from '../../components/admin/Settings/SettingConfirmationModal';

const CONFIRM_MODAL_CONFIG = {
  [SETTING_KEYS.BOOKING_ENABLED]: {
    title: 'Disable All Bookings?',
    description:
      'Customers and administrators will not be able to create new bookings across any station. Existing confirmed bookings will remain unchanged.',
    confirmLabel: 'Disable Bookings',
    tone: 'danger',
  },
  [SETTING_KEYS.ADVANCE_BOOKING_ENABLED]: {
    title: 'Disable Advance Bookings?',
    description:
      'Customers will only be able to book for today. Existing future reservations will not be affected.',
    confirmLabel: 'Disable Advance Bookings',
    tone: 'warning',
  },
};

/**
 * Oliveal Gaming Zone — Admin Settings Page (rendered inside persistent AdminShell).
 * Contains strictly three sections per spec:
 * 1. Profile Details (live authenticated Supabase admin profile + Edit Profile)
 * 2. Booking Controls (Disable Bookings, Disable Advance Bookings backed by app_settings)
 * 3. Logout (existing Supabase signOut)
 */
export default function AdminSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile: authProfile, signOut } = useAuth();
  const outletContext = useOutletContext();
  const registerRefreshHandler = outletContext?.registerRefreshHandler;

  const [adminProfile, setAdminProfile] = useState(
    () => location.state?.refreshedProfile || authProfile || null
  );
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const [settings, setSettings] = useState({
    bookingEnabled: true,
    advanceBookingEnabled: true,
    disableBookings: false,
    disableAdvanceBookings: false,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [savingKey, setSavingKey] = useState(null);
  const [pendingConfirmKey, setPendingConfirmKey] = useState(null);
  const [confirmError, setConfirmError] = useState(null);
  const [feedback, setFeedback] = useState(() => location.state?.feedback || null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [adminProfile?.avatar_url]);

  // Clear one-time route state feedback cleanly after consumption
  useEffect(() => {
    if (location.state?.feedback || location.state?.refreshedProfile) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  const loadSettingsAndProfile = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setLoadError(null);

      try {
        const [freshProfile, freshSettings] = await Promise.all([
          fetchAuthenticatedAdminProfile(),
          fetchAdminAppSettings(),
        ]);
        setAdminProfile(freshProfile);
        setSettings({
          bookingEnabled: freshSettings.bookingEnabled,
          advanceBookingEnabled: freshSettings.advanceBookingEnabled,
          disableBookings: freshSettings.disableBookings,
          disableAdvanceBookings: freshSettings.disableAdvanceBookings,
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
        setLoadError(err?.message || 'Unable to load settings from Supabase.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    loadSettingsAndProfile();
  }, [loadSettingsAndProfile]);

  useEffect(() => {
    return subscribeToAppSettingsSync(() => {
      loadSettingsAndProfile({ silent: true });
    });
  }, [loadSettingsAndProfile]);

  const handleManualRefresh = useCallback(async () => {
    await loadSettingsAndProfile({ silent: true });
  }, [loadSettingsAndProfile]);

  useEffect(() => {
    registerRefreshHandler?.(handleManualRefresh, refreshing);
  }, [registerRefreshHandler, handleManualRefresh, refreshing]);

  useEffect(() => {
    if (!feedback) return undefined;
    const t = setTimeout(() => setFeedback(null), 4500);
    return () => clearTimeout(t);
  }, [feedback]);

  const commitToggleChange = async (settingKey, nextBoolEnabledValue) => {
    if (savingKey) return;
    setSavingKey(settingKey);
    setConfirmError(null);
    setFeedback(null);

    try {
      const updated = await updateGlobalBookingSetting(settingKey, nextBoolEnabledValue);
      setSettings({
        bookingEnabled: updated.bookingEnabled,
        advanceBookingEnabled: updated.advanceBookingEnabled,
        disableBookings: updated.disableBookings,
        disableAdvanceBookings: updated.disableAdvanceBookings,
      });
      setPendingConfirmKey(null);

      const message =
        settingKey === SETTING_KEYS.BOOKING_ENABLED
          ? updated.bookingEnabled
            ? 'All new bookings are now enabled across Spot & Online.'
            : 'All new bookings have been disabled across every station.'
          : updated.advanceBookingEnabled
          ? 'Advance customer bookings have been re-enabled.'
          : 'Advance bookings have been disabled. Customers can book for today only.';

      setFeedback({ type: 'success', text: message });
    } catch (err) {
      if (err?.code === 'unauthenticated') {
        navigate('/login', { replace: true });
        return;
      }
      if (err?.code === 'forbidden') {
        navigate('/dashboard', { replace: true });
        return;
      }
      const errText =
        err?.message || 'Failed to update booking control in Supabase. Previous state preserved.';
      if (pendingConfirmKey) {
        setConfirmError(errText);
      } else {
        setFeedback({ type: 'error', text: errText });
      }
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggleSwitch = (settingKey) => {
    if (savingKey || loading) return;

    if (settingKey === SETTING_KEYS.BOOKING_ENABLED) {
      const currentlyDisabled = settings.disableBookings;
      if (!currentlyDisabled) {
        // Enabling Disable Bookings -> require confirmation modal
        setConfirmError(null);
        setPendingConfirmKey(SETTING_KEYS.BOOKING_ENABLED);
      } else {
        // Re-enabling bookings (turning Disable Bookings OFF)
        commitToggleChange(SETTING_KEYS.BOOKING_ENABLED, true);
      }
      return;
    }

    if (settingKey === SETTING_KEYS.ADVANCE_BOOKING_ENABLED) {
      const currentlyDisabled = settings.disableAdvanceBookings;
      if (!currentlyDisabled) {
        // Enabling Disable Advance Bookings -> require confirmation modal
        setConfirmError(null);
        setPendingConfirmKey(SETTING_KEYS.ADVANCE_BOOKING_ENABLED);
      } else {
        // Re-enabling advance bookings (turning Disable Advance Bookings OFF)
        commitToggleChange(SETTING_KEYS.ADVANCE_BOOKING_ENABLED, true);
      }
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    clearAdminDashboardCache();
    invalidateAppSettingsCache();
    try {
      await signOut();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const displayName =
    adminProfile?.full_name?.trim() || adminProfile?.email || 'Admin';
  const displayEmail = adminProfile?.email || '';
  const initial = displayName.charAt(0).toUpperCase();
  const hasAvatar = Boolean(adminProfile?.avatar_url) && !avatarLoadError;
  const activeModalConfig = pendingConfirmKey ? CONFIRM_MODAL_CONFIG[pendingConfirmKey] : null;

  return (
    <main className="relative z-10 flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-3.5 sm:pt-4 pb-28 space-y-3.5 sm:space-y-4">
      {/* Page Heading */}
      <header className="px-0.5">
        <div className="flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 sm:w-7 sm:h-7 text-[#C4B5FD] shrink-0" aria-hidden="true" />
          <h1 className="text-[1.6rem] sm:text-[1.75rem] font-extrabold text-white tracking-tight leading-tight">
            Settings
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#A9A0BC] mt-1 font-medium leading-snug">
          Manage your profile and booking preferences
        </p>
      </header>

      {/* Action Feedback Alert */}
      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`rounded-2xl px-3.5 py-2.5 text-xs font-semibold border flex items-start gap-2.5 ${
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

      {/* Load Error Alert */}
      {loadError && (
        <div
          role="alert"
          className="rounded-2xl bg-rose-500/15 border border-rose-500/40 p-3.5 flex items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-rose-200 leading-snug">{loadError}</p>
          </div>
          <button
            type="button"
            onClick={() => loadSettingsAndProfile()}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-[11px] font-bold text-white cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* SECTION A — PROFILE DETAILS */}
      <section
        aria-labelledby="settings-profile-heading"
        className="rounded-2xl bg-[#120B20]/95 border border-purple-500/30 shadow-[0_8px_28px_rgba(0,0,0,0.45),0_0_24px_rgba(124,58,237,0.12)] backdrop-blur-md overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#C4B5FD] shrink-0" aria-hidden="true" />
            <h2
              id="settings-profile-heading"
              className="text-sm sm:text-base font-bold text-white tracking-tight"
            >
              Profile Details
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-[#A9A0BC] mt-0.5">
            View and update your admin profile
          </p>
        </div>

        <div className="p-4 flex items-center justify-between gap-3">
          {loading && !adminProfile ? (
            <div className="w-full h-14 flex items-center gap-3 animate-pulse">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-white/10" />
                <div className="h-3 w-44 rounded bg-white/[0.06]" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#9333EA] to-[#6D28D9] border border-purple-300/45 shadow-[0_0_18px_rgba(147,51,234,0.4)] flex items-center justify-center text-white text-lg sm:text-xl font-extrabold shrink-0 overflow-hidden">
                  {hasAvatar ? (
                    <img
                      src={adminProfile.avatar_url}
                      alt={displayName}
                      onError={() => setAvatarLoadError(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initial}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate max-w-[160px] sm:max-w-[240px]">
                      {displayName}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-600/35 border border-purple-400/45 px-2 py-0.5 text-[10px] font-bold text-[#E9D5FF] leading-none shrink-0">
                      <Crown className="w-2.5 h-2.5 text-[#D8B4FE]" aria-hidden="true" />
                      <span className="capitalize">{adminProfile?.role || 'Admin'}</span>
                    </span>
                  </div>

                  {displayEmail && (
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] sm:text-xs text-[#D6CFE6] min-w-0">
                      <Mail className="w-3.5 h-3.5 text-[#A9A0BC] shrink-0" aria-hidden="true" />
                      <span className="truncate">{displayEmail}</span>
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/admin/settings/edit-profile')}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#1D1135]/95 hover:bg-[#29184B] border border-purple-400/40 px-3 py-2 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.2)] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                <Pencil className="w-3.5 h-3.5 text-[#C084FC]" aria-hidden="true" />
                <span>Edit Profile</span>
              </button>
            </>
          )}
        </div>
      </section>

      {/* SECTION B — BOOKING CONTROLS */}
      <section
        aria-labelledby="settings-booking-controls-heading"
        className="rounded-2xl bg-[#120B20]/95 border border-purple-500/30 shadow-[0_8px_28px_rgba(0,0,0,0.45),0_0_24px_rgba(124,58,237,0.12)] backdrop-blur-md overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#C4B5FD] shrink-0" aria-hidden="true" />
            <h2
              id="settings-booking-controls-heading"
              className="text-sm sm:text-base font-bold text-white tracking-tight"
            >
              Booking Controls
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-[#A9A0BC] mt-0.5">
            Manage overall booking availability for customers
          </p>
        </div>

        <div className="divide-y divide-white/[0.08]">
          {/* Control 1: Disable Bookings */}
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-400/35 flex items-center justify-center shrink-0 mt-0.5">
                <CalendarX2 className="w-5 h-5 text-rose-300" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-tight">Disable Bookings</p>
                <p className="text-[11px] sm:text-xs text-[#A9A0BC] mt-1 leading-snug">
                  Temporarily stop all new bookings across every station (Spot &amp; Online).
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.disableBookings}
              aria-label="Disable Bookings"
              disabled={loading || Boolean(savingKey)}
              onClick={() => handleToggleSwitch(SETTING_KEYS.BOOKING_ENABLED)}
              className={`relative shrink-0 inline-flex items-center w-12 h-6 rounded-full p-0.5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:opacity-55 ${
                settings.disableBookings
                  ? 'bg-gradient-to-r from-rose-600 to-rose-500 border border-rose-300/45 shadow-[0_0_16px_rgba(244,63,94,0.5)]'
                  : 'bg-[#2B253A] border border-white/15'
              }`}
            >
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  settings.disableBookings ? 'translate-x-6' : 'translate-x-0'
                }`}
              >
                {savingKey === SETTING_KEYS.BOOKING_ENABLED && (
                  <Loader2 className="w-3 h-3 text-[#7C3AED] animate-spin" aria-hidden="true" />
                )}
              </span>
            </button>
          </div>

          {/* Control 2: Disable Advance Bookings */}
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-400/35 flex items-center justify-center shrink-0 mt-0.5">
                <Layers className="w-5 h-5 text-[#D8B4FE]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-tight">
                  Disable Advance Bookings
                </p>
                <p className="text-[11px] sm:text-xs text-[#A9A0BC] mt-1 leading-snug">
                  Stop customers from booking future dates beyond today.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.disableAdvanceBookings}
              aria-label="Disable Advance Bookings"
              disabled={loading || Boolean(savingKey)}
              onClick={() => handleToggleSwitch(SETTING_KEYS.ADVANCE_BOOKING_ENABLED)}
              className={`relative shrink-0 inline-flex items-center w-12 h-6 rounded-full p-0.5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:opacity-55 ${
                settings.disableAdvanceBookings
                  ? 'bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] border border-purple-300/45 shadow-[0_0_16px_rgba(168,85,247,0.55)]'
                  : 'bg-[#2B253A] border border-white/15'
              }`}
            >
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  settings.disableAdvanceBookings ? 'translate-x-6' : 'translate-x-0'
                }`}
              >
                {savingKey === SETTING_KEYS.ADVANCE_BOOKING_ENABLED && (
                  <Loader2 className="w-3 h-3 text-[#7C3AED] animate-spin" aria-hidden="true" />
                )}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* SECTION C — LOGOUT */}
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full py-3.5 px-5 rounded-2xl bg-rose-950/25 hover:bg-rose-900/35 border border-rose-500/45 text-sm font-bold text-rose-300 hover:text-white flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(0,0,0,0.4)] transition cursor-pointer disabled:opacity-55"
      >
        {loggingOut ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Logging Out...</span>
          </>
        ) : (
          <>
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Logout</span>
          </>
        )}
      </button>

      {/* Confirmation Dialog before enabling Disable Bookings / Disable Advance Bookings */}
      <SettingConfirmationModal
        isOpen={Boolean(pendingConfirmKey)}
        title={activeModalConfig?.title || ''}
        description={activeModalConfig?.description || ''}
        confirmLabel={activeModalConfig?.confirmLabel || 'Confirm'}
        cancelLabel="Cancel"
        tone={activeModalConfig?.tone || 'danger'}
        updating={Boolean(savingKey)}
        error={confirmError}
        onConfirm={() => {
          if (pendingConfirmKey) {
            commitToggleChange(pendingConfirmKey, false);
          }
        }}
        onCancel={() => {
          if (!savingKey) {
            setPendingConfirmKey(null);
            setConfirmError(null);
          }
        }}
      />
    </main>
  );
}

