---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
status: complete
completedAt: 2026-02-24
workflowType: 'prd'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-nomadically.work-2026-02-23.md
  - _bmad-output/planning-artifacts/research/technical-worker-cron-failures-observability-research-2026-02-23.md
  - _bmad-output/planning-artifacts/architecture.md
documentCounts:
  briefs: 1
  research: 1
  brainstorming: 0
  projectDocs: 1
  projectContext: 0
classification:
  projectType: api_backend
  domain: scientific / AI-ML
  complexity: medium
  projectContext: brownfield
---

# PRD: Workers Consolidation — nomadically.work

**Author:** Vadim
**Date:** 2026-02-24
**Project Type:** API Backend / Infrastructure · **Domain:** Scientific / AI-ML · **Complexity:** Medium · **Context:** Brownfield

---

## Executive Summary

nomadically.work operates **7+ Cloudflare Workers** across three runtimes (TypeScript, Python/LangGraph, Rust/WASM). The fleet has grown organically and now carries dead weight: `insert-jobs` still references Turso (libsql) post-D1 migration, `promptfoo-eval` is on-demand only and rarely deployed, and `janitor` and `insert-jobs` have overlapping ingestion responsibilities. Separate `wrangler` configs, deployment pipelines, and cron schedules create disproportionate maintenance overhead for a solo developer and expand the surface area for silent failures.

This initiative audits all workers, identifies consolidation opportunities within runtime constraints, retires dead code, and produces a leaner fleet — fewer configs to deploy, fewer failure points to monitor, clearer separation of concerns.

### Differentiator

Runtime boundaries are the hard constraint: TypeScript workers can merge freely; Python and Rust/WASM workers are architecturally isolated. The consolidation strategy respects these boundaries — merging within runtimes where functions are complementary, retiring where functionality is already covered (D1 gateway replacing Turso), leaving cross-runtime workers untouched. The result is a **right-sized fleet**: each worker has a single, non-overlapping responsibility.

---

## Success Criteria

### User Success

- Developer deploys the full workers fleet with **≤5 `wrangler deploy` commands** (down from 7+)
- Each worker's responsibility is describable in one sentence — no ambiguity
- No dead-code workers remain; `insert-jobs` (Turso/legacy) is fully retired
- `workers/` directory structure is self-documenting — contributors understand the fleet at a glance

### Business Success

- Zero regression in job ingestion pipeline throughput post-consolidation
- Cloudflare Worker invocation count reduced (removing idle/legacy workers reduces billing surface)
- Cron job failure rate at or below pre-consolidation baseline
- Ships within a single sprint with no production downtime

### Technical Success

- TypeScript workers reduced from 4 (`janitor`, `d1-gateway`, `insert-jobs`, `promptfoo-eval`) to ≤3
- `insert-jobs` fully deleted — no `@libsql/client` or Turso references remain
- Python workers (`process-jobs`, `resume-rag`) remain isolated; Rust/WASM `ashby-crawler` untouched
- All surviving workers have a single, clearly named `wrangler.*.toml` config

### Measurable Outcomes

| Metric | Before | Target |
|---|---|---|
| Wrangler configs | 7+ | ≤5 |
| Workers referencing Turso | 2 | 0 |
| Ambiguous worker responsibilities | 2+ | 0 |
| Deploy commands for full fleet | 7+ | ≤5 |

---

## Product Scope

### MVP (Phase 1)

1. **Worker audit** — inventory all workers: runtime, trigger type, queue bindings, active/legacy status
2. **`insert-jobs` retirement** — delete worker code, `wrangler.insert-jobs.toml`, `@libsql/client` dep, CF dashboard queue consumer
3. **Turso reference purge** — remove all Turso/libsql refs from `janitor` and any surviving TS workers
4. **`promptfoo-eval` decision** — retire or migrate to Next.js API route; audit for consumers first
5. **`CLAUDE.md` workers table update** — every entry reflects a living, functional worker
6. **`package.json` deploy scripts audit** — one unambiguous command per worker, no dead scripts

### Growth (Phase 2)

- Unified structured logging across surviving TypeScript workers
- Shared utility module for common bootstrap code (D1 client, auth check)
- Worker health summary in admin UI

### Vision (Phase 3)

- Single TypeScript "platform worker" consolidating janitor + future cron jobs via internal dispatcher
- OpenTelemetry traces across all workers feeding a central collector

---

## User Journeys

### Journey 1: Deploy after a week away (Primary — current pain)

Vadim wants to push a small tweak to the janitor cron schedule. He opens the repo: `wrangler.toml`, `wrangler.d1-gateway.toml`, `wrangler.insert-jobs.toml`, `wrangler.promptfoo.toml`, plus configs buried in `workers/`. He can't recall which is "the main one." He runs `wrangler deploy` — wrong one. He checks `package.json` and finds three different deploy commands. Twenty minutes later he's deployed the right worker but also accidentally re-deployed `insert-jobs`, which silently does nothing because it points at a dead Turso database.

**After:** One command deploys the platform worker. One deploys the D1 gateway. Python and Rust workers have clearly named configs. Deploy scripts are documented in one place.

### Journey 2: Pipeline fails silently at 2am (Primary — failure recovery)

Janitor fires at midnight UTC, triggers ATS ingestion. Downstream, `insert-jobs` picks up the queue message and tries to insert into Turso — unreachable. The job fails, retries, dead-letters. No alert fires. By morning, 40 jobs are missing. Vadim reconstructs what happened by digging through logs across 4 workers.

**After:** `insert-jobs` is retired. Queue messages go directly to the D1 gateway path. Fewer workers = fewer failure surfaces. Surviving workers emit structured logs that trace a job's lifecycle end-to-end.

### Journey 3: Contributor reads the codebase (Secondary — new developer orientation)

A developer forks the repo. They see `workers/` contains `process-jobs/`, `resume-rag/`, `ashby-crawler/`, `deep-planner/`. Root contains `wrangler.toml` (janitor?), `wrangler.d1-gateway.toml`, `wrangler.insert-jobs.toml`. They open `CLAUDE.md`: "`insert-jobs` still uses Turso (legacy)." They don't know if they should run it. They skip it. Things work anyway.

**After:** The workers table in `CLAUDE.md` is clean. Every entry is a living worker. Contributors clone and deploy with confidence.

### Journey 4: Automated ingestion pipeline runs (System — happy path)

Every midnight: janitor fires → discovers new ATS jobs → pushes to queue → process-jobs classifies → writes to D1. The pipeline has a ghost: `insert-jobs` listening on the same queue, burning invocations, doing nothing useful.

**After:** Each pipeline step maps to exactly one worker. No ghost listeners. Queue consumers documented in `CLAUDE.md`.

---

## Technical Constraints & Integration Requirements

### Cloudflare Workers Platform Constraints

- **Runtime isolation:** TypeScript (V8), Python (Pyodide), Rust (WASM) are separate environments — consolidation is only possible within the same runtime. Hard architectural boundary.
- **CPU time limits:** 30ms CPU per invocation on paid plan. Any merged TS worker must be benchmarked with `wrangler dev` before production deploy.
- **Memory limits:** 128MB per invocation — relevant for `process-jobs` (LangGraph) and `resume-rag` (Vectorize); both stay isolated.
- **Queue consumers:** One consumer worker per queue. Changing queue consumers requires updating bindings in the CF dashboard, not just config files.
- **Bindings are per-worker:** D1, KV, Vectorize, and AI bindings declared per `wrangler.toml`. Merging workers requires auditing for binding name collisions.

### API Contract Preservation

- `d1-gateway` HTTP POST `/query` and `/batch` — URL and `API_KEY` auth contract must not change
- `janitor` cron schedule and ATS ingestion trigger logic must remain functionally identical
- `insert-jobs` queue consumer binding must be removed from CF dashboard after retirement (deleting code is insufficient)
- Queue message payload schemas must remain byte-identical — no field renames, type changes, or additions
- `d1-gateway` base URL must remain unchanged in Vercel env vars — no app redeployment needed

### Implementation Constraints

- All TypeScript workers share the `pnpm` workspace — merging is a config + code relocation exercise
- `workers/` subdirectory workers have their own `package.json` — handled independently from root-level workers
- `scripts/deploy.ts` must be updated to reflect the final fleet topology
- No secrets in source control — all `TURSO_*` and `API_KEY` values stay in CF dashboard / `.env.local`

### Risk Mitigations

| Risk | Mitigation |
|---|---|
| Merged worker exceeds CPU budget | Benchmark with `wrangler dev` before deploying |
| Ghost queue consumer remains after retirement | Audit CF dashboard queue consumers post-retirement |
| `promptfoo-eval` has hidden consumers | Grep CI configs, scripts, and cron before retiring |
| Dead Turso bindings remain in wrangler configs | Grep all `wrangler.*.toml` for `TURSO_` env vars |
| Binding name collision in merged worker | Audit all binding names across configs before merging |

---

## Functional Requirements

### Worker Fleet Audit

- **FR1:** Developer can view a complete inventory of all workers: name, runtime, trigger type (cron/queue/HTTP/on-demand), queue bindings, and status (active/legacy/uncertain)
- **FR2:** Developer can identify workers with overlapping responsibilities or redundant queue consumer registrations
- **FR3:** Developer can determine the exact dependency chain between workers (producer → consumer relationships)

### Worker Retirement

- **FR4:** Developer can retire `insert-jobs` with all artifacts removed: worker code, `wrangler.insert-jobs.toml`, CF dashboard queue consumer, and `@libsql/client` dependency
- **FR5:** Developer can retire or migrate `promptfoo-eval` after confirming no external consumers reference it
- **FR6:** Job ingestion pipeline processes correctly after worker retirement — no regression in throughput

### Dependency Cleanup

- **FR7:** Developer can identify all Turso/libsql references across the workers codebase: `wrangler.*.toml` env vars, TypeScript imports, `package.json` deps
- **FR8:** Developer can remove all Turso/libsql references from surviving workers without breaking functionality
- **FR9:** No `@libsql/client` or `TURSO_*` environment variables remain in any wrangler config or worker code post-consolidation

### Configuration Management

- **FR10:** Developer deploys each surviving worker using a single, clearly named `wrangler.*.toml` config
- **FR11:** Developer identifies the correct deploy command for any worker from `package.json` or `CLAUDE.md` without ambiguity
- **FR12:** All surviving wrangler configs list only active, valid bindings — no dead KV, Queue, or D1 entries
- **FR13:** Developer deploys the entire TypeScript workers fleet with ≤3 distinct `wrangler deploy` commands

### Pipeline Integrity

- **FR14:** CF dashboard queue consumer registrations match the surviving workers exactly — no ghost consumers
- **FR15:** All queue message formats remain unchanged — consumers receive identical payloads as before
- **FR16:** `d1-gateway` HTTP endpoint URL and `API_KEY` auth contract remain unchanged
- **FR17:** `janitor` cron schedule and ATS ingestion trigger logic remain functionally identical after any refactoring

### Documentation & Observability

- **FR18:** `CLAUDE.md` workers table contains an accurate entry for every surviving worker — no legacy entries
- **FR19:** Developer traces a job through the ingestion pipeline by reading only the workers table — each step maps to exactly one worker
- **FR20:** Surviving TypeScript workers emit structured logs with at minimum: `worker_name`, `status`, `duration_ms` per invocation

---

## Non-Functional Requirements

### Performance

- Surviving TypeScript workers complete within Cloudflare's 30ms CPU time limit — verified via `wrangler dev` benchmark before production deploy
- `d1-gateway` p95 response time does not increase post-consolidation — baseline measured before changes begin
- `janitor` cron completes within the 30s wall-clock limit — verified if logic is added during any merge

### Security

- `d1-gateway` `API_KEY` remains the sole auth mechanism — no new auth surface introduced
- No secrets committed to source control — all secrets stay in CF dashboard / `.env.local`
- `insert-jobs` retirement does not expose queue endpoints — verify no public routes are opened

### Reliability

- Zero production downtime — workers are retired/deployed independently, no coordinated cutover
- Job ingestion throughput does not drop below pre-consolidation baseline for 48h post-deployment — monitored via CF analytics
- No increase in dead-lettered queue messages post-consolidation — any spike indicates a missed queue consumer

### Integration

- Queue message payload schemas remain byte-identical — no field renames, type changes, or additions
- `d1-gateway` base URL unchanged in Vercel environment variables
- Cloudflare binding names in surviving `wrangler.toml` files match worker code exactly — mismatches are silent runtime failures
