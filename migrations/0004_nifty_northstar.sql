CREATE INDEX `idx_jobs_company_key` ON `jobs` (`company_key`);--> statement-breakpoint
CREATE INDEX `idx_jobs_source_kind` ON `jobs` (`source_kind`);--> statement-breakpoint
CREATE INDEX `idx_jobs_remote_eu_posted` ON `jobs` (`is_remote_eu`,`posted_at`,`created_at`);--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `categories`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `workplace_type`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `country`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `opening`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `opening_plain`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `description_body`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `description_body_plain`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `additional`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `additional_plain`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `lists`;--> statement-breakpoint
ALTER TABLE `jobs` DROP COLUMN `ats_created_at`;--> statement-breakpoint
DROP TABLE IF EXISTS `lever_boards`;