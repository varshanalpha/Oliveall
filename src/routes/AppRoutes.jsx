import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import ForgotPassword from '../pages/auth/ForgotPassword';
import AuthLayout from '../components/auth/AuthLayout';
import OtpVerificationModal from '../components/auth/OtpVerificationModal';

// Dedicated standalone wrapper for /verify-otp
function StandaloneOtpPage() {
  return (
    <AuthLayout showBackButton={true} backTo="/signup">
      <OtpVerificationModal
        email="gamer@olivealgaming.com"
        onVerify={() => {
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        }}
        onBack={() => {
          window.location.href = '/signup';
        }}
      />
    </AuthLayout>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-otp" element={<StandaloneOtpPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

