-- Add RemoteOK, Himalayas, and Jobicy as singleton job sources
INSERT OR IGNORE INTO job_sources (kind, company_key, canonical_url, first_seen_at)
VALUES
  ('remoteok',  'remoteok',  'https://remoteok.com/api',                                           datetime('now')),
  ('himalayas', 'himalayas', 'https://himalayas.app/jobs/api',                                     datetime('now')),
  ('jobicy',    'jobicy',    'https://jobicy.com/api/v2/remote-jobs?count=50&geo=worldwide&industry=tech', datetime('now'));
