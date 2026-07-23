/*
# Admin Panel Upgrade: Add hidden flag to reviews, IP to audit_logs, and admin_id to notifications

1. Schema Changes
- `reviews` table: add `is_hidden` boolean column (default false) — allows admin to hide reviews without deleting them.
- `audit_logs` table: add `ip_address` text column — stores the admin's IP for security auditing.
- `notifications` table: add `admin_id` uuid column (nullable, references profiles) — marks system/broadcast notifications sent by admin, as opposed to user-generated ones.

2. Security
- RLS policies updated:
  - reviews: admin can now UPDATE any review (to toggle is_hidden).
  - audit_logs: admin can INSERT with ip_address.
  - notifications: admin can INSERT for any user_id (broadcast), not just own.
*/

-- Add is_hidden to reviews
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- Add ip_address to audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address text DEFAULT '';

-- Add admin_id to notifications (for broadcast/system notifications sent by admin)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update reviews UPDATE policy to allow admin to hide/unhide any review
DROP POLICY IF EXISTS "reviews_update_admin" ON public.reviews;
CREATE POLICY "reviews_update_admin" ON public.reviews FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (true);

-- Update notifications INSERT policy to allow admin to send to any user
-- The existing "notifications_insert_own" policy requires auth.uid() = user_id.
-- We need a new policy that allows admin to insert notifications for any user.
DROP POLICY IF EXISTS "notifications_insert_admin" ON public.notifications;
CREATE POLICY "notifications_insert_admin" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

-- Allow admin to read all notifications (for monitoring)
DROP POLICY IF EXISTS "notifications_select_admin" ON public.notifications;
CREATE POLICY "notifications_select_admin" ON public.notifications FOR SELECT
  TO authenticated USING (public.is_admin());

-- Allow admin to delete any notification
DROP POLICY IF EXISTS "notifications_delete_admin" ON public.notifications;
CREATE POLICY "notifications_delete_admin" ON public.notifications FOR DELETE
  TO authenticated USING (public.is_admin());
