/*
# Create workers, gallery, and favorites tables

1. New Tables
- `workers` — worker profiles linked to auth.users
  - id (uuid, PK, references auth.users)
  - category_id (uuid, FK to categories)
  - full_name, email, phone, address, latitude/longitude
  - profile_photo_url, aadhaar_url, pan_url
  - skills (text[]), experience_years (int), hourly_rate (numeric)
  - working_hours (text), languages (text[]), bio (text), availability (boolean)
  - status (text: 'pending' | 'approved' | 'rejected' | 'suspended', default 'pending')
  - is_verified (boolean, default false)
  - rating (numeric, default 0), total_ratings (int, default 0), total_jobs (int, default 0)
  - booking_success_rate (numeric, default 0)
  - approved_at, rejected_at, created_at, updated_at
- `gallery` — worker gallery images
  - id, worker_id, image_url, caption, created_at
- `favorites` — users' saved workers
  - id, user_id, worker_id, created_at

2. Security
- RLS on all tables.
- workers: public can SELECT approved only; workers can SELECT/UPDATE own; admin full access.
- gallery: public read; workers manage own.
- favorites: users manage own favorites.
*/

CREATE TABLE IF NOT EXISTS public.workers (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  full_name text NOT NULL DEFAULT '',
  email text UNIQUE,
  phone text DEFAULT '',
  address text DEFAULT '',
  latitude float8 DEFAULT NULL,
  longitude float8 DEFAULT NULL,
  profile_photo_url text DEFAULT '',
  aadhaar_url text DEFAULT '',
  pan_url text DEFAULT '',
  skills text[] DEFAULT '{}',
  experience_years int NOT NULL DEFAULT 0,
  hourly_rate numeric(10,2) NOT NULL DEFAULT 0,
  working_hours text DEFAULT '',
  languages text[] DEFAULT '{}',
  bio text DEFAULT '',
  availability boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  is_verified boolean NOT NULL DEFAULT false,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  total_ratings int NOT NULL DEFAULT 0,
  total_jobs int NOT NULL DEFAULT 0,
  booking_success_rate numeric(5,2) NOT NULL DEFAULT 0,
  approved_at timestamptz DEFAULT NULL,
  rejected_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workers_select_approved_public" ON public.workers;
CREATE POLICY "workers_select_approved_public" ON public.workers FOR SELECT
  TO anon, authenticated USING (status = 'approved');

DROP POLICY IF EXISTS "workers_select_own" ON public.workers;
CREATE POLICY "workers_select_own" ON public.workers FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "workers_select_admin" ON public.workers;
CREATE POLICY "workers_select_admin" ON public.workers FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "workers_insert_own" ON public.workers;
CREATE POLICY "workers_insert_own" ON public.workers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "workers_update_own" ON public.workers;
CREATE POLICY "workers_update_own" ON public.workers FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "workers_update_admin" ON public.workers;
CREATE POLICY "workers_update_admin" ON public.workers FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (true);

DROP POLICY IF EXISTS "workers_delete_admin" ON public.workers;
CREATE POLICY "workers_delete_admin" ON public.workers FOR DELETE
  TO authenticated USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gallery_select_public" ON public.gallery;
CREATE POLICY "gallery_select_public" ON public.gallery FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "gallery_insert_own_worker" ON public.gallery;
CREATE POLICY "gallery_insert_own_worker" ON public.gallery FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = worker_id);

DROP POLICY IF EXISTS "gallery_update_own_worker" ON public.gallery;
CREATE POLICY "gallery_update_own_worker" ON public.gallery FOR UPDATE
  TO authenticated USING (auth.uid() = worker_id) WITH CHECK (auth.uid() = worker_id);

DROP POLICY IF EXISTS "gallery_delete_own_worker" ON public.gallery;
CREATE POLICY "gallery_delete_own_worker" ON public.gallery FOR DELETE
  TO authenticated USING (auth.uid() = worker_id);

CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, worker_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
CREATE POLICY "favorites_select_own" ON public.favorites FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
CREATE POLICY "favorites_insert_own" ON public.favorites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
CREATE POLICY "favorites_delete_own" ON public.favorites FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workers_status ON public.workers(status);
CREATE INDEX IF NOT EXISTS idx_workers_category ON public.workers(category_id);
CREATE INDEX IF NOT EXISTS idx_gallery_worker ON public.gallery(worker_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
