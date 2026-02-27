CREATE TABLE `opportunities` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `url` text,
  `source` text,
  `status` text NOT NULL DEFAULT 'open',
  `reward_usd` real,
  `reward_text` text,
  `start_date` text,
  `end_date` text,
  `deadline` text,
  `first_seen` text,
  `last_seen` text,
  `score` integer,
  `raw_context` text,
  `metadata` text,
  `applied` integer NOT NULL DEFAULT false,
  `applied_at` text,
  `application_status` text,
  `application_notes` text,
  `tags` text,
  `company_id` integer REFERENCES `companies`(`id`),
  `contact_id` integer REFERENCES `contacts`(`id`),
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX `idx_opportunities_status` ON `opportunities` (`status`);
CREATE INDEX `idx_opportunities_company_id` ON `opportunities` (`company_id`);
CREATE INDEX `idx_opportunities_contact_id` ON `opportunities` (`contact_id`);
