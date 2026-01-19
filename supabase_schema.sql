-- ==========================================
-- 0. CLEANUP (Optional - Use if you want a clean slate)
-- ==========================================
-- DROP VIEW IF EXISTS aadhaar_metrics_view;
-- DROP TABLE IF EXISTS enrollments;
-- DROP TABLE IF EXISTS biometric_updates;
-- DROP TABLE IF EXISTS demographic_updates;

-- ==========================================
-- 1. SETUP SEPARATE TABLES (with Age Groups)
-- ==========================================

-- ENROLLMENTS
CREATE TABLE IF NOT EXISTS enrollments (
    pincode TEXT PRIMARY KEY,
    state TEXT,
    district TEXT,
    age_0_5 INT4 DEFAULT 0,
    age_5_18 INT4 DEFAULT 0,
    age_18_plus INT4 DEFAULT 0,
    total INT4 GENERATED ALWAYS AS (age_0_5 + age_5_18 + age_18_plus) STORED,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BIOMETRIC UPDATES
CREATE TABLE IF NOT EXISTS biometric_updates (
    pincode TEXT PRIMARY KEY,
    state TEXT,
    district TEXT,
    count INT4 DEFAULT 0, -- For raw count if no age breakdown
    age_0_5 INT4 DEFAULT 0,
    age_5_18 INT4 DEFAULT 0,
    age_18_plus INT4 DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEMOGRAPHIC UPDATES
CREATE TABLE IF NOT EXISTS demographic_updates (
    pincode TEXT PRIMARY KEY,
    state TEXT,
    district TEXT,
    count INT4 DEFAULT 0, -- For raw count if no age breakdown
    age_0_5 INT4 DEFAULT 0,
    age_5_18 INT4 DEFAULT 0,
    age_18_plus INT4 DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. UNIFIED VIEW (For Dashboard Compatibility)
-- ==========================================
CREATE OR REPLACE VIEW aadhaar_metrics_view AS
SELECT 
    COALESCE(e.pincode, b.pincode, d.pincode) as pincode,
    COALESCE(e.state, b.state, d.state) as state,
    COALESCE(e.district, b.district, d.district) as district,
    
    -- Totals for Map Coloring
    COALESCE(e.total, 0) as total_enrollments,
    COALESCE(b.count, 0) + (COALESCE(b.age_0_5, 0) + COALESCE(b.age_5_18, 0) + COALESCE(b.age_18_plus, 0)) as biometric_updates,
    COALESCE(d.count, 0) + (COALESCE(d.age_0_5, 0) + COALESCE(d.age_5_18, 0) + COALESCE(d.age_18_plus, 0)) as demographic_updates,
    
    -- Enrollment Breakdown
    COALESCE(e.age_0_5, 0) as enrollment_0_5,
    COALESCE(e.age_5_18, 0) as enrollment_5_18,
    COALESCE(e.age_18_plus, 0) as enrollment_18_plus,

    -- Biometric Breakdown
    COALESCE(b.age_0_5, 0) as biometric_0_5,
    COALESCE(b.age_5_18, 0) as biometric_5_18,
    COALESCE(b.age_18_plus, 0) as biometric_18_plus,

    -- Demographic Breakdown
    COALESCE(d.age_0_5, 0) as demographic_0_5,
    COALESCE(d.age_5_18, 0) as demographic_5_18,
    COALESCE(d.age_18_plus, 0) as demographic_18_plus,
    
    -- Timestamp for Analytics
    GREATEST(e.updated_at, b.updated_at, d.updated_at) as updated_at

FROM enrollments e
FULL OUTER JOIN biometric_updates b ON e.pincode = b.pincode
FULL OUTER JOIN demographic_updates d ON e.pincode = d.pincode;


-- ==========================================
-- 3. LEGACY TABLE SUPPORT (Optional)
--    If you prefer using the single 'aadhaar_metrics' table 
--    instead of the view approach, run this part.
-- ==========================================
/*
CREATE TABLE IF NOT EXISTS aadhaar_metrics (
    pincode TEXT PRIMARY KEY,
    state TEXT,
    district TEXT,
    total_enrollments INT4 DEFAULT 0,
    biometric_updates INT4 DEFAULT 0,
    demographic_updates INT4 DEFAULT 0,
    enrollment_0_5 INT4 DEFAULT 0,
    enrollment_5_18 INT4 DEFAULT 0,
    enrollment_18_plus INT4 DEFAULT 0,
    biometric_0_5 INT4 DEFAULT 0,
    biometric_5_18 INT4 DEFAULT 0,
    biometric_18_plus INT4 DEFAULT 0,
    demographic_0_5 INT4 DEFAULT 0,
    demographic_5_18 INT4 DEFAULT 0,
    demographic_18_plus INT4 DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
*/

-- ==========================================
-- 4. ANALYTICS VIEWS (New Feature)
-- ==========================================

-- A. Monthly Trends (Aggregated by updated_at)
-- Note: In a real production system, you'd want a separate 'events' table.
-- Here we imply trends based on when the snapshot was last updated.
CREATE OR REPLACE VIEW analytics_monthly_trends AS
SELECT 
    TO_CHAR(updated_at, 'Mon YY') as month,
    SUM(total_enrollments) as new_enrollments,
    SUM(biometric_updates) as bio_updates,
    SUM(demographic_updates) as demo_updates,
    MIN(updated_at) as sort_date -- helper for sorting
FROM aadhaar_metrics_view
GROUP BY TO_CHAR(updated_at, 'Mon YY')
ORDER BY MIN(updated_at);

-- B. State Stats for Bar Chart
CREATE OR REPLACE VIEW analytics_state_stats AS
SELECT 
    state,
    SUM(total_enrollments) as total_enrollments,
    SUM(biometric_updates + demographic_updates) as total_updates,
    SUM(biometric_updates) as bio_updates_only,
    SUM(demographic_updates) as demo_updates_only
FROM aadhaar_metrics_view
WHERE state IS NOT NULL
GROUP BY state
ORDER BY total_updates DESC
LIMIT 5;

-- C. Age Distribution (Aggregate of Enrollments)
CREATE OR REPLACE VIEW analytics_age_dist AS
SELECT 
    SUM(enrollment_0_5) as age_0_5,
    SUM(enrollment_5_18) as age_5_18,
    SUM(enrollment_18_plus) as age_18_plus
FROM aadhaar_metrics_view;

-- D. District Leaderboard
CREATE OR REPLACE VIEW analytics_district_leaderboard AS
SELECT 
    district,
    state,
    (SUM(total_enrollments) + SUM(biometric_updates) + SUM(demographic_updates)) as total_activity
FROM aadhaar_metrics_view
WHERE district IS NOT NULL
GROUP BY district, state
ORDER BY total_activity DESC
LIMIT 10;
