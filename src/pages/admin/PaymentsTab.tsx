import { useState } from 'react';
import { Download } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import EmptyState from '@/components/EmptyState';
import { formatCurrency } from '@/lib/helpers';
import { exportToCSV } from '@/lib/csv';
import type { Payment } from '@/lib/types';

interface PaymentsTabProps {
  payments: Payment[];
}

type DateRange = 'all' | 'today' | 'week' | 'month' | 'year';

export default function PaymentsTab({ payments }: PaymentsTabProps) {
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  const filtered = payments.filter((p) => {
    const matchesSearch = !search ||
      p.payment_id.toLowerCase().includes(search.toLowerCase()) ||
      p.transaction_id.toLowerCase().includes(search.toLowerCase()) ||
      (p.payment_method || '').toLowerCase().includes(search.toLowerCase());

    let matchesDate = true;
    const now = new Date();
    const payDate = new Date(p.created_at);
    if (dateRange === 'today') {
      matchesDate = payDate.toDateString() === now.toDateString();
    } else if (dateRange === 'week') {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      matchesDate = payDate >= weekAgo;
    } else if (dateRange === 'month') {
      matchesDate = payDate.getMonth() === now.getMonth() && payDate.getFullYear() === now.getFullYear();
    } else if (dateRange === 'year') {
      matchesDate = payDate.getFullYear() === now.getFullYear();
    }
    return matchesSearch && matchesDate;
  });

  const handleExport = () => {
    exportToCSV('payments-export', [
      'Payment ID', 'Transaction ID', 'Booking ID', 'Amount', 'Method', 'Status', 'Date',
    ], filtered.map((p) => [
      p.payment_id, p.transaction_id, p.booking_id.slice(0, 8), Number(p.amount), p.payment_method, p.status, new Date(p.created_at).toLocaleString(),
    ]));
  };

  const totalAmount = filtered.filter((p) => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by payment ID, transaction ID, method..." />
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRange)} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium whitespace-nowrap">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Paid Amount ({filtered.length} payments)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No payments found" />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Payment ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Booking</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-300">{p.payment_id}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-300">{p.transaction_id}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{p.booking_id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(Number(p.amount))}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">{p.payment_method.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${p.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : p.status === 'refunded' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
