CREATE INDEX `idx_jobs_company_key` ON `jobs` (`company_key`);--> statement-breakpoint
CREATE INDEX `idx_jobs_source_kind` ON `jobs` (`source_kind`);--> statement-breakpoint
CREATE INDEX `idx_jobs_country` ON `jobs` (`country`);--> statement-breakpoint
CREATE INDEX `idx_jobs_remote_eu_posted` ON `jobs` (`is_remote_eu`,`posted_at`,`created_at`);