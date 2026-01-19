-- ==========================================
-- OPTIMIZED ANALYTICS VIEWS (No Correlated Subqueries)
-- Run this AFTER the main schema
-- ==========================================

-- ==========================================
-- 1. MONTHLY TRENDS VIEW (for line charts)
-- ==========================================
DROP VIEW IF EXISTS analytics_monthly_trends CASCADE;

CREATE OR REPLACE VIEW analytics_monthly_trends AS
SELECT 
    TO_CHAR(record_date, 'Mon YYYY') as month_label,
    record_date as sort_date,
    SUM(age_0_5 + age_5_18 + age_18_plus) as total_enrollments
FROM enrollments
GROUP BY record_date, TO_CHAR(record_date, 'Mon YYYY')
ORDER BY record_date;

-- ==========================================
-- 2. STATE STATISTICS VIEW (Simplified)
-- ==========================================
DROP VIEW IF EXISTS analytics_state_stats CASCADE;

CREATE OR REPLACE VIEW analytics_state_stats AS
SELECT 
    COALESCE(state, 'Unknown') as state,
    SUM(age_0_5 + age_5_18 + age_18_plus) as total_enrollments,
    SUM(age_0_5) as enrollments_0_5,
    SUM(age_5_18) as enrollments_5_18,
    SUM(age_18_plus) as enrollments_18_plus,
    COUNT(DISTINCT pincode) as unique_pincodes,
    0::BIGINT as total_updates
FROM enrollments
GROUP BY state
HAVING SUM(age_0_5 + age_5_18 + age_18_plus) > 0
ORDER BY total_enrollments DESC;

-- ==========================================
-- 3. DISTRICT LEADERBOARD VIEW (Simplified)
-- ==========================================
DROP VIEW IF EXISTS analytics_district_leaderboard CASCADE;

CREATE OR REPLACE VIEW analytics_district_leaderboard AS
SELECT 
    COALESCE(state, 'Unknown') as state,
    COALESCE(district, 'Unknown') as district,
    SUM(age_0_5 + age_5_18 + age_18_plus) as total_enrollments,
    0::BIGINT as biometric_updates,
    0::BIGINT as demographic_updates,
    SUM(age_0_5 + age_5_18 + age_18_plus) as total_activity,
    COUNT(DISTINCT pincode) as unique_pincodes
FROM enrollments
GROUP BY state, district
HAVING SUM(age_0_5 + age_5_18 + age_18_plus) > 0
ORDER BY total_activity DESC
LIMIT 50;

-- ==========================================
-- 4. AGE DISTRIBUTION VIEW (Simplified)
-- ==========================================
DROP VIEW IF EXISTS analytics_age_dist CASCADE;

CREATE OR REPLACE VIEW analytics_age_dist AS
SELECT 
    'enrollment' as data_type,
    SUM(age_0_5) as age_0_5,
    SUM(age_5_18) as age_5_18,
    SUM(age_18_plus) as age_18_plus,
    SUM(age_0_5 + age_5_18 + age_18_plus) as total
FROM enrollments;

-- ==========================================
-- VERIFY VIEWS 
-- ==========================================
SELECT 'Analytics views created!' as status;
