-- Create user_preferences table for evidence-based personalization
CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  
  -- Preference field (e.g., "preferred_countries", "excluded_company_types", "min_salary")
  field TEXT NOT NULL,
  
  -- Value storage (use appropriate field based on type)
  value_json TEXT,      -- JSON for arrays/objects
  value_text TEXT,      -- Plain text value
  value_number REAL,    -- Numeric value
  
  -- Evidence/confidence tracking
  confidence REAL NOT NULL DEFAULT 1.0,  -- 0..1
  source TEXT NOT NULL,  -- EXPLICIT_SETTING, INFERRED_ACTION, FEEDBACK, IMPLICIT
  
  -- Context for inference
  context TEXT,  -- JSON with additional context
  observed_at TEXT NOT NULL,
  
  -- Tracking
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  -- Foreign key constraint
  FOREIGN KEY (user_id) REFERENCES user_settings(user_id) ON DELETE CASCADE
);

-- Create index for efficient lookups
CREATE INDEX idx_user_preferences_user_field ON user_preferences(user_id, field);

-- Create index for source-based queries
CREATE INDEX idx_user_preferences_source ON user_preferences(source);

-- Create index for time-based queries
CREATE INDEX idx_user_preferences_observed_at ON user_preferences(observed_at);
