import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, RotateCw, CheckCircle2, ArrowLeft } from 'lucide-react';
import PrimaryButton from './PrimaryButton';
import StatusMessage from '../ui/StatusMessage';

export default function OtpVerificationModal({
  email = 'user@example.com',
  onVerify,
  onResend,
  onBack,
  isOpen = true,
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(59);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [isVerified, setIsVerified] = useState(false);

  const inputRefs = useRef([]);

  // Auto-focus the first input on load
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  // Handle single digit input
  const handleChange = (index, value) => {
    // Only accept numeric digits
    const cleaned = value.replace(/\D/g, '');
    const newOtp = [...otp];

    if (cleaned.length >= 1) {
      // Take only the last entered char if multiple
      newOtp[index] = cleaned[cleaned.length - 1];
      setOtp(newOtp);

      // Advance focus to next input
      if (index < 5 && inputRefs.current[index + 1]) {
        inputRefs.current[index + 1].focus();
      }
    } else {
      newOtp[index] = '';
      setOtp(newOtp);
    }
  };

  // Handle backspace key
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0 && inputRefs.current[index - 1]) {
        // Current is already empty, go back and clear previous
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1].focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle clipboard paste (e.g. 123456)
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const numbers = pastedData.replace(/\D/g, '').slice(0, 6);

    if (numbers.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = numbers[i] || '';
      }
      setOtp(newOtp);

      // Focus last filled index
      const focusIndex = Math.min(numbers.length, 5);
      if (inputRefs.current[focusIndex]) {
        inputRefs.current[focusIndex].focus();
      }
    }
  };

  // Handle Resend Code
  const handleResend = async () => {
    if (!canResend) return;
    setStatus(null);

    if (onResend) {
      try {
        const res = await onResend();
        if (res?.error) {
          setStatus({
            type: 'error',
            message: res.error.message || 'Failed to resend code. Please try again.',
          });
          return;
        }
      } catch (err) {
        setStatus({
          type: 'error',
          message: err.message || 'Failed to resend verification code.',
        });
        return;
      }
    }

    setTimer(59);
    setCanResend(false);
    setStatus({
      type: 'info',
      message: 'A fresh 6-digit verification code has been dispatched to your email!',
    });
  };

  // Handle Verify Submission
  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    const code = otp.join('');

    if (code.length < 6) {
      setStatus({
        type: 'error',
        message: 'Please enter all 6 digits of the verification code.',
      });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      if (onVerify) {
        const res = await onVerify(code);
        if (res?.error) {
          setStatus({
            type: 'error',
            message: res.error.message || 'Invalid verification code. Please check and try again.',
          });
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      setIsVerified(true);
      setStatus({
        type: 'success',
        message: 'Email successfully verified! Welcome to Oliveal Gaming Zone.',
      });
    } catch (err) {
      setLoading(false);
      setStatus({
        type: 'error',
        message: err.message || 'Verification failed. Please check the code.',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full flex flex-col items-center animate-fadeIn">
      {/* Top Security Emblem */}
      <div className="relative mb-3.5 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.45)]">
          {isVerified ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
          ) : (
            <ShieldCheck className="w-8 h-8 text-purple-400" />
          )}
        </div>
      </div>

      {/* Headings */}
      <div className="text-center mb-5">
        <h2 className="text-2xl sm:text-[1.85rem] font-extrabold text-white tracking-tight leading-tight">
          Verify Your Email
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-xs mx-auto leading-relaxed">
          We've sent a 6-digit verification code to
          <span className="block font-semibold text-purple-300 break-all mt-0.5">
            {email}
          </span>
        </p>
      </div>

      {/* Main Glass Card */}
      <div className="w-full p-5 sm:p-8 rounded-3xl bg-[#120f22]/85 border border-white/10 backdrop-blur-xl shadow-glass-card">
        
        {/* Status Message */}
        {status && (
          <StatusMessage
            type={status.type}
            message={status.message}
            onClose={() => setStatus(null)}
          />
        )}

        {/* 6 Digit Inputs Matrix */}
        <div className="flex items-center justify-center gap-2 sm:gap-2.5 my-4" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              disabled={isVerified || loading}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-xl sm:rounded-2xl bg-[#1c1833]/90 text-white border transition-all duration-200 outline-none select-all ${
                digit
                  ? 'border-purple-400/80 bg-[#251f42] shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                  : 'border-white/10 hover:border-white/20'
              } focus:border-purple-400 focus:bg-[#282147] focus:ring-2 focus:ring-purple-500/40 focus:shadow-[0_0_16px_rgba(168,85,247,0.45)]`}
            />
          ))}
        </div>

        {/* Resend Code Section */}
        <div className="flex items-center justify-center my-4 text-xs sm:text-sm text-slate-400">
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-semibold transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Resend verification code</span>
            </button>
          ) : (
            <p>
              Resend code in{' '}
              <span className="font-semibold text-purple-300 font-mono">
                00:{timer < 10 ? `0${timer}` : timer}
              </span>
            </p>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="mt-5">
          <PrimaryButton
            type="button"
            onClick={handleVerify}
            loading={loading}
            disabled={isVerified}
          >
            {isVerified ? 'Verified Successfully' : 'Verify & Continue'}
          </PrimaryButton>
        </div>

        {/* Back / Change Email Link */}
        {onBack && !isVerified && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-purple-300 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Wrong email? Edit details</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
