import {
  Users, Wrench, Calendar, DollarSign, Clock, CheckCircle, XCircle,
  Star, MessageSquare, Shield, TrendingUp
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import { SimpleBarChart, SimpleLineChart, ProgressRing } from '@/components/Charts';
import { formatCurrency, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/helpers';
import type { AdminStats, AdminData } from '@/lib/adminHelpers';
import type { Booking } from '@/lib/types';

export default function OverviewTab({
  stats,
  data,
}: {
  stats: AdminStats;
  data: AdminData;
}) {
  // Last 7 days bookings chart
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const count = data.bookings.filter((b) => b.created_at.split('T')[0] === dateStr).length;
    return { label: d.toLocaleDateString('en', { weekday: 'short' }), value: count };
  });

  // Last 6 months revenue chart
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.getMonth();
    const revenue = data.payments
      .filter((p) => p.status === 'paid' && new Date(p.created_at).getMonth() === month)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return { label: d.toLocaleDateString('en', { month: 'short' }), value: revenue };
  });

  // Popular categories (by booking count)
  const categoryStats = data.categories.map((cat) => ({
    label: cat.name,
    value: data.bookings.filter((b) => b.category_id === cat.id).length,
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  const recentBookings = data.bookings.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Primary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers} icon={Users} color="text-blue-500" bgColor="bg-blue-50 dark:bg-blue-900/20" />
        <StatCard label="Total Workers" value={stats.totalWorkers} icon={Wrench} color="text-cyan-500" bgColor="bg-cyan-50 dark:bg-cyan-900/20" />
        <StatCard label="Pending Approvals" value={stats.pendingWorkers} icon={Shield} color="text-yellow-500" bgColor="bg-yellow-50 dark:bg-yellow-900/20" />
        <StatCard label="Approved Workers" value={stats.approvedWorkers} icon={CheckCircle} color="text-green-500" bgColor="bg-green-50 dark:bg-green-900/20" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Bookings" value={stats.activeBookings} icon={Calendar} color="text-orange-500" bgColor="bg-orange-50 dark:bg-orange-900/20" />
        <StatCard label="Completed Bookings" value={stats.completedBookings} icon={CheckCircle} color="text-green-500" bgColor="bg-green-50 dark:bg-green-900/20" />
        <StatCard label="Cancelled Bookings" value={stats.cancelledBookings} icon={XCircle} color="text-red-500" bgColor="bg-red-50 dark:bg-red-900/20" />
        <StatCard label="Open Complaints" value={stats.complaintsCount} icon={MessageSquare} color="text-purple-500" bgColor="bg-purple-50 dark:bg-purple-900/20" />
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard label="Today's Revenue" value={formatCurrency(stats.todayRevenue)} icon={DollarSign} color="text-green-500" bgColor="bg-green-50 dark:bg-green-900/20" />
        <StatCard label="Monthly Revenue" value={formatCurrency(stats.monthlyRevenue)} icon={TrendingUp} color="text-blue-500" bgColor="bg-blue-50 dark:bg-blue-900/20" />
        <StatCard label="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={DollarSign} color="text-emerald-500" bgColor="bg-emerald-50 dark:bg-emerald-900/20" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Bookings (Last 7 Days)</h3>
          <SimpleBarChart data={last7Days} height={200} color="bg-blue-500" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Revenue (Last 6 Months)</h3>
          <SimpleLineChart data={last6Months} height={200} color="#3b82f6" formatValue={(v) => formatCurrency(v)} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Popular Categories */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Popular Categories</h3>
          {categoryStats.every((c) => c.value === 0) ? (
            <p className="text-sm text-gray-400 text-center py-8">No booking data yet</p>
          ) : (
            <div className="space-y-3">
              {categoryStats.map((cat, i) => {
                const maxVal = Math.max(...categoryStats.map((c) => c.value), 1);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{cat.label}</span>
                      <span className="text-gray-500">{cat.value}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${(cat.value / maxVal) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rating Ring */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center justify-center">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Avg Worker Rating</h3>
          <ProgressRing value={stats.avgWorkerRating} max={5} label={`${stats.avgWorkerRating.toFixed(1)} / 5.0`} color="#f59e0b" />
          <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span>{stats.reviewsCount} reviews</span>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Bookings</h3>
          <div className="space-y-2">
            {recentBookings.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No bookings yet</p>
            ) : recentBookings.map((b: Booking) => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{b.service_name}</p>
                  <p className="text-xs text-gray-500 truncate">{b.user_profile?.full_name} → {b.worker?.full_name}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${BOOKING_STATUS_COLORS[b.status]}`}>{BOOKING_STATUS_LABELS[b.status]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
