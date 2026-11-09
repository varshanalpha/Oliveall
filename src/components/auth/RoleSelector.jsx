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
      <div className="relative p-1.5 rounded-full bg-[#131024]/90 border border-white/10 flex items-center backdrop-blur-md shadow-inner select-none">

        {/* Animated Sliding Background Glow Pill */}
        <div
          className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full bg-gradient-to-r from-[#9333ea] via-[#a855f7] to-[#c084fc] shadow-[0_0_24px_rgba(168,85,247,0.55)] border border-purple-300/30 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${activeRole === 'admin'
            ? 'left-[calc(50%+1.5px)]'
            : 'left-1.5'
            }`}
        />

        {/* Customer Button */}
        <button
          type="button"
          onClick={() => onRoleChange && onRoleChange('customer')}
          className={`relative z-10 flex-1 py-3 sm:py-3.5 px-4 sm:px-6 rounded-full flex items-center justify-center gap-2.5 text-sm sm:text-[15px] font-semibold transition-colors duration-300 ${activeRole === 'customer'
            ? 'text-white'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          <User className="w-4.5 h-4.5" />
          <span>Customer</span>
        </button>

        {/* Admin Button */}
        <button
          type="button"
          disabled={disableAdmin}
          onClick={() => !disableAdmin && onRoleChange && onRoleChange('admin')}
          title={disableAdmin ? adminDisabledReason : "Switch to Admin Login"}
          className={`relative z-10 flex-1 py-3 sm:py-3.5 px-4 sm:px-6 rounded-full flex items-center justify-center gap-2.5 text-sm sm:text-[15px] font-semibold transition-colors duration-300 ${disableAdmin
            ? 'text-slate-500 cursor-not-allowed opacity-60'
            : activeRole === 'admin'
              ? 'text-white'
              : 'text-slate-400 hover:text-white'
            }`}
        >
          <Shield className="w-4.5 h-4.5" />
          <span>Admin</span>
          {disableAdmin && (
            <Lock className="w-4 h-4 text-slate-400 ml-0.5" />
          )}
        </button>
      </div>


    </div>
  );
}
