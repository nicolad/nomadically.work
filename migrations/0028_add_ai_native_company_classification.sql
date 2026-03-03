-- Migration 0028: Add ai_tier company classification
-- Combines is_ai_native + is_ai_first into a single ordered field.
--
-- ai_tier values:
--   0 = not classified as AI company
--   1 = AI-first (AI central to engineering/operations, confidence 0.5–0.7)
--   2 = AI-native (core product is AI/ML/LLM, confidence >= 0.7)

ALTER TABLE companies ADD COLUMN ai_tier INTEGER NOT NULL DEFAULT 0 CHECK (ai_tier IN (0, 1, 2));
ALTER TABLE companies ADD COLUMN ai_classification_reason TEXT;
ALTER TABLE companies ADD COLUMN ai_classification_confidence REAL DEFAULT 0.5;

CREATE INDEX IF NOT EXISTS idx_companies_ai_tier ON companies(ai_tier);
CREATE INDEX IF NOT EXISTS idx_companies_ai_tier_created ON companies(ai_tier, created_at DESC);

-- Backfill: companies with ai-ml industry tag → AI-native (tier 2)
UPDATE companies
SET ai_tier = 2,
    ai_classification_reason = 'Backfill: ai-ml industry tag detected',
    ai_classification_confidence = 0.8
WHERE industries LIKE '%"ai-ml"%';
