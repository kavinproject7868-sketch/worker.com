/*
# Create storage policies and seed categories

1. Storage Policies
- profiles bucket: users can upload/read own profile photos
- workers bucket: workers can upload/read own photos
- gallery bucket: workers can upload/read own gallery
- documents bucket: workers can upload/read own aadhaar/pan (private)
- reviews bucket: users can upload review images
- invoices bucket: users can read invoices

2. Seed Data
- Insert default service categories
*/

-- Storage policies for profiles bucket
DROP POLICY IF EXISTS "profiles_bucket_read" ON storage.objects;
CREATE POLICY "profiles_bucket_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'profiles');

DROP POLICY IF EXISTS "profiles_bucket_upload_own" ON storage.objects;
CREATE POLICY "profiles_bucket_upload_own" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'profiles' AND auth.uid() = owner);

DROP POLICY IF EXISTS "profiles_bucket_update_own" ON storage.objects;
CREATE POLICY "profiles_bucket_update_own" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'profiles' AND auth.uid() = owner) WITH CHECK (bucket_id = 'profiles' AND auth.uid() = owner);

DROP POLICY IF EXISTS "profiles_bucket_delete_own" ON storage.objects;
CREATE POLICY "profiles_bucket_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'profiles' AND auth.uid() = owner);

-- Storage policies for workers bucket
DROP POLICY IF EXISTS "workers_bucket_read" ON storage.objects;
CREATE POLICY "workers_bucket_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'workers');

DROP POLICY IF EXISTS "workers_bucket_upload_own" ON storage.objects;
CREATE POLICY "workers_bucket_upload_own" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'workers' AND auth.uid() = owner);

DROP POLICY IF EXISTS "workers_bucket_update_own" ON storage.objects;
CREATE POLICY "workers_bucket_update_own" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'workers' AND auth.uid() = owner) WITH CHECK (bucket_id = 'workers' AND auth.uid() = owner);

DROP POLICY IF EXISTS "workers_bucket_delete_own" ON storage.objects;
CREATE POLICY "workers_bucket_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'workers' AND auth.uid() = owner);

-- Storage policies for gallery bucket
DROP POLICY IF EXISTS "gallery_bucket_read" ON storage.objects;
CREATE POLICY "gallery_bucket_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'gallery');

DROP POLICY IF EXISTS "gallery_bucket_upload_own" ON storage.objects;
CREATE POLICY "gallery_bucket_upload_own" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'gallery' AND auth.uid() = owner);

DROP POLICY IF EXISTS "gallery_bucket_delete_own" ON storage.objects;
CREATE POLICY "gallery_bucket_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'gallery' AND auth.uid() = owner);

-- Storage policies for documents bucket (private - aadhaar/pan)
DROP POLICY IF EXISTS "documents_bucket_read_own" ON storage.objects;
CREATE POLICY "documents_bucket_read_own" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'documents' AND auth.uid() = owner);

DROP POLICY IF EXISTS "documents_bucket_upload_own" ON storage.objects;
CREATE POLICY "documents_bucket_upload_own" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'documents' AND auth.uid() = owner);

DROP POLICY IF EXISTS "documents_bucket_delete_own" ON storage.objects;
CREATE POLICY "documents_bucket_delete_own" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'documents' AND auth.uid() = owner);

-- Storage policies for reviews bucket
DROP POLICY IF EXISTS "reviews_bucket_read" ON storage.objects;
CREATE POLICY "reviews_bucket_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'reviews');

DROP POLICY IF EXISTS "reviews_bucket_upload_own" ON storage.objects;
CREATE POLICY "reviews_bucket_upload_own" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'reviews' AND auth.uid() = owner);

-- Storage policies for invoices bucket
DROP POLICY IF EXISTS "invoices_bucket_read" ON storage.objects;
CREATE POLICY "invoices_bucket_read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'invoices');

-- Seed categories
INSERT INTO public.categories (name, slug, description, icon, sort_order) VALUES
  ('Plumbing', 'plumbing', 'Pipe fitting, leaks, taps, drainage', 'Wrench', 1),
  ('Electrical', 'electrical', 'Wiring, switches, repairs, installation', 'Zap', 2),
  ('Cleaning', 'cleaning', 'Home cleaning, deep cleaning, sofa cleaning', 'Sparkles', 3),
  ('Carpentry', 'carpentry', 'Furniture repair, woodwork, installation', 'Hammer', 4),
  ('Painting', 'painting', 'Wall painting, waterproofing, texture', 'Paintbrush', 5),
  ('Appliance Repair', 'appliance-repair', 'AC, washing machine, fridge, microwave', 'Plug', 6),
  ('Pest Control', 'pest-control', 'Termite, cockroach, rodent control', 'Bug', 7),
  ('Home Repair', 'home-repair', 'General home maintenance and repairs', 'Home', 8),
  ('Gardening', 'gardening', 'Lawn care, plant maintenance, landscaping', 'Leaf', 9),
  ('Moving & Packing', 'moving-packing', 'Packers, movers, shifting services', 'Package', 10),
  ('Beauty & Spa', 'beauty-spa', 'Salon at home, spa, grooming', 'Scissors', 11),
  ('Tutoring', 'tutoring', 'Home tutors, online classes, coaching', 'GraduationCap', 12)
ON CONFLICT (name) DO NOTHING;
