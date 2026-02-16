-- Add ATS enhanced data fields to jobs table

-- Full ATS data
ALTER TABLE jobs ADD COLUMN ats_data TEXT;

-- ATS-specific fields (primarily for Greenhouse, but generic enough for other ATS)
ALTER TABLE jobs ADD COLUMN internal_job_id INTEGER;
ALTER TABLE jobs ADD COLUMN requisition_id TEXT;
ALTER TABLE jobs ADD COLUMN departments TEXT;
ALTER TABLE jobs ADD COLUMN offices TEXT;
ALTER TABLE jobs ADD COLUMN questions TEXT;
ALTER TABLE jobs ADD COLUMN location_questions TEXT;
ALTER TABLE jobs ADD COLUMN compliance TEXT;
ALTER TABLE jobs ADD COLUMN demographic_questions TEXT;

-- Create indexes for lookups
CREATE INDEX IF NOT EXISTS idx_jobs_internal_job_id ON jobs(internal_job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_requisition_id ON jobs(requisition_id);
