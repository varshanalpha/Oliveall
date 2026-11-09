import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthBranding from '../../components/auth/AuthBranding';
import RoleSelector from '../../components/auth/RoleSelector';
import AuthInput from '../../components/auth/AuthInput';
import PasswordInput from '../../components/auth/PasswordInput';
import PrimaryButton from '../../components/auth/PrimaryButton';
import SocialLoginButton from '../../components/auth/SocialLoginButton';
import AuthDivider from '../../components/auth/AuthDivider';
import StatusMessage from '../../components/ui/StatusMessage';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState('customer'); // 'customer' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus(null);

    if (!validate()) return;

    setLoading(true);

    // Simulate authentication processing for UI preview
    setTimeout(() => {
      setLoading(false);
      if (role === 'admin') {
        setStatus({
          type: 'success',
          message: 'Admin credentials validated! Ready for server session in Phase 2.',
        });
      } else {
        setStatus({
          type: 'success',
          message: 'Welcome back, gamer! Redirecting to dashboard...',
        });
      }
    }, 1200);
  };

  const handleGoogleLogin = () => {
    setStatus({
      type: 'info',
      message: 'Google OAuth flow will connect to Supabase Auth in the backend integration phase.',
    });
  };

  return (
    <AuthLayout>
      <div className="w-full flex flex-col items-center">

        {/* Top Logo & Branding */}
        <div className="mb-3">
          <AuthBranding />
        </div>

        {/* Page Headings */}
        <div className="text-center mb-4">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {role === 'admin' ? 'Admin  Portal' : 'Welcome  Back'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {role === 'admin'
              ? 'Sign in with your enterprise credentials'
              : 'Login to your account'}
          </p>
        </div>

        {/* Customer / Admin Segmented Switcher */}
        <RoleSelector activeRole={role} onRoleChange={(newRole) => {
          setRole(newRole);
          setErrors({});
          setStatus(null);
        }} />

        {/* Main Glassmorphic Form Card */}
        <div className="w-full p-4 sm:p-6 rounded-3xl bg-[#120f22]/80 border border-white/10 backdrop-blur-xl shadow-glass-card">

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
            <div className="flex items-center justify-between mt-1 mb-5 text-xs sm:text-sm">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1c1833] border-white/20 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 focus:ring-offset-transparent accent-purple-600 transition"
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
              {role === 'admin' ? 'Admin Log In' : 'Log In'}
            </PrimaryButton>
          </form>

          {/* Social Login Options (CUSTOMER ONLY) */}
          {role === 'customer' && (
            <>
              <AuthDivider text="or continue with" />
              <SocialLoginButton
                onClick={handleGoogleLogin}
                text="Continue with Google"
              />
            </>
          )}

          {/* Footer Navigation Link */}
          <div className="mt-4 text-center text-xs sm:text-sm text-slate-400">
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
              <p className="text-[11px] text-slate-500">
                Unauthorized access to the admin portal is strictly monitored.
              </p>
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
