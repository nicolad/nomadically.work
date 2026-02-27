# Schema Specification

## Purpose

Defines the required columns on the `jobs` table that classification workers depend on for remote-EU signal extraction and pipeline status progression.

---

## Requirements

### Requirement: Jobs Table MUST Include ATS Classification Columns

The `jobs` table in `src/db/schema.ts` MUST define the columns `country`, `workplace_type`, `categories`, and `ats_created_at`. These columns are written by the `process-jobs` enhancement worker (Phase 1) and read by the `eu-classifier` worker (Phase 3) for signal extraction.

#### Scenario: Country column exists and accepts text values

- GIVEN the `jobs` table schema in `src/db/schema.ts`
- WHEN the schema is inspected
- THEN a `country` column of type `text` MUST be present
- AND it MUST accept nullable string values (ISO country codes or full country names)

#### Scenario: Workplace type column exists and accepts text values

- GIVEN the `jobs` table schema in `src/db/schema.ts`
- WHEN the schema is inspected
- THEN a `workplace_type` column of type `text` MUST be present
- AND it MUST accept nullable string values (e.g., "remote", "hybrid", "onsite")

#### Scenario: Categories column exists and accepts JSON text

- GIVEN the `jobs` table schema in `src/db/schema.ts`
- WHEN the schema is inspected
- THEN a `categories` column of type `text` MUST be present
- AND it MUST accept nullable JSON-encoded string values

#### Scenario: ATS created-at column exists and accepts text values

- GIVEN the `jobs` table schema in `src/db/schema.ts`
- WHEN the schema is inspected
- THEN an `ats_created_at` column of type `text` MUST be present
- AND it MUST accept nullable ISO 8601 datetime string values

---

### Requirement: Migration MUST Be Non-Destructive

The Drizzle migration that re-adds the dropped columns MUST use `ALTER TABLE ADD COLUMN` statements. It SHALL NOT drop, rename, or modify any existing columns or data.

#### Scenario: Migration adds columns without data loss

- GIVEN the remote D1 database contains existing job rows
- WHEN the new migration is applied via `pnpm db:push`
- THEN columns `country`, `workplace_type`, `categories`, and `ats_created_at` MUST be added to the `jobs` table
- AND all existing rows MUST retain their current data unchanged
- AND the new columns MUST default to `NULL` for existing rows

#### Scenario: Migration is idempotent with the schema definition

- GIVEN the columns have been added to `src/db/schema.ts`
- WHEN `pnpm db:generate` is run
- THEN a migration file MUST be generated in `migrations/`
- AND the migration SQL MUST contain only `ALTER TABLE ... ADD COLUMN` statements for the four columns

---

### Requirement: Schema Column Types MUST Match Worker Expectations

The Drizzle column definitions MUST produce SQLite column types that are compatible with the SQL written by the Python workers (`process-jobs` and `eu-classifier`).

#### Scenario: Process-jobs writes country value successfully

- GIVEN the `country` column exists as `text("country")` in the schema
- WHEN the `process-jobs` worker executes `UPDATE jobs SET country = ? WHERE id = ?`
- THEN the value MUST be persisted and retrievable by subsequent `SELECT` queries

#### Scenario: EU-classifier reads workplace_type successfully

- GIVEN the `workplace_type` column exists as `text("workplace_type")` in the schema
- WHEN the `eu-classifier` worker executes `SELECT workplace_type FROM jobs WHERE id = ?`
- THEN the column MUST return the value previously written by `process-jobs`
- AND it SHALL NOT return `NULL` for rows that were enhanced after the migration
