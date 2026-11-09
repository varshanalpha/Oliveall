import React from 'react';
import { Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import CustomerHome from '../pages/customer/CustomerHome';
import BookSlot from '../pages/customer/BookSlot';
import ConfirmBooking from '../pages/customer/ConfirmBooking';
import MyBookings from '../pages/customer/MyBookings';
import AdminDashboard from '../pages/admin/Dashboard';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import AuthLayout from '../components/auth/AuthLayout';
import OtpVerificationModal from '../components/auth/OtpVerificationModal';
import { useAuth } from '../context/AuthContext';

// Dedicated standalone wrapper for /verify-otp with query params (e.g. /verify-otp?email=...)
function StandaloneOtpPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyOtp, resendOtp } = useAuth();
  const email = searchParams.get('email') || 'gamer@olivealgaming.com';

  const handleVerify = async (code) => {
    const res = await verifyOtp({
      email,
      token: code,
      type: 'signup',
    });

    if (res.error) {
      return { error: res.error };
    }

    setTimeout(() => {
      navigate('/dashboard');
    }, 1500);

    return { success: true };
  };

  const handleResend = async () => {
    return await resendOtp({
      email,
      type: 'signup',
    });
  };

  return (
    <AuthLayout showBackButton={true} backTo="/signup">
      <OtpVerificationModal
        email={email}
        onVerify={handleVerify}
        onResend={handleResend}
        onBack={() => navigate('/signup')}
      />
    </AuthLayout>
  );
}

// Root redirect handler based on auth state
function RootRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    if (profile?.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root Route */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-otp" element={<StandaloneOtpPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected Customer Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <CustomerHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/book-slot"
        element={
          <ProtectedRoute>
            <BookSlot />
          </ProtectedRoute>
        }
      />
      <Route
        path="/confirm-booking"
        element={
          <ProtectedRoute>
            <ConfirmBooking />
          </ProtectedRoute>
        }
      />
      {/* Visual verification preview route */}
      <Route path="/preview-confirm" element={<ConfirmBooking />} />
      <Route
        path="/my-bookings"
        element={
          <ProtectedRoute>
            <MyBookings />
          </ProtectedRoute>
        }
      />

      {/* Protected Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
