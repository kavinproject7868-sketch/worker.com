import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Star, MapPin, TrendingUp, Sparkles, Navigation, Clock, Wrench, ArrowRight } from 'lucide-react';
import WorkerCard from '@/components/WorkerCard';
import CategoryCard from '@/components/CategoryCard';
import { WorkerCardSkeleton, CategoryCardSkeleton } from '@/components/Skeletons';
import { supabase } from '@/lib/supabase';
import { getRecommendedWorkers, getNearbyWorkers, getTopRatedWorkers, getNewWorkers } from '@/lib/helpers';
import type { Worker, Category } from '@/lib/types';

export default function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [recommended, setRecommended] = useState<Worker[]>([]);
  const [nearby, setNearby] = useState<Worker[]>([]);
  const [topRated, setTopRated] = useState<Worker[]>([]);
  const [newlyJoined, setNewlyJoined] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cats, recommendedData, topRatedData, newWorkers] = await Promise.all([
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
      getRecommendedWorkers(userLocation?.lat, userLocation?.lng, 8),
      getTopRatedWorkers(8),
      getNewWorkers(8),
    ]);
    setCategories(cats.data as Category[] || []);
    setRecommended(recommendedData);
    setTopRated(topRatedData);
    setNewlyJoined(newWorkers);

    if (userLocation) {
      const nearbyData = await getNearbyWorkers(userLocation.lat, userLocation.lng, 8);
      setNearby(nearbyData);
    }
    setLoading(false);
  }, [userLocation]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime: update when workers change
  useEffect(() => {
    const channel = supabase
      .channel('home_workers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workers', filter: 'status=eq.approved' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/workers?q=${encodeURIComponent(searchQuery)}`);
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  };

  useEffect(() => { detectLocation(); }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-600 to-cyan-500 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              Find Skilled Workers<br />for Any Job, Anytime
            </h1>
            <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
              Book trusted professionals for plumbing, electrical, cleaning, and more. Verified experts at your doorstep.
            </p>
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2 p-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
              <div className="flex-1 flex items-center gap-2 px-4">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, skill, or service..."
                  className="w-full py-3 bg-transparent text-gray-900 dark:text-white outline-none"
                />
              </div>
              <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors whitespace-nowrap">
                Search
              </button>
            </form>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-blue-100">
              <span className="flex items-center gap-1"><Sparkles className="w-4 h-4" /> AI Recommendations</span>
              <span className="flex items-center gap-1"><Navigation className="w-4 h-4" /> Live Tracking</span>
              <span className="flex items-center gap-1"><Star className="w-4 h-4" /> Verified Workers</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Popular Services</h2>
          <Link to="/categories" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <CategoryCardSkeleton key={i} />)
            : categories.slice(0, 12).map((cat) => <CategoryCard key={cat.id} category={cat} />)}
        </div>
      </section>

      {/* AI Recommended */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Recommended Workers</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Smart matching based on ratings, experience, and distance</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <WorkerCardSkeleton key={i} />)
            : recommended.map((w) => <WorkerCard key={w.id} worker={w} />)}
        </div>
      </section>

      {/* Nearby Workers */}
      {userLocation && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nearby Workers</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Workers close to your location</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <WorkerCardSkeleton key={i} />)
              : nearby.map((w) => <WorkerCard key={w.id} worker={w} />)}
          </div>
        </section>
      )}

      {/* Top Rated */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Top Rated Workers</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Highest-rated professionals on our platform</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <WorkerCardSkeleton key={i} />)
            : topRated.map((w) => <WorkerCard key={w.id} worker={w} />)}
        </div>
      </section>

      {/* Newly Joined */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Newly Joined</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Latest workers to join our platform</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <WorkerCardSkeleton key={i} />)
            : newlyJoined.map((w) => <WorkerCard key={w.id} worker={w} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-800 dark:to-cyan-800 rounded-3xl p-8 sm:p-12 text-center">
          <Wrench className="w-12 h-12 text-white mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-4">Are You a Skilled Professional?</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">Join thousands of workers earning on worker.com. Set your own rates, work flexible hours, and grow your business.</p>
          <Link to="/register-worker" className="inline-flex items-center gap-2 px-8 py-3 bg-white text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors">
            Register as Worker <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
