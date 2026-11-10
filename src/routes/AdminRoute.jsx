import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#07060e] flex flex-col items-center justify-center text-white">
        <div className="relative flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.45)] mb-4">
            <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-300 tracking-wide">
            Verifying Admin Credentials...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strictly enforce server-verified admin role
  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

