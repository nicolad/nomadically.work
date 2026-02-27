# Design: Fix Empty Job Board — Restore Dropped Classification Columns

## Technical Approach

Re-add the 4 columns (`country`, `workplace_type`, `categories`, `ats_created_at`) that migration `0004_nifty_northstar.sql` dropped from the `jobs` table. These columns are written by the `process-jobs` Phase 1 enhancement (Lever and Ashby builders) and read by the `eu-classifier` signal extraction pipeline. Without them, `extract_eu_signals()` always returns `None` for `workplace_type` and `country`, so the heuristic tier never fires positively and the LLM tiers receive degraded input — resulting in zero `is_remote_eu = 1` rows and an empty homepage.

The fix is schema-only on the application side: add columns back to `src/db/schema.ts`, generate a Drizzle migration, apply it to remote D1. No worker code changes required.

## Architecture Decisions

### Decision: Re-add columns vs. refactor workers to use ats_data JSON

**Choice**: Re-add the 4 dropped columns to the `jobs` table.
**Alternatives considered**: Store `country`/`workplace_type`/`categories`/`ats_created_at` inside the existing `ats_data` JSON column and update `extract_eu_signals()` to read from there.
**Rationale**: The workers already write to these columns. Re-adding them requires zero code changes in either `process-jobs` or `eu-classifier`. The JSON alternative would require modifying 3 Python files across 2 workers, updating the signal extraction logic, and redeploying both workers — higher risk for no benefit.

### Decision: Add only the 4 classification-critical columns, not all dropped columns

**Choice**: Re-add only `country`, `workplace_type`, `categories`, and `ats_created_at`.
**Alternatives considered**: Re-add all 11 columns dropped by migration 0004 (including `opening`, `opening_plain`, `description_body`, `description_body_plain`, `additional`, `additional_plain`, `lists`).
**Rationale**: The other 7 columns are Lever-specific text fields written by `build_lever_update()` but never read by the `eu-classifier` or any other consumer. D1/SQLite silently ignores writes to non-existent columns, so their absence does not cause errors — it just means that data is lost. Since no code reads them, re-adding them is unnecessary for unblocking classification. They can be re-added later if a use case emerges.

### Decision: Use Drizzle db:generate for migration, not hand-written SQL

**Choice**: Add columns to `src/db/schema.ts` and run `pnpm db:generate` to produce the migration.
**Alternatives considered**: Hand-write `ALTER TABLE jobs ADD COLUMN ...` SQL and place it in `migrations/`.
**Rationale**: Drizzle-generated migrations stay in sync with the schema file and follow the project's established migration workflow. Hand-written SQL risks divergence between `schema.ts` and the actual DB state.

### Decision: No backfill migration — use existing worker pipeline

**Choice**: After applying the migration, trigger the existing `process-jobs` enhancement pipeline on stuck `new` jobs (they will re-enhance and populate the new columns, then proceed through tagging and classification).
**Alternatives considered**: Write a one-time backfill SQL script that copies data from `ats_data` JSON into the new columns.
**Rationale**: The `ats_data` column stores the raw ATS API response, but its structure varies by source kind. The existing `build_lever_update()` / `build_ashby_update()` functions already know how to parse each format. Re-running the enhancement pipeline is simpler and uses battle-tested code. Jobs stuck at `new` will be re-fetched from ATS APIs anyway.

## Data Flow

Current (broken):

```
ATS API ─→ process-jobs Phase 1 ─→ UPDATE jobs SET country=?, workplace_type=? ...
                                       │
                                       │  columns don't exist → writes silently ignored
                                       ▼
                              eu-classifier SELECT country, workplace_type ...
                                       │
                                       │  columns don't exist → NULL values
                                       ▼
                              extract_eu_signals() → all None → heuristic fails
                                       │
                                       ▼
                              LLM receives "No structured ATS signals available"
                                       │
                                       ▼
                              is_remote_eu stays NULL → homepage shows 0 jobs
```

After fix:

```
ATS API ─→ process-jobs Phase 1 ─→ UPDATE jobs SET country=?, workplace_type=? ...
                                       │
                                       │  columns exist → values persisted
                                       ▼
                              status: new → enhanced → (Phase 2) → role-match
                                       │
                                       ▼
                              eu-classifier SELECT country, workplace_type, categories ...
                                       │
                                       │  values present
                                       ▼
                              extract_eu_signals() → ats_remote, eu_country_code populated
                                       │
                                       ▼
                              Tier 0 heuristic fires / LLM gets structured signals
                                       │
                                       ▼
                              is_remote_eu = 1 for qualifying jobs → homepage populated
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/db/schema.ts` | Modify | Add `country`, `workplace_type`, `categories`, `ats_created_at` columns to the `jobs` table definition |
| `migrations/0021_restore_classification_columns.sql` | Create | Generated by `pnpm db:generate` — 4 `ALTER TABLE ADD COLUMN` statements |
| `workers/process-jobs/src/entry.py` | No change | Already writes these columns in `build_lever_update()` and `build_ashby_update()` |
| `workers/eu-classifier/src/entry.py` | No change | Already SELECTs `country`, `workplace_type`, `categories` in classify queries |
| `workers/eu-classifier/src/signals.py` | No change | Already reads `job.get("workplace_type")` and `job.get("country")` |

## Interfaces / Contracts

Schema additions to `src/db/schema.ts` inside the `jobs` table definition:

```ts
// Classification-critical ATS columns (restored — dropped by 0004_nifty_northstar.sql)
country: text("country"),
workplace_type: text("workplace_type"),
categories: text("categories"),       // JSON object (Lever categories / Ashby aggregated)
ats_created_at: text("ats_created_at"),
```

These columns are:
- **Written by**: `process-jobs` worker (`build_lever_update`, `build_ashby_update`)
- **Read by**: `eu-classifier` worker (`extract_eu_signals` in `signals.py`, `classify_batch` and `handle_classify_one` SELECT queries in `entry.py`)
- **Not exposed via GraphQL**: No schema changes needed in `schema/**/*.graphql`
- **Type**: All `TEXT` (nullable) — matches existing pattern for ATS metadata columns

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Migration | Columns exist after migration | `wrangler d1 execute --remote` then `PRAGMA table_info(jobs)` — verify `country`, `workplace_type`, `categories`, `ats_created_at` present |
| Pipeline | Enhancement populates columns | Trigger `process-jobs /enhance` on a known Lever or Ashby job, then `SELECT country, workplace_type FROM jobs WHERE id = ?` |
| Pipeline | Classification reads columns | Use `eu-classifier /classify-one` on a job with populated `country`/`workplace_type`, check `wrangler tail` for signal extraction output |
| E2E | Homepage shows jobs | After full pipeline run, verify `SELECT count(*) FROM jobs WHERE is_remote_eu = 1` > 0 and homepage renders results |

## Migration / Rollout

### Step 1: Schema + Migration (local)
1. Add 4 columns to `src/db/schema.ts`
2. Run `pnpm db:generate` to produce migration SQL
3. Verify generated migration contains only `ALTER TABLE jobs ADD COLUMN` statements

### Step 2: Apply to remote D1
1. Run `pnpm db:push` (or `wrangler d1 execute nomadically-work-db --remote --file migrations/0021_....sql`)
2. Verify with `PRAGMA table_info(jobs)` that columns exist

### Step 3: Trigger pipeline
1. No worker redeployment needed — the workers already reference these columns
2. Trigger `process-jobs /enhance` to re-run Phase 1 on `status = 'new'` jobs (populates `country`, `workplace_type`, etc.)
3. Trigger `process-jobs /tag` to run Phase 2 on `status = 'enhanced'` jobs
4. Trigger `eu-classifier /classify` to run Phase 3 on `status = 'role-match'` jobs
5. Verify `is_remote_eu = 1` count > 0

### Rollback
- Drop the 4 columns with `ALTER TABLE jobs DROP COLUMN` (same as 0004 did)
- No data loss — columns are nullable and only populated by the pipeline

## Open Questions

- [x] Do we need to re-add the other 7 Lever-specific columns (`opening`, `description_body`, etc.)? **No** — not read by any consumer, not needed for classification.
- [ ] Should we batch the pipeline trigger to avoid CPU limits? The proposal suggests batches of 1000. The workers already have built-in `limit` parameters — use those.
- [ ] Is there a concern about migration numbering? Drizzle auto-numbers, but there are both auto-named (0000, 0001, 0003, 0004) and manually-named (0002, 0005-0020) migrations. The generated migration filename is determined by `pnpm db:generate`.
