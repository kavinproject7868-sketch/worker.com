import { supabase } from '@/lib/supabase';
import type { Worker, Booking, Payment, Profile, Complaint, Review, Category, AuditLog } from '@/lib/types';

export interface AdminData {
  workers: Worker[];
  pendingWorkers: Worker[];
  users: Profile[];
  bookings: Booking[];
  payments: Payment[];
  complaints: Complaint[];
  reviews: Review[];
  categories: Category[];
  auditLogs: AuditLog[];
}

export async function fetchAdminData(): Promise<AdminData> {
  const [w, u, b, p, c, r, cats, logs] = await Promise.all([
    supabase.from('workers').select('*, category:categories(*)').order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('bookings').select('*, worker:workers(*), user_profile:profiles!bookings_user_id_fkey(*)').order('created_at', { ascending: false }).limit(200),
    supabase.from('payments').select('*, booking:bookings(*), user_profile:profiles!payments_user_id_fkey(*), worker:workers(*)').order('created_at', { ascending: false }).limit(200),
    supabase.from('complaints').select('*, user_profile:profiles!complaints_user_id_fkey(*), worker:workers(*)').order('created_at', { ascending: false }),
    supabase.from('reviews').select('*, worker:workers(*), user_profile:profiles!reviews_user_id_fkey(*)').order('created_at', { ascending: false }).limit(100),
    supabase.from('categories').select('*').order('sort_order'),
    supabase.from('audit_logs').select('*, admin_profile:profiles!audit_logs_admin_id_fkey(*)').order('created_at', { ascending: false }).limit(100),
  ]);

  const workers = w.data as Worker[] || [];
  return {
    workers,
    pendingWorkers: workers.filter((wkr) => wkr.status === 'pending'),
    users: u.data as Profile[] || [],
    bookings: b.data as Booking[] || [],
    payments: p.data as Payment[] || [],
    complaints: c.data as Complaint[] || [],
    reviews: r.data as Review[] || [],
    categories: cats.data as Category[] || [],
    auditLogs: logs.data as AuditLog[] || [],
  };
}

export interface AdminStats {
  totalUsers: number;
  totalWorkers: number;
  pendingWorkers: number;
  approvedWorkers: number;
  rejectedWorkers: number;
  suspendedWorkers: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  todayRevenue: number;
  monthlyRevenue: number;
  totalRevenue: number;
  reviewsCount: number;
  complaintsCount: number;
  avgWorkerRating: number;
}

export function computeStats(data: AdminData): AdminStats {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const thisMonth = now.getMonth();

  const paidPayments = data.payments.filter((p) => p.status === 'paid');
  const todayRevenue = paidPayments
    .filter((p) => p.created_at.split('T')[0] === today)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const monthlyRevenue = paidPayments
    .filter((p) => new Date(p.created_at).getMonth() === thisMonth)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalRevenue = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const approvedWorkers = data.workers.filter((w) => w.status === 'approved');
  const avgRating = approvedWorkers.length > 0
    ? approvedWorkers.reduce((sum, w) => sum + (w.rating || 0), 0) / approvedWorkers.length
    : 0;

  const activeStatuses = ['pending', 'accepted', 'on_the_way', 'arrived', 'otp_verified', 'in_progress'];

  return {
    totalUsers: data.users.filter((u) => u.role === 'user').length,
    totalWorkers: data.workers.length,
    pendingWorkers: data.workers.filter((w) => w.status === 'pending').length,
    approvedWorkers: approvedWorkers.length,
    rejectedWorkers: data.workers.filter((w) => w.status === 'rejected').length,
    suspendedWorkers: data.workers.filter((w) => w.status === 'suspended').length,
    activeBookings: data.bookings.filter((b) => activeStatuses.includes(b.status)).length,
    completedBookings: data.bookings.filter((b) => b.status === 'completed').length,
    cancelledBookings: data.bookings.filter((b) => b.status === 'cancelled' || b.status === 'rejected').length,
    todayRevenue,
    monthlyRevenue,
    totalRevenue,
    reviewsCount: data.reviews.length,
    complaintsCount: data.complaints.filter((c) => c.status === 'open').length,
    avgWorkerRating: avgRating,
  };
}
