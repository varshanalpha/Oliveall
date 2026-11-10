import React, { useState, useEffect } from 'react';
import CustomerHeader from '../../components/customer/CustomerHeader';
import HeroSection from '../../components/customer/HeroSection';
import NavigationCard from '../../components/customer/NavigationCard';
import StationCard from '../../components/customer/StationCard';
import { fetchActiveStations, getCachedStations } from '../../services/stationService';

export default function CustomerHome() {
  const [stations, setStations] = useState(() => getCachedStations() || []);
  const [loadingStations, setLoadingStations] = useState(() => !getCachedStations());

  useEffect(() => {
    let mounted = true;
    async function loadStations() {
      const { stations: list } = await fetchActiveStations();
      if (!mounted) return;
      setStations((prev) => {
        if (prev.length === list.length && JSON.stringify(prev) === JSON.stringify(list)) {
          return prev;
        }
        return list;
      });
      setLoadingStations(false);
    }
    loadStations();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#07060e] text-white flex flex-col justify-between selection:bg-purple-600 selection:text-white relative overflow-x-hidden">

      {/* ================= BACKGROUND GAMING AMBIENCE ================= */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-fuchsia-600/12 rounded-full blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 w-[450px] h-72 bg-purple-600/20 rounded-full blur-[130px]" />
      </div>

      {/* Top Customer Header */}
      <CustomerHeader activeRoute="dashboard" />

      {/* Main Customer Screen Content Container */}
      <main className="relative z-10 w-full max-w-[465px] sm:max-w-xl mx-auto px-4 sm:px-5 py-5 flex-1 flex flex-col gap-5">

        {/* 1. "Ready to Play?" Hero Banner */}
        <HeroSection />

        {/* 2. Primary Navigation Cards ("Book Your Slot" & "My Bookings") */}
        <NavigationCard />

        {/* 3. Gaming Stations Section */}
        <section className="mt-1">
          {/* Section Header with Live Availability Badge */}
          <div className="flex items-center justify-between mb-3 px-0.5">
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
              Our Gaming Stations
            </h2>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Live Availability</span>
            </div>
          </div>

          {/* Stations Grid */}
          {loadingStations ? (
            <div className="grid grid-cols-2 gap-3.5">
              {[...Array(6)].map((_, idx) => (
                <div
                  key={idx}
                  className="h-52 rounded-3xl bg-[#120f22]/70 border border-white/[0.06] animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5">
              {stations.map((station) => (
                <StationCard key={station.id} station={station} />
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-[11px] text-slate-500 border-t border-white/[0.06]">
        Oliveal Gaming Zone © 2026. All rights reserved.
      </footer>
    </div>
  );
}
