import { useState } from 'react';
import SearchBar from '@/components/SearchBar';
import EmptyState from '@/components/EmptyState';
import type { AuditLog } from '@/lib/types';

export default function AuditTab({ logs }: { logs: AuditLog[] }) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filtered = logs.filter((l) => {
    const matchesSearch = !search ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.admin_profile?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === 'all' || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const actionLabels: Record<string, string> = {
    approve_worker: 'Approve Worker',
    reject_worker: 'Reject Worker',
    suspend_worker: 'Suspend Worker',
    delete_worker: 'Delete Worker',
    delete_user: 'Delete User',
    payment_refund: 'Payment Refund',
    category_update: 'Category Update',
    complaint_resolution: 'Complaint Resolution',
    booking_cancel: 'Booking Cancelled',
    booking_status_update: 'Booking Status Update',
  };

  const uniqueActions = [...new Set(logs.map((l) => l.action))];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by action, admin, entity..." />
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All Actions</option>
          {uniqueActions.map((a) => <option key={a} value={a}>{actionLabels[a] || a}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No audit logs" description="Admin actions will be tracked here." />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Admin</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Entity Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Entity ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{log.admin_profile?.full_name || 'Admin'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{actionLabels[log.action] || log.action}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 capitalize">{log.entity_type}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{log.entity_id?.slice(0, 8) || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{log.ip_address || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
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
