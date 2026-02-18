-- Ashby job boards discovered via Common Crawl
CREATE TABLE IF NOT EXISTS ashby_boards (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT    NOT NULL UNIQUE,
    url         TEXT    NOT NULL,
    first_seen  TEXT    NOT NULL,
    last_seen   TEXT    NOT NULL,
    crawl_id    TEXT    NOT NULL,
    http_status TEXT,
    mime_type   TEXT,
    warc_file   TEXT,
    warc_offset INTEGER,
    warc_length INTEGER,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_boards_slug      ON ashby_boards(slug);
CREATE INDEX IF NOT EXISTS idx_boards_crawl     ON ashby_boards(crawl_id);
CREATE INDEX IF NOT EXISTS idx_boards_last_seen ON ashby_boards(last_seen);

-- Tracks crawl pagination progress so we can resume across invocations
CREATE TABLE IF NOT EXISTS crawl_progress (
    crawl_id     TEXT PRIMARY KEY,
    total_pages  INTEGER NOT NULL DEFAULT 0,
    current_page INTEGER NOT NULL DEFAULT 0,
    status       TEXT    NOT NULL DEFAULT 'pending',
    boards_found INTEGER NOT NULL DEFAULT 0,
    started_at   TEXT,
    finished_at  TEXT,
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Rig-inspired: persisted embeddings for vector search ──
CREATE TABLE IF NOT EXISTS board_embeddings (
    slug       TEXT PRIMARY KEY,
    embedding  TEXT NOT NULL,         -- JSON array of f64
    tokens     TEXT NOT NULL,         -- JSON array of token strings (for debug)
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
