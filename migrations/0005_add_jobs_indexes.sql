CREATE INDEX IF NOT EXISTS `idx_jobs_posted_at_created_at` ON `jobs` (`posted_at`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_jobs_is_remote_eu` ON `jobs` (`is_remote_eu`);
