CREATE TABLE `deep_planner_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_type` text NOT NULL,
	`problem_description` text NOT NULL,
	`context` text,
	`status` text NOT NULL DEFAULT 'pending',
	`current_step` text,
	`checkpoint_count` integer NOT NULL DEFAULT 0,
	`output_artifact` text,
	`error_message` text,
	`started_at` text,
	`completed_at` text,
	`created_at` text NOT NULL DEFAULT (datetime('now')),
	`updated_at` text NOT NULL DEFAULT (datetime('now'))
);
