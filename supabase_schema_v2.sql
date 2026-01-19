-- ==========================================
-- NEW SCHEMA: Date-Based Individual Records
-- Composite Primary Key: (pincode, record_date)
-- ==========================================

-- Drop old tables (CAREFUL: This deletes all data!)
DROP VIEW IF EXISTS aadhaar_metrics_view CASCADE;
DROP VIEW IF EXISTS analytics_monthly_trends CASCADE;
DROP VIEW IF EXISTS analytics_state_stats CASCADE;
DROP VIEW IF EXISTS analytics_age_dist CASCADE;
DROP VIEW IF EXISTS analytics_district_leaderboard CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS biometric_updates CASCADE;
DROP TABLE IF EXISTS demographic_updates CASCADE;

-- ==========================================
-- 1. ENROLLMENTS TABLE (with date)
-- ==========================================
CREATE TABLE enrollments (
    pincode TEXT NOT NULL,
    record_date DATE NOT NULL,
    state TEXT,
    district TEXT,
    age_0_5 INT4 DEFAULT 0,
    age_5_18 INT4 DEFAULT 0,
    age_18_plus INT4 DEFAULT 0,
    total INT4 GENERATED ALWAYS AS (age_0_5 + age_5_18 + age_18_plus) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (pincode, record_date)
);

-- ==========================================
-- 2. BIOMETRIC UPDATES TABLE (with date)
-- ==========================================
CREATE TABLE biometric_updates (
    pincode TEXT NOT NULL,
    record_date DATE NOT NULL,
    state TEXT,
    district TEXT,
    age_0_5 INT4 DEFAULT 0,
    age_5_18 INT4 DEFAULT 0,
    age_18_plus INT4 DEFAULT 0,
    total INT4 GENERATED ALWAYS AS (age_0_5 + age_5_18 + age_18_plus) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (pincode, record_date)
);

-- ==========================================
-- 3. DEMOGRAPHIC UPDATES TABLE (with date)
-- ==========================================
CREATE TABLE demographic_updates (
    pincode TEXT NOT NULL,
    record_date DATE NOT NULL,
    state TEXT,
    district TEXT,
    age_0_5 INT4 DEFAULT 0,
    age_5_18 INT4 DEFAULT 0,
    age_18_plus INT4 DEFAULT 0,
    total INT4 GENERATED ALWAYS AS (age_0_5 + age_5_18 + age_18_plus) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (pincode, record_date)
);

-- ==========================================
-- 4. INDEXES for fast date filtering
-- ==========================================
CREATE INDEX idx_enrollments_date ON enrollments(record_date DESC);
CREATE INDEX idx_enrollments_pincode ON enrollments(pincode);
CREATE INDEX idx_enrollments_state ON enrollments(state);

CREATE INDEX idx_biometric_date ON biometric_updates(record_date DESC);
CREATE INDEX idx_biometric_pincode ON biometric_updates(pincode);

CREATE INDEX idx_demographic_date ON demographic_updates(record_date DESC);
CREATE INDEX idx_demographic_pincode ON demographic_updates(pincode);

-- ==========================================
-- 5. UNIFIED VIEW (Aggregated for Dashboard Overview)
-- ==========================================
CREATE OR REPLACE VIEW aadhaar_metrics_view AS
SELECT 
    COALESCE(e.pincode, b.pincode, d.pincode) as pincode,
    COALESCE(e.state, b.state, d.state) as state,
    COALESCE(e.district, b.district, d.district) as district,
    
    -- Aggregated totals (sum of all dates)
    COALESCE(e.total_enrollments, 0) as total_enrollments,
    COALESCE(b.biometric_updates, 0) as biometric_updates,
    COALESCE(d.demographic_updates, 0) as demographic_updates,
    
    -- Enrollment Breakdown (aggregated)
    COALESCE(e.enrollment_0_5, 0) as enrollment_0_5,
    COALESCE(e.enrollment_5_18, 0) as enrollment_5_18,
    COALESCE(e.enrollment_18_plus, 0) as enrollment_18_plus,

    -- Biometric Breakdown (aggregated)
    COALESCE(b.biometric_0_5, 0) as biometric_0_5,
    COALESCE(b.biometric_5_18, 0) as biometric_5_18,
    COALESCE(b.biometric_18_plus, 0) as biometric_18_plus,

    -- Demographic Breakdown (aggregated)
    COALESCE(d.demographic_0_5, 0) as demographic_0_5,
    COALESCE(d.demographic_5_18, 0) as demographic_5_18,
    COALESCE(d.demographic_18_plus, 0) as demographic_18_plus,
    
    -- Latest date for reference
    GREATEST(e.latest_date, b.latest_date, d.latest_date) as latest_date
FROM 
    (SELECT pincode, state, district,
            SUM(total) as total_enrollments,
            SUM(age_0_5) as enrollment_0_5,
            SUM(age_5_18) as enrollment_5_18,
            SUM(age_18_plus) as enrollment_18_plus,
            MAX(record_date) as latest_date
     FROM enrollments GROUP BY pincode, state, district) e
FULL OUTER JOIN 
    (SELECT pincode, state, district,
            SUM(total) as biometric_updates,
            SUM(age_0_5) as biometric_0_5,
            SUM(age_5_18) as biometric_5_18,
            SUM(age_18_plus) as biometric_18_plus,
            MAX(record_date) as latest_date
     FROM biometric_updates GROUP BY pincode, state, district) b 
ON e.pincode = b.pincode
FULL OUTER JOIN 
    (SELECT pincode, state, district,
            SUM(total) as demographic_updates,
            SUM(age_0_5) as demographic_0_5,
            SUM(age_5_18) as demographic_5_18,
            SUM(age_18_plus) as demographic_18_plus,
            MAX(record_date) as latest_date
     FROM demographic_updates GROUP BY pincode, state, district) d 
ON COALESCE(e.pincode, b.pincode) = d.pincode;

-- ==========================================
-- 6. TIME-BASED ANALYTICS FUNCTION
-- ==========================================
-- Function to get metrics for a specific time period
CREATE OR REPLACE FUNCTION get_metrics_by_period(
    period_type TEXT DEFAULT 'all', -- 'day', 'week', 'month', '3months', '6months', 'year', 'all'
    target_pincode TEXT DEFAULT NULL
) 
RETURNS TABLE (
    pincode TEXT,
    state TEXT,
    district TEXT,
    total_enrollments BIGINT,
    total_biometric BIGINT,
    total_demographic BIGINT,
    enrollment_0_5 BIGINT,
    enrollment_5_18 BIGINT,
    enrollment_18_plus BIGINT
) AS $$
DECLARE
    start_date DATE;
BEGIN
    -- Calculate start date based on period
    CASE period_type
        WHEN 'day' THEN start_date := CURRENT_DATE - INTERVAL '1 day';
        WHEN 'week' THEN start_date := CURRENT_DATE - INTERVAL '7 days';
        WHEN 'month' THEN start_date := CURRENT_DATE - INTERVAL '1 month';
        WHEN '3months' THEN start_date := CURRENT_DATE - INTERVAL '3 months';
        WHEN '6months' THEN start_date := CURRENT_DATE - INTERVAL '6 months';
        WHEN 'year' THEN start_date := CURRENT_DATE - INTERVAL '1 year';
        ELSE start_date := '1900-01-01'::DATE; -- All time
    END CASE;

    RETURN QUERY
    SELECT 
        e.pincode,
        e.state,
        e.district,
        COALESCE(SUM(e.total), 0)::BIGINT as total_enrollments,
        COALESCE(SUM(b.total), 0)::BIGINT as total_biometric,
        COALESCE(SUM(d.total), 0)::BIGINT as total_demographic,
        COALESCE(SUM(e.age_0_5), 0)::BIGINT as enrollment_0_5,
        COALESCE(SUM(e.age_5_18), 0)::BIGINT as enrollment_5_18,
        COALESCE(SUM(e.age_18_plus), 0)::BIGINT as enrollment_18_plus
    FROM enrollments e
    LEFT JOIN biometric_updates b ON e.pincode = b.pincode AND e.record_date = b.record_date
    LEFT JOIN demographic_updates d ON e.pincode = d.pincode AND e.record_date = d.record_date
    WHERE e.record_date >= start_date
      AND (target_pincode IS NULL OR e.pincode = target_pincode)
    GROUP BY e.pincode, e.state, e.district;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 7. DAILY TRENDS VIEW (for line charts)
-- ==========================================
CREATE OR REPLACE VIEW daily_trends AS
SELECT 
    record_date,
    SUM(total) as enrollments,
    0::BIGINT as biometric_updates, -- Placeholder
    0::BIGINT as demographic_updates -- Placeholder
FROM enrollments
GROUP BY record_date
ORDER BY record_date;

-- ==========================================
-- 8. DISABLE RLS FOR DEVELOPMENT
-- ==========================================
ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE demographic_updates DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- VERIFY SCHEMA
-- ==========================================
SELECT 'Schema created successfully!' as status;
