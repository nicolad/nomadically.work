-- Add additional Greenhouse ATS fields to jobs table

-- Greenhouse-specific enhanced fields
ALTER TABLE jobs ADD COLUMN absolute_url TEXT;
ALTER TABLE jobs ADD COLUMN company_name TEXT;
ALTER TABLE jobs ADD COLUMN first_published TEXT;
ALTER TABLE jobs ADD COLUMN language TEXT;
ALTER TABLE jobs ADD COLUMN metadata TEXT;
ALTER TABLE jobs ADD COLUMN data_compliance TEXT;
