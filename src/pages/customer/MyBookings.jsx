import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Gamepad2 } from 'lucide-react';
import CustomerHeader from '../../components/customer/CustomerHeader';
import BookingCard from '../../components/customer/BookingCard';
import { getCustomerBookings } from '../../services/mock/bookingStore';

export default function MyBookings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [bookings, setBookings] = useState([]);

  // Load customer bookings
  const loadBookings = () => {
    const list = getCustomerBookings();
    setBookings(list);
  };

  useEffect(() => {
    loadBookings();
    window.addEventListener('oliveal_booking_updated', loadBookings);
    return () => window.removeEventListener('oliveal_booking_updated', loadBookings);
  }, []);

  const upcomingBookings = bookings.filter((b) => b.isUpcoming !== false && b.status !== 'Completed');
  const pastBookings = bookings.filter((b) => b.isUpcoming === false || b.status === 'Completed');

  const displayedList = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  return (
    <div className="min-h-screen w-full bg-[#07060e] text-white flex flex-col justify-between selection:bg-purple-600 selection:text-white relative overflow-x-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-fuchsia-600/12 rounded-full blur-[130px]" />
      </div>

      {/* Top Header */}
      <CustomerHeader activeRoute="my-bookings" />

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-[465px] sm:max-w-xl mx-auto px-4 sm:px-5 py-4 flex-1 flex flex-col gap-4">
        
        {/* Top Bar: Back Button & Title */}
        <div className="flex items-center justify-between min-h-[44px]">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            aria-label="Back to Customer Home"
            className="w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 border border-white/10 flex items-center justify-center text-slate-200 hover:text-white transition backdrop-blur-md shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
            My Bookings
          </h1>

          <div className="w-10 h-10" />
        </div>

        {/* Tab Switcher: Upcoming (N) vs Past (N) */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-full bg-[#120f24]/90 border border-white/[0.08] backdrop-blur-md shadow-inner select-none">
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`py-3 px-4 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 ${
              activeTab === 'upcoming'
                ? 'bg-gradient-to-r from-[#9333ea] via-[#a855f7] to-[#c084fc] text-white shadow-[0_0_24px_rgba(168,85,247,0.55)] border border-purple-300/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Upcoming ({upcomingBookings.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('past')}
            className={`py-3 px-4 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 ${
              activeTab === 'past'
                ? 'bg-gradient-to-r from-[#9333ea] via-[#a855f7] to-[#c084fc] text-white shadow-[0_0_24px_rgba(168,85,247,0.55)] border border-purple-300/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Past ({pastBookings.length})
          </button>
        </div>

        {/* Booking Cards List */}
        <div className="space-y-3.5 mt-1">
          {displayedList.length === 0 ? (
            <div className="p-8 rounded-3xl bg-[#120f22]/70 border border-white/[0.08] text-center backdrop-blur-xl my-6">
              <div className="w-14 h-14 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-3 text-purple-400">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">No {activeTab} bookings</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                {activeTab === 'upcoming'
                  ? 'Ready to get into the action? Choose your gaming station and reserve your spot.'
                  : 'You have not completed any bookings yet.'}
              </p>
              {activeTab === 'upcoming' && (
                <button
                  type="button"
                  onClick={() => navigate('/book-slot')}
                  className="mt-4 inline-flex items-center gap-2 py-2.5 px-5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Book Your Slot Now</span>
                </button>
              )}
            </div>
          ) : (
            displayedList.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-[11px] text-slate-500 border-t border-white/[0.06]">
        Oliveal Gaming Zone © 2026. All rights reserved.
      </footer>
    </div>
  );
}

