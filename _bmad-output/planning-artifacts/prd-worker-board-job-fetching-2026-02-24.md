---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
status: complete
completedAt: 2026-02-24
classification:
  projectType: api_backend
  domain: scientific / AI-ML
  complexity: medium
  projectContext: brownfield
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-nomadically.work-2026-02-23.md
  - _bmad-output/planning-artifacts/research/technical-worker-cron-failures-observability-research-2026-02-23.md
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 1
  brainstorming: 0
  projectDocs: 0
  projectContext: 0
---

# Product Requirements Document — nomadically.work: Board Job Fetch Fix

**Author:** Vadim
**Date:** 2026-02-24
**Project Type:** API backend / background pipeline worker
**Domain:** Scientific / AI-ML job aggregation pipeline
**Complexity:** Medium
**Context:** Brownfield — 7-worker polyglot infrastructure (TypeScript, Python, Rust/WASM)

## Executive Summary

The nomadically.work ATS ingestion pipeline discovers job boards via the Ashby crawler, then ingests jobs via cron workers — but a gap exists between boards *registered in D1* and boards *actually fetched on each cycle*. Some boards are silently skipped, leaving EU remote jobs invisible to end users. This initiative identifies the exact worker responsible, diagnoses the root cause (missing loop, premature abort, pagination cutoff, or silent error), and delivers a fix ensuring every registered board is attempted on every ingestion run.

The fix targets two gaps simultaneously: the functional gap (not all boards fetched) and the observability gap (failures expire silently in unmonitored DLQs after 4 days). The result is an aggregator that is *provably complete* per cycle — with per-board log evidence — rather than partially complete in an unknown state.

## Success Criteria

### User Success

- Every EU remote job from every registered ATS board is available in the job feed within 24h of posting
- No board is silently skipped — users see a complete picture of the market
- Zero "missing company" reports attributable to board fetch failures

### Business Success

- 100% of boards registered in D1 have at least one successful fetch attempt per ingestion cycle
- Board fetch failures are visible within the same cron cycle (not days later via DLQ expiry)
- Ingestion completeness is auditable post-fix — operator can confirm which boards were fetched per run

### Technical Success

- Root cause identified and documented before any code changes
- Fix verified against all three ATS board types (Greenhouse, Lever, Ashby)
- Minimum one structured log entry emitted per board fetch attempt (success or failure)
- No silent DLQ failures for board-related messages

### Measurable Outcomes

- Board fetch coverage: 100% of active `ats_sources` / `ashby_boards` rows attempted per cycle (baseline currently unknown)
- Time-to-detect fetch failure: from days (DLQ expiry) → same cron run
- Zero regression on boards currently ingesting successfully

## Product Scope

### MVP (Phase 1)

**Approach:** Problem-solving MVP — fix the specific failure causing boards to be skipped; add minimum logging to verify correctness.
**Resources:** Solo developer, single worker file change, no infrastructure additions.

**Must-have capabilities:**
1. Identify which worker owns board iteration (`janitor.ts` vs `insert-jobs.ts` vs ingestion layer)
2. Fix iteration logic: query all active boards from D1, loop each, catch errors per-board, continue on failure
3. Emit structured log per board: `{ boardId, atsType, jobsFetched, error? }`
4. Cover all three ATS types: Greenhouse, Lever, Ashby
5. Zero regression on currently-working boards

### Growth (Phase 2)

- Cloudflare Tail Worker alert on boards with 3+ consecutive fetch failures
- Per-board ingestion health visible in admin dashboard
- DLQ monitoring with auto-retry before 4-day expiry

### Vision (Phase 3)

- Full pipeline correlation IDs (board discovered → jobs fetched → classified → served)
- Automated board health scoring with self-healing retry strategies
- Board fetch frequency tuning per ATS type (rate-limit aware)

## User Journeys

### Journey 1: Vadim (Operator) — Discovers Missing Jobs

*Opening Scene:* Vadim notices a known EU remote company's jobs are absent from nomadically.work despite the company using Ashby. He confirms the board is registered in D1. Cron logs show no record of a fetch attempt for that board — he cannot distinguish "never tried" from "tried and failed silently."

*Rising Action:* He traces `workers/janitor.ts` and `src/ingestion/ashby.ts` to determine whether the worker iterates all board rows or a subset. The cron triggers ingestion, but he cannot confirm full coverage.

*Climax:* He finds the exact gap — hardcoded board list, early pagination cutoff, or an unhandled error aborting the loop for all subsequent boards.

*Resolution (post-fix):* Every board emits `[board:acme-corp] fetched 12 jobs` or `[board:acme-corp] ERROR: 429 rate limit` on every run. Nothing is silent.

---

### Journey 2: Vadim — Verifies Fix Correctness

*Opening Scene:* After deploying the fix, Vadim needs to confirm 100% board coverage without waiting for the next cron cycle.

*Rising Action:* He triggers the worker manually and inspects per-board log output.

*Climax:* Every board in D1 appears in logs as attempted — with job counts or error reasons.

*Resolution:* Verifiable coverage confirmation, not just "seems to work."

---

### Journey 3: Pipeline (System) — Happy Path Post-Fix

*Opening Scene:* Cron fires at midnight UTC. The janitor worker starts.

*Rising Action:* Worker queries D1 for all active ATS boards and iterates each. Each fetch logs start and result.

*Climax:* One Ashby board returns HTTP 500. The error is logged per-board; the loop continues to the next board.

*Resolution:* 99%+ of boards complete. The single failure is visible in logs for triage. No silent DLQ message.

---

### Journey 4: Vadim — Ongoing Ops Monitoring

*Opening Scene:* A week post-fix, Vadim checks for boards with persistent fetch failures.

*Rising Action:* He filters Cloudflare Worker logs by `[board:*] ERROR` across 7 days.

*Resolution:* One board shows repeated 429s. He adjusts fetch timing for that board — only possible because failures are now surfaced.

---

### Journey Requirements Summary

| Journey | Capabilities Required |
|---|---|
| Missing jobs discovery | Per-board loop audit, structured logging per board |
| Fix verification | Manual trigger capability, per-board log output |
| Pipeline happy path | Full board iteration, per-board error isolation, structured logs |
| Ops monitoring | Log queryability by board ID, error classification |

## Domain & Technical Constraints

### Technical Constraints

- **Reproducibility:** Each cron run produces an auditable per-board log (board ID + result) — any run can be reconstructed from logs
- **Validation:** Fix correctness confirmed by comparing D1 board count against boards logged as attempted per run (100% match = success)
- **Active board assumption:** Fix targets boards with active/enabled status; boards without a status column treated as active by default — confirm during implementation
- **Resource limits:** Sequential loop is safe for up to ~50 boards within Cloudflare's 30s CPU limit; evaluate queue-dispatch for larger sets

### Integration Constraints

- Fix uses existing D1 schema (`ats_sources` / `ashby_boards`) — no schema changes
- Logging uses existing `console.log` / structured output — no new logging infrastructure for MVP
- Fix respects existing rate-limit handling in `src/ingestion/{greenhouse,lever,ashby}.ts` — no duplicate logic

### Risk Register

| Risk | Mitigation |
|---|---|
| Single board error aborts loop | Wrap each board fetch in try/catch; log and continue |
| Board count exceeds CPU time budget | Check count in D1 first; implement queue-dispatch if >50 boards |
| Regression on currently-working boards | Compare log coverage counts before and after deploy |
| Unknown ATS rate limits (Ashby, Lever) | Per-board delay or respect `Retry-After` header |

## API Backend Technical Requirements

### Worker Architecture

- **Runtime:** TypeScript (Janitor or Insert-Jobs — determined during investigation)
- **Execution model:** Cron-triggered — fix must complete within Worker CPU limits
- **Interaction model:** Internal machine-to-machine only — no new external endpoints introduced

### Authentication

- D1 Gateway: `API_KEY` secret already in place — no changes
- ATS APIs: Greenhouse, Lever, Ashby secrets already configured — no changes
- No new authentication surface introduced

### Data Schema

| Direction | Schema |
|---|---|
| Input | `ats_sources` / `ashby_boards` D1 rows (board ID, ATS type, URL/token) |
| Output | Job rows via existing insertion logic in `src/ingestion/` |
| Logs | `{ boardId, atsType, jobsFetched, error? }` per board per run |

### Error Handling Matrix

| Scenario | Required Behavior |
|---|---|
| ATS API 429 (rate limit) | Log error with board ID, continue loop |
| ATS API 500 | Log error with board ID, continue loop |
| D1 write failure | Log error with board ID, continue loop |
| Board row malformed | Log warning, skip board, continue loop |

## Functional Requirements

### Board Iteration & Coverage

- **FR1:** The system queries all active ATS board records from D1 on each ingestion cycle
- **FR2:** The system iterates every board record returned from D1 — no hardcoded subsets, no premature termination
- **FR3:** The system dispatches a job-fetch operation per board, keyed by ATS type (Greenhouse / Lever / Ashby)
- **FR4:** The system continues board iteration when a single board fetch fails

### Per-Board Error Handling

- **FR5:** The system catches and isolates errors at the individual board level without propagating to the iteration loop
- **FR6:** The system classifies board fetch errors by type (rate limit, server error, auth failure, malformed data)
- **FR7:** The system skips malformed or incomplete board records and continues processing remaining boards

### Observability & Logging

- **FR8:** The system emits a structured log entry per board fetch attempt: board ID, ATS type, jobs fetched count or error reason
- **FR9:** An operator can identify which boards were attempted, succeeded, and failed from a single cron run's log output
- **FR10:** An operator can distinguish a board never attempted from one attempted and failed

### Investigation & Audit

- **FR11:** An operator can trace the board iteration entry point to a specific worker file and function
- **FR12:** An operator can manually trigger the board fetch loop outside of cron to verify fix correctness
- **FR13:** The system reports total boards attempted vs. total active boards in D1 per run (coverage ratio)

### ATS Compatibility

- **FR14:** The system fetches jobs from Greenhouse boards via the Greenhouse Jobs API
- **FR15:** The system fetches jobs from Lever boards via the Lever Postings API
- **FR16:** The system fetches jobs from Ashby boards via the Ashby Job Board API
- **FR17:** The system handles ATS-type-specific rate limiting without failing other board types

### Regression Safety

- **FR18:** All boards currently ingesting successfully continue to ingest after the fix
- **FR19:** The fix introduces no changes to the job insertion schema or downstream classification pipeline

## Non-Functional Requirements

### Performance

- **NFR1:** Sequential processing of up to 50 boards completes within 30 seconds; queue-dispatch required for larger board sets
- **NFR2:** Each per-board fetch times out independently after 10 seconds — one slow board does not block others
- **NFR3:** Total cron execution time stays within the scheduled interval (3h for Insert-Jobs, 24h for Janitor) to prevent overlapping runs

### Reliability

- **NFR4:** A single board fetch failure does not prevent processing of remaining boards (per-board fault isolation)
- **NFR5:** The iteration loop produces a log entry for 100% of boards attempted — zero silent skips
- **NFR6:** The fix does not introduce new DLQ messages — errors are handled synchronously per-board

### Scalability

- **NFR7:** The board iteration design handles up to 500 board records without architectural changes (queue-dispatch path activates beyond 50 boards)
- **NFR8:** Adding new ATS board types requires no changes to the iteration loop — dispatch is keyed by board type

### Integration Compatibility

- **NFR9:** The fix uses `createD1HttpClient()` and Drizzle ORM — no raw SQL strings
- **NFR10:** ATS integrations reuse existing rate-limit logic in `src/ingestion/{greenhouse,lever,ashby}.ts` — no duplication
