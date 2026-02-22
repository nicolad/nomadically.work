-- Greenhouse job boards discovered via Common Crawl
CREATE TABLE IF NOT EXISTS greenhouse_boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    first_seen TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT NOT NULL DEFAULT (datetime('now')),
    crawl_id TEXT,
    last_synced_at TEXT,
    job_count INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gh_boards_token ON greenhouse_boards(token);

-- Tag companies by ATS provider for per-provider slug queries
ALTER TABLE companies ADD COLUMN ats_provider TEXT DEFAULT 'ashby';
