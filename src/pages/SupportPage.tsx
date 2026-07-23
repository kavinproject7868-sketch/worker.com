import { useEffect, useState } from 'react';
import { LifeBuoy, MessageSquare, Mail, Phone, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import type { Complaint } from '@/lib/types';
import EmptyState from '@/components/EmptyState';

export default function SupportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('complaints').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setComplaints(data as Complaint[] || []); setLoading(false); });
  }, [user]);

  const submit = async () => {
    if (!user || !subject.trim()) return;
    const { error } = await supabase.from('complaints').insert({ user_id: user.id, subject, description });
    if (error) { toast(error.message, 'error'); return; }
    toast('Complaint submitted. Our team will contact you soon.', 'success');
    setSubject(''); setDescription('');
    const { data } = await supabase.from('complaints').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setComplaints(data as Complaint[] || []);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Support Center</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">We're here to help. Submit a complaint or contact us.</p>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 text-center">
          <Mail className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="font-medium text-gray-900 dark:text-white">Email</p>
          <p className="text-sm text-gray-500">support@worker.com</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 text-center">
          <Phone className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="font-medium text-gray-900 dark:text-white">Phone</p>
          <p className="text-sm text-gray-500">+91 1800-123-4567</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 text-center">
          <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="font-medium text-gray-900 dark:text-white">Hours</p>
          <p className="text-sm text-gray-500">24/7 Support</p>
        </div>
      </div>

      {/* Submit Complaint */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><LifeBuoy className="w-5 h-5" /> Submit a Complaint</h2>
        <div className="space-y-3">
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe your issue..." className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          <button onClick={submit} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">Submit Complaint</button>
        </div>
      </div>

      {/* Previous Complaints */}
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Your Complaints</h2>
        {loading ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div> : complaints.length === 0 ? <EmptyState title="No complaints submitted" /> : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900 dark:text-white">{c.subject}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${c.status === 'open' ? 'bg-yellow-100 text-yellow-800' : c.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{c.status.replace('_', ' ')}</span>
                </div>
                <p className="text-sm text-gray-500">{c.description}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(c.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
