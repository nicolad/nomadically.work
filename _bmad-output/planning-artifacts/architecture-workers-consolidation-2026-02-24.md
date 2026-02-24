---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-02-24'
project_name: 'nomadically.work'
user_name: 'Vadim'
date: '2026-02-24'
inputDocuments:
  - _bmad-output/planning-artifacts/prd-workers-consolidation-2026-02-24.md
  - _bmad-output/planning-artifacts/research/technical-worker-cron-failures-observability-research-2026-02-23.md
---

# Architecture Decision Document
## Workers Consolidation — nomadically.work

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
20 FRs across 5 areas — audit, retirement, cleanup, config management, and documentation. No requirements introduce new system capabilities; all FRs describe removal, simplification, or verification of existing components.

**Non-Functional Requirements:**
- Performance: 30ms CPU budget enforced per worker; d1-gateway p95 baseline must not regress
- Security: API_KEY auth contract preserved; no secrets in source control
- Reliability: Zero downtime deployment; 48h pipeline monitoring post-consolidation; no dead-letter spike
- Integration: Byte-identical queue schemas; stable d1-gateway URL; exact binding name match between configs and code

**Scale & Complexity:**
- Primary domain: Infrastructure / Cloudflare Workers platform operations
- Complexity level: Low — targeted retirement and cleanup, no new infrastructure
- Estimated architectural components: 4 (TypeScript workers layer, CF Queue bindings, wrangler configs, deployment scripts)

### Technical Constraints & Dependencies

- **Runtime isolation:** TypeScript (V8), Python (Pyodide), Rust (WASM) — consolidation only within same runtime
- **Queue consumer:** One consumer per CF Queue — dashboard update required independently of code changes
- **Binding declarations:** Per-worker in `wrangler.toml` — merging workers requires collision audit
- **Deployment topology:** Workers are independently deployable — no coordinated cutover needed
- **pnpm workspace:** Root-level TS workers share workspace; `workers/` subdirectory workers have isolated `package.json`

### Cross-Cutting Concerns Identified

- **Queue consumer integrity** — affects `insert-jobs` retirement and any future queue consumer changes
- **Turso/libsql removal** — spans `janitor`, `insert-jobs`, and potentially `wrangler.*.toml` env var declarations
- **Binding name consistency** — affects any wrangler config merge or rename
- **Deploy script coherence** — spans `package.json`, `scripts/deploy.ts`, and `CLAUDE.md`

## Starter Template Evaluation

### Primary Technology Domain

Infrastructure / Cloudflare Workers — refactoring existing workers, no new project initialization required.

### Starter Options Considered

Not applicable. This is a brownfield cleanup of an existing multi-runtime workers fleet. All workers already exist; the work is retirement, config consolidation, and dependency removal.

### Existing Tech Foundation (Governs All Implementation)

**TypeScript Workers (janitor, d1-gateway, promptfoo-eval):**
- Runtime: Cloudflare Workers (V8 isolate)
- Language: TypeScript 5.9
- Tooling: Wrangler CLI, pnpm workspace
- Config: `wrangler.*.toml` at repo root

**Python Workers (process-jobs, resume-rag):**
- Runtime: Cloudflare Workers (Python/Pyodide)
- Tooling: Wrangler CLI, `wrangler.jsonc` in `workers/` subdirectory
- Status: **Untouched** by this initiative

**Rust/WASM Worker (ashby-crawler):**
- Runtime: Cloudflare Workers (WASM)
- Tooling: `worker-build`, Cargo, `wrangler.toml` in `workers/ashby-crawler/`
- Status: **Untouched** by this initiative

**Deployment Pipeline:**
- Deploy script: `scripts/deploy.ts` (run via `pnpm deploy`)
- Commands: `wrangler deploy --config <file>` per worker
- Package manager: pnpm 10.10

**Note:** No project initialization story needed. First implementation story is the worker audit (FR1–FR3).

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Final workers fleet topology — defines what gets retired vs kept
- Queue consumer audit — must precede `insert-jobs` retirement
- `promptfoo-eval` migration target — determines retirement vs Next.js API route

**Important Decisions (Shape Architecture):**
- Wrangler config naming convention — standardize before renaming
- `janitor` Turso reference removal scope

**Deferred Decisions (Post-MVP):**
- Unified structured logging implementation
- Shared utility module for worker bootstrap code

### Workers Fleet Topology

**Final fleet (target state):**

| Worker | Action | Rationale |
|---|---|---|
| `janitor` | **Keep — cleanup only** | Cron worker, lightweight, clear responsibility. Remove Turso refs only. |
| `d1-gateway` | **Keep — no changes** | HTTP on-demand, separate scaling profile from cron. Cannot merge with janitor. |
| `insert-jobs` | **Retire completely** | Dead weight post-D1 migration. Turso is gone; queue responsibilities absorbed by existing workers. |
| `promptfoo-eval` | **Retire + migrate to Next.js API route** | On-demand HTTP only, no cron. `/api/eval` route in existing Vercel deploy — no worker needed. |
| `process-jobs` | **Untouched** | Python runtime, separate domain. |
| `resume-rag` | **Untouched** | Python runtime, Vectorize-dependent. |
| `ashby-crawler` | **Untouched** | Rust/WASM, standalone by design. |

**Result: 2 active TypeScript workers** (down from 4), 2 Python workers, 1 Rust worker.

### Authentication & Security

- `d1-gateway` `API_KEY` auth contract unchanged — no new auth surface
- No secrets in wrangler configs — all secrets remain in CF dashboard / `.env.local`
- `insert-jobs` retirement does not open any new public routes (queue-triggered only; no HTTP handler)

### API & Communication Patterns

- `d1-gateway` HTTP POST `/query` and `/batch` — contract preserved, URL unchanged
- `promptfoo-eval` HTTP interface migrated to Next.js API route `/api/eval` — same HTTP contract, different runtime
- Queue message formats byte-identical — no changes to producer or consumer payload schemas
- `janitor` → Queue → `process-jobs` chain preserved exactly

### Infrastructure & Deployment

**Wrangler Config Naming Convention (standardized):**
- `wrangler.janitor.toml` — rename from `wrangler.toml` (eliminates ambiguity)
- `wrangler.d1-gateway.toml` — already correct, no change

**Deploy Commands (post-consolidation):**
```bash
wrangler deploy --config wrangler.janitor.toml
wrangler deploy --config wrangler.d1-gateway.toml
# Python + Rust workers deploy from their own subdirectories
```

**`scripts/deploy.ts` and `CLAUDE.md`** updated to reflect the final 2-command TypeScript deploy.

### Queue Consumer Architecture

**Pre-consolidation:** `janitor` (producer) → Queue → `insert-jobs` (consumer) + `process-jobs` (consumer)
**Post-consolidation:** `janitor` (producer) → Queue → `process-jobs` (consumer only)

`insert-jobs` queue consumer binding removed from CF dashboard as part of retirement (code deletion alone is insufficient — FR14).

**Audit gate:** Before retiring `insert-jobs`, verify via CF dashboard that no other active queues have `insert-jobs` as their sole consumer (FR1 audit covers this).

### Decision Impact Analysis

**Implementation Sequence:**
1. Audit all workers and queue consumers (FR1–FR3) — unblocks all subsequent decisions
2. Retire `insert-jobs` — remove code, config, CF dashboard consumer, `@libsql/client` dep (FR4, FR7–FR9)
3. Purge remaining Turso refs from `janitor` (FR8)
4. Migrate `promptfoo-eval` to Next.js API route, then retire worker (FR5)
5. Rename `wrangler.toml` → `wrangler.janitor.toml`, update `package.json` scripts (FR10–FR13)
6. Update `CLAUDE.md` workers table (FR18–FR19)
7. Add structured logging to `janitor` and `d1-gateway` (FR20)

**Cross-Component Dependencies:**
- Steps 2–4 are independent of each other and can proceed in any order after step 1
- Step 5 depends only on step 4 being complete (promptfoo config rename)
- Step 6 and 7 are documentation tasks, can happen at any point after step 1

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 5 areas where AI agents could make different choices — config naming, binding references, log format, retirement order, and Turso grep scope.

### Naming Patterns

**Wrangler Config Naming:**
- Pattern: `wrangler.<worker-name>.toml` — all root-level workers
- ✅ `wrangler.janitor.toml`, `wrangler.d1-gateway.toml`
- ❌ `wrangler.toml` (ambiguous), `wrangler.promptfoo.toml` (non-standard)
- Workers in `workers/` subdirectory keep their own internal `wrangler.toml` — no rename needed

**Worker Name Consistency:**
- The `name` field in `wrangler.*.toml` must match the filename: `name = "janitor"` in `wrangler.janitor.toml`
- Binding names in worker code must exactly match binding declarations in `wrangler.*.toml` — mismatches are silent runtime failures

**Package.json Script Naming:**
- Pattern: `deploy:<worker-name>` for individual worker deploy scripts
- ✅ `deploy:janitor`, `deploy:d1-gateway`
- `pnpm deploy` (via `scripts/deploy.ts`) orchestrates all workers

### Structure Patterns

**Root-level vs Subdirectory Workers:**
- Root-level TypeScript workers: entry points + `wrangler.*.toml` at repo root
- Subdirectory workers (`workers/`): self-contained with own `package.json`, `wrangler.toml` inside the directory — never modify these from the root context

**Retirement Order (mandatory sequence):**
1. Remove worker code and entry point
2. Delete `wrangler.*.toml` config
3. Remove from `package.json` scripts and `scripts/deploy.ts`
4. Remove CF dashboard queue consumer binding (independent of code)
5. Update `CLAUDE.md` workers table
6. Remove package dependency (e.g., `@libsql/client`) — only after verifying no other worker uses it

### Format Patterns

**Structured Log Format (all surviving TS workers):**
```typescript
// Consistent shape across janitor and d1-gateway
console.log(JSON.stringify({
  worker: "janitor",          // matches wrangler config name
  status: "success" | "error",
  duration_ms: number,
  timestamp: new Date().toISOString(),
  // ...task-specific fields
}));
```

**Queue Message Format:**
- Preserve all existing payload schemas byte-identical — no field renames, additions, or type changes
- If a queue message schema must change, it is a breaking change and out of scope for this initiative

### Process Patterns

**Turso Reference Grep Scope:**
When purging Turso references, always check ALL of the following:
```bash
grep -r "libsql\|turso\|TURSO_\|@libsql" \
  wrangler.*.toml workers/*.toml workers/**/*.toml \
  package.json workers/*/package.json \
  *.ts workers/*.ts workers/**/*.ts
```

**Retirement Verification Checklist:**
Before marking any worker as retired:
- [ ] Code deleted from repo
- [ ] `wrangler.*.toml` deleted
- [ ] `package.json` scripts updated
- [ ] `scripts/deploy.ts` updated
- [ ] CF dashboard queue consumer removed (manual step — cannot be scripted)
- [ ] `CLAUDE.md` workers table updated
- [ ] `pnpm build` passes with no TS errors

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow the retirement checklist in order — never skip the CF dashboard step
- Use `wrangler dev` to benchmark any modified worker before deploying to production
- Preserve queue message schemas exactly — no "improving" payload structures
- Match binding names in code to wrangler config declarations exactly

**Anti-Patterns:**
- ❌ Deleting worker code without removing CF dashboard queue consumer
- ❌ Renaming wrangler config without updating `name` field inside it
- ❌ Removing `@libsql/client` before verifying no other worker imports it
- ❌ "Improving" queue message schemas during retirement

## Project Structure & Boundaries

### Complete Project Directory Structure

**Before (current state — files to be changed):**
```
nomadically.work/
├── wrangler.toml                    ← RENAME to wrangler.janitor.toml
├── wrangler.d1-gateway.toml         ← keep, no changes
├── wrangler.insert-jobs.toml        ← DELETE
├── wrangler.promptfoo.toml          ← DELETE (worker retired)
├── package.json                     ← UPDATE deploy scripts
├── scripts/
│   └── deploy.ts                    ← UPDATE worker list
├── workers/
│   ├── janitor.ts                   ← MODIFY: remove Turso refs, add structured logging
│   ├── d1-gateway.ts                ← MODIFY: add structured logging only
│   ├── insert-jobs.ts               ← DELETE
│   ├── process-jobs/                ← untouched
│   ├── resume-rag/                  ← untouched
│   ├── ashby-crawler/               ← untouched
│   └── deep-planner/                ← untouched
├── src/
│   └── app/
│       └── api/
│           └── (no eval route yet)  ← ADD /api/eval route (promptfoo migration)
└── CLAUDE.md                        ← UPDATE workers table
```

**After (target state):**
```
nomadically.work/
├── wrangler.janitor.toml            ✓ renamed, Turso refs removed
├── wrangler.d1-gateway.toml         ✓ unchanged
├── package.json                     ✓ deploy scripts: deploy:janitor, deploy:d1-gateway
├── scripts/
│   └── deploy.ts                    ✓ 2 TS workers only
├── workers/
│   ├── janitor.ts                   ✓ clean: no libsql, structured logging added
│   ├── d1-gateway.ts                ✓ structured logging added
│   ├── process-jobs/                ✓ untouched
│   ├── resume-rag/                  ✓ untouched
│   ├── ashby-crawler/               ✓ untouched
│   └── deep-planner/                ✓ untouched
├── src/
│   └── app/
│       └── api/
│           └── eval/
│               └── route.ts         ✓ promptfoo eval migrated here
└── CLAUDE.md                        ✓ workers table updated
```

### Architectural Boundaries

**API Boundaries:**
- `d1-gateway`: HTTP POST `/query`, `/batch` — external boundary, contract frozen
- `/api/eval` (Next.js): replaces `promptfoo-eval` worker — same HTTP contract, Vercel runtime
- `janitor`: no HTTP boundary — cron-only, internal

**Service Boundaries:**
- TypeScript workers (root) ↔ CF D1 via `d1-gateway` HTTP — no direct D1 binding in janitor
- `janitor` → CF Queue (producer) → `process-jobs` (consumer) — chain preserved
- Python and Rust workers: isolated; no shared code with TypeScript workers

**Data Boundaries:**
- No schema changes — all D1 interactions remain Drizzle ORM typed
- Queue message payloads: frozen schemas, no modifications permitted

### Requirements to Structure Mapping

| FR Category | Files Affected |
|---|---|
| Worker Fleet Audit (FR1–FR3) | `CLAUDE.md`, CF dashboard (read-only audit) |
| Worker Retirement (FR4–FR6) | `workers/insert-jobs.ts` (delete), `wrangler.insert-jobs.toml` (delete), `wrangler.promptfoo.toml` (delete), CF dashboard |
| Dependency Cleanup (FR7–FR9) | `workers/janitor.ts`, `package.json`, all `wrangler.*.toml` |
| Configuration Management (FR10–FR13) | `wrangler.toml` → `wrangler.janitor.toml`, `package.json`, `scripts/deploy.ts` |
| Documentation & Observability (FR18–FR20) | `CLAUDE.md`, `workers/janitor.ts`, `workers/d1-gateway.ts` |

### Integration Points

**Internal Communication:**
- `janitor` → Queue binding (CF) → `process-jobs` via queue message
- Next.js app → `d1-gateway` via HTTP (env var `D1_GATEWAY_URL`)
- `/api/eval` → Promptfoo library (direct import, no worker hop)

**External Integrations:**
- CF Dashboard: must be updated manually for queue consumer de-registration — cannot be scripted or automated
- Vercel: no env var changes needed (d1-gateway URL stable)

**Data Flow:**
```
janitor (cron) → CF Queue → process-jobs (Python)
                ↓
Next.js app → d1-gateway (HTTP) → CF D1
                ↓
/api/eval → Promptfoo → (evaluation output)
```

