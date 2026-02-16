CREATE TABLE `job_skill_tags` (
	`job_id` integer NOT NULL,
	`tag` text NOT NULL,
	`level` text NOT NULL,
	`confidence` real,
	`evidence` text,
	`extracted_at` text NOT NULL,
	`version` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `skill_aliases` (
	`alias` text PRIMARY KEY NOT NULL,
	`tag` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `jobs` ADD `is_remote_eu` integer;--> statement-breakpoint
ALTER TABLE `jobs` ADD `remote_eu_confidence` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `remote_eu_reason` text;--> statement-breakpoint
ALTER TABLE `jobs` ADD `remote_eu_classified_at` text;