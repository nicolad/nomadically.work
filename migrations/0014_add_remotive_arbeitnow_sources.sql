-- Add Remotive and Arbeitnow as job_sources for the insert-jobs worker
INSERT OR IGNORE INTO job_sources (kind, company_key, canonical_url, first_seen_at)
VALUES
  ('remotive',  'remotive',  'https://remotive.com/api/remote-jobs',       datetime('now')),
  ('arbeitnow', 'arbeitnow', 'https://www.arbeitnow.com/api/job-board-api', datetime('now'));
