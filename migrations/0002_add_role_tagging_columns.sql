-- Migration: Add role tagging columns for Phase 2 of the process-jobs pipeline.
-- These columns store the result of the three-tier role tagging pipeline
-- (keyword heuristic → Workers AI → DeepSeek) which determines whether
-- a job is a target role (Frontend/React or AI Engineer).
--
-- Run once before deploying the three-phase pipeline.

ALTER TABLE jobs ADD COLUMN role_frontend_react INTEGER;
ALTER TABLE jobs ADD COLUMN role_ai_engineer    INTEGER;
ALTER TABLE jobs ADD COLUMN role_confidence     TEXT;
ALTER TABLE jobs ADD COLUMN role_reason         TEXT;
ALTER TABLE jobs ADD COLUMN role_source         TEXT;
