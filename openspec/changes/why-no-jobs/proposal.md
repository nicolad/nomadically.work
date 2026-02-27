# Proposal: Fix Empty Job Board — Unblock Classification Pipeline

## Intent

The homepage shows zero jobs because the GraphQL `jobs` query hard-filters on `is_remote_eu = true` (via `REMOTE_EU_ONLY` constant), but **no job in the database has ever been classified as remote-EU**. The root cause is a three-part pipeline failure:

1. **Schema/worker mismatch** — Migration `0004_nifty_northstar.sql` dropped columns `country`, `workplace_type`, `categories`, and `ats_created_at` from the `jobs` table, but both `process-jobs` (Phase 1 enhancement) and `eu-classifier` (Phase 3 classification) still write to and read from these columns. D1/SQLite silently ignores writes to non-existent columns, so the enhancement phase completes but the data needed for classification is lost.

2. **Signal extraction blindness** — The eu-classifier's `extract_eu_signals()` reads `job.get("workplace_type")` and `job.get("country")` to determine the ATS remote flag and EU country code. Since these columns were dropped, both values are always `None`, so the heuristic (Tier 0) almost never fires positively, and the LLM tiers (1 and 2) receive "No structured ATS signals available" — degrading classification accuracy to near-zero for EU-positive results.

3. **Status bottleneck** — 89% of jobs (6,876) are stuck in `status = 'new'` because Phase 1 enhancement writes to dropped columns and may be failing silently for many jobs. Phase 3 only processes `status = 'role-match'` jobs, so even if classification worked, the jobs never reach it.

## Scope

### In Scope
- Re-add dropped columns (`country`, `workplace_type`, `categories`, `ats_created_at`) to the `jobs` table via a new Drizzle migration, OR update the workers to store this data in existing columns
- Verify Phase 1 enhancement actually advances jobs from `new` → `enhanced`
- Verify Phase 2 role tagging advances jobs from `enhanced` → `role-match`
- Verify Phase 3 classification reads the correct columns and produces `is_remote_eu = 1` for qualifying jobs
- Backfill: re-run the pipeline on stuck `new` jobs to populate `is_remote_eu`
- Confirm jobs appear on the homepage after fix

### Out of Scope
- Changing the `REMOTE_EU_ONLY` filter behavior (it is working as designed)
- Improving classification accuracy beyond "functional" (separate tuning work)
- Fixing N+1 query performance issues
- Adding new ATS sources or ingestion improvements
- DataLoader implementation

## Approach

**Option A (Recommended): Re-add the dropped columns to the schema and DB.**

1. Add `country`, `workplace_type`, `categories`, and `ats_created_at` back to `src/db/schema.ts`
2. Generate and apply a new Drizzle migration (`pnpm db:generate && pnpm db:push`)
3. Redeploy `process-jobs` and `eu-classifier` workers (no code changes needed — they already write to these columns)
4. Trigger a full pipeline run: `enhance → tag → classify` on all stuck `new` jobs
5. Verify homepage shows classified jobs

**Option B (Alternative): Refactor workers to use existing columns.**

Store `country` and `workplace_type` inside the `ats_data` JSON column and update `extract_eu_signals()` to read from there. More invasive, more code changes, higher risk.

Option A is preferred because it requires zero worker code changes and the columns were only dropped as a schema cleanup — the data is still needed.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/db/schema.ts` | Modified | Re-add `country`, `workplace_type`, `categories`, `ats_created_at` columns to `jobs` table |
| `migrations/` | New | New migration file to add columns back |
| `workers/process-jobs/src/entry.py` | Verified | Enhancement phase writes to these columns — no changes needed |
| `workers/eu-classifier/src/entry.py` | Verified | Classification reads these columns — no changes needed |
| `workers/eu-classifier/src/signals.py` | Verified | Signal extraction reads `workplace_type`, `country` — no changes needed |
| `src/apollo/resolvers/job/jobs-query.ts` | None | Query is correct — `is_remote_eu = true` filter is working as designed |
| `src/lib/constants.ts` | None | `REMOTE_EU_ONLY = true` is correct |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration fails on remote D1 | Low | SQLite `ALTER TABLE ADD COLUMN` is safe and non-destructive |
| Backfill run exceeds worker CPU limits | Medium | Process in batches (enhance 1000, tag 1000, classify 1000) |
| Classification still produces zero EU results | Medium | After fix, manually test with `/classify-one` on a known EU-remote job, check Wrangler tail logs |
| Enhancement phase errors are swallowed silently | Medium | Check Wrangler logs during first pipeline run; add explicit error logging if needed |

## Rollback Plan

1. If the new migration causes issues, the added columns can be dropped again with a follow-up migration (the same `ALTER TABLE DROP COLUMN` from 0004)
2. Worker deployments can be reverted via `wrangler rollback`
3. No existing data is modified by adding columns — they will be `NULL` until the pipeline populates them

## Dependencies

- Access to remote D1 (`pnpm db:push` or `wrangler d1 execute --remote`)
- Worker deployment access (`wrangler deploy`)
- DeepSeek API key or Workers AI binding must be configured on the eu-classifier worker

## Success Criteria

- [ ] `SELECT count(*) FROM jobs WHERE is_remote_eu = 1` returns > 0
- [ ] Homepage at localhost:3000 displays classified remote EU jobs
- [ ] Pipeline status check shows jobs progressing through all phases: `new → enhanced → role-match → eu-remote`
- [ ] `wrangler tail` on eu-classifier shows successful classification runs with non-zero `euRemote` count
