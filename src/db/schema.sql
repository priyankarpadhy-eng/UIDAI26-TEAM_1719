-- Create a table for Aadhaar metrics
CREATE TABLE aadhaar_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pincode text NOT NULL UNIQUE, -- Unique index for UPSERT operations
  district text,
  state text,
  total_enrollments integer DEFAULT 0,
  biometric_updates integer DEFAULT 0,
  demographic_updates integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) if needed, or leave public for dev
-- ALTER TABLE aadhaar_metrics ENABLE ROW LEVEL SECURITY;

-- Optional: Create an index on State/District for faster aggregation queries
CREATE INDEX idx_aadhaar_state ON aadhaar_metrics(state);
CREATE INDEX idx_aadhaar_district ON aadhaar_metrics(district);
