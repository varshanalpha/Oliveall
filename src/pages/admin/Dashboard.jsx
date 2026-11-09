import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { LogOut, Shield, Users, Layers, QrCode, CheckCircle2 } from 'lucide-react';
import AuthBranding from '../../components/auth/AuthBranding';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [profileCount, setProfileCount] = useState(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  useEffect(() => {
    async function loadStats() {
      try {
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          setProfileCount(count);
        }
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      }
    }
    loadStats();
  }, []);

  const adminName = profile?.full_name || 'System Admin';

  return (
    <div className="min-h-screen w-full bg-[#07060e] text-white flex flex-col justify-between selection:bg-purple-600 selection:text-white relative overflow-x-hidden">
      
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-fuchsia-600/15 rounded-full blur-[140px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 w-full border-b border-purple-500/20 bg-[#0c0a1a]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AuthBranding size="sm" />
          </div>

          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-600/25 border border-purple-500/40 text-purple-300 text-xs font-bold">
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </div>

            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs sm:text-sm font-medium text-slate-200 hover:text-white transition active:scale-95 shadow-md"
            >
              <LogOut className="w-4 h-4 text-purple-400" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Body */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* Admin Welcome Hero */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-950/50 via-[#161033]/90 to-[#221240]/80 border border-purple-500/30 backdrop-blur-xl shadow-glass-card mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-semibold mb-3">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Enterprise Admin Authenticated</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Oliveal Administration Hub
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-xl">
                Logged in as <strong className="text-white">{adminName}</strong> ({user?.email}).
                Your session is authenticated via Supabase Row-Level-Security (RLS) policies.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-4 rounded-2xl bg-purple-900/30 border border-purple-500/30 text-center">
                <span className="block text-2xl font-black text-white">
                  {profileCount !== null ? profileCount : '—'}
                </span>
                <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider">
                  Registered Profiles
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Roadmap Panels for Admin */}
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>Operational Capabilities</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Slot Management */}
          <div className="p-6 rounded-2xl bg-[#120f22]/85 border border-white/[0.08] backdrop-blur-xl hover:border-purple-500/30 transition">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Feature 2: Slot Management</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Create, configure, and monitor gaming stations (PS5, Xbox Series X, PC rigs), hourly pricing, and slot operating schedules.
            </p>
            <span className="inline-block px-2.5 py-1 rounded-lg bg-white/[0.06] text-purple-300 text-[11px] font-semibold">
              Next Feature Phase
            </span>
          </div>

          {/* Card 2: QR Code Entry Scanner */}
          <div className="p-6 rounded-2xl bg-[#120f22]/85 border border-white/[0.08] backdrop-blur-xl hover:border-purple-500/30 transition">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 mb-4">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Feature 5: QR Entry Scanner</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Scan arriving customers' dynamic QR passes using your mobile/tablet camera to instantly validate booking and unlock stations.
            </p>
            <span className="inline-block px-2.5 py-1 rounded-lg bg-white/[0.06] text-fuchsia-300 text-[11px] font-semibold">
              Upcoming Phase
            </span>
          </div>

          {/* Card 3: User & Revenue Oversight */}
          <div className="p-6 rounded-2xl bg-[#120f22]/85 border border-white/[0.08] backdrop-blur-xl hover:border-purple-500/30 transition">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Feature 6: Analytics & Control</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Real-time booking ledger, Razorpay settlement auditing, customer attendance tracking, and capacity optimization metrics.
            </p>
            <span className="inline-block px-2.5 py-1 rounded-lg bg-white/[0.06] text-violet-300 text-[11px] font-semibold">
              Upcoming Phase
            </span>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-500 border-t border-white/[0.06]">
        Oliveal Gaming Zone — Enterprise Administration System © 2026.
      </footer>
    </div>
  );
}

