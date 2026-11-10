import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, User } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthBranding from '../../components/auth/AuthBranding';
import RoleSelector from '../../components/auth/RoleSelector';
import AuthInput from '../../components/auth/AuthInput';
import PasswordInput from '../../components/auth/PasswordInput';
import PrimaryButton from '../../components/auth/PrimaryButton';
import SocialLoginButton from '../../components/auth/SocialLoginButton';
import AuthDivider from '../../components/auth/AuthDivider';
import StatusMessage from '../../components/ui/StatusMessage';
import OtpVerificationModal from '../../components/auth/OtpVerificationModal';
import { useAuth } from '../../context/AuthContext';

export default function Signup() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signUp, signInWithGoogle, verifyOtp, resendOtp } = useAuth();

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  // 6-Digit OTP Step State
  const [showOtpStep, setShowOtpStep] = useState(false);

  // Surface any OAuth redirect errors
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

  // Redirect authenticated users or returning Google OAuth sessions to Customer Main Page
  useEffect(() => {
    if (!authLoading && user && !loading && !showOtpStep) {
      sessionStorage.removeItem('oliveal_oauth_pending');
      const effectiveRole = profile?.role || 'customer';
      if (effectiveRole === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, profile, authLoading, loading, showOtpStep, navigate]);

  const validate = () => {
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    }

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

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (!validate()) return;

    setLoading(true);

    try {
      const { data, requiresConfirmation, error } = await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
      });

      if (error) {
        setLoading(false);
        let errorMsg = error.message || "Failed to create account. Please check your information.";
        if (error.message && error.message.toLowerCase().includes("confirmation email")) {
          errorMsg = "Email delivery error: Supabase could not dispatch the confirmation email. Please disable 'Confirm email' in Supabase (Authentication -> Providers -> Email) or verify your Resend custom SMTP credentials.";
        }
        setStatus({
          type: "error",
          message: errorMsg,
        });
        return;
      }

      setLoading(false);

      if (requiresConfirmation) {
        // Switch directly to 6-digit OTP verification screen
        setShowOtpStep(true);
      } else {
        // Direct signup without confirmation required
        setStatus({
          type: 'success',
          message: 'Account created successfully! Welcome to Oliveal Gaming Zone.',
        });
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      }
    } catch (err) {
      setLoading(false);
      setStatus({
        type: 'error',
        message: err.message || 'An unexpected error occurred during signup.',
      });
    }
  };

  const handleOtpVerified = async (code) => {
    const res = await verifyOtp({
      email: email.trim(),
      token: code,
      type: 'signup',
    });

    if (res.error) {
      return { error: res.error };
    }

    // Success — redirect to dashboard
    setTimeout(() => {
      navigate('/dashboard');
    }, 1500);

    return { success: true };
  };

  const handleResendOtp = async () => {
    return await resendOtp({
      email: email.trim(),
      type: 'signup',
    });
  };

  const handleGoogleSignup = async () => {
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
    <AuthLayout
      showBackButton={true}
      onBack={showOtpStep ? () => setShowOtpStep(false) : () => navigate('/login')}
    >
      {showOtpStep ? (
        /* 6-DIGIT OTP VERIFICATION VIEW */
        <OtpVerificationModal
          email={email.trim()}
          onVerify={handleOtpVerified}
          onResend={handleResendOtp}
          onBack={() => setShowOtpStep(false)}
        />
      ) : (
        /* STANDARD SIGNUP FORM VIEW */
        <div className="w-full flex flex-col items-center">
          
          {/* Top Logo & Branding */}
          <div className="mb-3">
            <AuthBranding />
          </div>

          {/* Heading */}
          <div className="text-center mb-4">
            <h2 className="text-[1.65rem] sm:text-[1.9rem] font-extrabold text-white tracking-tight leading-tight">
              Create Account
            </h2>
            <p className="text-[11.5px] sm:text-sm text-slate-400 mt-1">
              Join the Oliveal gaming community
            </p>
          </div>

          {/* Glass Form Card */}
          <div className="w-full mt-2 p-5 sm:p-6 rounded-3xl bg-[#120f22]/85 border border-white/[0.09] backdrop-blur-xl shadow-glass-card">
            
            {/* Role Indicator (Customer locked / Admin registration strictly prohibited) */}
            <RoleSelector
              activeRole="customer"
              disableAdmin={true}
              adminDisabledReason="Admin registration is prohibited. Admin accounts are provisioned server-side."
            />

            {status && (
              <StatusMessage
                type={status.type}
                message={status.message}
                onClose={() => setStatus(null)}
              />
            )}

            <form onSubmit={handleSignupSubmit} noValidate>
              {/* Full Name */}
              <AuthInput
                label="Full Name"
                id="fullName"
                name="fullName"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
                }}
                placeholder="Enter your full name"
                icon={User}
                error={errors.fullName}
                autoComplete="name"
              />

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
                placeholder="Create a password"
                error={errors.password}
                autoComplete="new-password"
              />

              {/* Confirm Password */}
              <PasswordInput
                label="Confirm Password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }
                }}
                placeholder="Re-enter your password"
                error={errors.confirmPassword}
                autoComplete="new-password"
              />

              {/* Submit Button */}
              <div className="mt-6">
                <PrimaryButton type="submit" loading={loading}>
                  Sign Up
                </PrimaryButton>
              </div>
            </form>

            {/* Social Signup Option */}
            <AuthDivider text="or continue with" />
            <SocialLoginButton
              onClick={handleGoogleSignup}
              loading={socialLoading}
              text="Continue with Google"
            />

            {/* Footer Navigation */}
            <div className="mt-6 text-center text-xs sm:text-sm text-slate-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-purple-400 hover:text-purple-300 font-bold transition-colors underline-offset-4 hover:underline"
              >
                Log In
              </Link>
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
