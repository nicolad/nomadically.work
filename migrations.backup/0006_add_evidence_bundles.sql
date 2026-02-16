-- Evidence Bundles: Immutable snapshots of classification/extraction decisions
-- Used for debugging, reprocessing, and audit trails
CREATE TABLE IF NOT EXISTS evidence_bundles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bundle_type TEXT NOT NULL, -- 'job_classification', 'company_extraction', 'skill_extraction'
  entity_type TEXT NOT NULL, -- 'job', 'company', 'company_snapshot'
  entity_id INTEGER NOT NULL, -- references jobs.id, companies.id, or company_snapshots.id
  
  -- Bundle metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  run_id TEXT, -- links to reprocessing_runs if applicable
  version TEXT NOT NULL, -- prompt/extractor version identifier
  model TEXT, -- model used (if LLM-based)
  
  -- Content references (stored in workspace/evidence/)
  bundle_path TEXT NOT NULL UNIQUE, -- relative path in workspace
  content_hash TEXT NOT NULL, -- sha256 of bundle contents
  
  -- Quick access to key outputs (denormalized for search)
  input_summary TEXT, -- abbreviated input (first 500 chars)
  output_summary TEXT, -- key decision/extraction result
  decision_reason TEXT, -- why this classification/extraction happened
  
  -- Langfuse integration
  trace_id TEXT, -- Langfuse trace ID
  trace_url TEXT, -- Direct link to trace
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'superseded', 'invalid'
  superseded_by INTEGER REFERENCES evidence_bundles(id)
);

CREATE INDEX idx_evidence_bundle_entity ON evidence_bundles(entity_type, entity_id);
CREATE INDEX idx_evidence_bundle_run ON evidence_bundles(run_id);
CREATE INDEX idx_evidence_bundle_type ON evidence_bundles(bundle_type);
CREATE INDEX idx_evidence_bundle_status ON evidence_bundles(status);

-- Reprocessing Runs: Track batch operations and their outcomes
CREATE TABLE IF NOT EXISTS reprocessing_runs (
  id TEXT PRIMARY KEY, -- uuid
  run_type TEXT NOT NULL, -- 'job_reclassify', 'company_reextract', 'skill_reextract'
  
  -- Scope
  entity_ids TEXT NOT NULL, -- JSON array of IDs to reprocess
  total_count INTEGER NOT NULL,
  
  -- Configuration
  version TEXT NOT NULL, -- new version identifier
  model TEXT, -- model to use
  config TEXT, -- JSON of additional config
  
  -- Execution
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'running', 'completed', 'failed', 'cancelled'
  started_at TEXT,
  completed_at TEXT,
  
  -- Results
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  
  -- Evidence
  summary_report_path TEXT, -- path to detailed report in workspace
  error_log_path TEXT, -- path to error log
  
  -- Approval
  requested_by TEXT, -- user ID who requested
  approved_by TEXT, -- user ID who approved (if required)
  approved_at TEXT,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_reprocessing_run_status ON reprocessing_runs(status);
CREATE INDEX idx_reprocessing_run_type ON reprocessing_runs(run_type);

-- Run Results: Individual results within a reprocessing run
CREATE TABLE IF NOT EXISTS run_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES reprocessing_runs(id) ON DELETE CASCADE,
  entity_id INTEGER NOT NULL,
  
  -- Execution
  status TEXT NOT NULL, -- 'success', 'failure', 'skipped'
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  
  -- Changes
  old_value TEXT, -- JSON snapshot before
  new_value TEXT, -- JSON snapshot after
  diff_summary TEXT, -- human-readable diff
  
  -- Evidence bundle
  bundle_id INTEGER REFERENCES evidence_bundles(id),
  
  -- Error tracking
  error_message TEXT,
  error_stack TEXT,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_run_result_run ON run_results(run_id);
CREATE INDEX idx_run_result_status ON run_results(status);
CREATE INDEX idx_run_result_entity ON run_results(entity_id);

-- Decision Explanations: Cached explanations for why a decision was made
-- Populated on-demand when user asks "why was this classified as X?"
CREATE TABLE IF NOT EXISTS decision_explanations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  bundle_id INTEGER REFERENCES evidence_bundles(id),
  
  -- Explanation content
  question TEXT NOT NULL, -- what was asked
  explanation TEXT NOT NULL, -- generated explanation
  evidence_excerpts TEXT NOT NULL, -- JSON array of {text, offset, source}
  rule_path TEXT, -- which rules fired
  counterfactual TEXT, -- what would flip the decision
  
  -- Generation metadata
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  model TEXT NOT NULL,
  tokens_used INTEGER,
  
  -- Feedback
  helpful_votes INTEGER DEFAULT 0,
  unhelpful_votes INTEGER DEFAULT 0,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_explanation_entity ON decision_explanations(entity_type, entity_id);
CREATE INDEX idx_explanation_bundle ON decision_explanations(bundle_id);
