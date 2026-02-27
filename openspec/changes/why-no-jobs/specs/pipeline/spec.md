# Pipeline Specification

## Purpose

Defines the required behavior of the three-phase job processing pipeline that ingests, enhances, tags, and classifies jobs as remote-EU eligible. Covers the status progression, signal extraction, and classification output that ultimately determines whether a job appears on the homepage.

---

## Requirements

### Requirement: Phase 1 Enhancement MUST Populate Classification Columns

The `process-jobs` worker Phase 1 (enhancement) MUST write `country`, `workplace_type`, `categories`, and `ats_created_at` values extracted from ATS API responses into the corresponding `jobs` table columns. The worker MUST advance the job status from `new` to `enhanced` upon successful enhancement.

#### Scenario: Greenhouse job enhancement populates all four columns

- GIVEN a job with `status = 'new'` and `source_kind = 'greenhouse'`
- WHEN Phase 1 enhancement runs on the job
- THEN the `country` column MUST be set to the value from `data.country` (if present)
- AND `workplace_type` MUST be set to the value from `data.workplaceType` (if present)
- AND `categories` MUST be set to the JSON-encoded value from `data.categories` (if present)
- AND `ats_created_at` MUST be set to an ISO 8601 datetime derived from `data.updated_at` or `data.created_at`
- AND `status` MUST be advanced to `enhanced`

#### Scenario: Ashby job enhancement populates remote and country columns

- GIVEN a job with `status = 'new'` and `source_kind = 'ashby'`
- WHEN Phase 1 enhancement runs on the job
- THEN `workplace_type` MUST be set to `"remote"` if `data.isRemote` is truthy
- AND `country` MUST be set from `postalAddress.addressCountry` (if present)
- AND `ats_created_at` MUST be set from `data.publishedAt`
- AND `status` MUST be advanced to `enhanced`

#### Scenario: Enhancement failure does not advance status

- GIVEN a job with `status = 'new'`
- WHEN Phase 1 enhancement fails (ATS API error, network timeout)
- THEN `status` MUST remain `new`
- AND the four classification columns SHALL NOT be modified

---

### Requirement: Phase 2 Role Tagging MUST Advance Status to role-match

The `process-jobs` worker Phase 2 MUST evaluate enhanced jobs for role relevance and advance qualifying jobs from `enhanced` to `role-match`. Jobs that do not match any target role SHOULD be advanced to a terminal status (e.g., `non-match`) so they do not block the pipeline.

#### Scenario: AI engineering role match advances to role-match

- GIVEN a job with `status = 'enhanced'` and a title containing "AI Engineer"
- WHEN Phase 2 role tagging runs
- THEN `status` MUST be advanced to `role-match`

#### Scenario: Non-matching role advances to non-match

- GIVEN a job with `status = 'enhanced'` and a title containing "Office Manager"
- WHEN Phase 2 role tagging runs
- THEN `status` SHOULD be advanced to `non-match` or equivalent terminal status
- AND the job SHALL NOT remain stuck at `enhanced` indefinitely

---

### Requirement: Phase 3 Classification MUST Read Classification Columns for Signal Extraction

The `eu-classifier` worker MUST read `country`, `workplace_type`, `ashby_is_remote`, `ashby_address`, and `location` from the `jobs` table to produce EU signals. The `extract_eu_signals()` function MUST use these values to determine `ats_remote`, `country_code`, and `eu_country_code` signals.

#### Scenario: EU country with remote flag classifies as remote-EU

- GIVEN a job with `status = 'role-match'`, `country = 'DE'`, and `workplace_type = 'remote'`
- WHEN Phase 3 classification runs
- THEN `is_remote_eu` MUST be set to `1` (true)
- AND `remote_eu_confidence` MUST be set to `'high'`
- AND `status` MUST be advanced to `eu-remote`

#### Scenario: Non-EU country with remote flag does not auto-classify

- GIVEN a job with `status = 'role-match'`, `country = 'US'`, and `workplace_type = 'remote'`
- WHEN Phase 3 classification runs with heuristic-only evaluation
- THEN the heuristic MUST escalate to LLM classification (not auto-accept)

#### Scenario: Missing country and workplace_type degrades classification

- GIVEN a job with `status = 'role-match'`, `country = NULL`, and `workplace_type = NULL`
- WHEN Phase 3 classification runs
- THEN `extract_eu_signals()` MUST return `ats_remote = False` and `country_code = None`
- AND the classifier MUST still attempt classification using description-based signals and LLM tiers

#### Scenario: Worldwide remote with no country classifies as remote-EU with medium confidence

- GIVEN a job with `status = 'role-match'`, `ashby_is_remote = 1`, `country = ''`, and no US-implicit signals in description
- WHEN Phase 3 classification runs
- THEN `is_remote_eu` MUST be set to `1` (true)
- AND `remote_eu_confidence` MUST be set to `'medium'`

---

### Requirement: Pipeline Status Progression MUST Be Monotonic

Jobs MUST progress through statuses in order: `new` -> `enhanced` -> `role-match` -> `eu-remote` or `non-eu`. A job's status SHALL NOT regress to a previous phase during normal pipeline operation.

#### Scenario: Backfill re-processes stuck new jobs

- GIVEN jobs with `status = 'new'` that were ingested before the schema fix
- WHEN a pipeline backfill run is triggered
- THEN each job MUST be processed through Phase 1, Phase 2, and Phase 3 in sequence
- AND jobs that qualify MUST reach `eu-remote` status with `is_remote_eu = 1`

#### Scenario: Already-classified jobs are not re-processed

- GIVEN a job with `status = 'eu-remote'` and `is_remote_eu = 1`
- WHEN the pipeline runs
- THEN the job SHALL NOT be re-processed by any phase

---

### Requirement: Classification Output MUST Set is_remote_eu Column

After Phase 3 classification completes for a job, the `is_remote_eu` column MUST be set to `1` (true) for EU-remote jobs or `0` (false) for non-EU jobs. The column SHALL NOT remain `NULL` after classification.

#### Scenario: Classified EU-remote job has is_remote_eu = 1

- GIVEN a job that Phase 3 classifies as EU-remote
- WHEN the classification result is written to the database
- THEN `is_remote_eu` MUST equal `1`
- AND `remote_eu_confidence` MUST be one of `'high'`, `'medium'`, or `'low'`
- AND `remote_eu_reason` MUST contain a non-empty explanation string

#### Scenario: Classified non-EU job has is_remote_eu = 0

- GIVEN a job that Phase 3 classifies as non-EU
- WHEN the classification result is written to the database
- THEN `is_remote_eu` MUST equal `0`
- AND `status` MUST be set to `non-eu`
