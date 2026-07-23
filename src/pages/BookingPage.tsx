import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, FileText, ArrowLeft, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatCurrency } from '@/lib/helpers';
import type { Worker } from '@/lib/types';

interface BookingForm {
  service_name: string;
  service_description: string;
  scheduled_date: string;
  scheduled_time: string;
  address: string;
}

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<BookingForm>();
  const scheduledTime = watch('scheduled_time');

  useEffect(() => {
    if (!id) return;
    supabase.from('workers').select('*, category:categories(*)').eq('id', id).maybeSingle()
      .then(({ data }) => { setWorker(data as Worker | null); setLoading(false); });
  }, [id]);

  const onSubmit = async (data: BookingForm) => {
    if (!user || !worker) return;
    setSubmitting(true);
    try {
      const { data: booking, error } = await supabase.from('bookings').insert({
        user_id: user.id,
        worker_id: worker.id,
        category_id: worker.category_id,
        service_name: data.service_name,
        service_description: data.service_description,
        scheduled_date: data.scheduled_date,
        scheduled_time: data.scheduled_time,
        address: data.address,
        amount: Number(worker.hourly_rate),
        status: 'pending',
      }).select().single();

      if (error) { toast(error.message, 'error'); setSubmitting(false); return; }

      // Send notification to worker
      await supabase.from('notifications').insert({
        user_id: worker.id,
        type: 'new_booking',
        title: 'New Booking Request',
        message: `${data.service_name} scheduled for ${data.scheduled_date}`,
        booking_id: booking.id,
      });

      toast('Booking request sent! Waiting for worker confirmation.', 'success');
      navigate(`/booking/${booking.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Booking failed', 'error');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  if (!worker) return <div className="max-w-7xl mx-auto px-4 py-16"><p className="text-center text-gray-500">Worker not found</p></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Book Service</h1>

        {/* Worker Summary */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl mb-6">
          {worker.profile_photo_url ? (
            <img src={worker.profile_photo_url} alt="" className="w-16 h-16 rounded-xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-blue-100 dark:bg-gray-700 flex items-center justify-center text-xl font-bold text-blue-600">{worker.full_name.charAt(0)}</div>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{worker.full_name}</p>
            <p className="text-sm text-blue-600 dark:text-blue-400">{worker.category?.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(Number(worker.hourly_rate))}/hr</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service Name *</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input {...register('service_name', { required: 'Required' })} type="text" defaultValue={worker.category?.name || ''} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Pipe leak repair" />
            </div>
            {errors.service_name && <p className="text-xs text-red-500 mt-1">{errors.service_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea {...register('service_description')} rows={3} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Describe the problem or service needed..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input {...register('scheduled_date', { required: 'Required' })} type="date" min={new Date().toISOString().split('T')[0]} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              {errors.scheduled_date && <p className="text-xs text-red-500 mt-1">{errors.scheduled_date.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time *</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input {...register('scheduled_time', { required: 'Required' })} type="time" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              {errors.scheduled_time && <p className="text-xs text-red-500 mt-1">{errors.scheduled_time.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service Address *</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input {...register('address', { required: 'Required' })} type="text" className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="123 Main St, City, State" />
            </div>
            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address.message}</p>}
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Service Rate</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(Number(worker.hourly_rate))}/hr</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Final amount will be calculated based on actual work duration.</p>
          </div>

          <button type="submit" disabled={submitting} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending request...</> : 'Send Booking Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
