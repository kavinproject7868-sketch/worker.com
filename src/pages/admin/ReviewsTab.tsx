import { useState } from 'react';
import { Trash2, EyeOff, Eye, Star } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import type { Review } from '@/lib/types';

interface ReviewsTabProps {
  reviews: Review[];
  onChanged: () => void;
}

export default function ReviewsTab({ reviews, onChanged }: ReviewsTabProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');

  const filtered = reviews.filter((r) => {
    const matchesSearch = !search ||
      (r.user_profile?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.worker?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      r.comment.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'visible' && !r.is_hidden) || (filter === 'hidden' && r.is_hidden);
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (r: Review) => {
    if (!confirm('Delete this review permanently?')) return;
    await supabase.from('reviews').delete().eq('id', r.id);
    if (r.worker_id) await supabase.rpc('update_worker_rating', { p_worker_id: r.worker_id });
    toast('Review deleted', 'info');
    onChanged();
  };

  const toggleHidden = async (r: Review) => {
    await supabase.from('reviews').update({ is_hidden: !r.is_hidden }).eq('id', r.id);
    toast(`Review ${r.is_hidden ? 'unhidden' : 'hidden'}`, 'info');
    onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by customer, worker, comment..." />
        <select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | 'visible' | 'hidden')} className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All Reviews</option>
          <option value="visible">Visible Only</option>
          <option value="hidden">Hidden Only</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No reviews found" />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-4 ${r.is_hidden ? 'border-orange-200 dark:border-orange-800 opacity-60' : 'border-gray-100 dark:border-gray-700'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{r.user_profile?.full_name || 'Anonymous'}</p>
                      <p className="text-xs text-gray-500">on {r.worker?.full_name || 'Unknown Worker'}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{r.comment || 'No comment'}</p>
                  {r.images && r.images.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {r.images.map((img, i) => <img key={i} src={img} alt="" className="w-12 h-12 rounded-lg object-cover" />)}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">{new Date(r.created_at).toLocaleString()}</p>
                  {r.is_hidden && <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded-full text-xs">Hidden</span>}
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button onClick={() => toggleHidden(r)} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title={r.is_hidden ? 'Unhide' : 'Hide'}>
                    {r.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(r)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} review{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
