import { useState } from 'react';
import { Eye, Ban, RotateCcw } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import EmptyState from '@/components/EmptyState';
import { Modal } from '@/components/ConfirmDialog';
import { formatCurrency, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/helpers';
import type { Booking } from '@/lib/types';

interface BookingsTabProps {
  bookings: Booking[];
  onCancel: (b: Booking) => void;
  onRefund: (b: Booking) => void;
  onUpdateStatus: (b: Booking, status: string) => void;
}

const ALL_STATUSES = ['pending', 'accepted', 'rejected', 'on_the_way', 'arrived', 'otp_verified', 'in_progress', 'completed', 'cancelled'];

export default function BookingsTab({ bookings, onCancel, onRefund, onUpdateStatus }: BookingsTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Booking | null>(null);
  const [statusModalBooking, setStatusModalBooking] = useState<Booking | null>(null);

  const filtered = bookings.filter((b) => {
    const matchesSearch = !search ||
      b.service_name.toLowerCase().includes(search.toLowerCase()) ||
      (b.user_profile?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (b.worker?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by service, customer, worker, booking ID..." />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All Status</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{BOOKING_STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No bookings found" />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Booking ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Worker</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{b.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{b.service_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{b.user_profile?.full_name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{b.worker?.full_name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(b.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{formatCurrency(Number(b.amount))}</td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${BOOKING_STATUS_COLORS[b.status]}`}>{BOOKING_STATUS_LABELS[b.status]}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelected(b)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="View"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => setStatusModalBooking(b)} className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Update Status"><RotateCcw className="w-4 h-4" /></button>
                        {b.status !== 'cancelled' && b.status !== 'completed' && (
                          <button onClick={() => onCancel(b)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Cancel"><Ban className="w-4 h-4" /></button>
                        )}
                        {b.status === 'completed' && (
                          <button onClick={() => onRefund(b)} className="p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg" title="Refund"><RotateCcw className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} booking{filtered.length !== 1 ? 's' : ''}</p>

      {/* Booking Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Booking Details">
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Booking ID:</span> <span className="font-mono">{selected.id.slice(0, 12)}</span></div>
              <div><span className="text-gray-500">Status:</span> <span className={`px-2 py-0.5 rounded-full text-xs ${BOOKING_STATUS_COLORS[selected.status]}`}>{BOOKING_STATUS_LABELS[selected.status]}</span></div>
              <div><span className="text-gray-500">Service:</span> {selected.service_name}</div>
              <div><span className="text-gray-500">Amount:</span> {formatCurrency(Number(selected.amount))}</div>
              <div><span className="text-gray-500">Customer:</span> {selected.user_profile?.full_name || 'N/A'}</div>
              <div><span className="text-gray-500">Worker:</span> {selected.worker?.full_name || 'N/A'}</div>
              <div><span className="text-gray-500">Date:</span> {selected.scheduled_date}</div>
              <div><span className="text-gray-500">Time:</span> {selected.scheduled_time || 'N/A'}</div>
              <div className="col-span-2"><span className="text-gray-500">Address:</span> {selected.address}</div>
              {selected.service_description && <div className="col-span-2"><span className="text-gray-500">Description:</span> {selected.service_description}</div>}
            </div>
          </div>
        )}
      </Modal>

      {/* Status Update Modal */}
      <Modal open={!!statusModalBooking} onClose={() => setStatusModalBooking(null)} title="Update Booking Status">
        {statusModalBooking && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Current status: <span className="font-medium text-gray-900 dark:text-white">{BOOKING_STATUS_LABELS[statusModalBooking.status]}</span></p>
            <div className="grid grid-cols-3 gap-2">
              {ALL_STATUSES.map((s) => (
                <button key={s} onClick={() => { onUpdateStatus(statusModalBooking, s); setStatusModalBooking(null); }}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${statusModalBooking.status === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'}`}>
                  {BOOKING_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
