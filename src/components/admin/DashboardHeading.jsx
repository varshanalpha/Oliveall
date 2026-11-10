import React from 'react';

export default function DashboardHeading({
  title = 'Admin Dashboard',
  subtitle = 'Manage spot bookings, check-ins and stations',
}) {
  return (
    <div className="px-0.5">
      <h1 className="text-[1.6rem] sm:text-[1.75rem] font-extrabold text-white tracking-tight leading-tight">
        {title}
      </h1>
      <p className="text-xs sm:text-sm text-[#A9A0BC] mt-1 font-medium leading-snug">
        {subtitle}
      </p>
    </div>
  );
}

