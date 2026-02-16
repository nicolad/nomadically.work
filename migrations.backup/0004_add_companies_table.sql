-- Create companies table
CREATE TABLE companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  description TEXT,
  industry TEXT,
  size TEXT,
  location TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create index on company key for faster lookups
CREATE INDEX idx_companies_key ON companies(key);

-- Migrate existing company_key data to companies table
INSERT INTO companies (key, name)
SELECT DISTINCT company_key, company_key
FROM jobs
WHERE company_key NOT IN (SELECT key FROM companies);

-- Add company_id column to jobs table
ALTER TABLE jobs ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;

-- Update jobs table to link with companies
UPDATE jobs 
SET company_id = (
  SELECT id FROM companies WHERE companies.key = jobs.company_key
);

-- Create index on company_id for better join performance
CREATE INDEX idx_jobs_company_id ON jobs(company_id);
