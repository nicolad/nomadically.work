CREATE TABLE `study_concept_explanations` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `study_topic_id` integer NOT NULL REFERENCES `study_topics`(`id`) ON DELETE CASCADE,
  `text_hash` text NOT NULL,
  `selected_text` text NOT NULL,
  `explanation_md` text NOT NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX `idx_study_concept_explanations_topic_hash`
  ON `study_concept_explanations` (`study_topic_id`, `text_hash`);
