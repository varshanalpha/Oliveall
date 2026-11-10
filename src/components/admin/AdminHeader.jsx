import React, { useState, useRef, useEffect } from 'react';
import { Bell, LogOut, Shield, RefreshCw } from 'lucide-react';

/**
 * OLIVEAL GAMING ZONE — ADMIN HEADER
 * Left: Official Oliveal Gaming Zone logo (aspect-ratio preserved, safe-area padded)
 * Right: Notification bell (badge shown ONLY when real count > 0) + Admin Avatar
 */
export default function AdminHeader({
  adminProfile,
  notificationCount = 0,
  notifications = [],
  onSignOut,
  onRefresh,
  refreshing = false,
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const notifRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    setAvatarFailed(false);
  }, [adminProfile?.avatar_url]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const displayName = adminProfile?.full_name?.trim() || adminProfile?.email || 'Admin';
  const initial = displayName.charAt(0).toUpperCase();
  const hasAvatar = Boolean(adminProfile?.avatar_url) && !avatarFailed;

  return (
    <header className="relative z-30 w-full pt-[max(env(safe-area-inset-top),0.875rem)] pb-2.5 px-4 sm:px-6 bg-[#080510]/90 backdrop-blur-xl border-b border-purple-500/15">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 min-h-[56px] sm:min-h-[62px]">
        
        {/* Left: Official Oliveal Gaming Zone Logo (unclipped, natural aspect ratio) */}
        <div className="flex items-center shrink-0 py-0.5">
          <img
            src="/assets/images/oliveal-logo.png"
            alt="Oliveal Gaming Zone"
            className="h-12 sm:h-14 w-auto object-contain select-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
          />
        </div>

        {/* Right: Notification Bell & Circular Admin Avatar */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          
          {/* Optional Manual Refresh Button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Refresh dashboard data"
              title="Refresh data"
              className="w-9 h-9 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-[#A9A0BC] hover:text-white transition cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          )}

          {/* Notification Bell (badge ONLY renders if real notification data exists) */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setNotifOpen((prev) => !prev);
                setMenuOpen(false);
              }}
              aria-label="Admin Notifications"
              className="w-10 h-10 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-white transition cursor-pointer active:scale-95 relative"
            >
              <Bell className="w-5 h-5 text-slate-200" />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#7C3AED] border border-[#080510] text-[10px] font-bold text-white flex items-center justify-center shadow-[0_0_8px_rgba(124,58,237,0.8)]">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-64 p-3.5 rounded-2xl bg-[#120B20]/95 border border-purple-500/30 backdrop-blur-2xl shadow-2xl z-50">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Notifications
                  </span>
                  <span className="text-[10px] text-[#A9A0BC] font-medium">
                    {notificationCount} unread
                  </span>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#A9A0BC] py-2 text-center">
                    No notifications at this time.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {notifications.map((n, idx) => (
                      <div key={n.id || idx} className="p-2 rounded-xl bg-white/[0.04] text-xs text-slate-200">
                        {n.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Circular Admin Profile Avatar */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                setMenuOpen((prev) => !prev);
                setNotifOpen(false);
              }}
              aria-label={`Admin Profile: ${displayName}`}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6d28d9] to-[#4c1d95] border border-purple-400/50 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_14px_rgba(124,58,237,0.4)] hover:brightness-110 transition cursor-pointer active:scale-95 overflow-hidden"
            >
              {hasAvatar ? (
                <img
                  src={adminProfile.avatar_url}
                  alt={displayName}
                  onError={() => setAvatarFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initial}</span>
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-60 p-3.5 rounded-2xl bg-[#120B20]/95 border border-purple-500/30 backdrop-blur-2xl shadow-2xl z-50">
                <div className="pb-3 border-b border-white/10">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-600/25 border border-purple-400/35 text-purple-200 text-[10px] font-bold mb-1.5">
                    <Shield className="w-3 h-3 text-purple-300" />
                    <span>Admin</span>
                  </div>
                  <p className="text-sm font-bold text-white truncate">{displayName}</p>
                  {adminProfile?.email && (
                    <p className="text-[11px] text-[#A9A0BC] truncate">{adminProfile.email}</p>
                  )}
                </div>

                {onSignOut && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onSignOut();
                    }}
                    className="mt-2.5 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-300 hover:text-red-200 text-xs font-bold transition cursor-pointer active:scale-95"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}

