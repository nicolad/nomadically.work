-- Report columns on jobs table
ALTER TABLE jobs ADD COLUMN report_reason      TEXT;
ALTER TABLE jobs ADD COLUMN report_confidence  REAL;
ALTER TABLE jobs ADD COLUMN report_reasoning   TEXT;
ALTER TABLE jobs ADD COLUMN report_tags        TEXT;
ALTER TABLE jobs ADD COLUMN report_action      TEXT;  -- pending|auto_restored|escalated|confirmed
ALTER TABLE jobs ADD COLUMN report_trace_id    TEXT;  -- Langfuse trace ID for score updates
ALTER TABLE jobs ADD COLUMN report_reviewed_at TEXT;

-- Audit event log
CREATE TABLE IF NOT EXISTS job_report_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id     INTEGER NOT NULL REFERENCES jobs(id),
  event_type TEXT    NOT NULL,  -- reported|llm_analyzed|auto_restored|escalated|confirmed|restored
  actor      TEXT,              -- "system:llm" | "admin:<userId>"
  payload    TEXT,              -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_report_events_job ON job_report_events(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status        ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_action        ON jobs(report_action);

-- Admin review queue view
CREATE VIEW IF NOT EXISTS v_reported_review_queue AS
SELECT
  j.id, j.title, j.company_key AS company, j.url, j.status,
  j.report_reason, j.report_confidence, j.report_reasoning,
  j.report_tags, j.report_action, j.report_trace_id,
  j.report_reviewed_at, j.updated_at
FROM jobs j
WHERE j.status = 'reported'
  AND (j.report_action IN ('pending','escalated') OR j.report_action IS NULL)
ORDER BY
  CASE j.report_action WHEN 'escalated' THEN 0 ELSE 1 END,
  j.updated_at DESC;
