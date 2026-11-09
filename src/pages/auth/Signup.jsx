import React, { useState } from 'react';
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

export default function Signup() {
  const navigate = useNavigate();

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 6-Digit OTP Step State
  const [showOtpStep, setShowOtpStep] = useState(false);

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

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    setStatus(null);

    if (!validate()) return;

    setLoading(true);

    // Simulate account preparation and transition to 6-digit OTP verification
    setTimeout(() => {
      setLoading(false);
      setShowOtpStep(true);
    }, 700);
  };

  const handleOtpVerified = (code) => {
    // When OTP is confirmed
    setTimeout(() => {
      navigate('/login');
    }, 2000);
  };

  const handleGoogleSignup = () => {
    setStatus({
      type: 'info',
      message: 'Google OAuth registration will be linked in the Supabase backend phase.',
    });
  };

  return (
    <AuthLayout
      showBackButton={true}
      onBack={showOtpStep ? () => setShowOtpStep(false) : () => navigate('/login')}
    >
      {showOtpStep ? (
        /* 6-DIGIT OTP VERIFICATION VIEW */
        <OtpVerificationModal
          email={email}
          onVerify={handleOtpVerified}
          onBack={() => setShowOtpStep(false)}
        />
      ) : (
        /* STANDARD SIGNUP FORM VIEW */
        <div className="w-full flex flex-col items-center">
          
          {/* Top Logo & Branding */}
          <div className="mb-4">
            <AuthBranding />
          </div>

          {/* Heading */}
          <div className="text-center mb-5">
            <h2 className="text-2xl sm:text-[1.85rem] font-extrabold text-white tracking-tight leading-tight">
              Create Account
            </h2>
          </div>

          {/* Role Indicator (Customer locked / Admin registration strictly prohibited) */}
          <RoleSelector
            activeRole="customer"
            disableAdmin={true}
            adminDisabledReason="Admin registration is prohibited. Admin accounts are provisioned server-side."
          />

          {/* Glass Form Card */}
          <div className="w-full p-5 sm:p-8 rounded-3xl bg-[#120f22]/80 border border-white/10 backdrop-blur-xl shadow-glass-card">
            
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
