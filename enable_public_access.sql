-- ==========================================
-- ENABLE PUBLIC ACCESS VIA RLS POLICIES
-- ==========================================
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. DISABLE RLS (if you want completely public access - NOT recommended for production)
-- OR keep RLS enabled and add policies (recommended approach below)

-- Option A: Disable RLS completely (quick fix, less secure)
ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE demographic_updates DISABLE ROW LEVEL SECURITY;

-- Option B: Keep RLS but add public policies (more secure, run these instead of Option A)
-- First enable RLS if not already
-- ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE biometric_updates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE demographic_updates ENABLE ROW LEVEL SECURITY;

-- Then add policies allowing anonymous access

-- For enrollments table
-- DROP POLICY IF EXISTS "Allow anonymous read" ON enrollments;
-- DROP POLICY IF EXISTS "Allow anonymous insert" ON enrollments;
-- DROP POLICY IF EXISTS "Allow anonymous update" ON enrollments;

-- CREATE POLICY "Allow anonymous read" ON enrollments FOR SELECT USING (true);
-- CREATE POLICY "Allow anonymous insert" ON enrollments FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow anonymous update" ON enrollments FOR UPDATE USING (true) WITH CHECK (true);

-- For biometric_updates table
-- DROP POLICY IF EXISTS "Allow anonymous read" ON biometric_updates;
-- DROP POLICY IF EXISTS "Allow anonymous insert" ON biometric_updates;
-- DROP POLICY IF EXISTS "Allow anonymous update" ON biometric_updates;

-- CREATE POLICY "Allow anonymous read" ON biometric_updates FOR SELECT USING (true);
-- CREATE POLICY "Allow anonymous insert" ON biometric_updates FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow anonymous update" ON biometric_updates FOR UPDATE USING (true) WITH CHECK (true);

-- For demographic_updates table
-- DROP POLICY IF EXISTS "Allow anonymous read" ON demographic_updates;
-- DROP POLICY IF EXISTS "Allow anonymous insert" ON demographic_updates;
-- DROP POLICY IF EXISTS "Allow anonymous update" ON demographic_updates;

-- CREATE POLICY "Allow anonymous read" ON demographic_updates FOR SELECT USING (true);
-- CREATE POLICY "Allow anonymous insert" ON demographic_updates FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow anonymous update" ON demographic_updates FOR UPDATE USING (true) WITH CHECK (true);

-- ==========================================
SELECT * FROM enrollments LIMIT 1;
