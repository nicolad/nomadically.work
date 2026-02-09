-- Company Facts (MDM/Evidence-based)
CREATE TABLE IF NOT EXISTS company_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  value_json TEXT,
  value_text TEXT,
  normalized_value TEXT,
  confidence REAL NOT NULL,
  
  -- Evidence/Provenance
  source_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  crawl_id TEXT,
  capture_timestamp TEXT,
  observed_at TEXT NOT NULL,
  method TEXT NOT NULL,
  extractor_version TEXT,
  http_status INTEGER,
  mime TEXT,
  content_hash TEXT,
  
  -- WARC pointer
  warc_filename TEXT,
  warc_offset INTEGER,
  warc_length INTEGER,
  warc_digest TEXT,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_company_facts_company_field ON company_facts(company_id, field);

-- Company Snapshots (Crawl storage for debugging/reprocessing)
CREATE TABLE IF NOT EXISTS company_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  source_url TEXT NOT NULL,
  crawl_id TEXT,
  capture_timestamp TEXT,
  fetched_at TEXT NOT NULL,
  
  http_status INTEGER,
  mime TEXT,
  content_hash TEXT,
  
  text_sample TEXT,
  jsonld TEXT,
  extracted TEXT,
  
  -- Evidence
  source_type TEXT NOT NULL,
  method TEXT NOT NULL,
  extractor_version TEXT,
  
  -- WARC pointer
  warc_filename TEXT,
  warc_offset INTEGER,
  warc_length INTEGER,
  warc_digest TEXT,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_company_snapshots_company_hash ON company_snapshots(company_id, content_hash);

-- ATS Boards
CREATE TABLE IF NOT EXISTS ats_boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  url TEXT NOT NULL,
  vendor TEXT NOT NULL,
  board_type TEXT NOT NULL,
  
  confidence REAL NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  
  -- Evidence
  source_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  crawl_id TEXT,
  capture_timestamp TEXT,
  observed_at TEXT NOT NULL,
  method TEXT NOT NULL,
  extractor_version TEXT,
  
  -- WARC pointer
  warc_filename TEXT,
  warc_offset INTEGER,
  warc_length INTEGER,
  warc_digest TEXT,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ats_boards_company_url ON ats_boards(company_id, url);
CREATE INDEX IF NOT EXISTS idx_ats_boards_vendor ON ats_boards(vendor);
