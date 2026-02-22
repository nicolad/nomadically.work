CREATE UNIQUE INDEX IF NOT EXISTS `idx_jobs_source_company_external` ON `jobs` (`source_kind`, `company_key`, `external_id`);
