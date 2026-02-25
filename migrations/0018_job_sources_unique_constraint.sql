-- Add unique constraint on (kind, company_key) to prevent duplicate job_sources rows
-- Without this, INSERT OR IGNORE in janitor's syncNewBoards has nothing to ignore on,
-- causing the same board to accumulate duplicates and be ingested multiple times per cron run.
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_sources_kind_company_key
  ON job_sources(kind, company_key);
