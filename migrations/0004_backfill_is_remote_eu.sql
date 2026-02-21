-- Backfill is_remote_eu from status for jobs classified before the bug fix
-- (process-jobs worker was setting status but not is_remote_eu)

UPDATE jobs
SET is_remote_eu = 1,
    remote_eu_confidence = 'medium',
    remote_eu_reason = 'Backfilled from status=eu-remote'
WHERE status = 'eu-remote'
  AND is_remote_eu IS NULL;

UPDATE jobs
SET is_remote_eu = 0,
    remote_eu_confidence = 'medium',
    remote_eu_reason = 'Backfilled from status=non-eu'
WHERE status = 'non-eu'
  AND is_remote_eu IS NULL;

-- Add indexes for filtered queries
CREATE INDEX IF NOT EXISTS idx_jobs_is_remote_eu ON jobs (is_remote_eu);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
