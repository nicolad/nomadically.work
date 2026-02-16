CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`job_id` text NOT NULL,
	`resume_url` text,
	`questions` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ashby_boards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`board_name` text NOT NULL,
	`discovered_at` text DEFAULT (datetime('now')) NOT NULL,
	`last_synced_at` text,
	`job_count` integer DEFAULT 0,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ashby_boards_board_name_unique` ON `ashby_boards` (`board_name`);--> statement-breakpoint
CREATE TABLE `ats_boards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`url` text NOT NULL,
	`vendor` text NOT NULL,
	`board_type` text NOT NULL,
	`confidence` real NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`source_type` text NOT NULL,
	`source_url` text NOT NULL,
	`crawl_id` text,
	`capture_timestamp` text,
	`observed_at` text NOT NULL,
	`method` text NOT NULL,
	`extractor_version` text,
	`warc_filename` text,
	`warc_offset` integer,
	`warc_length` integer,
	`warc_digest` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`logo_url` text,
	`website` text,
	`description` text,
	`industry` text,
	`size` text,
	`location` text,
	`canonical_domain` text,
	`category` text DEFAULT 'UNKNOWN' NOT NULL,
	`tags` text,
	`services` text,
	`service_taxonomy` text,
	`industries` text,
	`score` real DEFAULT 0.5 NOT NULL,
	`score_reasons` text,
	`last_seen_crawl_id` text,
	`last_seen_capture_timestamp` text,
	`last_seen_source_url` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companies_key_unique` ON `companies` (`key`);--> statement-breakpoint
CREATE TABLE `company_facts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`field` text NOT NULL,
	`value_json` text,
	`value_text` text,
	`normalized_value` text,
	`confidence` real NOT NULL,
	`source_type` text NOT NULL,
	`source_url` text NOT NULL,
	`crawl_id` text,
	`capture_timestamp` text,
	`observed_at` text NOT NULL,
	`method` text NOT NULL,
	`extractor_version` text,
	`http_status` integer,
	`mime` text,
	`content_hash` text,
	`warc_filename` text,
	`warc_offset` integer,
	`warc_length` integer,
	`warc_digest` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `company_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`source_url` text NOT NULL,
	`crawl_id` text,
	`capture_timestamp` text,
	`fetched_at` text NOT NULL,
	`http_status` integer,
	`mime` text,
	`content_hash` text,
	`text_sample` text,
	`jsonld` text,
	`extracted` text,
	`source_type` text NOT NULL,
	`method` text NOT NULL,
	`extractor_version` text,
	`warc_filename` text,
	`warc_offset` integer,
	`warc_length` integer,
	`warc_digest` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
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
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` text NOT NULL,
	`source_id` text,
	`source_kind` text NOT NULL,
	`company_id` integer,
	`company_key` text NOT NULL,
	`title` text NOT NULL,
	`location` text,
	`url` text NOT NULL,
	`description` text,
	`posted_at` text NOT NULL,
	`score` real,
	`score_reason` text,
	`status` text,
	`is_remote_eu` integer,
	`remote_eu_confidence` text,
	`remote_eu_reason` text,
	`ats_data` text,
	`absolute_url` text,
	`internal_job_id` integer,
	`requisition_id` text,
	`company_name` text,
	`first_published` text,
	`language` text,
	`metadata` text,
	`departments` text,
	`offices` text,
	`questions` text,
	`location_questions` text,
	`compliance` text,
	`demographic_questions` text,
	`data_compliance` text,
	`categories` text,
	`workplace_type` text,
	`country` text,
	`opening` text,
	`opening_plain` text,
	`description_body` text,
	`description_body_plain` text,
	`additional` text,
	`additional_plain` text,
	`lists` text,
	`ats_created_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `skill_aliases` (
	`alias` text PRIMARY KEY NOT NULL,
	`tag` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`field` text NOT NULL,
	`value_json` text,
	`value_text` text,
	`value_number` real,
	`confidence` real DEFAULT 1 NOT NULL,
	`source` text NOT NULL,
	`context` text,
	`observed_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user_settings`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
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