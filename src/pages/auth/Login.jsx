import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthBranding from '../../components/auth/AuthBranding';
import RoleSelector from '../../components/auth/RoleSelector';
import AuthInput from '../../components/auth/AuthInput';
import PasswordInput from '../../components/auth/PasswordInput';
import PrimaryButton from '../../components/auth/PrimaryButton';
import SocialLoginButton from '../../components/auth/SocialLoginButton';
import AuthDivider from '../../components/auth/AuthDivider';
import StatusMessage from '../../components/ui/StatusMessage';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signIn, signInWithGoogle, signOut } = useAuth();

  const [role, setRole] = useState('customer'); // 'customer' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);

  // Restore remembered email on initial mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('oliveal_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Surface any OAuth redirect errors (e.g. user cancelled Google consent)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const oauthErrorDesc = searchParams.get('error_description') || hashParams.get('error_description');
    const oauthError = searchParams.get('error') || hashParams.get('error');

    if (oauthError || oauthErrorDesc) {
      sessionStorage.removeItem('oliveal_oauth_pending');
      setSocialLoading(false);
      setStatus({
        type: 'error',
        message: oauthErrorDesc || 'Google sign-in was cancelled or failed. Please try again.',
      });
    }
  }, []);

  // Automatically redirect returning Google OAuth sessions or already-authenticated users
  // Note: active form submits hold `loading === true` until `handleSubmit` finishes strict role checks
  useEffect(() => {
    if (!authLoading && user && !loading) {
      sessionStorage.removeItem('oliveal_oauth_pending');
      const effectiveRole = profile?.role || 'customer';
      if (effectiveRole === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, profile, authLoading, loading, navigate]);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (!validate()) return;

    setLoading(true);

    try {
      // Remember me handling
      if (rememberMe) {
        localStorage.setItem('oliveal_remembered_email', email.trim());
      } else {
        localStorage.removeItem('oliveal_remembered_email');
      }

      // Pass expectedRole (e.g. 'customer' or 'admin') for strict portal segregation
      const { data, profile: userProfile, error } = await signIn({
        email: email.trim(),
        password,
        expectedRole: role,
      });

      if (error) {
        setLoading(false);
        let errorMsg = 'Incorrect email or password. Please try again.';
        if (error.message?.includes('Email not confirmed')) {
          errorMsg = 'Your email has not been confirmed yet. Please verify your email code or check your inbox.';
        }
        setStatus({
          type: 'error',
          message: errorMsg,
        });
        return;
      }

      // Double-check role matches the active portal
      const effectiveRole = userProfile?.role || 'customer';
      if (effectiveRole !== role) {
        await signOut();
        setLoading(false);
        setStatus({
          type: 'error',
          message: 'Incorrect email or password. Please try again.',
        });
        return;
      }

      // Successful portal login
      if (role === 'admin') {
        setStatus({
          type: 'success',
          message: 'Admin access verified! Launching Oliveal Admin Portal...',
        });
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 800);
      } else {
        setStatus({
          type: 'success',
          message: `Welcome back, ${userProfile?.full_name || 'Gamer'}! Entering gaming zone...`,
        });
        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      }
    } catch (err) {
      setLoading(false);
      setStatus({
        type: 'error',
        message: 'Incorrect email or password. Please try again.',
      });
    }
  };

  const handleGoogleLogin = async () => {
    setStatus(null);
    setSocialLoading(true);

    const { error } = await signInWithGoogle();
    if (error) {
      setSocialLoading(false);
      setStatus({
        type: 'error',
        message: error.message || 'Failed to authenticate with Google. Please try again.',
      });
    }
  };

  return (
    <AuthLayout>
      <div className="w-full flex flex-col items-center">

        {/* ── TOP: Branding (controller + Oliveal GAMING ZONE) ── */}
        <div className="mb-3">
          <AuthBranding />
        </div>

        {/* ── Page Heading (Welcome Back / Admin Portal) ── */}
        <div className="text-center mb-4 min-h-[54px] flex flex-col justify-center">
          <h2
            key={role + '-title'}
            className="text-[1.65rem] sm:text-[1.9rem] font-extrabold text-white tracking-tight leading-tight animate-fadeIn"
          >
            {role === 'admin' ? 'Admin Portal' : 'Welcome Back'}
          </h2>
          <p
            key={role + '-subtitle'}
            className="text-[11.5px] sm:text-sm text-slate-400 mt-1 animate-fadeIn"
          >
            {role === 'admin'
              ? 'Sign in with your enterprise credentials'
              : 'Login to your account'}
          </p>
        </div>

        {/* ── Main Glassmorphic Form Card (role selector lives inside) ── */}
        <div className="w-full mt-3 p-5 sm:p-6 rounded-3xl bg-[#120f22]/85 border border-white/[0.09] backdrop-blur-xl shadow-glass-card transition-all duration-300">

          {/* Customer / Admin Segmented Switcher — top of card */}
          <RoleSelector activeRole={role} onRoleChange={(newRole) => {
            setRole(newRole);
            setErrors({});
            setStatus(null);
          }} />

          {/* Status Message Alert */}
          {status && (
            <StatusMessage
              type={status.type}
              message={status.message}
              onClose={() => setStatus(null)}
            />
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email Address */}
            <AuthInput
              label="Email Address"
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
              }}
              placeholder="Enter your email"
              icon={Mail}
              error={errors.email}
              autoComplete="email"
            />

            {/* Password */}
            <PasswordInput
              label="Password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
              placeholder="Enter your password"
              error={errors.password}
            />

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between mt-2 mb-6 text-xs sm:text-sm">
              <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4.5 h-4.5 rounded bg-[#1c1833] border-white/20 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 focus:ring-offset-transparent accent-purple-600 transition"
                />
                <span className="text-slate-300 font-medium whitespace-nowrap">Remember me</span>
              </label>

              <Link
                to="/forgot-password"
                className="text-purple-400 hover:text-purple-300 font-semibold transition-colors whitespace-nowrap ml-2"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Primary Submit Button */}
            <PrimaryButton type="submit" loading={loading}>
              <span key={role} className="animate-fadeIn">
                {role === 'admin' ? 'Admin Log In' : 'Log In'}
              </span>
            </PrimaryButton>
          </form>

          {/* Social Login Options (CUSTOMER ONLY — smooth height & opacity collapse) */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${role === 'customer'
                ? 'max-h-36 opacity-100'
                : 'max-h-0 opacity-0 pointer-events-none'
              }`}
          >
            <AuthDivider text="or continue with" />
            <SocialLoginButton
              onClick={handleGoogleLogin}
              loading={socialLoading}
              text="Continue with Google"
            />
          </div>

          {/* Footer Navigation Link with smooth cross-fade */}
          <div key={role + '-footer'} className="mt-5 text-center text-xs sm:text-sm text-slate-400 animate-fadeIn">
            {role === 'customer' ? (
              <p>
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  className="text-purple-400 hover:text-purple-300 font-bold transition-colors underline-offset-4 hover:underline"
                >
                  Sign Up
                </Link>
              </p>
            ) : (
              <p className="text-[11.5px] text-slate-500">
                Unauthorized access to the admin portal is strictly monitored.
              </p>
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
