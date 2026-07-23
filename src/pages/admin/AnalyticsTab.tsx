import { SimpleBarChart, SimpleLineChart, ProgressRing } from '@/components/Charts';
import { formatCurrency } from '@/lib/helpers';
import type { AdminData } from '@/lib/adminHelpers';
import { Star, Wrench, TrendingUp } from 'lucide-react';

export default function AnalyticsTab({ data }: { data: AdminData }) {
  // Daily users (last 14 days)
  const dailyUsers = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toISOString().split('T')[0];
    const count = data.users.filter((u) => u.created_at.split('T')[0] === dateStr).length;
    return { label: d.toLocaleDateString('en', { day: '2-digit', month: 'short' }), value: count };
  });

  // Daily workers (last 14 days)
  const dailyWorkers = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toISOString().split('T')[0];
    const count = data.workers.filter((w) => w.created_at.split('T')[0] === dateStr).length;
    return { label: d.toLocaleDateString('en', { day: '2-digit', month: 'short' }), value: count };
  });

  // Monthly bookings (last 6 months)
  const monthlyBookings = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.getMonth();
    const count = data.bookings.filter((b) => new Date(b.created_at).getMonth() === month).length;
    return { label: d.toLocaleDateString('en', { month: 'short' }), value: count };
  });

  // Monthly revenue (last 6 months)
  const monthlyRevenue = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.getMonth();
    const revenue = data.payments.filter((p) => p.status === 'paid' && new Date(p.created_at).getMonth() === month).reduce((sum, p) => sum + Number(p.amount), 0);
    return { label: d.toLocaleDateString('en', { month: 'short' }), value: revenue };
  });

  // Popular categories
  const categoryStats = data.categories.map((cat) => ({
    label: cat.name,
    value: data.bookings.filter((b) => b.category_id === cat.id).length,
  })).sort((a, b) => b.value - a.value).slice(0, 8);

  // Top workers by jobs
  const topWorkers = [...data.workers].filter((w) => w.status === 'approved').sort((a, b) => b.total_jobs - a.total_jobs).slice(0, 5);
  const maxJobs = Math.max(...topWorkers.map((w) => w.total_jobs), 1);

  // Growth calculations
  const totalUsers = data.users.filter((u) => u.role === 'user').length;
  const totalWorkers = data.workers.length;
  const totalBookings = data.bookings.length;
  const totalRevenue = data.payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      {/* Summary Rings */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col items-center">
          <ProgressRing value={totalUsers} max={Math.max(totalUsers, 1)} label="Total Users" color="#3b82f6" size={100} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col items-center">
          <ProgressRing value={totalWorkers} max={Math.max(totalWorkers, 1)} label="Total Workers" color="#06b6d4" size={100} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col items-center">
          <ProgressRing value={totalBookings} max={Math.max(totalBookings, 1)} label="Bookings" color="#f59e0b" size={100} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col items-center">
          <ProgressRing value={totalRevenue / 1000} max={Math.max(totalRevenue / 1000, 1)} label="Revenue (K)" color="#10b981" size={100} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" /> Daily New Users (14 Days)</h3>
          <SimpleBarChart data={dailyUsers} height={180} color="bg-blue-500" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Wrench className="w-5 h-5 text-cyan-500" /> Daily New Workers (14 Days)</h3>
          <SimpleBarChart data={dailyWorkers} height={180} color="bg-cyan-500" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-orange-500" /> Monthly Bookings</h3>
          <SimpleBarChart data={monthlyBookings} height={180} color="bg-orange-500" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-500" /> Monthly Revenue</h3>
          <SimpleLineChart data={monthlyRevenue} height={180} color="#10b981" formatValue={(v) => formatCurrency(v)} />
        </div>
      </div>

      {/* Popular Categories */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Popular Categories (by Bookings)</h3>
        {categoryStats.every((c) => c.value === 0) ? (
          <p className="text-sm text-gray-400 text-center py-8">No booking data yet</p>
        ) : (
          <SimpleBarChart data={categoryStats} height={200} color="bg-purple-500" />
        )}
      </div>

      {/* Top Workers */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500" /> Top Workers (by Jobs Completed)</h3>
        {topWorkers.length === 0 || topWorkers.every((w) => w.total_jobs === 0) ? (
          <p className="text-sm text-gray-400 text-center py-8">No completed jobs yet</p>
        ) : (
          <div className="space-y-3">
            {topWorkers.map((w, i) => (
              <div key={w.id} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500 w-6">#{i + 1}</span>
                {w.profile_photo_url ? (
                  <img src={w.profile_photo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-blue-600">{w.full_name.charAt(0)}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{w.full_name}</span>
                    <span className="text-xs text-gray-500">{w.total_jobs} jobs</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${(w.total_jobs / maxJobs) * 100}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-gray-600 dark:text-gray-300">{w.rating > 0 ? w.rating.toFixed(1) : 'New'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
