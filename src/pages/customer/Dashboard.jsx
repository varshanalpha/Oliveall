import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Gamepad2, CheckCircle2, Calendar, ShieldCheck, Sparkles } from 'lucide-react';
import AuthBranding from '../../components/auth/AuthBranding';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'Gamer';
  const displayEmail = user?.email || profile?.email || '';

  return (
    <div className="min-h-screen w-full bg-[#07060e] text-white flex flex-col justify-between selection:bg-purple-600 selection:text-white relative overflow-x-hidden">
      
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-600/15 rounded-full blur-[140px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 w-full border-b border-white/[0.08] bg-[#0c0a1a]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AuthBranding size="sm" />
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-bold text-white leading-tight">{displayName}</span>
              <span className="text-[11px] text-purple-300/80">{displayEmail}</span>
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

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* Welcome Hero Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-950/40 via-[#130f29]/90 to-[#1e1338]/80 border border-purple-500/20 backdrop-blur-xl shadow-glass-card mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Supabase Auth Connected</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome back, {displayName}! 🎮
              </h1>
              <p className="text-slate-300 text-sm mt-1 max-w-xl">
                You are successfully authenticated via Supabase. Your gamer profile is stored in the PostgreSQL database.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center">
              <div className="px-4 py-2 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Role: {profile?.role || 'Customer'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Card 1: Account Details */}
          <div className="p-5 rounded-2xl bg-[#120f22]/85 border border-white/[0.08] backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Database Profile</h3>
                <p className="text-[11px] text-slate-400">Public Profiles Table</p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300 mt-3 pt-3 border-t border-white/[0.06]">
              <div className="flex justify-between">
                <span className="text-slate-400">Role:</span>
                <span className="font-semibold text-purple-300 capitalize">{profile?.role || 'customer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Provider:</span>
                <span className="text-slate-200 capitalize">{user?.app_metadata?.provider || 'Email'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Next Feature: Slot Booking */}
          <div className="p-5 rounded-2xl bg-[#120f22]/85 border border-white/[0.08] backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Feature 2 & 3: Slot Booking</h3>
                <p className="text-[11px] text-slate-400">Next Development Phase</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mt-2">
              Slot scheduling, station selection (PS5, Xbox, PC Gaming), and real-time availability will unlock in the next feature phase.
            </p>
          </div>

          {/* Card 3: Payments & QR Pass */}
          <div className="p-5 rounded-2xl bg-[#120f22]/85 border border-white/[0.08] backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Feature 4 & 5: Razorpay + QR</h3>
                <p className="text-[11px] text-slate-400">Upcoming Integrations</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mt-2">
              Instant Razorpay checkout and cryptographic QR passes ready for the admin scanner at entry.
            </p>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-500 border-t border-white/[0.06]">
        Oliveal Gaming Zone © 2026. All rights reserved.
      </footer>
    </div>
  );
}

