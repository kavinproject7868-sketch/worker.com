import { useState } from 'react';
import { Power, Trash2, Eye, Star } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import EmptyState from '@/components/EmptyState';
import { formatCurrency } from '@/lib/helpers';
import type { Worker } from '@/lib/types';

interface WorkersTabProps {
  workers: Worker[];
  onSuspend: (w: Worker) => void;
  onDelete: (w: Worker) => void;
  onApprove: (w: Worker) => void;
}

const STATUS_BADGES: Record<string, string> = {
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  suspended: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function WorkersTab({ workers, onSuspend, onDelete, onApprove }: WorkersTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = workers.filter((w) => {
    const matchesSearch = !search ||
      w.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (w.email || '').toLowerCase().includes(search.toLowerCase()) ||
      w.phone.includes(search) ||
      (w.category?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, phone, category..." />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No workers found" description="Try adjusting your search or filters." />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Worker</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Jobs</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {w.profile_photo_url ? (
                          <img src={w.profile_photo_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-gray-700 flex items-center justify-center font-bold text-blue-600 text-sm">{w.full_name.charAt(0)}</div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{w.full_name}</p>
                          <p className="text-xs text-gray-500">{w.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{w.category?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatCurrency(Number(w.hourly_rate))}/hr</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{w.rating > 0 ? w.rating.toFixed(1) : 'New'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{w.total_jobs}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGES[w.status] || ''}`}>{w.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {w.status === 'pending' && (
                          <button onClick={() => onApprove(w)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg" title="Approve">
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {w.status === 'approved' && (
                          <button onClick={() => onSuspend(w)} className="p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg" title="Suspend">
                            <Power className="w-4 h-4" />
                          </button>
                        )}
                        {w.status === 'suspended' && (
                          <button onClick={() => onApprove(w)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg" title="Reactivate">
                            <Power className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => onDelete(w)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} worker{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
