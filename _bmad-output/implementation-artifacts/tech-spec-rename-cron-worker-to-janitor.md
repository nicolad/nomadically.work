---
title: 'Rename cron worker to janitor'
slug: 'rename-cron-worker-to-janitor'
created: '2026-02-23'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Cloudflare Workers', 'Wrangler']
files_to_modify:
  - workers/cron.ts
  - wrangler.toml
  - scripts/trigger-cron.ts
  - package.json
  - CLAUDE.md
code_patterns:
  - 'WORKER constant for structured logging identity'
  - 'wrangler.toml as default CF worker config'
  - 'kebab-case pnpm script keys'
test_patterns:
  - 'No unit tests for workers — validate via wrangler dry-run + grep check'
---

# Tech-Spec: Rename cron worker to janitor

**Created:** 2026-02-23

## Overview

### Problem Statement

`workers/cron.ts` is the daily ATS ingestion trigger worker. The name "cron" is generic and doesn't communicate its maintenance/cleanup role in the system.

### Solution

Pure rename across all 5 touch points — no logic changes. Rename the file to `workers/janitor.ts`, update the Cloudflare Worker name in `wrangler.toml`, update the trigger script and its `package.json` reference, and update `CLAUDE.md`.

### Scope

**In Scope:**
- Rename `workers/cron.ts` → `workers/janitor.ts`
- Update `const WORKER = "cron"` → `"janitor"` inside the worker file
- Update file header comment to reflect new name
- `wrangler.toml`: update `name` and `main` fields
- Rename `scripts/trigger-cron.ts` → `scripts/trigger-janitor.ts`, update internal `workers/cron.ts` references
- `package.json`: update `cron:trigger` script path to `scripts/trigger-janitor.ts`
- `CLAUDE.md`: update worker table row and known issues section

**Out of Scope:**
- Logic changes to the worker
- `ARCHITECTURE_REPORT.md` (doc artifact, not source of truth)
- Worktree copies (`.claude/worktrees/`)

## Context for Development

### Codebase Patterns

- Workers live in `workers/` directory
- Each worker has a corresponding `wrangler*.toml` config at project root
- `wrangler.toml` (no suffix) is the default config — it stays as `wrangler.toml` (not renamed)
- The `WORKER` constant inside each worker file is the logging identity used by `workers/lib/logger.ts`
- `package.json` scripts use kebab-case (e.g. `janitor:trigger`)
- No unit tests for workers; validation is via `wrangler deploy --dry-run` and grep

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `workers/cron.ts` (line 14) | `const WORKER = "cron"` → rename file + update constant |
| `wrangler.toml` (lines 1–2) | `name = "nomadically-work-cron"`, `main = "workers/cron.ts"` |
| `scripts/trigger-cron.ts` (lines 16, 25) | Two hardcoded `workers/cron.ts` path refs |
| `package.json` (line 28) | `"cron:trigger": "tsx scripts/trigger-cron.ts"` |
| `CLAUDE.md` (lines 43, 95, 200) | Commands section, worker table, known issues |

### Technical Decisions

- Keep `wrangler.toml` as the filename (no rename to `wrangler.janitor.toml`) — it's the default wrangler config and other tooling may rely on it
- Rename `package.json` key from `cron:trigger` to `janitor:trigger` for consistency
- Update the Cloudflare Worker service name to `nomadically-janitor` (dropping "work" from the name) — note this is a **breaking change** for any Cloudflare dashboard references or service bindings using the old name

## Implementation Plan

### Tasks

- [x] Task 1: Rename worker file
  - File: `workers/cron.ts` → `workers/janitor.ts`
  - Action: `git mv workers/cron.ts workers/janitor.ts`
  - Action: Line 14 — `const WORKER = "cron"` → `const WORKER = "janitor"`
  - Action: Line 4 — update header comment `"Cloudflare Workers Cron — ATS Job Ingestion Trigger"` → `"Cloudflare Workers Janitor — ATS Job Ingestion Trigger"`

- [x] Task 2: Update wrangler.toml
  - File: `wrangler.toml`
  - Action: Line 1 — `name = "nomadically-work-cron"` → `name = "nomadically-janitor"`
  - Action: Line 2 — `main = "workers/cron.ts"` → `main = "workers/janitor.ts"`
  - Action: Line 6 — update comment `# Cron Triggers - runs daily at midnight UTC` → `# Janitor Triggers - runs daily at midnight UTC`

- [x] Task 3: Rename trigger script
  - File: `scripts/trigger-cron.ts` → `scripts/trigger-janitor.ts`
  - Action: `git mv scripts/trigger-cron.ts scripts/trigger-janitor.ts`
  - Action: Line 4 — update JSDoc comment to reference "Janitor" instead of "Cron"
  - Action: Line 10 — `async function triggerCron()` → `async function triggerJanitor()`
  - Action: Line 11 — update console string `"🚀 Triggering Cloudflare Workers Cron job discovery...\n"` → `"🚀 Triggering Cloudflare Workers Janitor...\n"`
  - Action: Line 14 — update console string `"📦 Deploying latest cron worker..."` → `"📦 Deploying latest janitor worker..."`
  - Action: Line 16 — `execSync("npx wrangler deploy workers/cron.ts"` → `execSync("npx wrangler deploy workers/janitor.ts"`
  - Action: Line 25 — `execSync(\`npx wrangler dev workers/cron.ts --test-scheduled --local\`` → `execSync(\`npx wrangler dev workers/janitor.ts --test-scheduled --local\``
  - Action: Line 38 — `triggerCron()` → `triggerJanitor()`

- [x] Task 4: Update package.json
  - File: `package.json`
  - Action: Line 28 — rename key `"cron:trigger"` → `"janitor:trigger"`, update value `"tsx scripts/trigger-cron.ts"` → `"tsx scripts/trigger-janitor.ts"`

- [x] Task 5: Update CLAUDE.md
  - File: `CLAUDE.md`
  - Action: Line 43 — `pnpm cron:trigger                 # Manually trigger cron job` → `pnpm janitor:trigger              # Manually trigger janitor worker`
  - Action: Line 95 — `| \`cron\` | \`wrangler.toml\` | TypeScript | Daily midnight UTC, triggers ATS ingestion |` → `| \`janitor\` | \`wrangler.toml\` | TypeScript | Daily midnight UTC, triggers ATS ingestion |`
  - Action: Line 200 — `\`workers/cron.ts\` and \`workers/insert-jobs.ts\` still reference Turso (libsql) instead of D1.` → `\`workers/janitor.ts\` and \`workers/insert-jobs.ts\` still reference Turso (libsql) instead of D1.`

### Acceptance Criteria

- [x] AC 1: Given the rename is complete, when `wrangler deploy` is run with default `wrangler.toml`, then it deploys a worker named `nomadically-janitor` from `workers/janitor.ts` without errors
- [x] AC 2: Given the rename is complete, when `pnpm janitor:trigger` is run, then the script references `workers/janitor.ts` and executes without path errors
- [x] AC 3: Given the rename is complete, when `git status` is checked, then `workers/cron.ts` and `scripts/trigger-cron.ts` no longer exist as tracked files
- [x] AC 4: Given the rename is complete, when `grep -r "workers/cron" . --include="*.ts" --include="*.toml" --include="*.json" --include="*.md" --exclude-dir=".claude" --exclude-dir="node_modules"` is run, then zero results are returned

## Additional Context

### Dependencies

None — pure rename, no new packages or DB changes.

### Testing Strategy

- Run `npx wrangler deploy --dry-run --config wrangler.toml` to validate config after rename
- Run `grep -r "workers/cron" . --include="*.ts" --include="*.toml" --include="*.json" --include="*.md" --exclude-dir=".claude" --exclude-dir="node_modules"` to verify no stale references

### Notes

- The Cloudflare Worker service name change (`nomadically-work-cron` → `nomadically-janitor`) will create a **new worker** on Cloudflare's side on next deploy. The old `nomadically-work-cron` worker should be manually deleted from the Cloudflare dashboard after confirming the janitor worker is live.
- Worktree files (`.claude/worktrees/`) are excluded — they are isolated branches and will be cleaned up separately.

## Review Notes
- Adversarial review completed
- Findings: 10 total, 0 fixed, 10 skipped
- Resolution approach: skip
