import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2 } from 'lucide-react';
import AuthLayout from '../../components/auth/AuthLayout';
import AuthBranding from '../../components/auth/AuthBranding';
import PasswordInput from '../../components/auth/PasswordInput';
import PrimaryButton from '../../components/auth/PrimaryButton';
import StatusMessage from '../../components/ui/StatusMessage';
import { useAuth } from '../../context/AuthContext';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!password) {
      newErrors.password = 'New password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm your new password';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      const { error } = await updatePassword(password);

      setLoading(false);

      if (error) {
        setStatus({
          type: 'error',
          message: error.message || 'Failed to update password. Recovery link may have expired.',
        });
        return;
      }

      setSuccess(true);
      setStatus({
        type: 'success',
        message: 'Password successfully updated! Redirecting to login...',
      });

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setLoading(false);
      setStatus({
        type: 'error',
        message: err.message || 'An error occurred while updating your password.',
      });
    }
  };

  return (
    <AuthLayout showBackButton={true} backTo="/login">
      <div className="w-full flex flex-col items-center">
        
        {/* Top Logo & Branding */}
        <div className="mb-3">
          <AuthBranding />
        </div>

        {/* Page Headings */}
        <div className="text-center mb-4">
          <h2 className="text-[1.65rem] sm:text-[1.9rem] font-extrabold text-white tracking-tight leading-tight">
            Create New Password
          </h2>
          <p className="text-[11.5px] sm:text-sm text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Enter and confirm your new secure password below.
          </p>
        </div>

        {/* Form Container */}
        <div className="w-full mt-2 p-5 sm:p-6 rounded-3xl bg-[#120f22]/85 border border-white/[0.09] backdrop-blur-xl shadow-glass-card">
          
          {status && (
            <StatusMessage
              type={status.type}
              message={status.message}
              onClose={() => setStatus(null)}
            />
          )}

          {success ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-bounce" />
              <p className="text-slate-200 text-sm font-medium">Password updated securely.</p>
              <Link
                to="/login"
                className="mt-4 inline-block text-purple-400 hover:text-purple-300 font-bold text-sm"
              >
                Go to Login →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <PasswordInput
                label="New Password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                placeholder="Enter at least 6 characters"
                error={errors.password}
                autoComplete="new-password"
              />

              <PasswordInput
                label="Confirm New Password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }
                }}
                placeholder="Re-enter your new password"
                error={errors.confirmPassword}
                autoComplete="new-password"
              />

              <div className="mt-5">
                <PrimaryButton type="submit" loading={loading}>
                  Update Password
                </PrimaryButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}

