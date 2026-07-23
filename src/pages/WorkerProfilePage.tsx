import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, MapPin, Briefcase, Clock, Languages, Heart, Calendar, ArrowLeft, CheckCircle, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/lib/helpers';
import type { Worker, GalleryImage, Review, Category } from '@/lib/types';
import EmptyState from '@/components/EmptyState';

export default function WorkerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('workers').select('*, category:categories(*)').eq('id', id).maybeSingle(),
      supabase.from('gallery').select('*').eq('worker_id', id).order('created_at', { ascending: false }),
      supabase.from('reviews').select('*, user_profile:profiles!reviews_user_id_fkey(*)').eq('worker_id', id).order('created_at', { ascending: false }),
    ]).then(([wData, gData, rData]) => {
      setWorker(wData.data as Worker | null);
      setGallery(gData.data as GalleryImage[] || []);
      setReviews(rData.data as Review[] || []);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (user && id) {
      supabase.from('favorites').select('id').eq('user_id', user.id).eq('worker_id', id).maybeSingle()
        .then(({ data }) => setIsFavorite(!!data));
    }
  }, [user, id]);

  const toggleFavorite = async () => {
    if (!user) { toast('Please sign in to save workers', 'info'); navigate('/login'); return; }
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('worker_id', id);
      setIsFavorite(false);
      toast('Removed from saved workers', 'info');
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, worker_id: id });
      setIsFavorite(true);
      toast('Added to saved workers', 'success');
    }
  };

  const handleBookNow = () => {
    if (!user) { toast('Please sign in to book a service', 'info'); navigate('/login'); return; }
    if (profile?.role === 'worker') { toast('Workers cannot book services', 'error'); return; }
    navigate(`/book/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <EmptyState title="Worker not found" description="This worker may not exist or has been removed." action={<Link to="/workers" className="text-blue-600 hover:underline">Browse all workers</Link>} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/workers" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to workers
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Header */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-blue-500 to-cyan-400" />
            <div className="px-6 pb-6">
              <div className="flex items-end justify-between -mt-16">
                <div className="flex items-end gap-4">
                  {worker.profile_photo_url ? (
                    <img src={worker.profile_photo_url} alt={worker.full_name} className="w-28 h-28 rounded-2xl border-4 border-white dark:border-gray-800 object-cover" />
                  ) : (
                    <div className="w-28 h-28 rounded-2xl border-4 border-white dark:border-gray-800 bg-blue-100 dark:bg-gray-700 flex items-center justify-center text-4xl font-bold text-blue-600 dark:text-blue-400">
                      {worker.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="pb-2">
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{worker.full_name}</h1>
                      {worker.is_verified && <CheckCircle className="w-5 h-5 text-blue-500" />}
                    </div>
                    {worker.category && <p className="text-blue-600 dark:text-blue-400 font-medium">{worker.category.name}</p>}
                    {worker.address && <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1"><MapPin className="w-4 h-4" /> {worker.address}</p>}
                  </div>
                </div>
                <button onClick={toggleFavorite} className={`p-3 rounded-xl border transition-colors ${isFavorite ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-500' : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500'}`}>
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500' : ''}`} />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <div className="flex items-center justify-center gap-1 text-yellow-500">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{worker.rating > 0 ? worker.rating.toFixed(1) : 'New'}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{worker.total_ratings} reviews</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <Briefcase className="w-5 h-5 text-blue-500 mx-auto" />
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{worker.experience_years}+</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Years exp</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{worker.total_jobs}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Jobs done</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <span className={`inline-block w-2 h-2 rounded-full ${worker.availability ? 'bg-green-500 animate-pulse' : 'bg-gray-400'} mx-auto`} />
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{worker.availability ? 'Available' : 'Busy'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                </div>
              </div>
            </div>
          </div>

          {/* About */}
          {worker.bio && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">About</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{worker.bio}</p>
            </div>
          )}

          {/* Skills */}
          {worker.skills.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {worker.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Gallery */}
          {gallery.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Gallery</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {gallery.map((img) => (
                  <button key={img.id} onClick={() => setSelectedImage(img.image_url)} className="aspect-square rounded-xl overflow-hidden hover:opacity-90 transition-opacity">
                    <img src={img.image_url} alt={img.caption || ''} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Reviews ({reviews.length})</h2>
            {reviews.length === 0 ? (
              <EmptyState title="No reviews yet" description="Reviews will appear after completed bookings." />
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-start gap-3">
                      {review.user_profile?.profile_photo_url ? (
                        <img src={review.user_profile.profile_photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
                          {(review.user_profile?.full_name || 'U').charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900 dark:text-white">{review.user_profile?.full_name || 'Anonymous'}</p>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{review.comment}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Booking Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="text-center mb-6">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(Number(worker.hourly_rate))}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">per hour</p>
            </div>

            <div className="space-y-3 mb-6">
              {worker.working_hours && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Clock className="w-4 h-4 text-gray-400" /> {worker.working_hours}
                </div>
              )}
              {worker.languages.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Languages className="w-4 h-4 text-gray-400" /> {worker.languages.join(', ')}
                </div>
              )}
              {worker.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <Phone className="w-4 h-4 text-gray-400" /> {worker.phone}
                </div>
              )}
            </div>

            <button onClick={handleBookNow} disabled={!worker.availability} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <Calendar className="w-5 h-5" /> {worker.availability ? 'Book Now' : 'Not Available'}
            </button>

            {worker.availability && (
              <p className="text-xs text-center text-green-600 dark:text-green-400 mt-2 flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Available now
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
