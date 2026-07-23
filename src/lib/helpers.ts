import { supabase } from './supabase';
import type { Worker, Booking, Category } from './types';

/**
 * AI Recommendation ranking formula:
 * 40% Rating + 20% Experience + 15% Distance + 15% Availability + 10% Booking Success
 */
export function calculateRecommendationScore(
  worker: Worker,
  userLat?: number,
  userLng?: number,
  maxExperience = 20,
  maxDistance = 50
): number {
  // Rating score (0-5 normalized to 0-1)
  const ratingScore = (worker.rating / 5) * 0.4;

  // Experience score (normalized to 0-1)
  const experienceScore = Math.min(worker.experience_years / maxExperience, 1) * 0.2;

  // Distance score (closer is better, normalized)
  let distanceScore = 0.15;
  if (
    userLat != null &&
    userLng != null &&
    worker.latitude != null &&
    worker.longitude != null
  ) {
    const dist = haversineDistance(userLat, userLng, worker.latitude, worker.longitude);
    distanceScore = Math.max(0, 1 - dist / maxDistance) * 0.15;
  }

  // Availability score
  const availabilityScore = (worker.availability ? 1 : 0) * 0.15;

  // Booking success rate score
  const successScore = (worker.booking_success_rate / 100) * 0.1;

  return ratingScore + experienceScore + distanceScore + availabilityScore + successScore;
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getRecommendedWorkers(
  userLat?: number,
  userLng?: number,
  limit = 10
): Promise<Worker[]> {
  const { data, error } = await supabase
    .from('workers')
    .select('*, category:categories(*)')
    .eq('status', 'approved')
    .order('rating', { ascending: false })
    .limit(50);

  if (error || !data) return [];

  const scored = (data as Worker[])
    .map((w) => ({
      worker: w,
      score: calculateRecommendationScore(w, userLat, userLng),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.worker);

  return scored;
}

export async function getNearbyWorkers(
  userLat: number,
  userLng: number,
  limit = 10
): Promise<Worker[]> {
  const { data, error } = await supabase
    .from('workers')
    .select('*, category:categories(*)')
    .eq('status', 'approved')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(100);

  if (error || !data) return [];

  return (data as Worker[])
    .map((w) => ({
      worker: w,
      dist:
        w.latitude != null && w.longitude != null
          ? haversineDistance(userLat, userLng, w.latitude, w.longitude)
          : Infinity,
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit)
    .map((s) => s.worker);
}

export async function getTopRatedWorkers(limit = 10): Promise<Worker[]> {
  const { data, error } = await supabase
    .from('workers')
    .select('*, category:categories(*)')
    .eq('status', 'approved')
    .order('rating', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as Worker[];
}

export async function getNewWorkers(limit = 10): Promise<Worker[]> {
  const { data, error } = await supabase
    .from('workers')
    .select('*, category:categories(*)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as Worker[];
}

export async function searchWorkers(filters: {
  query?: string;
  category_id?: string;
  min_rating?: number;
  min_experience?: number;
  max_price?: number;
  available_only?: boolean;
}): Promise<Worker[]> {
  let query = supabase
    .from('workers')
    .select('*, category:categories(*)')
    .eq('status', 'approved');

  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters.min_rating) {
    query = query.gte('rating', filters.min_rating);
  }
  if (filters.min_experience) {
    query = query.gte('experience_years', filters.min_experience);
  }
  if (filters.max_price) {
    query = query.lte('hourly_rate', filters.max_price);
  }
  if (filters.available_only) {
    query = query.eq('availability', true);
  }
  if (filters.query) {
    query = query.or(
      `full_name.ilike.%${filters.query}%,bio.ilike.%${filters.query}%,address.ilike.%${filters.query}%`
    );
  }

  const { data, error } = await query.order('rating', { ascending: false }).limit(50);
  if (error || !data) return [];
  return data as Worker[];
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generatePaymentId(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `PAY${new Date().getFullYear()}${num}`;
}

export function generateTransactionId(): string {
  const num = Math.floor(100000000 + Math.random() * 900000000);
  return `TXN${num}`;
}

export function generateInvoiceNumber(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `INV${new Date().getFullYear()}${num}`;
}

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  on_the_way: 'On The Way',
  arrived: 'Arrived',
  otp_verified: 'OTP Verified',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  accepted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  on_the_way: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  arrived: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  otp_verified: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  in_progress: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};
