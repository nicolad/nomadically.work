-- Auto-enrichment columns populated after each crawl batch
ALTER TABLE ashby_boards ADD COLUMN company_name   TEXT;
ALTER TABLE ashby_boards ADD COLUMN industry_tags  TEXT; -- JSON array of strings
ALTER TABLE ashby_boards ADD COLUMN tech_signals   TEXT; -- JSON array of strings
ALTER TABLE ashby_boards ADD COLUMN enriched_at    TEXT;

CREATE INDEX IF NOT EXISTS idx_boards_company   ON ashby_boards(company_name);
CREATE INDEX IF NOT EXISTS idx_boards_industry  ON ashby_boards(industry_tags);
