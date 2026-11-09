import React from 'react';
import { User, Shield, Lock } from 'lucide-react';

export default function RoleSelector({
  activeRole = 'customer',
  onRoleChange,
  disableAdmin = false,
  adminDisabledReason = "Admin registration is not available",
}) {
  return (
    <div className="w-full mb-6">
      <div className="relative p-1 rounded-full bg-[#131024]/90 border border-white/10 flex items-center justify-between backdrop-blur-md shadow-inner">
        {/* Customer Button */}
        <button
          type="button"
          onClick={() => onRoleChange && onRoleChange('customer')}
          className={`flex-1 py-2.5 px-4 rounded-full flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-300 relative select-none ${
            activeRole === 'customer'
              ? 'bg-gradient-to-r from-[#9333ea] via-[#a855f7] to-[#c084fc] text-white shadow-[0_0_22px_rgba(168,85,247,0.55)] border border-purple-300/30'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Customer</span>
        </button>

        {/* Admin Button */}
        <button
          type="button"
          disabled={disableAdmin}
          onClick={() => !disableAdmin && onRoleChange && onRoleChange('admin')}
          title={disableAdmin ? adminDisabledReason : "Switch to Admin Login"}
          className={`flex-1 py-2.5 px-4 rounded-full flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-300 relative select-none ${
            disableAdmin
              ? 'text-slate-500 cursor-not-allowed opacity-60'
              : activeRole === 'admin'
              ? 'bg-gradient-to-r from-[#7c3aed] via-[#9333ea] to-[#a855f7] text-white shadow-[0_0_22px_rgba(168,85,247,0.55)] border border-purple-300/30'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Admin</span>
          {disableAdmin && (
            <Lock className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          )}
        </button>
      </div>

      {disableAdmin && (
        <p className="text-[11px] text-center text-purple-300/60 mt-1.5 font-medium">
          Only customers can create accounts. Admin credentials are created server-side.
        </p>
      )}
    </div>
  );
}

