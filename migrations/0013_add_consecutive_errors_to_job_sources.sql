CREATE TABLE IF NOT EXISTS job_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  company_key TEXT NOT NULL,
  canonical_url TEXT,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_fetched_at TEXT,
  last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  consecutive_errors INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_job_sources_kind ON job_sources(kind);
CREATE INDEX IF NOT EXISTS idx_job_sources_company_key ON job_sources(company_key);
