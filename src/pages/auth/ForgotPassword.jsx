import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthBranding from '../../components/auth/AuthBranding';
import AuthInput from '../../components/auth/AuthInput';
import PrimaryButton from '../../components/auth/PrimaryButton';
import StatusMessage from '../../components/ui/StatusMessage';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setStatus(null);

    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    // Simulate password reset email transmission
    setTimeout(() => {
      setLoading(false);
      setStatus({
        type: 'success',
        message: `Reset instructions dispatched to ${email}. Please check your inbox or spam folder.`,
      });
      setEmail('');
    }, 1000);
  };

  return (
    <AuthLayout showBackButton={true} backTo="/login">
      <div className="w-full flex flex-col items-center">
        
        {/* Top Logo & Branding */}
        <div className="mb-4">
          <AuthBranding />
        </div>

        {/* Page Headings */}
        <div className="text-center mb-5">
          <h2 className="text-2xl sm:text-[1.85rem] font-extrabold text-white tracking-tight leading-tight flex items-center justify-center gap-2">
            <span>Reset Password</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Enter your registered email and we'll send you recovery instructions.
          </p>
        </div>

        {/* Form Container */}
        <div className="w-full p-5 sm:p-8 rounded-3xl bg-[#120f22]/80 border border-white/10 backdrop-blur-xl shadow-glass-card">
          
          {status && (
            <StatusMessage
              type={status.type}
              message={status.message}
              onClose={() => setStatus(null)}
            />
          )}

          <form onSubmit={handleSubmit} noValidate>
            <AuthInput
              label="Email Address"
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter your registered email"
              icon={Mail}
              error={error}
              autoComplete="email"
            />

            <div className="mt-5">
              <PrimaryButton type="submit" loading={loading}>
                Send Reset Link
              </PrimaryButton>
            </div>
          </form>

          {/* Back to Login Link */}
          <div className="mt-6 text-center text-xs sm:text-sm text-slate-400">
            Remember your password?{' '}
            <Link
              to="/login"
              className="text-purple-400 hover:text-purple-300 font-bold transition-colors underline-offset-4 hover:underline"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

