import { useState } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import type { Profile } from '@/lib/types';

interface NotificationsTabProps {
  users: Profile[];
}

type TargetType = 'all_users' | 'all_workers' | 'single';
type NotificationType = 'information' | 'warning' | 'promotion' | 'system_update';

export default function NotificationsTab({ users }: NotificationsTabProps) {
  const { toast } = useToast();
  const [targetType, setTargetType] = useState<TargetType>('all_users');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [type, setType] = useState<NotificationType>('information');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) { toast('Title and message are required', 'error'); return; }
    setSending(true);

    let targetIds: string[] = [];
    if (targetType === 'all_users') {
      targetIds = users.filter((u) => u.role === 'user').map((u) => u.id);
    } else if (targetType === 'all_workers') {
      targetIds = users.filter((u) => u.role === 'worker').map((u) => u.id);
    } else if (targetType === 'single' && selectedUserId) {
      targetIds = [selectedUserId];
    }

    if (targetIds.length === 0) { toast('No recipients selected', 'error'); setSending(false); return; }

    const notifications = targetIds.map((uid) => ({
      user_id: uid,
      type,
      title,
      message,
    }));

    const { error } = await supabase.from('notifications').insert(notifications);
    setSending(false);

    if (error) { toast(error.message, 'error'); return; }
    toast(`Notification sent to ${targetIds.length} recipient${targetIds.length !== 1 ? 's' : ''}`, 'success');
    setTitle(''); setMessage('');
  };

  const typeColors: Record<NotificationType, string> = {
    information: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    promotion: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    system_update: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Send className="w-5 h-5" /> Send Notification</h2>

        {/* Target */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Send To</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: 'all_users', label: 'All Users' },
              { key: 'all_workers', label: 'All Workers' },
              { key: 'single', label: 'Single User' },
            ] as const).map((t) => (
              <button key={t.key} onClick={() => setTargetType(t.key)} className={`px-3 py-2 text-sm rounded-lg border transition-colors ${targetType === t.key ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {targetType === 'single' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select User</label>
            <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select a user...</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || 'Unknown'} ({u.role}) - {u.email}</option>)}
            </select>
          </div>
        )}

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notification Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['information', 'warning', 'promotion', 'system_update'] as const).map((t) => (
              <button key={t} onClick={() => setType(t)} className={`px-3 py-2 text-xs rounded-lg border capitalize transition-colors ${type === t ? typeColors[t] : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-blue-400'}`}>
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Notification title..." />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message *</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Notification message..." />
        </div>

        <button onClick={handleSend} disabled={sending} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
          <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Notification'}
        </button>
      </div>
    </div>
  );
}
