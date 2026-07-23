import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, CreditCard, Heart, Star, Bell, MapPin, LifeBuoy,
  CheckCircle, Clock, XCircle, Play, Navigation, Receipt
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { formatCurrency, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/helpers';
import type { Booking, Payment, Invoice, Favorite, Review, Complaint } from '@/lib/types';
import EmptyState from '@/components/EmptyState';

type Tab = 'bookings' | 'payments' | 'invoices' | 'notifications' | 'favorites' | 'reviews' | 'support';

export default function UserDashboard() {
  const { user, profile } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState<Tab>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [b, p, i, f, r, c] = await Promise.all([
      supabase.from('bookings').select('*, worker:workers(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('favorites').select('*, worker:workers(*, category:categories(*))').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('reviews').select('*, worker:workers(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('complaints').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    setBookings(b.data as Booking[] || []);
    setPayments(p.data as Payment[] || []);
    setInvoices(i.data as Invoice[] || []);
    setFavorites(f.data as Favorite[] || []);
    setReviews(r.data as Review[] || []);
    setComplaints(c.data as Complaint[] || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime bookings
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('user_bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${user.id}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchAll]);

  const submitComplaint = async () => {
    if (!user || !complaintSubject.trim()) return;
    const { error } = await supabase.from('complaints').insert({
      user_id: user.id, subject: complaintSubject, description: complaintDesc,
    });
    if (error) return;
    setComplaintSubject(''); setComplaintDesc('');
    fetchAll();
  };

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { key: 'bookings', label: 'Bookings', icon: Calendar, count: bookings.length },
    { key: 'payments', label: 'Payments', icon: CreditCard, count: payments.length },
    { key: 'invoices', label: 'Invoices', icon: Receipt, count: invoices.length },
    { key: 'notifications', label: 'Notifications', icon: Bell, count: unreadCount },
    { key: 'favorites', label: 'Saved Workers', icon: Heart, count: favorites.length },
    { key: 'reviews', label: 'Reviews', icon: Star, count: reviews.length },
    { key: 'support', label: 'Support', icon: LifeBuoy },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Welcome back, {profile?.full_name || 'User'}</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <Icon className="w-4 h-4" /> {tab.label}
              {tab.count != null && tab.count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'}`}>{tab.count}</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Bookings */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <EmptyState title="No bookings yet" description="Browse workers and book your first service." action={<Link to="/workers" className="text-blue-600 hover:underline">Find Workers</Link>} />
              ) : bookings.map((b) => (
                <Link key={b.id} to={`/booking/${b.id}`} className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {b.worker?.profile_photo_url ? (
                        <img src={b.worker.profile_photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-gray-700 flex items-center justify-center font-bold text-blue-600 text-sm">{b.worker?.full_name?.charAt(0) || '?'}</div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{b.service_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{b.worker?.full_name}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${BOOKING_STATUS_COLORS[b.status]}`}>{BOOKING_STATUS_LABELS[b.status]}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {b.scheduled_date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {b.scheduled_time}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {b.address}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Payments */}
          {activeTab === 'payments' && (
            <div className="space-y-3">
              {payments.length === 0 ? <EmptyState title="No payments yet" /> : payments.map((p) => (
                <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(Number(p.amount))}</p>
                      <p className="text-sm text-gray-500 capitalize">{p.payment_method.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${p.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800'}`}>{p.status}</span>
                      <p className="text-xs text-gray-400 mt-1 font-mono">{p.payment_id}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Invoices */}
          {activeTab === 'invoices' && (
            <div className="space-y-3">
              {invoices.length === 0 ? <EmptyState title="No invoices yet" /> : invoices.map((inv) => (
                <Link key={inv.id} to={`/invoice/${inv.id}`} className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono font-medium text-gray-900 dark:text-white">{inv.invoice_number}</p>
                      <p className="text-sm text-gray-500">{formatCurrency(Number(inv.grand_total))}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${inv.payment_status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800'}`}>{inv.payment_status}</span>
                      <Receipt className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-2">
              {unreadCount > 0 && <button onClick={markAllAsRead} className="text-sm text-blue-600 hover:underline mb-2">Mark all as read</button>}
              {notifications.length === 0 ? <EmptyState title="No notifications" /> : notifications.map((n) => (
                <div key={n.id} className={`p-4 rounded-xl border ${n.is_read ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700' : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'}`}>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{n.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          {/* Favorites */}
          {activeTab === 'favorites' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.length === 0 ? <EmptyState title="No saved workers" description="Save workers to find them quickly later." /> : favorites.map((f) => (
                <Link key={f.id} to={`/worker/${f.worker_id}`} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    {f.worker?.profile_photo_url ? (
                      <img src={f.worker.profile_photo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-gray-700 flex items-center justify-center font-bold text-blue-600">{f.worker?.full_name?.charAt(0)}</div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{f.worker?.full_name}</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">{f.worker?.category?.name}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Reviews */}
          {activeTab === 'reviews' && (
            <div className="space-y-3">
              {reviews.length === 0 ? <EmptyState title="No reviews yet" /> : reviews.map((r) => (
                <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900 dark:text-white">{r.worker?.full_name}</p>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{r.comment}</p>
                </div>
              ))}
            </div>
          )}

          {/* Support */}
          {activeTab === 'support' && (
            <div className="max-w-lg">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Submit a Complaint</h3>
                <div className="space-y-3">
                  <input type="text" value={complaintSubject} onChange={(e) => setComplaintSubject(e.target.value)} placeholder="Subject" className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                  <textarea value={complaintDesc} onChange={(e) => setComplaintDesc(e.target.value)} rows={4} placeholder="Describe your issue..." className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  <button onClick={submitComplaint} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">Submit</button>
                </div>
              </div>
              <div className="space-y-2">
                {complaints.map((c) => (
                  <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900 dark:text-white">{c.subject}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${c.status === 'open' ? 'bg-yellow-100 text-yellow-800' : c.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{c.status}</span>
                    </div>
                    <p className="text-sm text-gray-500">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
