import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

export const NATIVE_OAUTH_REDIRECT_URL = 'com.olivealgaming.app://auth-callback';
export const NATIVE_RESET_PASSWORD_REDIRECT_URL = 'com.olivealgaming.app://reset-password';
const ROOT_ENTRY_PATHS = new Set(['/', '/login', '/dashboard', '/admin/dashboard']);

/**
 * Extracts Supabase OAuth session tokens, PKCE authorization code, or error details
 * from a native custom-scheme redirect URL (`com.olivealgaming.app://auth-callback...`).
 */
export function parseOAuthCallbackUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  if (!rawUrl.startsWith('com.olivealgaming.app://')) return null;

  const [beforeHash, rawHash = ''] = rawUrl.split('#');
  const queryIndex = beforeHash.indexOf('?');
  const rawQuery = queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : '';

  const queryParams = new URLSearchParams(rawQuery);
  const hashParams = new URLSearchParams(rawHash);

  const error =
    hashParams.get('error') || queryParams.get('error') || null;
  const errorDescription =
    hashParams.get('error_description') ||
    queryParams.get('error_description') ||
    null;
  const code = queryParams.get('code') || hashParams.get('code') || null;
  const accessToken =
    hashParams.get('access_token') || queryParams.get('access_token') || null;
  const refreshToken =
    hashParams.get('refresh_token') || queryParams.get('refresh_token') || '';
  const type = hashParams.get('type') || queryParams.get('type') || '';
  const isRecovery =
    rawUrl.startsWith('com.olivealgaming.app://reset-password') ||
    type === 'recovery';

  return {
    error,
    errorDescription,
    code,
    accessToken,
    refreshToken,
    isRecovery,
  };
}

/**
 * Configures Android native shell ergonomics when running inside Capacitor:
 * - Dark OLED status bar matching #080510 with light icons and zero overlap
 * - Hardware back button navigation across in-app screens, minimizing only on root tabs
 */
export function initNativeAndroidShell() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return () => {};
  }

  let disposed = false;
  let backListener = null;

  (async () => {
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#080510' });
    } catch {
      // Ignore if StatusBar is unavailable in preview/webview
    }

    try {
      const handle = await CapApp.addListener('backButton', ({ canGoBack }) => {
        const currentPath = window.location.pathname;
        if (!ROOT_ENTRY_PATHS.has(currentPath) && canGoBack && window.history.length > 1) {
          window.history.back();
          return;
        }
        CapApp.minimizeApp().catch(() => {});
      });
      if (disposed) {
        handle.remove();
      } else {
        backListener = handle;
      }
    } catch {
      // Ignore listener setup failure outside native shell
    }
  })();

  return () => {
    disposed = true;
    backListener?.remove?.().catch?.(() => {});
  };
}

