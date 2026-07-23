import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3, Shield, Wrench, Users, Calendar, DollarSign,
  MessageSquare, Star, FileText, Eye, Send, TrendingUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatCurrency, BOOKING_STATUS_LABELS } from '@/lib/helpers';
import { fetchAdminData, computeStats, type AdminData, type AdminStats } from '@/lib/adminHelpers';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { Worker, Booking, Profile } from '@/lib/types';

import OverviewTab from './admin/OverviewTab';
import PendingTab from './admin/PendingTab';
import WorkersTab from './admin/WorkersTab';
import UsersTab from './admin/UsersTab';
import BookingsTab from './admin/BookingsTab';
import PaymentsTab from './admin/PaymentsTab';
import CategoriesTab from './admin/CategoriesTab';
import ReviewsTab from './admin/ReviewsTab';
import ComplaintsTab from './admin/ComplaintsTab';
import NotificationsTab from './admin/NotificationsTab';
import AnalyticsTab from './admin/AnalyticsTab';
import AuditTab from './admin/AuditTab';

type Tab = 'overview' | 'pending' | 'workers' | 'users' | 'bookings' | 'payments' | 'complaints' | 'reviews' | 'categories' | 'notifications' | 'analytics' | 'audit';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [data, setData] = useState<AdminData | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', confirmLabel: 'Confirm', variant: 'danger', onConfirm: () => {} });

  const load = useCallback(async () => {
    const adminData = await fetchAdminData();
    setData(adminData);
    setStats(computeStats(adminData));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('admin_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workers' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const logAction = async (action: string, entityType: string, entityId: string, details: Record<string, unknown> = {}) => {
    if (!profile) return;
    await supabase.from('audit_logs').insert({
      admin_id: profile.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address: '',
    });
  };

  const sendNotification = async (userId: string, type: string, title: string, message: string) => {
    await supabase.from('notifications').insert({ user_id: userId, type, title, message });
  };

  // Worker actions
  const approveWorker = (w: Worker) => {
    setConfirmDialog({
      open: true,
      title: 'Approve Worker',
      message: `Approve "${w.full_name}"? They will become visible to all users immediately.`,
      confirmLabel: 'Approve',
      variant: 'info',
      onConfirm: async () => {
        await supabase.from('workers').update({ status: 'approved', is_verified: true, approved_at: new Date().toISOString(), rejected_at: null }).eq('id', w.id);
        await sendNotification(w.id, 'worker_approved', 'Profile Approved!', 'Your profile has been approved. You are now visible to users.');
        await logAction('approve_worker', 'worker', w.id, { worker_name: w.full_name });
        toast(`${w.full_name} approved successfully`, 'success');
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        load();
      },
    });
  };

  const rejectWorker = (w: Worker) => {
    setConfirmDialog({
      open: true,
      title: 'Reject Worker',
      message: `Reject "${w.full_name}"? They will be notified and can edit their profile to resubmit.`,
      confirmLabel: 'Reject',
      variant: 'warning',
      onConfirm: async () => {
        await supabase.from('workers').update({ status: 'rejected', rejected_at: new Date().toISOString() }).eq('id', w.id);
        await sendNotification(w.id, 'worker_rejected', 'Registration Rejected', 'Your registration has been rejected. Please update your profile and resubmit.');
        await logAction('reject_worker', 'worker', w.id, { worker_name: w.full_name });
        toast(`${w.full_name} rejected`, 'info');
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        load();
      },
    });
  };

  const suspendWorker = (w: Worker) => {
    setConfirmDialog({
      open: true,
      title: 'Suspend Worker',
      message: `Suspend "${w.full_name}"? They will be immediately removed from all public pages. Booking history is preserved.`,
      confirmLabel: 'Suspend',
      variant: 'warning',
      onConfirm: async () => {
        await supabase.from('workers').update({ status: 'suspended', availability: false }).eq('id', w.id);
        await sendNotification(w.id, 'worker_suspended', 'Account Suspended', 'Your account has been suspended. Please contact support.');
        await logAction('suspend_worker', 'worker', w.id, { worker_name: w.full_name });
        toast(`${w.full_name} suspended`, 'info');
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        load();
      },
    });
  };

  const deleteWorker = (w: Worker) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Worker',
      message: `Permanently delete "${w.full_name}"? This will remove their profile, gallery, documents, and all associated data. This cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        // Delete storage files
        if (w.profile_photo_url) {
          const path = w.profile_photo_url.split('/').slice(-2).join('/');
          await supabase.storage.from('workers').remove([path]);
        }
        if (w.aadhaar_url) {
          const path = w.aadhaar_url.split('/').slice(-2).join('/');
          await supabase.storage.from('documents').remove([path]);
        }
        if (w.pan_url) {
          const path = w.pan_url.split('/').slice(-2).join('/');
          await supabase.storage.from('documents').remove([path]);
        }
        // Delete gallery files
        const { data: gallery } = await supabase.from('gallery').select('image_url').eq('worker_id', w.id);
        if (gallery && gallery.length > 0) {
          const paths = gallery.map((g) => (g.image_url as string).split('/').slice(-2).join('/'));
          await supabase.storage.from('gallery').remove(paths);
        }
        // Delete notifications
        await supabase.from('notifications').delete().eq('user_id', w.id);
        // Delete worker record (cascades to gallery, favorites, bookings, etc.)
        await supabase.from('workers').delete().eq('id', w.id);
        await logAction('delete_worker', 'worker', w.id, { worker_name: w.full_name });
        toast(`${w.full_name} deleted permanently`, 'info');
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        load();
      },
    });
  };

  // User actions
  const deleteUser = (u: Profile) => {
    setConfirmDialog({
      open: true,
      title: 'Delete User',
      message: `Permanently delete user "${u.full_name || 'Unknown'}"? This will remove their profile and all associated data. This cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        await supabase.from('notifications').delete().eq('user_id', u.id);
        await supabase.from('favorites').delete().eq('user_id', u.id);
        await supabase.from('profiles').delete().eq('id', u.id);
        await logAction('delete_user', 'user', u.id, { user_name: u.full_name });
        toast('User deleted permanently', 'info');
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        load();
      },
    });
  };

  // Booking actions
  const cancelBooking = (b: Booking) => {
    setConfirmDialog({
      open: true,
      title: 'Cancel Booking',
      message: `Cancel booking "${b.service_name}"? Both user and worker will be notified.`,
      confirmLabel: 'Cancel Booking',
      variant: 'warning',
      onConfirm: async () => {
        await supabase.from('bookings').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', b.id);
        await sendNotification(b.user_id, 'booking_cancelled', 'Booking Cancelled', `Admin cancelled your booking: ${b.service_name}`);
        await sendNotification(b.worker_id, 'booking_cancelled', 'Booking Cancelled', `Admin cancelled booking: ${b.service_name}`);
        await logAction('booking_cancel', 'booking', b.id, { service: b.service_name });
        toast('Booking cancelled', 'info');
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        load();
      },
    });
  };

  const refundPayment = (b: Booking) => {
    setConfirmDialog({
      open: true,
      title: 'Refund Payment',
      message: `Refund payment for booking "${b.service_name}"? The payment status will be changed to "refunded".`,
      confirmLabel: 'Process Refund',
      variant: 'warning',
      onConfirm: async () => {
        await supabase.from('payments').update({ status: 'refunded' }).eq('booking_id', b.id);
        await sendNotification(b.user_id, 'payment_refunded', 'Payment Refunded', `Your payment for ${b.service_name} has been refunded.`);
        await logAction('payment_refund', 'payment', b.id, { service: b.service_name });
        toast('Payment refunded', 'success');
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        load();
      },
    });
  };

  const updateBookingStatus = async (b: Booking, status: string) => {
    await supabase.from('bookings').update({ status }).eq('id', b.id);
    await sendNotification(b.user_id, 'booking_status_update', 'Booking Status Updated', `Your booking status is now: ${BOOKING_STATUS_LABELS[status] || status}`);
    await sendNotification(b.worker_id, 'booking_status_update', 'Booking Status Updated', `Booking status is now: ${BOOKING_STATUS_LABELS[status] || status}`);
    await logAction('booking_status_update', 'booking', b.id, { new_status: status });
    toast('Booking status updated', 'success');
    load();
  };

  // Complaint actions
  const updateComplaintStatus = async (id: string, status: string) => {
    await supabase.from('complaints').update({ status }).eq('id', id);
    if (status === 'resolved' || status === 'closed') {
      await logAction('complaint_resolution', 'complaint', id, { new_status: status });
    }
    toast('Complaint status updated', 'success');
    load();
  };

  if (loading || !data || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'pending', label: 'Pending Approvals', icon: Shield, count: stats.pendingWorkers },
    { key: 'workers', label: 'Workers', icon: Wrench, count: stats.totalWorkers },
    { key: 'users', label: 'Users', icon: Users, count: stats.totalUsers },
    { key: 'bookings', label: 'Bookings', icon: Calendar, count: data.bookings.length },
    { key: 'payments', label: 'Payments', icon: DollarSign },
    { key: 'complaints', label: 'Complaints', icon: MessageSquare, count: stats.complaintsCount },
    { key: 'reviews', label: 'Reviews', icon: Star, count: stats.reviewsCount },
    { key: 'categories', label: 'Categories', icon: FileText },
    { key: 'notifications', label: 'Notifications', icon: Send },
    { key: 'analytics', label: 'Analytics', icon: TrendingUp },
    { key: 'audit', label: 'Audit Logs', icon: Eye },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage platform operations - {profile?.full_name || 'Admin'}</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <Icon className="w-4 h-4" /> {tab.label}
              {tab.count != null && tab.count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'}`}>{tab.count}</span>}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab stats={stats} data={data} />}
      {activeTab === 'pending' && <PendingTab workers={data.pendingWorkers} onApprove={approveWorker} onReject={rejectWorker} onSuspend={suspendWorker} onDelete={deleteWorker} />}
      {activeTab === 'workers' && <WorkersTab workers={data.workers} onSuspend={suspendWorker} onDelete={deleteWorker} onApprove={approveWorker} />}
      {activeTab === 'users' && <UsersTab users={data.users} onDelete={deleteUser} />}
      {activeTab === 'bookings' && <BookingsTab bookings={data.bookings} onCancel={cancelBooking} onRefund={refundPayment} onUpdateStatus={updateBookingStatus} />}
      {activeTab === 'payments' && <PaymentsTab payments={data.payments} />}
      {activeTab === 'complaints' && <ComplaintsTab complaints={data.complaints} onUpdateStatus={updateComplaintStatus} />}
      {activeTab === 'reviews' && <ReviewsTab reviews={data.reviews} onChanged={load} />}
      {activeTab === 'categories' && <CategoriesTab categories={data.categories} onChanged={load} />}
      {activeTab === 'notifications' && <NotificationsTab users={data.users} />}
      {activeTab === 'analytics' && <AnalyticsTab data={data} />}
      {activeTab === 'audit' && <AuditTab logs={data.auditLogs} />}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
