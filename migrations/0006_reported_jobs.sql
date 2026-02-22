ALTER TABLE `jobs` ADD `report_reason` text;
--> statement-breakpoint
ALTER TABLE `jobs` ADD `report_confidence` real;
--> statement-breakpoint
ALTER TABLE `jobs` ADD `report_reasoning` text;
--> statement-breakpoint
ALTER TABLE `jobs` ADD `report_tags` text;
--> statement-breakpoint
ALTER TABLE `jobs` ADD `report_action` text;
--> statement-breakpoint
ALTER TABLE `jobs` ADD `report_trace_id` text;
--> statement-breakpoint
ALTER TABLE `jobs` ADD `report_reviewed_at` text;
--> statement-breakpoint
CREATE TABLE `job_report_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL REFERENCES jobs(id),
	`event_type` text NOT NULL,
	`actor` text,
	`payload` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_report_events_job` ON `job_report_events` (`job_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_jobs_status` ON `jobs` (`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_jobs_action` ON `jobs` (`report_action`);
--> statement-breakpoint
CREATE VIEW IF NOT EXISTS v_reported_review_queue AS
SELECT
  j.id, j.title, j.company_key AS company, j.url, j.status,
  j.report_reason, j.report_confidence, j.report_reasoning,
  j.report_tags, j.report_action, j.report_trace_id,
  j.report_reviewed_at, j.updated_at
FROM jobs j
WHERE j.status = 'reported'
  AND (j.report_action IN ('pending','escalated') OR j.report_action IS NULL)
ORDER BY
  CASE j.report_action WHEN 'escalated' THEN 0 ELSE 1 END,
  j.updated_at DESC;
