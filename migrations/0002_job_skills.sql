-- Job skill tags table: stores canonical skill tags extracted from each job
CREATE TABLE IF NOT EXISTS job_skill_tags (
  job_id       INTEGER NOT NULL,
  tag          TEXT NOT NULL,
  level        TEXT NOT NULL CHECK(level IN ('required','preferred','nice')),
  confidence   REAL,
  evidence     TEXT,
  extracted_at TEXT NOT NULL,
  version      TEXT NOT NULL,
  PRIMARY KEY (job_id, tag),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Index for fast filtering: find all jobs with a specific skill tag
CREATE INDEX IF NOT EXISTS idx_job_skill_tags_tag_job
  ON job_skill_tags(tag, job_id);

-- Index for job lookups
CREATE INDEX IF NOT EXISTS idx_job_skill_tags_job_id
  ON job_skill_tags(job_id);

-- Skill aliases table: maps raw skill mentions to canonical tags
-- Used for query-time normalization (user search → canonical tags)
CREATE TABLE IF NOT EXISTS skill_aliases (
  alias TEXT PRIMARY KEY,  -- normalized lowercase alias (e.g., "reactjs")
  tag   TEXT NOT NULL      -- canonical tag (e.g., "react")
);

-- Index for reverse lookups (though PRIMARY KEY already provides this)
CREATE INDEX IF NOT EXISTS idx_skill_aliases_tag
  ON skill_aliases(tag);
