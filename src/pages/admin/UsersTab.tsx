import { useState, useEffect } from 'react';
import { Trash2, Eye, UserX } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import EmptyState from '@/components/EmptyState';
import { Modal } from '@/components/ConfirmDialog';
import { supabase } from '@/lib/supabase';
import type { Profile, Booking, Payment } from '@/lib/types';

interface UsersTabProps {
  users: Profile[];
  onDelete: (u: Profile) => void;
}

export default function UsersTab({ users, onDelete }: UsersTabProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Profile | null>(null);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [userPayments, setUserPayments] = useState<Payment[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const filtered = users.filter((u) => u.role === 'user' && (
    !search ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.phone || '').includes(search)
  ));

  const viewUser = async (u: Profile) => {
    setSelected(u);
    setLoadingDetails(true);
    const [b, p] = await Promise.all([
      supabase.from('bookings').select('*, worker:workers(*)').eq('user_id', u.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('user_id', u.id).order('created_at', { ascending: false }),
    ]);
    setUserBookings(b.data as Booking[] || []);
    setUserPayments(p.data as Payment[] || []);
    setLoadingDetails(false);
  };

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, phone..." />

      {filtered.length === 0 ? (
        <EmptyState title="No users found" />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.profile_photo_url ? (
                          <img src={u.profile_photo_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-gray-700 flex items-center justify-center font-bold text-blue-600 text-sm">{(u.full_name || 'U').charAt(0)}</div>
                        )}
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{u.full_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{u.phone || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-[200px] truncate">{u.address || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => viewUser(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(u)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete">
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
      <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>

      {/* User Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="User Details" maxWidth="max-w-2xl">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {selected.profile_photo_url ? (
                <img src={selected.profile_photo_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-gray-700 flex items-center justify-center text-xl font-bold text-blue-600">{(selected.full_name || 'U').charAt(0)}</div>
              )}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selected.full_name || 'Unknown'}</h3>
                <p className="text-sm text-gray-500">{selected.email}</p>
                <p className="text-sm text-gray-500">{selected.phone || 'N/A'}</p>
                <p className="text-sm text-gray-500">{selected.address || 'N/A'}</p>
              </div>
            </div>

            {loadingDetails ? (
              <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{userBookings.length}</p>
                    <p className="text-sm text-gray-500">Total Bookings</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{userPayments.length}</p>
                    <p className="text-sm text-gray-500">Total Payments</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Recent Bookings</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {userBookings.length === 0 ? <p className="text-sm text-gray-400">No bookings</p> : userBookings.slice(0, 5).map((b) => (
                      <div key={b.id} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-1">
                        <span className="text-gray-700 dark:text-gray-300">{b.service_name}</span>
                        <span className="text-gray-500">{b.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
