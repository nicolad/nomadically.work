CREATE TABLE `application_tracks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL REFERENCES `applications`(`id`),
	`track_slug` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);

CREATE UNIQUE INDEX `idx_application_tracks_unique` ON `application_tracks` (`application_id`,`track_slug`);
