import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Calendar, Clock, CheckCircle, XCircle, Navigation,
  Loader2, Shield, Play, FileText, CreditCard, Star, Phone, MessageSquare
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  formatCurrency, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS,
  generatePaymentId, generateTransactionId, generateInvoiceNumber, haversineDistance
} from '@/lib/helpers';
import type { Booking, Worker, Payment, Invoice, Review, Message, Profile } from '@/lib/types';
import EmptyState from '@/components/EmptyState';

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [workerProfile, setWorkerProfile] = useState<Profile | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [otpInput, setOtpInput] = useState('');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [paying, setPaying] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isWorker = profile?.role === 'worker';
  const isUser = profile?.role === 'user';

  const fetchBooking = useCallback(async () => {
    if (!id) return;
    const { data: b } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
    if (!b) { setLoading(false); return; }
    setBooking(b as Booking);
    const { data: w } = await supabase.from('workers').select('*, category:categories(*)').eq('id', b.worker_id).maybeSingle();
    setWorker(w as Worker | null);
    const { data: wp } = await supabase.from('profiles').select('*').eq('id', b.worker_id).maybeSingle();
    setWorkerProfile(wp as Profile | null);
    const { data: p } = await supabase.from('payments').select('*').eq('booking_id', id).maybeSingle();
    setPayment(p as Payment | null);
    const { data: inv } = await supabase.from('invoices').select('*').eq('booking_id', id).maybeSingle();
    setInvoice(inv as Invoice | null);
    const { data: r } = await supabase.from('reviews').select('*').eq('booking_id', id).maybeSingle();
    setReview(r as Review | null);
    const { data: msgs } = await supabase.from('messages').select('*').eq('booking_id', id).order('created_at', { ascending: true });
    setMessages(msgs as Message[] || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchBooking(); }, [fetchBooking]);

  // Realtime
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`booking-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `id=eq.${id}` }, () => fetchBooking())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `booking_id=eq.${id}` }, () => fetchBooking())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `booking_id=eq.${id}` }, () => fetchBooking())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `booking_id=eq.${id}` }, () => fetchBooking())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, fetchBooking]);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); },
        () => {}
      );
    }
  }, []);

  // Worker location tracking - update every 5 seconds when on_the_way
  useEffect(() => {
    if (!isWorker || !booking || booking.status !== 'on_the_way' || !id) return;
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        await supabase.from('bookings').update({
          worker_latitude: lat,
          worker_longitude: lng,
          last_location_update: new Date().toISOString(),
        }).eq('id', id);
        await supabase.from('tracking').insert({
          booking_id: id,
          worker_id: user!.id,
          latitude: lat,
          longitude: lng,
        });
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [isWorker, booking, id, user]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendNotification = async (targetId: string, type: string, title: string, message: string) => {
    await supabase.from('notifications').insert({
      user_id: targetId, type, title, message, booking_id: id,
    });
  };

  // Worker actions
  const acceptBooking = async () => {
    if (!booking || !user) return;
    const { data: otpData } = await supabase.rpc('generate_otp');
    const otp = otpData as string;
    await supabase.from('bookings').update({ status: 'accepted', accepted_at: new Date().toISOString(), otp }).eq('id', booking.id);
    await sendNotification(booking.user_id, 'booking_accepted', 'Booking Accepted', `${worker?.full_name} has accepted your booking.`);
    toast('Booking accepted', 'success');
  };

  const rejectBooking = async () => {
    if (!booking) return;
    await supabase.from('bookings').update({ status: 'rejected', rejected_at: new Date().toISOString() }).eq('id', booking.id);
    await sendNotification(booking.user_id, 'booking_rejected', 'Booking Rejected', `${worker?.full_name} has rejected your booking.`);
    toast('Booking rejected', 'info');
  };

  const startJourney = async () => {
    if (!booking || !user) return;
    await supabase.from('bookings').update({ status: 'on_the_way', started_journey_at: new Date().toISOString() }).eq('id', booking.id);
    await sendNotification(booking.user_id, 'worker_started', 'Worker On The Way', `${worker?.full_name} is on the way to your location.`);
    toast('Journey started - sharing location', 'success');
  };

  const markArrived = async () => {
    if (!booking) return;
    await supabase.from('bookings').update({ status: 'arrived', arrived_at: new Date().toISOString() }).eq('id', booking.id);
    await sendNotification(booking.user_id, 'worker_arrived', 'Worker Arrived', `${worker?.full_name} has arrived at your location.`);
    toast('Marked as arrived', 'success');
  };

  const verifyOtp = async () => {
    if (!booking) return;
    if (otpInput === booking.otp) {
      await supabase.from('bookings').update({ status: 'otp_verified', otp_verified: true }).eq('id', booking.id);
      await sendNotification(booking.user_id, 'otp_verified', 'OTP Verified', 'OTP verified successfully. Work will start soon.');
      toast('OTP verified successfully', 'success');
      setOtpInput('');
    } else {
      toast('Invalid OTP. Please try again.', 'error');
    }
  };

  const startWork = async () => {
    if (!booking) return;
    await supabase.from('bookings').update({ status: 'in_progress' }).eq('id', booking.id);
    await sendNotification(booking.user_id, 'work_started', 'Work Started', `${worker?.full_name} has started the work.`);
    toast('Work started', 'success');
  };

  const completeWork = async () => {
    if (!booking) return;
    await supabase.from('bookings').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', booking.id);
    await supabase.from('workers').update({ total_jobs: (worker?.total_jobs || 0) + 1 }).eq('id', booking.worker_id);
    await sendNotification(booking.user_id, 'work_completed', 'Work Completed', `${worker?.full_name} has completed the work. Please proceed to payment.`);
    toast('Work completed', 'success');
  };

  // User actions
  const cancelBooking = async () => {
    if (!booking) return;
    await supabase.from('bookings').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', booking.id);
    await sendNotification(booking.worker_id, 'booking_cancelled', 'Booking Cancelled', 'The user has cancelled the booking.');
    toast('Booking cancelled', 'info');
  };

  const handlePayment = async (method: string) => {
    if (!booking || !user) return;
    setPaying(true);
    await new Promise((r) => setTimeout(r, 2000));
    const payId = generatePaymentId();
    const txnId = generateTransactionId();
    const amount = Number(booking.amount);
    const gst = amount * 0.18;
    const platformFee = amount * 0.05;
    const grandTotal = amount + gst + platformFee;

    const { data: payData, error: payError } = await supabase.from('payments').insert({
      booking_id: booking.id, user_id: user.id, worker_id: booking.worker_id,
      amount: grandTotal, payment_method: method, payment_id: payId, transaction_id: txnId, status: 'paid',
    }).select().single();
    if (payError) { toast(payError.message, 'error'); setPaying(false); return; }

    const invNum = generateInvoiceNumber();
    const { data: invData } = await supabase.from('invoices').insert({
      booking_id: booking.id, payment_id: payData.id, user_id: user.id, worker_id: booking.worker_id,
      invoice_number: invNum, subtotal: amount, gst, platform_fee: platformFee, grand_total: grandTotal, payment_status: 'paid',
    }).select().single();

    await sendNotification(booking.worker_id, 'payment_completed', 'Payment Received', `Payment of ${formatCurrency(grandTotal)} received.`);
    toast('Payment successful!', 'success');
    setPayment(payData as Payment);
    setInvoice(invData as Invoice);
    setShowPayment(false);
    setPaying(false);
  };

  const submitReview = async () => {
    if (!booking || !user) return;
    const { error } = await supabase.from('reviews').insert({
      booking_id: booking.id, user_id: user.id, worker_id: booking.worker_id,
      rating: reviewRating, comment: reviewComment,
    });
    if (error) { toast(error.message, 'error'); return; }
    // Update worker rating
    await supabase.rpc('update_worker_rating', { p_worker_id: booking.worker_id });
    await sendNotification(booking.worker_id, 'review_received', 'New Review', `You received a ${reviewRating}-star review.`);
    toast('Review submitted successfully', 'success');
    setShowReview(false);
    fetchBooking();
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !booking || !user) return;
    const receiverId = isWorker ? booking.user_id : booking.worker_id;
    await supabase.from('messages').insert({
      booking_id: booking.id, sender_id: user.id, receiver_id: receiverId, message: messageInput,
    });
    setMessageInput('');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  if (!booking) return <div className="max-w-7xl mx-auto px-4 py-16"><EmptyState title="Booking not found" /></div>;

  const distance = booking.worker_latitude && booking.worker_longitude && userLat && userLng
    ? haversineDistance(userLat, userLng, booking.worker_latitude, booking.worker_longitude)
    : null;

  const steps = [
    { key: 'pending', label: 'Pending', icon: Clock },
    { key: 'accepted', label: 'Accepted', icon: CheckCircle },
    { key: 'on_the_way', label: 'On The Way', icon: Navigation },
    { key: 'arrived', label: 'Arrived', icon: MapPin },
    { key: 'otp_verified', label: 'OTP Verified', icon: Shield },
    { key: 'in_progress', label: 'In Progress', icon: Play },
    { key: 'completed', label: 'Completed', icon: CheckCircle },
  ];
  const currentStepIndex = steps.findIndex((s) => s.key === booking.status);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{booking.service_name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Booking ID: {booking.id.slice(0, 8)}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${BOOKING_STATUS_COLORS[booking.status]}`}>
            {BOOKING_STATUS_LABELS[booking.status]}
          </span>
        </div>

        {/* Progress Steps */}
        {booking.status !== 'cancelled' && booking.status !== 'rejected' && (
          <div className="flex items-center justify-between mt-6 overflow-x-auto">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isDone = i <= currentStepIndex;
              return (
                <div key={step.key} className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDone ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-1 ${isDone ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>{step.label}</span>
                  {i < steps.length - 1 && <div className={`hidden sm:block absolute h-0.5 ${isDone ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} style={{ width: 'calc(100% - 40px)', marginLeft: '40px', marginTop: '20px' }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Service Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Calendar className="w-4 h-4 text-gray-400" /> {booking.scheduled_date}</div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Clock className="w-4 h-4 text-gray-400" /> {booking.scheduled_time}</div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><MapPin className="w-4 h-4 text-gray-400" /> {booking.address}</div>
            {booking.service_description && <p className="text-gray-500 dark:text-gray-400 mt-2">{booking.service_description}</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Worker Details</h2>
          {worker && (
            <Link to={`/worker/${worker.id}`} className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-900 p-2 rounded-lg transition-colors">
              {worker.profile_photo_url ? (
                <img src={worker.profile_photo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-gray-700 flex items-center justify-center font-bold text-blue-600">{worker.full_name.charAt(0)}</div>
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{worker.full_name}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">{worker.category?.name}</p>
              </div>
            </Link>
          )}
          {workerProfile?.phone && (
            <a href={`tel:${workerProfile.phone}`} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mt-3 hover:text-blue-600">
              <Phone className="w-4 h-4" /> {workerProfile.phone}
            </a>
          )}
          <button onClick={() => setShowChat(!showChat)} className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mt-3 hover:underline">
            <MessageSquare className="w-4 h-4" /> Chat
          </button>
        </div>
      </div>

      {/* Chat */}
      {showChat && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6 animate-fade-in">
          <div className="max-h-64 overflow-y-auto space-y-2 mb-3">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">No messages yet</p>
            ) : messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${m.sender_id === user?.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'}`}>
                  {m.message}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex gap-2">
            <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={sendMessage} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Send</button>
          </div>
        </div>
      )}

      {/* Live Tracking */}
      {booking.status === 'on_the_way' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600" /> Live Tracking
          </h2>
          {booking.worker_latitude && booking.worker_longitude ? (
            <div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">Worker is {distance != null ? `${distance.toFixed(1)} km` : ''} away from you</p>
                <p className="text-xs text-gray-400 mt-1">Last updated: {booking.last_location_update ? new Date(booking.last_location_update).toLocaleTimeString() : 'N/A'}</p>
                <div className="mt-3 flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                  <span className="text-sm font-medium">Tracking live</span>
                </div>
              </div>
              <a href={`https://www.google.com/maps?q=${booking.worker_latitude},${booking.worker_longitude}`} target="_blank" rel="noopener noreferrer" className="block mt-3 text-center text-sm text-blue-600 dark:text-blue-400 hover:underline">
                View on Google Maps
              </a>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center">Waiting for location data...</p>
          )}
        </div>
      )}

      {/* OTP Section - User sees OTP, Worker enters it */}
      {(booking.status === 'arrived' || booking.status === 'otp_verified') && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" /> OTP Verification
          </h2>
          {isUser && booking.otp && (
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Share this OTP with the worker</p>
              <div className="text-4xl font-bold tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl py-4 inline-block px-8">
                {booking.otp}
              </div>
            </div>
          )}
          {isWorker && booking.status === 'arrived' && (
            <div className="flex gap-2">
              <input type="text" maxLength={6} value={otpInput} onChange={(e) => setOtpInput(e.target.value)} placeholder="Enter 6-digit OTP" className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest" />
              <button onClick={verifyOtp} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Verify</button>
            </div>
          )}
          {booking.otp_verified && <p className="text-center text-sm text-green-600 dark:text-green-400 mt-2">OTP Verified</p>}
        </div>
      )}

      {/* Worker Actions */}
      {isWorker && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Worker Actions</h2>
          <div className="flex flex-wrap gap-2">
            {booking.status === 'pending' && (
              <>
                <button onClick={acceptBooking} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Accept</button>
                <button onClick={rejectBooking} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"><XCircle className="w-4 h-4" /> Reject</button>
              </>
            )}
            {booking.status === 'accepted' && (
              <button onClick={startJourney} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><Navigation className="w-4 h-4" /> Start Journey</button>
            )}
            {booking.status === 'on_the_way' && (
              <button onClick={markArrived} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><MapPin className="w-4 h-4" /> Mark Arrived</button>
            )}
            {booking.status === 'otp_verified' && (
              <button onClick={startWork} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"><Play className="w-4 h-4" /> Start Work</button>
            )}
            {booking.status === 'in_progress' && (
              <button onClick={completeWork} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Complete Work</button>
            )}
          </div>
        </div>
      )}

      {/* User Actions */}
      {isUser && (booking.status === 'pending' || booking.status === 'accepted') && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <button onClick={cancelBooking} className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 flex items-center gap-2"><XCircle className="w-4 h-4" /> Cancel Booking</button>
        </div>
      )}

      {/* Payment */}
      {booking.status === 'completed' && !payment && isUser && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-blue-600" /> Payment</h2>
          {!showPayment ? (
            <button onClick={() => setShowPayment(true)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">Proceed to Payment</button>
          ) : (
            <div>
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Service Amount</span><span className="font-medium">{formatCurrency(Number(booking.amount))}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">GST (18%)</span><span className="font-medium">{formatCurrency(Number(booking.amount) * 0.18)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Platform Fee (5%)</span><span className="font-medium">{formatCurrency(Number(booking.amount) * 0.05)}</span></div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700"><span className="font-semibold">Total</span><span className="font-bold text-lg">{formatCurrency(Number(booking.amount) * 1.23)}</span></div>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select UPI Payment Method</p>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 mb-4">
                {[
                  { key: 'google_pay', label: 'Google Pay' },
                  { key: 'phonepe', label: 'PhonePe' },
                  { key: 'paytm', label: 'Paytm' },
                  { key: 'bhim_upi', label: 'BHIM UPI' },
                ].map((m) => (
                  <button key={m.key} disabled={paying} onClick={() => handlePayment(m.key)} className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50">
                    {m.label}
                  </button>
                ))}
              </div>
              {paying && <div className="flex items-center justify-center gap-2 text-blue-600"><Loader2 className="w-5 h-5 animate-spin" /> Processing payment...</div>}
            </div>
          )}
        </div>
      )}

      {/* Invoice */}
      {invoice && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> Invoice</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Invoice No.</span><span className="font-mono font-medium">{invoice.invoice_number}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(Number(invoice.subtotal))}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">GST (18%)</span><span>{formatCurrency(Number(invoice.gst))}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Platform Fee</span><span>{formatCurrency(Number(invoice.platform_fee))}</span></div>
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700"><span className="font-semibold">Grand Total</span><span className="font-bold text-lg">{formatCurrency(Number(invoice.grand_total))}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Payment Status</span><span className="text-green-600 font-medium capitalize">{invoice.payment_status}</span></div>
            {payment && <div className="flex justify-between"><span className="text-gray-500">Payment ID</span><span className="font-mono">{payment.payment_id}</span></div>}
            {payment && <div className="flex justify-between"><span className="text-gray-500">Transaction ID</span><span className="font-mono">{payment.transaction_id}</span></div>}
          </div>
          <button onClick={() => navigate(`/invoice/${invoice.id}`)} className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">View Full Invoice</button>
        </div>
      )}

      {/* Review */}
      {booking.status === 'completed' && payment && isUser && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500" /> Review</h2>
          {review ? (
            <div>
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-5 h-5 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>
            </div>
          ) : !showReview ? (
            <button onClick={() => setShowReview(true)} className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg">Write a Review</button>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button key={i} onClick={() => setReviewRating(i + 1)}>
                    <Star className={`w-8 h-8 ${i < reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                  </button>
                ))}
              </div>
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} placeholder="Share your experience..." className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3" />
              <button onClick={submitReview} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">Submit Review</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
