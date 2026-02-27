# Tasks: Fix Empty Job Board — Restore Dropped Classification Columns

## Phase 1: Schema + Migration

- [x] 1.1 Add 4 columns to `src/db/schema.ts` — append `country: text("country")`, `workplace_type: text("workplace_type")`, `categories: text("categories")`, and `ats_created_at: text("ats_created_at")` to the `jobs` table definition, with a comment noting they were restored (dropped by 0004_nifty_northstar.sql)
- [x] 1.2 Run `pnpm db:generate` to produce a Drizzle migration file in `migrations/`
- [x] 1.3 Inspect the generated migration SQL — verify it contains only 4 `ALTER TABLE jobs ADD COLUMN` statements and does not drop, rename, or modify any existing columns
- [ ] 1.4 Apply migration to remote D1 via `pnpm db:push`
- [ ] 1.5 Verify columns exist on remote D1: run `wrangler d1 execute nomadically-work-db --remote --command "PRAGMA table_info(jobs)"` and confirm `country`, `workplace_type`, `categories`, `ats_created_at` are listed

## Phase 2: Pipeline Trigger + Backfill

- [ ] 2.1 Trigger Phase 1 enhancement on stuck jobs: invoke `process-jobs /enhance` endpoint (or `pnpm jobs:enhance`) to re-enhance `status = 'new'` jobs — use worker's built-in `limit` parameter to batch (e.g., 1000 at a time)
- [ ] 2.2 Verify enhancement populates the restored columns: run `wrangler d1 execute nomadically-work-db --remote --command "SELECT id, country, workplace_type, status FROM jobs WHERE country IS NOT NULL LIMIT 5"` and confirm non-NULL values for recently enhanced jobs
- [ ] 2.3 Verify status progression from `new` to `enhanced`: run `wrangler d1 execute nomadically-work-db --remote --command "SELECT status, count(*) FROM jobs GROUP BY status"` and confirm jobs are moving out of `new`
- [ ] 2.4 Trigger Phase 2 role tagging on enhanced jobs to advance qualifying jobs from `enhanced` to `role-match`
- [ ] 2.5 Trigger Phase 3 classification on `role-match` jobs via `eu-classifier /classify` endpoint
- [ ] 2.6 Verify classification output: run `wrangler d1 execute nomadically-work-db --remote --command "SELECT count(*) FROM jobs WHERE is_remote_eu = 1"` and confirm count > 0

## Phase 3: Verification

- [ ] 3.1 Verify homepage shows jobs: run `pnpm dev` and load `localhost:3000` — confirm the job list renders at least one job card (spec: homepage/scenario "Classified jobs appear in the job list")
- [ ] 3.2 Verify signal extraction works: use `eu-classifier /classify-one` on a known EU-remote job (one with `country` in EU country list and `workplace_type = 'remote'`), check `wrangler tail --config workers/eu-classifier/wrangler.jsonc` for `ats_remote` and `eu_country_code` values in log output (spec: pipeline/scenario "EU country with remote flag classifies as remote-EU")
- [ ] 3.3 Verify pipeline status distribution is healthy: run `wrangler d1 execute nomadically-work-db --remote --command "SELECT status, count(*) as cnt FROM jobs GROUP BY status ORDER BY cnt DESC"` — confirm `new` count is decreasing and `eu-remote` count > 0 (spec: pipeline/scenario "Backfill re-processes stuck new jobs")
- [ ] 3.4 Verify `is_remote_eu` is not NULL after classification: run `wrangler d1 execute nomadically-work-db --remote --command "SELECT count(*) FROM jobs WHERE status IN ('eu-remote','non-eu') AND is_remote_eu IS NULL"` — must return 0 (spec: pipeline/requirement "Classification Output MUST Set is_remote_eu Column")
