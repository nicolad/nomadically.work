CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`job_id` text NOT NULL,
	`resume_url` text,
	`questions` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
