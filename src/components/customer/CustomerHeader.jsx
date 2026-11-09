import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, Bell, User, LogOut, X, Gamepad2, Calendar, Shield } from 'lucide-react';
import AuthBranding from '../auth/AuthBranding';
import { useAuth } from '../../context/AuthContext';

export default function CustomerHeader({ activeRoute = 'dashboard' }) {
  const navigate = useNavigate();
  const { user, profile, signOut, isAdmin } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Gamer';
  const displayEmail = user?.email || '';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      <header className="relative z-30 w-full border-b border-white/[0.08] bg-[#0c0a1a]/85 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Left: Mobile Navigation Drawer Toggle */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open Navigation Menu"
            className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-slate-200 hover:text-white transition active:scale-95 shadow-md"
          >
            <Menu className="w-5 h-5 text-slate-200" />
          </button>

          {/* Center: Oliveal Gaming Zone Branding */}
          <Link to="/dashboard" className="flex items-center justify-center cursor-pointer hover:opacity-95 transition">
            <AuthBranding size="sm" />
          </Link>

          {/* Right: Notifications Bell & Customer Profile Avatar */}
          <div className="flex items-center gap-2.5">
            
            {/* Notification Bell with Pink Unread Indicator Dot */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((prev) => !prev)}
                aria-label="View Notifications"
                className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-slate-200 hover:text-white transition active:scale-95 shadow-md relative"
              >
                <Bell className="w-4.5 h-4.5 text-slate-200" />
                {/* Neon Pink Indicator Dot */}
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-fuchsia-500 shadow-[0_0_8px_#d946ef] ring-2 ring-[#0c0a1a]" />
              </button>

              {/* Notification Popup Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 p-3.5 rounded-2xl bg-[#141029]/95 border border-purple-500/30 backdrop-blur-2xl shadow-glass-card z-50 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
                    <span className="text-[10px] text-fuchsia-400 font-semibold">1 New</span>
                  </div>
                  <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/20 text-xs">
                    <p className="font-semibold text-purple-200">24/7 Gaming Active</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      Advance booking for tomorrow unlocks daily at 8:00 PM.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Customer Avatar Circle */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Customer Profile"
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-700 to-fuchsia-600 p-0.5 shadow-[0_0_15px_rgba(168,85,247,0.4)] active:scale-95 transition"
            >
              <div className="w-full h-full rounded-full bg-[#120f22] flex items-center justify-center">
                <User className="w-4.5 h-4.5 text-purple-300" />
              </div>
            </button>
          </div>

        </div>
      </header>

      {/* Navigation Slide-Over Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer container */}
          <div className="relative w-full max-w-xs bg-[#100d24] border-r border-white/10 p-6 flex flex-col justify-between shadow-2xl z-10 animate-slideRight">
            <div>
              {/* Header inside drawer */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-400 font-bold text-xs">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{displayName}</h3>
                    <span className="text-[11px] text-purple-300/80 capitalize">Role: {profile?.role || 'Customer'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="mt-6 space-y-2">
                <Link
                  to="/dashboard"
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                    activeRoute === 'dashboard'
                      ? 'bg-purple-600/25 text-white border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                      : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <Gamepad2 className="w-4.5 h-4.5 text-purple-400" />
                  <span>Customer Home</span>
                </Link>

                <Link
                  to="/book-slot"
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                    activeRoute === 'book-slot'
                      ? 'bg-purple-600/25 text-white border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                      : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <Gamepad2 className="w-4.5 h-4.5 text-fuchsia-400" />
                  <span>Book Your Slot</span>
                </Link>

                <Link
                  to="/my-bookings"
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                    activeRoute === 'my-bookings'
                      ? 'bg-purple-600/25 text-white border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                      : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <Calendar className="w-4.5 h-4.5 text-purple-400" />
                  <span>My Bookings</span>
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-purple-300 hover:bg-purple-600/20 transition border border-purple-500/20"
                  >
                    <Shield className="w-4.5 h-4.5 text-purple-400" />
                    <span>Admin Portal</span>
                  </Link>
                )}
              </nav>
            </div>

            {/* Logout button in drawer footer */}
            <div className="pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-sm font-semibold transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

