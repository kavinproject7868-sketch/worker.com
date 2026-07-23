/*
# Create bookings, payments, invoices, reviews, notifications, tracking, messages, complaints, audit_logs tables

1. New Tables
- `bookings` — service bookings between users and workers
  - id, user_id, worker_id, category_id
  - service_name, service_description, scheduled_date, scheduled_time
  - address, latitude, longitude
  - amount, status (pending/accepted/rejected/on_the_way/arrived/otp_verified/in_progress/completed/cancelled)
  - otp (text), otp_verified (boolean)
  - worker_latitude, worker_longitude, last_location_update
  - accepted_at, rejected_at, started_journey_at, arrived_at, completed_at, cancelled_at
  - created_at, updated_at
- `payments` — payment records for bookings
  - id, booking_id, user_id, worker_id
  - amount, payment_method, payment_id, transaction_id, status
  - created_at
- `invoices` — invoice records
  - id, booking_id, payment_id, user_id, worker_id
  - invoice_number, subtotal, gst, platform_fee, grand_total, payment_status
  - created_at
- `reviews` — reviews for workers (only after payment)
  - id, booking_id, user_id, worker_id, rating, comment, images, created_at
- `notifications` — realtime notifications for users and workers
  - id, user_id, type, title, message, is_read, booking_id, created_at
- `tracking` — live tracking location updates
  - id, booking_id, worker_id, latitude, longitude, created_at
- `messages` — chat messages between users and workers
  - id, booking_id, sender_id, receiver_id, message, created_at
- `complaints` — user complaints
  - id, user_id, booking_id, worker_id, subject, description, status, created_at
- `audit_logs` — admin audit logs
  - id, admin_id, action, entity_type, entity_id, details, created_at

2. Security
- RLS on all tables.
- bookings: users read/update own; workers read/update assigned; admin full.
- payments: users read own; workers read own; admin full; users insert own.
- invoices: users read own; workers read own; admin full.
- reviews: public read; users insert own.
- notifications: users read/update/delete own.
- tracking: users read for own bookings; workers insert own; admin full.
- messages: participants read/insert own.
- complaints: users manage own; admin read all.
- audit_logs: admin only.
*/

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  service_name text NOT NULL DEFAULT '',
  service_description text DEFAULT '',
  scheduled_date date NOT NULL DEFAULT CURRENT_DATE,
  scheduled_time text DEFAULT '',
  address text DEFAULT '',
  latitude float8 DEFAULT NULL,
  longitude float8 DEFAULT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'on_the_way', 'arrived', 'otp_verified', 'in_progress', 'completed', 'cancelled')),
  otp text DEFAULT '',
  otp_verified boolean NOT NULL DEFAULT false,
  worker_latitude float8 DEFAULT NULL,
  worker_longitude float8 DEFAULT NULL,
  last_location_update timestamptz DEFAULT NULL,
  accepted_at timestamptz DEFAULT NULL,
  rejected_at timestamptz DEFAULT NULL,
  started_journey_at timestamptz DEFAULT NULL,
  arrived_at timestamptz DEFAULT NULL,
  completed_at timestamptz DEFAULT NULL,
  cancelled_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select_own_or_worker_or_admin" ON public.bookings;
CREATE POLICY "bookings_select_own_or_worker_or_admin" ON public.bookings FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR auth.uid() = worker_id OR public.is_admin());

DROP POLICY IF EXISTS "bookings_insert_own" ON public.bookings;
CREATE POLICY "bookings_insert_own" ON public.bookings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookings_update_own_or_worker_or_admin" ON public.bookings;
CREATE POLICY "bookings_update_own_or_worker_or_admin" ON public.bookings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR auth.uid() = worker_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR auth.uid() = worker_id OR public.is_admin());

DROP POLICY IF EXISTS "bookings_delete_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_delete_own_or_admin" ON public.bookings FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT '',
  payment_id text DEFAULT '',
  transaction_id text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select_own_or_worker_or_admin" ON public.payments;
CREATE POLICY "payments_select_own_or_worker_or_admin" ON public.payments FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR auth.uid() = worker_id OR public.is_admin());

DROP POLICY IF EXISTS "payments_insert_own" ON public.payments;
CREATE POLICY "payments_insert_own" ON public.payments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "payments_update_own_or_admin" ON public.payments;
CREATE POLICY "payments_update_own_or_admin" ON public.payments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  gst numeric(10,2) NOT NULL DEFAULT 0,
  platform_fee numeric(10,2) NOT NULL DEFAULT 0,
  grand_total numeric(10,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_select_own_or_worker_or_admin" ON public.invoices;
CREATE POLICY "invoices_select_own_or_worker_or_admin" ON public.invoices FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR auth.uid() = worker_id OR public.is_admin());

DROP POLICY IF EXISTS "invoices_insert_own_or_admin" ON public.invoices;
CREATE POLICY "invoices_insert_own_or_admin" ON public.invoices FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "invoices_update_admin" ON public.invoices;
CREATE POLICY "invoices_update_admin" ON public.invoices FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  images text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;
CREATE POLICY "reviews_select_public" ON public.reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
CREATE POLICY "reviews_insert_own" ON public.reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_delete_own_or_admin" ON public.reviews;
CREATE POLICY "reviews_delete_own_or_admin" ON public.reviews FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
CREATE POLICY "notifications_insert_own" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  latitude float8 NOT NULL,
  longitude float8 NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tracking_select_own_or_admin" ON public.tracking;
CREATE POLICY "tracking_select_own_or_admin" ON public.tracking FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = tracking.booking_id AND (bookings.user_id = auth.uid() OR bookings.worker_id = auth.uid()))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "tracking_insert_own_worker" ON public.tracking;
CREATE POLICY "tracking_insert_own_worker" ON public.tracking FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = worker_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;
CREATE POLICY "messages_select_participants" ON public.messages FOR SELECT
  TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

CREATE TABLE IF NOT EXISTS public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  worker_id uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  subject text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "complaints_select_own_or_admin" ON public.complaints;
CREATE POLICY "complaints_select_own_or_admin" ON public.complaints FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "complaints_insert_own" ON public.complaints;
CREATE POLICY "complaints_insert_own" ON public.complaints FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "complaints_update_admin" ON public.complaints;
CREATE POLICY "complaints_update_admin" ON public.complaints FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL DEFAULT '',
  entity_type text NOT NULL DEFAULT '',
  entity_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "audit_logs_insert_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_admin" ON public.audit_logs FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_worker ON public.bookings(worker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_worker ON public.reviews(worker_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_booking ON public.tracking(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking ON public.messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_complaints_user ON public.complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.audit_logs(admin_id);
