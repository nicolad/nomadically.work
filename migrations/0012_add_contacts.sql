CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`linkedin_url` text,
	`email` text,
	`emails` text DEFAULT '[]',
	`company` text,
	`company_id` integer REFERENCES `companies`(`id`) ON DELETE SET NULL,
	`position` text,
	`user_id` text,
	`nb_status` text,
	`nb_result` text,
	`nb_flags` text DEFAULT '[]',
	`nb_suggested_correction` text,
	`nb_retry_token` text,
	`nb_execution_time_ms` integer,
	`email_verified` integer DEFAULT false,
	`github_handle` text,
	`telegram_handle` text,
	`do_not_contact` integer DEFAULT false,
	`tags` text DEFAULT '[]',
	`created_at` text NOT NULL DEFAULT (datetime('now')),
	`updated_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX `idx_contacts_email` ON `contacts` (`email`);
CREATE INDEX `idx_contacts_company_id` ON `contacts` (`company_id`);
CREATE INDEX `idx_contacts_linkedin_url` ON `contacts` (`linkedin_url`);
