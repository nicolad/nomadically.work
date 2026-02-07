-- Add Remote EU classification fields to jobs table
ALTER TABLE jobs ADD COLUMN is_remote_eu INTEGER;
ALTER TABLE jobs ADD COLUMN remote_eu_confidence TEXT CHECK(remote_eu_confidence IN ('high','medium','low'));
ALTER TABLE jobs ADD COLUMN remote_eu_reason TEXT;
