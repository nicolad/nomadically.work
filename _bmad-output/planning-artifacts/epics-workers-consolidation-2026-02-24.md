---
stepsCompleted: [1, 2, 3, 4]
status: complete
completedAt: '2026-02-24'
inputDocuments:
  - _bmad-output/planning-artifacts/prd-workers-consolidation-2026-02-24.md
  - _bmad-output/planning-artifacts/architecture-workers-consolidation-2026-02-24.md
---

# nomadically.work — Workers Consolidation: Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Workers Consolidation initiative, decomposing requirements from the PRD and Architecture into implementable stories for the nomadically.work Cloudflare Workers fleet.

## Requirements Inventory

### Functional Requirements

FR1: Developer can view a complete inventory of all workers: name, runtime, trigger type (cron/queue/HTTP/on-demand), queue bindings, and status (active/legacy/uncertain)
FR2: Developer can identify workers with overlapping responsibilities or redundant queue consumer registrations
FR3: Developer can determine the exact dependency chain between workers (producer → consumer relationships)
FR4: Developer can retire `insert-jobs` with all artifacts removed: worker code, `wrangler.insert-jobs.toml`, CF dashboard queue consumer, and `@libsql/client` dependency
FR5: Developer can retire or migrate `promptfoo-eval` after confirming no external consumers reference it
FR6: Job ingestion pipeline processes correctly after worker retirement — no regression in throughput
FR7: Developer can identify all Turso/libsql references across the workers codebase: `wrangler.*.toml` env vars, TypeScript imports, `package.json` deps
FR8: Developer can remove all Turso/libsql references from surviving workers without breaking functionality
FR9: No `@libsql/client` or `TURSO_*` environment variables remain in any wrangler config or worker code post-consolidation
FR10: Developer deploys each surviving worker using a single, clearly named `wrangler.*.toml` config
FR11: Developer identifies the correct deploy command for any worker from `package.json` or `CLAUDE.md` without ambiguity
FR12: All surviving wrangler configs list only active, valid bindings — no dead KV, Queue, or D1 entries
FR13: Developer deploys the entire TypeScript workers fleet with ≤3 distinct `wrangler deploy` commands
FR14: CF dashboard queue consumer registrations match the surviving workers exactly — no ghost consumers
FR15: All queue message formats remain unchanged — consumers receive identical payloads as before
FR16: `d1-gateway` HTTP endpoint URL and `API_KEY` auth contract remain unchanged
FR17: `janitor` cron schedule and ATS ingestion trigger logic remain functionally identical after any refactoring
FR18: `CLAUDE.md` workers table contains an accurate entry for every surviving worker — no legacy entries
FR19: Developer traces a job through the ingestion pipeline by reading only the workers table — each step maps to exactly one worker
FR20: Surviving TypeScript workers emit structured logs with at minimum: `worker_name`, `status`, `duration_ms` per invocation

### NonFunctional Requirements

NFR1 (Performance): Surviving TypeScript workers complete within Cloudflare's 30ms CPU time limit — verified via `wrangler dev` benchmark before production deploy
NFR2 (Performance): `d1-gateway` p95 response time does not increase post-consolidation — baseline measured before changes begin
NFR3 (Performance): `janitor` cron completes within the 30s wall-clock limit — verified if logic is added during any merge
NFR4 (Security): `d1-gateway` `API_KEY` remains the sole auth mechanism — no new auth surface introduced
NFR5 (Security): No secrets committed to source control — all secrets stay in CF dashboard / `.env.local`
NFR6 (Security): `insert-jobs` retirement does not expose queue endpoints — verify no public routes are opened
NFR7 (Reliability): Zero production downtime — workers are retired/deployed independently, no coordinated cutover
NFR8 (Reliability): Job ingestion throughput does not drop below pre-consolidation baseline for 48h post-deployment — monitored via CF analytics
NFR9 (Reliability): No increase in dead-lettered queue messages post-consolidation — any spike indicates a missed queue consumer
NFR10 (Integration): Queue message payload schemas remain byte-identical — no field renames, type changes, or additions
NFR11 (Integration): `d1-gateway` base URL unchanged in Vercel environment variables
NFR12 (Integration): Cloudflare binding names in surviving `wrangler.toml` files match worker code exactly — mismatches are silent runtime failures

### Additional Requirements

- **No starter template**: Brownfield cleanup — all workers exist; no project initialization needed
- **Implementation sequence enforced**: Audit → Retire `insert-jobs` → Purge Turso from `janitor` → Migrate `promptfoo-eval` → Rename `wrangler.toml` → Update `CLAUDE.md` → Add structured logging (steps 2–4 are independent of each other after step 1)
- **Runtime isolation**: TypeScript workers only (`janitor`, `d1-gateway`) — Python and Rust/WASM workers are untouched by this initiative
- **CF Dashboard manual step**: `insert-jobs` queue consumer must be removed from CF dashboard independently of code deletion — cannot be scripted
- **Binding name consistency**: All binding names in code must exactly match declarations in `wrangler.*.toml` — mismatches are silent runtime failures
- **Wrangler config rename**: `wrangler.toml` → `wrangler.janitor.toml` (eliminates ambiguity at repo root)
- **Deploy script coherence**: `scripts/deploy.ts`, `package.json` scripts, and `CLAUDE.md` all require updating to reflect 2-command TypeScript deploy
- **Structured log format**: `{ worker, status, duration_ms, timestamp }` minimum shape for `janitor` and `d1-gateway`
- **Turso grep scope**: Must check `wrangler.*.toml`, all `package.json` files, and all `.ts` files — not just `insert-jobs.ts`
- **pnpm build gate**: After any retirement, `pnpm build` must pass with no TypeScript errors before marking story complete

### FR Coverage Map

```
FR1:  Epic 1 — Worker inventory (name, runtime, trigger, bindings, status)
FR2:  Epic 1 — Overlapping responsibilities / redundant queue consumers
FR3:  Epic 1 — Producer → consumer dependency chain
FR4:  Epic 2 — Retire insert-jobs (code, config, CF dashboard, @libsql/client)
FR5:  Epic 2 — Retire/migrate promptfoo-eval → Next.js /api/eval
FR6:  Epic 2 — Pipeline integrity confirmed post-retirement
FR7:  Epic 2 — Identify all Turso/libsql references across codebase
FR8:  Epic 2 — Remove Turso/libsql refs from surviving workers
FR9:  Epic 2 — Zero @libsql/client or TURSO_* vars remaining post-consolidation
FR10: Epic 3 — Single clearly-named wrangler.*.toml per surviving worker
FR11: Epic 3 — Unambiguous deploy command per worker in package.json / CLAUDE.md
FR12: Epic 3 — Surviving configs have only active, valid bindings
FR13: Epic 3 — Full TS fleet deployed with ≤3 wrangler deploy commands
FR14: Epic 2 — CF dashboard queue consumers match surviving workers (no ghosts)
FR15: Epic 2 — Queue message schemas unchanged
FR16: Epic 2 — d1-gateway HTTP endpoint + API_KEY contract unchanged
FR17: Epic 2 — janitor cron schedule + logic functionally identical
FR18: Epic 1 — CLAUDE.md workers table accurate, no legacy entries
FR19: Epic 1 — Pipeline traceable from workers table alone
FR20: Epic 4 — Structured logs: worker_name, status, duration_ms per invocation
```

## Epic List

### Epic 1: Fleet Audit & Documentation
Developer has a complete, accurate picture of the current workers fleet — every worker's runtime, trigger, queue bindings, and responsibility documented in one place. No more guessing which config is "the main one."
**FRs covered:** FR1, FR2, FR3, FR18, FR19

### Epic 2: Legacy Worker Retirement & Dependency Cleanup
Developer eliminates all dead code: `insert-jobs` is fully retired (code, config, CF dashboard consumer), `promptfoo-eval` migrates to a Next.js API route, and every Turso/libsql reference is purged. The job ingestion pipeline is verified intact after retirement.
**FRs covered:** FR4, FR5, FR6, FR7, FR8, FR9, FR14, FR15, FR16, FR17

### Epic 3: Streamlined Deploy Configuration
Developer deploys any surviving TypeScript worker with a single, unambiguous command. All wrangler configs are renamed to the standard pattern, deploy scripts reflect the final fleet, and no dead bindings remain.
**FRs covered:** FR10, FR11, FR12, FR13

### Epic 4: Observability for Surviving Workers
Developer can trace any worker invocation through structured logs. Both `janitor` and `d1-gateway` emit consistent JSON logs with worker name, status, duration, and timestamp.
**FRs covered:** FR20

## Epic 1: Fleet Audit & Documentation

Developer has a complete, accurate picture of the current workers fleet — every worker's runtime, trigger, queue bindings, and responsibility documented in one place. No more guessing which config is "the main one."

### Story 1.1: Conduct Workers Fleet Audit

As a developer,
I want a complete inventory of every Cloudflare Worker in the fleet with its runtime, trigger type, queue bindings, and active/legacy status,
So that I have a clear, factual baseline before making any retirement or consolidation changes.

**Acceptance Criteria:**

**Given** the repo and CF dashboard are accessible
**When** I audit all workers by inspecting every `wrangler.*.toml`, the `workers/` directory, and `CLAUDE.md`
**Then** every worker is documented with: name, runtime (TypeScript/Python/Rust/WASM), trigger type (cron/queue/HTTP/on-demand), queue bindings (producer and/or consumer), and status (active/legacy/uncertain)
**And** workers with overlapping responsibilities are explicitly flagged (e.g., `insert-jobs` and `janitor` both touching job ingestion)
**And** redundant or ghost queue consumer registrations are identified

**Given** the full inventory is documented
**When** I review queue consumer registrations in the CF dashboard
**Then** every producer → consumer relationship is mapped (e.g., `janitor` → CF Queue → `process-jobs`; `insert-jobs` as a consumer)
**And** any queue with a consumer that has no surviving code counterpart is flagged for dashboard cleanup

### Story 1.2: Update CLAUDE.md Workers Table

As a developer,
I want the CLAUDE.md workers table to show only living, functional workers with accurate metadata,
So that any contributor can understand the fleet at a glance with no stale or misleading entries.

**Acceptance Criteria:**

**Given** the audit findings from Story 1.1
**When** I update the workers table in `CLAUDE.md`
**Then** every row corresponds to a worker that is deployed and active
**And** `insert-jobs` is marked as retired/pending removal (or removed if retirement is complete)
**And** `promptfoo-eval` is marked as pending migration
**And** `deep-planner` is added to the table if confirmed as an active deployed worker

**Given** the updated `CLAUDE.md` workers table
**When** a contributor reads only that table
**Then** they can trace the complete job ingestion pipeline step-by-step without consulting any other file
**And** each worker's single, non-overlapping responsibility is unambiguous from its table entry

## Epic 2: Legacy Worker Retirement & Dependency Cleanup

Developer eliminates all dead code: `insert-jobs` is fully retired (code, config, CF dashboard consumer), `promptfoo-eval` migrates to a Next.js API route, and every Turso/libsql reference is purged. The job ingestion pipeline is verified intact after retirement.

### Story 2.1: Audit All Turso/libsql References

As a developer,
I want a complete map of every Turso/libsql reference across the codebase before touching any files,
So that I can retire and clean up with confidence and miss nothing.

**Acceptance Criteria:**

**Given** the repo is open
**When** I run the grep scope across all `wrangler.*.toml`, `package.json` files, and `.ts` files
**Then** every occurrence of `libsql`, `turso`, `TURSO_`, and `@libsql` is listed with file path and line number
**And** results are grouped by file so the removal scope is clear per worker

### Story 2.2: Retire insert-jobs Worker

As a developer,
I want `insert-jobs` fully removed from the codebase and CF dashboard,
So that no ghost worker burns invocations or dead-letters queue messages against a defunct Turso database.

**Acceptance Criteria:**

**Given** the audit from Story 2.1 confirms `insert-jobs` is the sole Turso-dependent queue consumer
**When** I retire `insert-jobs`
**Then** `workers/insert-jobs.ts` is deleted from the repo
**And** `wrangler.insert-jobs.toml` is deleted from the repo
**And** `package.json` deploy scripts referencing `insert-jobs` are removed
**And** `scripts/deploy.ts` no longer references `insert-jobs`

**Given** the code is deleted
**When** I check the CF dashboard queue consumer list
**Then** `insert-jobs` is removed as a consumer from all queues (manual dashboard step — cannot be scripted)
**And** `pnpm build` passes with zero TypeScript errors after deletion

### Story 2.3: Purge Turso References from janitor

As a developer,
I want `workers/janitor.ts` to contain zero Turso/libsql references,
So that the surviving `janitor` worker is clean and the `@libsql/client` package can be fully removed.

**Acceptance Criteria:**

**Given** `insert-jobs` is retired (Story 2.2 complete)
**When** I remove all Turso/libsql imports and usages from `workers/janitor.ts`
**Then** `janitor.ts` contains no `import` from `@libsql/client` or any Turso URL
**And** no `TURSO_*` environment variable references remain in `workers/janitor.ts` or `wrangler.toml`
**And** `@libsql/client` is removed from root `package.json` (after confirming no other TS worker imports it)
**And** `pnpm build` passes with zero TypeScript errors

### Story 2.4: Migrate promptfoo-eval to Next.js API Route

As a developer,
I want `promptfoo-eval` functionality available as a Next.js API route at `/api/eval`,
So that on-demand evaluation runs without a standalone Cloudflare Worker and without changing the HTTP interface.

**Acceptance Criteria:**

**Given** no external consumers reference the `promptfoo-eval` worker URL (confirmed by grepping CI configs, scripts, and cron definitions)
**When** I create `src/app/api/eval/route.ts`
**Then** the route accepts the same HTTP contract (method, payload shape) as the retired `promptfoo-eval` worker
**And** the route runs Promptfoo evaluation via direct library import (no worker hop)
**And** `wrangler.promptfoo.toml` is deleted from the repo
**And** the `promptfoo-eval` worker deploy script is removed from `package.json` and `scripts/deploy.ts`
**And** `pnpm build` passes with zero TypeScript errors

### Story 2.5: Verify Pipeline Integrity Post-Retirement

As a developer,
I want confirmation that the job ingestion pipeline processes correctly after all retirements,
So that I can close this epic with confidence that no throughput regression or dead-letter spike occurred.

**Acceptance Criteria:**

**Given** Stories 2.2, 2.3, and 2.4 are complete
**When** I review CF analytics and queue metrics for 48h post-deployment
**Then** job ingestion throughput matches the pre-consolidation baseline
**And** the dead-letter queue shows no spike attributable to missing consumers
**And** `d1-gateway` HTTP endpoint URL and `API_KEY` auth contract are unchanged (verified by a test POST to `/query`)
**And** `janitor` cron schedule and ATS ingestion trigger logic are functionally identical to pre-consolidation behavior
**And** all queue message payloads received by `process-jobs` are byte-identical to pre-consolidation payloads

## Epic 3: Streamlined Deploy Configuration

Developer deploys any surviving TypeScript worker with a single, unambiguous command. All wrangler configs are renamed to the standard pattern, deploy scripts reflect the final fleet, and no dead bindings remain.

### Story 3.1: Rename wrangler.toml to wrangler.janitor.toml

As a developer,
I want the `janitor` worker's config file named `wrangler.janitor.toml` instead of the ambiguous `wrangler.toml`,
So that every wrangler config at the repo root follows the `wrangler.<worker-name>.toml` pattern and I never have to guess which file deploys which worker.

**Acceptance Criteria:**

**Given** `insert-jobs` and `promptfoo-eval` are retired (Epic 2 complete)
**When** I rename `wrangler.toml` to `wrangler.janitor.toml`
**Then** the `name` field inside the file still reads `"janitor"` (unchanged)
**And** all binding names declared in `wrangler.janitor.toml` exactly match the binding references in `workers/janitor.ts`
**And** all dead or legacy bindings (e.g., any remaining `TURSO_*` env vars) are removed from the config
**And** `wrangler deploy --config wrangler.janitor.toml` successfully deploys the janitor worker

### Story 3.2: Update Deploy Scripts to Reflect Final Fleet

As a developer,
I want `package.json`, `scripts/deploy.ts`, and `CLAUDE.md` to reflect exactly the two surviving TypeScript workers,
So that `pnpm deploy` deploys the correct fleet and every deploy command is documented without ambiguity.

**Acceptance Criteria:**

**Given** `wrangler.janitor.toml` exists (Story 3.1 complete)
**When** I update `scripts/deploy.ts` and `package.json`
**Then** the TypeScript deploy commands are exactly: `wrangler deploy --config wrangler.janitor.toml` and `wrangler deploy --config wrangler.d1-gateway.toml`
**And** no deploy script references `insert-jobs`, `promptfoo-eval`, or `wrangler.toml` (without the `.janitor` suffix)
**And** `package.json` contains `deploy:janitor` and `deploy:d1-gateway` as individual scripts
**And** the `CLAUDE.md` Workers and Common Commands sections are updated to show the renamed config and final deploy commands
**And** `pnpm deploy` (via `scripts/deploy.ts`) runs both TS worker deploys and exits cleanly

## Epic 4: Observability for Surviving Workers

Developer can trace any worker invocation through structured logs. Both `janitor` and `d1-gateway` emit consistent JSON logs with worker name, status, duration, and timestamp.

### Story 4.1: Add Structured Logging to janitor

As a developer,
I want `workers/janitor.ts` to emit a structured JSON log on every invocation,
So that I can observe cron execution outcomes, durations, and failures from the Wrangler tail stream without parsing unstructured text.

**Acceptance Criteria:**

**Given** `janitor.ts` has Turso references removed (Story 2.3 complete)
**When** the janitor cron executes
**Then** it emits a `console.log(JSON.stringify({...}))` entry at invocation end containing at minimum: `worker: "janitor"`, `status: "success" | "error"`, `duration_ms: number`, `timestamp: string (ISO 8601)`
**And** on error, the log includes an `error` field with the error message string
**And** any task-specific fields (e.g., `jobs_discovered`, `jobs_queued`) are included alongside the standard fields
**And** `wrangler dev` confirms the worker completes within the 30ms CPU time limit after logging is added

### Story 4.2: Add Structured Logging to d1-gateway

As a developer,
I want `workers/d1-gateway.ts` to emit a structured JSON log on every request,
So that I can observe query latency, status, and errors without parsing unstructured output.

**Acceptance Criteria:**

**Given** `d1-gateway.ts` is unchanged from the consolidation (no Turso refs to remove)
**When** the d1-gateway handles any HTTP request
**Then** it emits a `console.log(JSON.stringify({...}))` entry at response time containing at minimum: `worker: "d1-gateway"`, `status: "success" | "error"`, `duration_ms: number`, `timestamp: string (ISO 8601)`
**And** the log shape is identical to the `janitor` log shape for the standard fields (consistent across fleet)
**And** on error, the log includes an `error` field with the error message string
**And** `wrangler dev` confirms p95 response time is not measurably degraded by the logging addition
