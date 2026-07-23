import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import WorkerCard from '@/components/WorkerCard';
import { WorkerCardSkeleton } from '@/components/Skeletons';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabase';
import { searchWorkers } from '@/lib/helpers';
import type { Worker, Category } from '@/lib/types';

export default function WorkersListingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [minRating, setMinRating] = useState(0);
  const [minExperience, setMinExperience] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [availableOnly, setAvailableOnly] = useState(false);

  useEffect(() => {
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => data && setCategories(data as Category[]));
  }, []);

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    const data = await searchWorkers({
      query: query || undefined,
      category_id: selectedCategory || undefined,
      min_rating: minRating || undefined,
      min_experience: minExperience || undefined,
      max_price: maxPrice || undefined,
      available_only: availableOnly,
    });
    setWorkers(data);
    setLoading(false);
  }, [query, selectedCategory, minRating, minExperience, maxPrice, availableOnly]);

  useEffect(() => { fetchWorkers(); }, [fetchWorkers]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('workers_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workers', filter: 'status=eq.approved' }, () => fetchWorkers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchWorkers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (query) params.q = query;
    if (selectedCategory) params.category = selectedCategory;
    setSearchParams(params);
    fetchWorkers();
  };

  const clearFilters = () => {
    setQuery(''); setSelectedCategory(''); setMinRating(0); setMinExperience(0); setMaxPrice(0); setAvailableOnly(false);
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Find Workers</h1>
        <p className="text-gray-500 dark:text-gray-400">Browse our verified professionals</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <Search className="w-5 h-5 text-gray-400" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, skill, or service..." className="w-full bg-transparent text-gray-900 dark:text-white outline-none" />
        </div>
        <button type="button" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:border-blue-400 transition-colors">
          <SlidersHorizontal className="w-5 h-5" /> <span className="hidden sm:inline">Filters</span>
        </button>
      </form>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
            <button onClick={clearFilters} className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><X className="w-4 h-4" /> Clear all</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Rating</label>
              <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                <option value={0}>Any</option>
                <option value={3}>3+ Stars</option>
                <option value={4}>4+ Stars</option>
                <option value={4.5}>4.5+ Stars</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Experience (years)</label>
              <input type="number" min="0" value={minExperience || ''} onChange={(e) => setMinExperience(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Hourly Rate (₹)</label>
              <input type="number" min="0" value={maxPrice || ''} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            Available only
          </label>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <WorkerCardSkeleton key={i} />)}
        </div>
      ) : workers.length === 0 ? (
        <EmptyState title="No workers found" description="Try adjusting your filters or search query." />
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{workers.length} worker{workers.length !== 1 ? 's' : ''} found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {workers.map((w) => <WorkerCard key={w.id} worker={w} />)}
          </div>
        </>
      )}
    </div>
  );
}
