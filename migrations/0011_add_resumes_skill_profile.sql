CREATE TABLE `resumes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`filename` text,
	`raw_text` text NOT NULL,
	`extracted_skills` text DEFAULT '[]' NOT NULL,
	`taxonomy_version` text DEFAULT 'v1' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resumes_user_id_unique` ON `resumes` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_resumes_user_id` ON `resumes` (`user_id`);
