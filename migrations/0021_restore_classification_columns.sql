-- Restore classification-critical columns dropped by 0004_nifty_northstar.sql
-- These columns are written by process-jobs (Phase 1 enhancement) and read by eu-classifier (Phase 3 classification)
ALTER TABLE `jobs` ADD COLUMN `country` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD COLUMN `workplace_type` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD COLUMN `categories` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD COLUMN `ats_created_at` text;
