import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

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
    return (
      <div className="min-h-screen w-full bg-[#07060e] flex flex-col items-center justify-center text-white p-6">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[#120f22]/90 border border-red-500/30 backdrop-blur-xl shadow-glass-card text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto mb-4 text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            Your account ({user.email}) does not have administrative privileges. Admin rights must be granted in the Supabase database.
          </p>
          <a
            href="/dashboard"
            className="inline-block w-full py-3 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition shadow-[0_0_20px_rgba(168,85,247,0.4)]"
          >
            Return to Customer Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}

