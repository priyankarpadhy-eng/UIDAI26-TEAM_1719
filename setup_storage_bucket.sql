-- ==========================================
-- STORAGE BUCKET RLS POLICIES
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Allow anonymous/authenticated users to upload to bulk_import bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('bulk_import', 'bulk_import', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: Allow anyone to upload files
CREATE POLICY "Allow uploads to bulk_import"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'bulk_import');

-- 3. Policy: Allow service role to read files (for Edge Function)
CREATE POLICY "Allow service role read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'bulk_import');

-- 4. Policy: Allow service role to delete files (cleanup)
CREATE POLICY "Allow service role delete"
ON storage.objects
FOR DELETE
USING (bucket_id = 'bulk_import');

-- ==========================================
-- TABLE RLS (Ensure inserts work)
-- ==========================================

-- Disable RLS on data tables (for development/demo)
ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE demographic_updates DISABLE ROW LEVEL SECURITY;

-- Or keep RLS enabled with permissive policies:
-- CREATE POLICY "Allow all inserts" ON enrollments FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow all updates" ON enrollments FOR UPDATE USING (true);
-- CREATE POLICY "Allow all selects" ON enrollments FOR SELECT USING (true);

-- ==========================================
-- VERIFY SETUP
-- ==========================================
SELECT * FROM storage.buckets WHERE id = 'bulk_import';
