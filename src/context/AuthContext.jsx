import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '../lib/supabase';
import {
  NATIVE_OAUTH_REDIRECT_URL,
  NATIVE_RESET_PASSWORD_REDIRECT_URL,
  parseOAuthCallbackUrl,
} from '../utils/nativeAndroidSetup';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Prevents onAuthStateChange from prematurely exposing an unverified session during strict portal role check
  const isVerifyingSignInRef = useRef(false);

  // Pure helper: resolve profile from public.profiles (never fails with null when user is authenticated)
  const resolveProfileData = useCallback(async (userId, userMetadata = null, email = null) => {
    if (!userId) return null;

    const fallbackProfile = {
      id: userId,
      email: email || '',
      full_name: userMetadata?.full_name || userMetadata?.name || 'Gamer',
      role: 'customer',
      avatar_url: userMetadata?.avatar_url || userMetadata?.picture || null,
    };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }

      if (data) {
        return data;
      }

      // Attempt provisioning fallback if trigger didn't create a row yet
      if (email || userMetadata) {
        const { data: inserted, error: insertErr } = await supabase
          .from('profiles')
          .upsert(fallbackProfile)
          .select()
          .maybeSingle();

        if (!insertErr && inserted) {
          return inserted;
        }
      }

      return fallbackProfile;
    } catch (err) {
      console.error('Failed to resolve profile:', err);
      return fallbackProfile;
    }
  }, []);

  // Fetch and commit profile to state
  const fetchProfile = useCallback(async (userId, userMetadata = null, email = null) => {
    const resolved = await resolveProfileData(userId, userMetadata, email);
    setProfile(resolved);
    return resolved;
  }, [resolveProfileData]);

  // Initialize session and listen for auth state changes
  useEffect(() => {
    let mounted = true;
    let initialLoadDone = false;

    async function initializeAuth() {
      try {
        // getSession() awaits Supabase URL detection / PKCE code exchange for Google OAuth callbacks
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting initial session:', error);
        }

        if (mounted && !isVerifyingSignInRef.current) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);

          if (initialSession?.user) {
            const prof = await resolveProfileData(
              initialSession.user.id,
              initialSession.user.user_metadata,
              initialSession.user.email
            );
            if (mounted && !isVerifyingSignInRef.current) {
              setProfile(prof);
            }
          } else {
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        initialLoadDone = true;
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Subscribe to auth state changes (sign in, sign out, token refresh, OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      if (isVerifyingSignInRef.current) return;

      // Let initializeAuth() handle INITIAL_SESSION so loading isn't cleared mid-OAuth exchange
      if (event === 'INITIAL_SESSION' && !initialLoadDone) {
        return;
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        const prof = await resolveProfileData(
          currentSession.user.id,
          currentSession.user.user_metadata,
          currentSession.user.email
        );
        if (mounted && !isVerifyingSignInRef.current) {
          setProfile(prof);
        }
      } else {
        setProfile(null);
      }

      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem('oliveal_recovery_pending', 'true');
        window.dispatchEvent(new Event('oliveal_password_recovery'));
      }

      if (mounted && initialLoadDone) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [resolveProfileData]);

  // Handle native Android/Capacitor Google OAuth deep-link callback & browser close
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    let active = true;
    let urlListener = null;
    let browserFinishListener = null;

    const notifyOAuthCancelled = (message = null) => {
      sessionStorage.removeItem('oliveal_oauth_pending');
      window.dispatchEvent(
        new CustomEvent('oliveal_oauth_cancelled', {
          detail: message ? { message } : null,
        })
      );
    };

    const handleIncomingOAuthUrl = async (rawUrl) => {
      const parsed = parseOAuthCallbackUrl(rawUrl);
      if (!parsed || !active) return;

      await Browser.close().catch(() => {});

      if (parsed.error || parsed.errorDescription) {
        notifyOAuthCancelled(
          parsed.errorDescription || 'Google sign-in was cancelled or failed. Please try again.'
        );
        return;
      }

      try {
        if (parsed.isRecovery) {
          sessionStorage.setItem('oliveal_recovery_pending', 'true');
        }
        if (parsed.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(parsed.code);
          if (error) throw error;
          if (parsed.isRecovery) {
            window.dispatchEvent(new Event('oliveal_password_recovery'));
          }
        } else if (parsed.accessToken) {
          const { error } = await supabase.auth.setSession({
            access_token: parsed.accessToken,
            refresh_token: parsed.refreshToken,
          });
          if (error) throw error;
          if (parsed.isRecovery) {
            window.dispatchEvent(new Event('oliveal_password_recovery'));
          }
        } else {
          sessionStorage.removeItem('oliveal_recovery_pending');
          notifyOAuthCancelled('Unable to complete Google authentication. Please try again.');
        }
      } catch (err) {
        sessionStorage.removeItem('oliveal_recovery_pending');
        notifyOAuthCancelled(
          err?.message || 'Failed to complete Google sign-in. Please try again.'
        );
      }
    };

    (async () => {
      try {
        const launch = await CapApp.getLaunchUrl();
        if (launch?.url && active) {
          await handleIncomingOAuthUrl(launch.url);
        }
      } catch {
        // Ignore launch URL lookup failure
      }

      try {
        const handle = await CapApp.addListener('appUrlOpen', ({ url }) => {
          handleIncomingOAuthUrl(url);
        });
        if (active) urlListener = handle;
        else handle.remove();
      } catch {
        // Ignore listener error
      }

      try {
        const handle = await Browser.addListener('browserFinished', () => {
          setTimeout(() => {
            if (active && sessionStorage.getItem('oliveal_oauth_pending') === 'true') {
              notifyOAuthCancelled(null);
            }
          }, 500);
        });
        if (active) browserFinishListener = handle;
        else handle.remove();
      } catch {
        // Ignore browser listener error
      }
    })();

    return () => {
      active = false;
      urlListener?.remove?.().catch?.(() => {});
      browserFinishListener?.remove?.().catch?.(() => {});
    };
  }, []);

  // Customer Signup
  const signUp = async ({ email, password, fullName }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) throw error;

      // Check if email confirmation is required
      // If user exists but session is null, email confirmation is active in Supabase
      const requiresConfirmation = !data.session && !!data.user;

      if (data.user && data.session) {
        await fetchProfile(data.user.id, { full_name: fullName }, email);
      }

      return { data, requiresConfirmation, error: null };
    } catch (error) {
      return { data: null, requiresConfirmation: false, error };
    }
  };

  // Sign In (Customer or Admin with strict portal enforcement)
  const signIn = async ({ email, password, expectedRole }) => {
    isVerifyingSignInRef.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      let userProfile = null;
      if (data.user) {
        userProfile = await resolveProfileData(
          data.user.id,
          data.user.user_metadata,
          data.user.email
        );
      }

      // STRICT ROLE ENFORCEMENT:
      // If expectedRole is specified, the user's role must match the active portal.
      // If an Admin logs into the Customer portal or a Customer logs into the Admin portal,
      // immediately terminate the session BEFORE committing user state and throw invalid credentials error.
      if (expectedRole) {
        const userRole = userProfile?.role || 'customer';
        if (userRole !== expectedRole) {
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setProfile(null);
          return {
            data: null,
            profile: null,
            error: new Error('Invalid email or password.'),
          };
        }
      }

      // Portal check passed: commit authenticated session and profile to state
      setSession(data.session ?? null);
      setUser(data.user ?? null);
      setProfile(userProfile);

      return { data, profile: userProfile, error: null };
    } catch (error) {
      return { data: null, profile: null, error };
    } finally {
      isVerifyingSignInRef.current = false;
    }
  };

  // Google OAuth Login (Customer Portal — supports Web + Capacitor Native Android Chrome Custom Tab)
  const signInWithGoogle = async () => {
    try {
      sessionStorage.setItem('oliveal_oauth_pending', 'true');
      const isNative = Capacitor.isNativePlatform();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: isNative
            ? NATIVE_OAUTH_REDIRECT_URL
            : `${window.location.origin}/dashboard`,
          ...(isNative ? { skipBrowserRedirect: true } : {}),
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        sessionStorage.removeItem('oliveal_oauth_pending');
        throw error;
      }

      if (isNative && data?.url) {
        await Browser.open({
          url: data.url,
          toolbarColor: '#080510',
        });
      }

      return { data, error: null };
    } catch (error) {
      sessionStorage.removeItem('oliveal_oauth_pending');
      return { data: null, error };
    }
  };

  // 6-Digit OTP / Token Verification
  const verifyOtp = async ({ email, token, type = 'signup' }) => {
    try {
      // First attempt with the specified type (typically 'signup')
      let res = await supabase.auth.verifyOtp({
        email,
        token,
        type,
      });

      // If signup type fails, attempt with 'email' (magic link/code variant)
      if (res.error && type === 'signup') {
        const fallbackRes = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'email',
        });
        if (!fallbackRes.error) {
          res = fallbackRes;
        }
      }

      if (res.error) throw res.error;

      if (res.data?.user) {
        await fetchProfile(
          res.data.user.id,
          res.data.user.user_metadata,
          res.data.user.email
        );
      }

      return { data: res.data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Resend OTP code
  const resendOtp = async ({ email, type = 'signup' }) => {
    try {
      const { data, error } = await supabase.auth.resend({
        type,
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Password Reset Email (strictly verified against registered Admin & Customer database accounts)
  const resetPassword = async (email) => {
    try {
      const cleanEmail = String(email || '').trim();
      if (!cleanEmail) {
        throw new Error('Email address is required');
      }

      const { data: emailRegistered, error: verifyErr } = await supabase.rpc(
        'is_registered_email',
        { p_email: cleanEmail }
      );

      if (verifyErr) {
        const msg = String(verifyErr.message || '');
        const code = String(verifyErr.code || '');
        if (
          code === 'PGRST202' ||
          code === '42883' ||
          msg.includes('is_registered_email')
        ) {
          throw new Error(
            'Password reset verification is not configured in Supabase yet. Please execute supabase/migrations/06_registered_email_check.sql in Supabase SQL Editor.'
          );
        }
        throw new Error(
          msg || 'Unable to verify registered email address right now. Please try again.'
        );
      }

      if (emailRegistered !== true) {
        throw new Error(
          'No registered account found with this email address. Please enter your registered email.'
        );
      }

      const redirectUrl = Capacitor.isNativePlatform()
        ? NATIVE_RESET_PASSWORD_REDIRECT_URL
        : `${window.location.origin}/reset-password`;

      const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Update Password (used after recovery)
  const updatePassword = async (newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Sign Out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    role: profile?.role || 'customer',
    isAdmin: profile?.role === 'admin',
    signUp,
    signIn,
    signInWithGoogle,
    verifyOtp,
    resendOtp,
    resetPassword,
    updatePassword,
    signOut,
    refreshProfile: () => user ? fetchProfile(user.id, user.user_metadata, user.email) : null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

