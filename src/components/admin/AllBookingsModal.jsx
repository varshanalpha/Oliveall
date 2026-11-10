import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Gamepad2,
  RefreshCw,
  Search,
  User,
  Users,
  X,
  AlertCircle,
} from 'lucide-react';
import { fetchAllAdminBookings } from '../../services/adminDashboardService';
import { STATUS_BADGE_STYLES } from './RecentBookings';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'in_use', label: 'In Use' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
];

const PAGE_SIZE = 50;

/**
 * Full-height overlay modal displaying all live Supabase bookings when Admin taps "View All"
 * or when recent bookings overflow past the bottom navigation boundary.
 */
export default function AllBookingsModal({
  isOpen,
  onClose,
  initialBookings = [],
  totalCount = 0,
}) {
  const [bookings, setBookings] = useState(initialBookings);
  const [serverTotal, setServerTotal] = useState(totalCount);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadBookings = useCallback(async ({ offset = 0, append = false } = {}) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetchAllAdminBookings({ limit: PAGE_SIZE, offset });
      setBookings((prev) => (append ? [...prev, ...res.bookings] : res.bookings));
      setServerTotal(res.totalCount);
      setHasMore(res.hasMore);
    } catch (err) {
      setError(err?.message || 'Failed to load bookings from Supabase.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    setBookings(initialBookings);
    setServerTotal(totalCount);
    setSearchQuery('');
    setStatusFilter('all');
    loadBookings({ offset: 0, append: false });

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, loadBookings]);

  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return (bookings || []).filter((b) => {
      if (b.statusInfo?.key === 'cancelled') {
        return false;
      }
      if (statusFilter !== 'all' && b.statusInfo?.key !== statusFilter) {
        return false;
      }
      if (!query) return true;
      return (
        String(b.bookingNumber || '').toLowerCase().includes(query) ||
        String(b.customerName || '').toLowerCase().includes(query) ||
        String(b.stationName || '').toLowerCase().includes(query)
      );
    });
  }, [bookings, searchQuery, statusFilter]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="all-bookings-modal-title"
      className="fixed inset-0 z-50 bg-[#080510]/96 backdrop-blur-2xl flex flex-col text-white"
    >
      {/* Top Sticky Header */}
      <header className="shrink-0 w-full border-b border-purple-500/20 bg-[#0D071A]/95 px-4 sm:px-6 pt-[max(env(safe-area-inset-top),0.875rem)] pb-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to Admin Dashboard"
              className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="all-bookings-modal-title"
                  className="text-base sm:text-lg font-extrabold text-white tracking-tight truncate"
                >
                  All Bookings
                </h2>
                <span className="inline-flex items-center justify-center rounded-full bg-purple-600/25 border border-purple-400/35 px-2 py-0.5 text-[11px] font-bold text-purple-200 tabular-nums">
                  {serverTotal}
                </span>
              </div>
              <p className="text-[11px] text-[#A9A0BC] truncate">
                All confirmed &amp; completed bookings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => loadBookings({ offset: 0, append: false })}
              disabled={loading}
              aria-label="Refresh all bookings"
              className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-[#A9A0BC] hover:text-white transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close all bookings"
              className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-[#A9A0BC] hover:text-white transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="max-w-3xl mx-auto mt-3 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[#A9A0BC] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by booking ID, customer, or station..."
              className="w-full rounded-xl bg-[#150D26] border border-white/10 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/25 pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-[#7B7191] outline-none transition"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {FILTER_TABS.map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                    active
                      ? 'bg-[#7C3AED] text-white border border-purple-300/40 shadow-[0_0_12px_rgba(124,58,237,0.4)]'
                      : 'bg-white/[0.04] hover:bg-white/[0.09] text-[#A9A0BC] hover:text-white border border-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Scrollable Bookings List */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <p className="text-xs text-rose-200 truncate">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => loadBookings({ offset: 0, append: false })}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-semibold text-white cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {loading && bookings.length === 0 ? (
            <div className="space-y-2.5" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl bg-[#120B20]/90 border border-white/[0.08] animate-pulse"
                />
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-2xl bg-[#120B20]/90 border border-purple-500/20 py-14 px-4 text-center">
              <p className="text-sm font-semibold text-[#D6CFE6]">
                {bookings.length === 0
                  ? 'No bookings found'
                  : 'No bookings match your search or filter'}
              </p>
              <p className="mt-1 text-xs text-[#7B7191]">
                {bookings.length === 0
                  ? 'Customer bookings will appear here once created.'
                  : 'Try clearing your filter or search query.'}
              </p>
            </div>
          ) : (
            <>
              {filteredBookings.map((booking) => {
                const badgeVariant = booking.statusInfo?.variant || 'muted';
                const badgeClass = STATUS_BADGE_STYLES[badgeVariant] || STATUS_BADGE_STYLES.muted;

                return (
                  <article
                    key={booking.id}
                    className="rounded-2xl bg-[#120B20]/95 border border-purple-500/25 p-3.5 sm:p-4 shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                          {booking.bookingNumber}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#A9A0BC] truncate">
                          <User className="w-3 h-3 text-purple-300 shrink-0" aria-hidden="true" />
                          <span className="truncate">{booking.customerName}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {booking.totalAmount !== null && booking.totalAmount !== undefined && (
                          <span className="text-xs font-bold text-white tabular-nums">
                            ₹{Number(booking.totalAmount).toLocaleString('en-IN')}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[10.5px] font-semibold leading-none whitespace-nowrap ${badgeClass}`}
                        >
                          {booking.statusInfo?.label || 'Confirmed'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[11px] text-[#D6CFE6]">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-white">
                          <Gamepad2 className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
                          {booking.stationName}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#A9A0BC]">
                          <Calendar className="w-3 h-3 text-purple-300" aria-hidden="true" />
                          {booking.dateLabel}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-purple-300" aria-hidden="true" />
                          {booking.timeRange}
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1 text-[#A9A0BC]">
                        <Users className="w-3 h-3 text-purple-300" aria-hidden="true" />
                        <span>
                          {booking.playerCount || 1}{' '}
                          {(booking.playerCount || 1) === 1 ? 'Player' : 'Players'}
                        </span>
                        {booking.durationMinutes && (
                          <span>• {booking.durationMinutes}m</span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}

              {hasMore && (
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => loadBookings({ offset: bookings.length, append: true })}
                    disabled={loadingMore}
                    className="px-4 py-2 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 border border-purple-400/35 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading more...' : 'Load More Bookings'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

