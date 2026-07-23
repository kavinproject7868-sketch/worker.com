import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar, CheckCircle, Clock, XCircle, Play, Navigation,
  DollarSign, TrendingUp, BarChart3, Power, Shield, MapPin
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/helpers';
import type { Booking, Worker, Payment } from '@/lib/types';
import EmptyState from '@/components/EmptyState';

type Tab = 'today' | 'pending' | 'accepted' | 'completed' | 'cancelled' | 'earnings' | 'analytics';

export default function WorkerDashboard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [worker, setWorker] = useState<Worker | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [otpInput, setOtpInput] = useState('');

  const fetchWorker = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('workers')
      .select('*, category:categories(*)')
      .eq('id', user.id)
      .maybeSingle();

    console.log("Logged User ID:", user.id);
    console.log("Worker Data:", data);

    setWorker(data as Worker | null);
  }, [user]);
  const fetchBookings = useCallback(async () => {
    if (!user) return;

    console.log("Logged User ID:", user.id);

    const { data, error } = await supabase
      .from('bookings')
      .select('*, user_profile:profiles!bookings_user_id_fkey(*)')
      .eq('worker_id', user.id)
      .order('created_at', { ascending: false });

    console.log("Bookings Data:", data);
    console.log("Bookings Error:", error);

    setBookings(data as Booking[] || []);

    const { data: payData } = await supabase
      .from('payments')
      .select('*')
      .eq('worker_id', user.id)
      .order('created_at', { ascending: false });

    setPayments(payData as Payment[] || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchWorker(); fetchBookings(); }, [fetchWorker, fetchBookings]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('worker_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `worker_id=eq.${user.id}` }, () => { fetchBookings(); fetchWorker(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workers', filter: `id=eq.${user.id}` }, () => fetchWorker())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchBookings, fetchWorker]);

  const sendNotification = async (targetId: string, type: string, title: string, message: string, bookingId?: string) => {
    await supabase.from('notifications').insert({ user_id: targetId, type, title, message, booking_id: bookingId });
  };

  const updateBookingStatus = async (bookingId: string, status: string, extra: Record<string, unknown> = {}) => {
    await supabase.from('bookings').update({ status, ...extra }).eq('id', bookingId);
    fetchBookings();
  };

  const handleAccept = async (b: Booking) => {
    const { data: otpData } = await supabase.rpc('generate_otp');
    const otp = otpData as string;
    await updateBookingStatus(b.id, 'accepted', { accepted_at: new Date().toISOString(), otp });
    await sendNotification(b.user_id, 'booking_accepted', 'Booking Accepted', 'Your booking has been accepted.', b.id);
    toast('Booking accepted - OTP generated for customer', 'success');
  };

  const handleReject = async (b: Booking) => {
    await updateBookingStatus(b.id, 'rejected', { rejected_at: new Date().toISOString() });
    await sendNotification(b.user_id, 'booking_rejected', 'Booking Rejected', 'Your booking has been rejected.', b.id);
    toast('Booking rejected', 'info');
  };

  const handleStartJourney = async (b: Booking) => {
    await updateBookingStatus(b.id, 'on_the_way', { started_journey_at: new Date().toISOString() });
    await sendNotification(b.user_id, 'worker_started', 'Worker On The Way', 'Your worker is on the way.', b.id);
    toast('Journey started - location sharing active', 'success');
  };

  const handleArrived = async (b: Booking) => {
    await updateBookingStatus(b.id, 'arrived', { arrived_at: new Date().toISOString() });
    await sendNotification(b.user_id, 'worker_arrived', 'Worker Arrived', 'Your worker has arrived.', b.id);
    toast('Marked as arrived', 'success');
  };

  const handleVerifyOtp = async (b: Booking) => {
    if (otpInput === b.otp) {
      await updateBookingStatus(b.id, 'otp_verified', { otp_verified: true });
      await sendNotification(b.user_id, 'otp_verified', 'OTP Verified', 'OTP verified successfully.', b.id);
      toast('OTP verified', 'success');
      setOtpInput('');
    } else {
      toast('Invalid OTP', 'error');
    }
  };

  const handleStartWork = async (b: Booking) => {
    await updateBookingStatus(b.id, 'in_progress');
    await sendNotification(b.user_id, 'work_started', 'Work Started', 'Work has started.', b.id);
    toast('Work started', 'success');
  };

  const handleCompleteWork = async (b: Booking) => {
    await updateBookingStatus(b.id, 'completed', { completed_at: new Date().toISOString() });
    await supabase.from('workers').update({ total_jobs: (worker?.total_jobs || 0) + 1 }).eq('id', b.worker_id);
    await sendNotification(b.user_id, 'work_completed', 'Work Completed', 'Work completed. Please proceed to payment.', b.id);
    toast('Work completed', 'success');
    fetchWorker();
  };

  const toggleAvailability = async () => {
    if (!worker) return;
    await supabase.from('workers').update({ availability: !worker.availability }).eq('id', worker.id);
    fetchWorker();
    toast(worker.availability ? 'You are now offline' : 'You are now available', 'info');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>;

  // Pending verification state
  if (worker && worker.status === 'pending') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verification Pending</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Your profile is under review by our admin team. It will become visible to users once approved.</p>
          <Link to="/profile" className="inline-flex items-center gap-2 text-blue-600 hover:underline">Edit Profile</Link>
        </div>
      </div>
    );
  }

  if (worker && worker.status === 'rejected') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Registration Rejected</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Your registration was rejected. Please update your profile and submit again.</p>
          <Link to="/profile" className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Edit Profile</Link>
        </div>
      </div>
    );
  }

  if (worker && worker.status === 'suspended') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
            <Power className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Account Suspended</h1>
          <p className="text-gray-500 dark:text-gray-400">Your account has been suspended. Please contact support for assistance.</p>
        </div>
      </div>
    );
  }

  const todayBookings = bookings.filter((b) => b.scheduled_date === new Date().toISOString().split('T')[0]);
  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const acceptedBookings = bookings.filter((b) => b.status === 'accepted' || b.status === 'on_the_way' || b.status === 'arrived' || b.status === 'otp_verified' || b.status === 'in_progress');
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled' || b.status === 'rejected');
  const monthlyEarnings = payments.filter((p) => p.status === 'paid' && new Date(p.created_at).getMonth() === new Date().getMonth()).reduce((sum, p) => sum + Number(p.amount), 0);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'today', label: "Today's Jobs", count: todayBookings.length },
    { key: 'pending', label: 'Pending', count: pendingBookings.length },
    { key: 'accepted', label: 'Active', count: acceptedBookings.length },
    { key: 'completed', label: 'Completed', count: completedBookings.length },
    { key: 'cancelled', label: 'Cancelled', count: cancelledBookings.length },
    { key: 'earnings', label: 'Earnings' },
    { key: 'analytics', label: 'Analytics' },
  ];

  const renderBookingCard = (b: Booking) => (
    <div key={b.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {b.user_profile?.profile_photo_url ? (
            <img src={b.user_profile.profile_photo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-gray-700 flex items-center justify-center font-bold text-blue-600 text-sm">{b.user_profile?.full_name?.charAt(0) || 'U'}</div>
          )}
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{b.service_name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{b.user_profile?.full_name}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${BOOKING_STATUS_COLORS[b.status]}`}>{BOOKING_STATUS_LABELS[b.status]}</span>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {b.scheduled_date}</span>
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {b.scheduled_time}</span>
        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {b.address}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to={`/booking/${b.id}`} className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200">View Details</Link>
        {b.status === 'pending' && (
          <>
            <button onClick={() => handleAccept(b)} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Accept</button>
            <button onClick={() => handleReject(b)} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Reject</button>
          </>
        )}
        {b.status === 'accepted' && <button onClick={() => handleStartJourney(b)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Start Journey</button>}
        {b.status === 'on_the_way' && <button onClick={() => handleArrived(b)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Mark Arrived</button>}
        {b.status === 'arrived' && (
          <div className="flex gap-2">
            <input type="text" maxLength={6} value={otpInput} onChange={(e) => setOtpInput(e.target.value)} placeholder="Enter OTP" className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-widest" />
            <button onClick={() => handleVerifyOtp(b)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Verify OTP</button>
          </div>
        )}
        {b.status === 'otp_verified' && <button onClick={() => handleStartWork(b)} className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700">Start Work</button>}
        {b.status === 'in_progress' && <button onClick={() => handleCompleteWork(b)} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Complete Work</button>}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Worker Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">{profile?.full_name}</p>
        </div>
        <button onClick={toggleAvailability} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${worker?.availability ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
          <Power className={`w-4 h-4 ${worker?.availability ? 'text-green-600' : 'text-gray-400'}`} />
          {worker?.availability ? 'Available' : 'Offline'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <Clock className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingBookings.length}</p>
          <p className="text-sm text-gray-500">Pending Jobs</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <Play className="w-5 h-5 text-orange-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{acceptedBookings.length}</p>
          <p className="text-sm text-gray-500">Active Jobs</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <CheckCircle className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedBookings.length}</p>
          <p className="text-sm text-gray-500">Completed</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <DollarSign className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(monthlyEarnings)}</p>
          <p className="text-sm text-gray-500">This Month</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {tab.label}
            {tab.count != null && tab.count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'}`}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'earnings' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Payment History</h2>
            {payments.length === 0 ? <EmptyState title="No payments yet" /> : payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(Number(p.amount))}</p>
                  <p className="text-sm text-gray-500 capitalize">{p.payment_method.replace('_', ' ')} - {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${p.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800'}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <TrendingUp className="w-8 h-8 text-blue-500 mb-2" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{(worker?.rating ?? 0) > 0 ? (worker?.rating ?? 0).toFixed(1) : 'New'}</p>
            <p className="text-sm text-gray-500">Average Rating ({worker?.total_ratings} reviews)</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{worker?.total_jobs}</p>
            <p className="text-sm text-gray-500">Total Jobs Completed</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <BarChart3 className="w-8 h-8 text-purple-500 mb-2" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{worker?.booking_success_rate}%</p>
            <p className="text-sm text-gray-500">Booking Success Rate</p>
          </div>
        </div>
      )}

      {activeTab === 'today' && (todayBookings.length === 0 ? <EmptyState title="No jobs today" /> : <div className="space-y-3">{todayBookings.map(renderBookingCard)}</div>)}
      {activeTab === 'pending' && (pendingBookings.length === 0 ? <EmptyState title="No pending jobs" /> : <div className="space-y-3">{pendingBookings.map(renderBookingCard)}</div>)}
      {activeTab === 'accepted' && (acceptedBookings.length === 0 ? <EmptyState title="No active jobs" /> : <div className="space-y-3">{acceptedBookings.map(renderBookingCard)}</div>)}
      {activeTab === 'completed' && (completedBookings.length === 0 ? <EmptyState title="No completed jobs" /> : <div className="space-y-3">{completedBookings.map(renderBookingCard)}</div>)}
      {activeTab === 'cancelled' && (cancelledBookings.length === 0 ? <EmptyState title="No cancelled jobs" /> : <div className="space-y-3">{cancelledBookings.map(renderBookingCard)}</div>)}
    </div>
  );
}
