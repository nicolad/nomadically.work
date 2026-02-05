CREATE TABLE IF NOT EXISTS `ashby_boards` (
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
CREATE UNIQUE INDEX IF NOT EXISTS `ashby_boards_board_name_unique` ON `ashby_boards` (`board_name`);
