CREATE TABLE `user_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`email_notifications` integer DEFAULT 1 NOT NULL,
	`daily_digest` integer DEFAULT 0 NOT NULL,
	`new_job_alerts` integer DEFAULT 1 NOT NULL,
	`preferred_locations` text,
	`preferred_skills` text,
	`excluded_companies` text,
	`dark_mode` integer DEFAULT 1 NOT NULL,
	`jobs_per_page` integer DEFAULT 20 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_user_id_unique` ON `user_settings` (`user_id`);