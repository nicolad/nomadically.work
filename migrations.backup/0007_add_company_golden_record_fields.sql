-- Add golden record fields to companies table
ALTER TABLE companies ADD COLUMN canonical_domain TEXT;
ALTER TABLE companies ADD COLUMN category TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE companies ADD COLUMN tags TEXT;
ALTER TABLE companies ADD COLUMN services TEXT;
ALTER TABLE companies ADD COLUMN service_taxonomy TEXT;
ALTER TABLE companies ADD COLUMN industries TEXT;
ALTER TABLE companies ADD COLUMN score REAL NOT NULL DEFAULT 0.5;
ALTER TABLE companies ADD COLUMN score_reasons TEXT;
ALTER TABLE companies ADD COLUMN last_seen_crawl_id TEXT;
ALTER TABLE companies ADD COLUMN last_seen_capture_timestamp TEXT;
ALTER TABLE companies ADD COLUMN last_seen_source_url TEXT;
