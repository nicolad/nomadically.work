-- Migration: Add notes, job_title, company_name columns to applications table.
-- These fields support the improved application kanban pipeline UI:
--   notes       - free-text user notes per application
--   job_title   - denormalized job title for display without extra DB join
--   company_name - denormalized company name for display without extra DB join

ALTER TABLE applications ADD COLUMN notes TEXT;
ALTER TABLE applications ADD COLUMN job_title TEXT;
ALTER TABLE applications ADD COLUMN company_name TEXT;
