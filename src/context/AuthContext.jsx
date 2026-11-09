import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch or ensure profile in public.profiles
  const fetchProfile = useCallback(async (userId, userMetadata = null, email = null) => {
    if (!userId) {
      setProfile(null);
      return null;
    }

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
        setProfile(data);
        return data;
      }

      // Fallback: If trigger didn't run or table was populated manually, create customer profile
      if (!data && (email || userMetadata)) {
        const fallbackProfile = {
          id: userId,
          email: email || '',
          full_name: userMetadata?.full_name || userMetadata?.name || 'Gamer',
          role: 'customer',
          avatar_url: userMetadata?.avatar_url || userMetadata?.picture || null,
        };

        const { data: inserted, error: insertErr } = await supabase
          .from('profiles')
          .upsert(fallbackProfile)
          .select()
          .maybeSingle();

        if (!insertErr && inserted) {
          setProfile(inserted);
          return inserted;
        }
      }

      return null;
    } catch (err) {
      console.error('Failed to resolve profile:', err);
      return null;
    }
  }, []);

  // Initialize session and listen for auth state changes
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting initial session:', error);
        }

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);

          if (initialSession?.user) {
            await fetchProfile(
              initialSession.user.id,
              initialSession.user.user_metadata,
              initialSession.user.email
            );
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Subscribe to auth state changes (sign in, sign out, token refresh, OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await fetchProfile(
          currentSession.user.id,
          currentSession.user.user_metadata,
          currentSession.user.email
        );
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

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
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      let userProfile = null;
      if (data.user) {
        userProfile = await fetchProfile(
          data.user.id,
          data.user.user_metadata,
          data.user.email
        );
      }

      // STRICT ROLE ENFORCEMENT:
      // If expectedRole is specified, the user's role must match the active portal.
      // If an Admin logs into the Customer portal or a Customer logs into the Admin portal,
      // immediately terminate the session and throw a generic invalid credentials error.
      if (expectedRole && userProfile) {
        const userRole = userProfile.role || 'customer';
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

      return { data, profile: userProfile, error: null };
    } catch (error) {
      return { data: null, profile: null, error };
    }
  };

  // Google OAuth Login
  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
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

  // Password Reset Email
  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
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

