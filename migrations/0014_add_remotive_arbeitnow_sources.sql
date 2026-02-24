-- Add Remotive as a job_source for the insert-jobs worker
INSERT OR IGNORE INTO job_sources (kind, company_key, canonical_url, first_seen_at)
VALUES
  ('remotive', 'remotive', 'https://remotive.com/api/remote-jobs', datetime('now'));
