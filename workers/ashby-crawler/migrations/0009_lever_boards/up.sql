CREATE TABLE IF NOT EXISTS lever_boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site TEXT NOT NULL UNIQUE,
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
CREATE INDEX IF NOT EXISTS idx_lv_boards_site ON lever_boards(site);
