---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-02-23'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-nomadically.work-2026-02-23.md
  - _bmad-output/planning-artifacts/research/technical-worker-cron-failures-observability-research-2026-02-23.md
workflowType: 'architecture'
project_name: 'nomadically.work'
user_name: 'Vadim'
date: '2026-02-23'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
23 FRs across 6 capability areas. The heaviest architectural weight falls on Workflow Execution (FR6-FR10) and State Persistence (FR11-FR14) — these define the DO + LangGraph + D1 checkpoint engine. Task Management (FR1-FR5) and Output Generation (FR21-FR23) are standard CRUD + markdown rendering. Status Tracking (FR15-FR18) requires the worker to write status updates back to D1 as a side-effect of execution. Auth (FR19-FR20) reuses existing Clerk + `isAdminEmail()` patterns.

**Non-Functional Requirements:**
Performance NFRs (NFR1-NFR5) constrain the DO execution loop — 30s per Workers AI call, 2s per checkpoint write, 10 calls/min pacing, 6h max runtime, 1s UI query response. Reliability NFRs (NFR6-NFR10) mandate D1 as single source of truth with no progress loss on DO eviction. Integration NFRs (NFR11-NFR13) lock the worker to Cloudflare-native bindings and deploy-time context bundling.

**Scale & Complexity:**

- Primary domain: API backend + Cloudflare Worker (Durable Object)
- Complexity level: Medium — novel runtime architecture, narrow functional scope
- Estimated architectural components: 5 (Admin UI page, GraphQL resolvers, D1 schema, Python Worker, Durable Object)

### Technical Constraints & Dependencies

- **Pyodide runtime** — Python on Workers via Pyodide. 128MB memory ceiling. langchain-cloudflare + langgraph + pydantic must fit. Untested for multi-hour DO runs.
- **Workers AI free tier** — rate limits (per-minute caps), model selection limited to free models (Llama 3.3 70B, Qwen3 30B). No paid API fallback in MVP.
- **D1 free tier** — 100K writes/day. Deep Planner tasks well within budget (estimated ~60 checkpoint writes per full run).
- **DO alarm API** — schedules next execution cycle. Minimum granularity ~100ms. Enables pacing between LLM calls.
- **Existing D1 Gateway** — app already accesses D1 via gateway worker. Deep Planner worker uses direct D1 binding (not gateway).
- **Codebase context at deploy time** — CLAUDE.md, schemas bundled into worker. No runtime fetch of project files.
- **GraphQL codegen pipeline** — new schema requires `pnpm codegen` and generated types flow through existing Apollo infrastructure.

### Cross-Cutting Concerns Identified

- **D1 shared database** — both the Next.js app (via gateway) and the Deep Planner worker (via binding) read/write the same D1 database. Schema changes affect both. Task status must be consistent across both access paths.
- **Admin auth** — GraphQL resolvers use Clerk + `isAdminEmail()`. Worker HTTP endpoint needs its own auth (API key or shared secret) since it's called from the resolver, not from a browser.
- **Error taxonomy** — worker failures (DO eviction, Workers AI timeout, Pyodide crash, rate limit) need consistent status reporting back to D1 so the admin UI can display meaningful failure reasons.
- **Deploy coordination** — worker deploys (wrangler) and app deploys (Vercel) are independent. Schema changes require coordinated migration + deploy sequence.

## Starter Template Evaluation

### Primary Technology Domain

**Brownfield extension** — no greenfield starter template needed. The existing nomadically.work stack (Next.js 16 + Apollo Server 5 + Drizzle ORM + Cloudflare Workers) is fully established. The new Deep Planner component follows the existing Python Worker pattern already proven in `workers/process-jobs/` and `workers/resume-rag/`.

### Starter Options Considered

**Option 1: Follow existing `process-jobs` Python Worker pattern (Selected)**
- Already proven in production with the same bindings (D1, Workers AI)
- Uses `langchain-cloudflare` (`ChatCloudflareWorkersAI`, `ChatPromptTemplate`, LCEL chains)
- `langgraph-checkpoint-cloudflare-d1` already imported and used for checkpointing
- `workers` package for `Response`, `WorkerEntrypoint`
- Wrangler JSONC config with `python_workers` compatibility flag
- Single `src/entry.py` entry point pattern

**Option 2: langchain-cloudflare examples starter** — useful as reference but existing `process-jobs` is already derived from these examples. No additional value.

**Option 3: Custom scaffold from scratch** — unnecessary, the existing pattern is proven and matches needs exactly.

### Selected Starter: Existing Python Worker Pattern (`workers/process-jobs/`)

**Rationale:** The `process-jobs` worker already uses every library Deep Planner needs (langchain-cloudflare, LangGraph checkpointing, D1 binding, Workers AI binding). The new worker adds Durable Objects on top of this proven foundation.

**Initialization Command:**

```bash
mkdir -p workers/deep-planner/src
cp workers/process-jobs/wrangler.jsonc workers/deep-planner/wrangler.jsonc
```

**Architectural Decisions Provided by Existing Pattern:**

- **Language & Runtime:** Python 3.13 on Pyodide (`python_workers` compatibility flag)
- **Dependencies:** `langchain-cloudflare`, `langgraph-checkpoint-cloudflare-d1`, `pydantic`, `workers`
- **Build Tooling:** Wrangler JSONC config, Pyodide bundles at deploy
- **Code Organization:** Single `src/entry.py` entry point
- **Development Experience:** `wrangler dev` / `wrangler deploy` / `wrangler tail`
- **New for Deep Planner:** Durable Object class + `durable_objects` binding in wrangler config

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1. Durable Object execution loop architecture
2. Worker trigger + status communication pattern
3. D1 schema design (tasks table + checkpoint storage)
4. BMAD workflow encoding strategy

**Important Decisions (Shape Architecture):**
5. Codebase context bundling approach
6. Error handling & status reporting taxonomy
7. Workers AI model selection + prompt strategy

**Deferred Decisions (Post-MVP):**
- Multi-model routing (Workers AI → DeepSeek escalation)
- Cross-task learning / memory
- Feedback loop / re-kick with revision notes
- BMAD agent personas (PM, architect, QA roles)

### Data Architecture

**Decision: D1 Schema — Two-Table Design**

| Aspect | Decision |
|--------|----------|
| Task metadata | `deep_planner_tasks` table in existing D1 database |
| Checkpoint data | Separate `langgraph_checkpoints` table managed by `CloudflareD1Saver` |
| Rationale | Task metadata (status, timestamps, output) is queried by the app via D1 gateway. Checkpoint data is written/read only by the worker via D1 binding. Separate tables, same database. |

**`deep_planner_tasks` schema (Drizzle):**

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (ULID) | Primary key |
| `workflow_type` | text | `product_brief` (MVP), extensible |
| `problem_description` | text | User-provided problem statement |
| `context` | text | User-provided additional context |
| `status` | text | `pending` / `running` / `complete` / `failed` |
| `current_step` | text | Current BMAD step name (e.g., `vision`) |
| `checkpoint_count` | integer | Incremented per checkpoint write |
| `output_artifact` | text | Final markdown artifact |
| `error_message` | text | Failure reason (nullable) |
| `started_at` | text (ISO) | When worker began execution |
| `completed_at` | text (ISO) | When worker finished (nullable) |
| `created_at` | text (ISO) | Task creation timestamp |
| `updated_at` | text (ISO) | Last update timestamp |

**Checkpoint table** — managed entirely by `langgraph-checkpoint-cloudflare-d1`. Schema is owned by the library. Thread ID maps to task ID for correlation.

**Migration approach:** Drizzle schema → `pnpm db:generate` → `pnpm db:migrate` → `pnpm db:push`

### Authentication & Security

**Decision: API Key Auth for Worker Endpoint**

| Aspect | Decision |
|--------|----------|
| App → Worker auth | Shared API key (wrangler secret `API_KEY`), same pattern as D1 gateway |
| Worker → D1 auth | Direct D1 binding (no auth needed, same Cloudflare account) |
| Admin UI auth | Clerk + `isAdminEmail()` on all GraphQL resolvers (existing pattern) |
| Rationale | GraphQL resolver calls worker's HTTP endpoint. API key in `Authorization` header, validated in worker's `fetch()` handler. Same pattern as existing D1 gateway worker. |

### API & Communication Patterns

**Decision: GraphQL Mutation Triggers Worker, D1 Polling for Status**

| Aspect | Decision |
|--------|----------|
| Task creation | `createDeepPlannerTask` mutation → insert task row (status: `pending`) → HTTP POST to worker URL with task ID |
| Worker startup | Worker `fetch()` receives task ID → instantiates DO by task ID → DO begins BMAD execution |
| Status updates | DO writes status + checkpoint_count to `deep_planner_tasks` in D1 after each pass |
| Status polling | Admin UI polls `deepPlannerTask(id)` query every 10s while status is `running` |
| Completion | DO writes final artifact to `output_artifact` column, sets status to `complete` |
| Rationale | Polling is simple, sufficient for single admin user, avoids WebSocket complexity. D1 is the communication channel — worker writes, app reads. |

**GraphQL Schema:**

```graphql
type DeepPlannerTask {
  id: ID!
  workflowType: String!
  problemDescription: String!
  context: String
  status: DeepPlannerStatus!
  currentStep: String
  checkpointCount: Int!
  outputArtifact: String
  errorMessage: String
  startedAt: DateTime
  completedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum DeepPlannerStatus {
  PENDING
  RUNNING
  COMPLETE
  FAILED
}

extend type Query {
  deepPlannerTasks: [DeepPlannerTask!]!
  deepPlannerTask(id: ID!): DeepPlannerTask
}

extend type Mutation {
  createDeepPlannerTask(
    workflowType: String!
    problemDescription: String!
    context: String
  ): DeepPlannerTask!
}
```

### Infrastructure & Deployment

**Decision: Durable Object Execution Loop with Alarm-Based Pacing**

| Aspect | Decision |
|--------|----------|
| Execution model | Durable Object with alarm API for step-by-step pacing |
| Loop pattern | DO `alarm()` → load checkpoint from D1 → execute one LLM pass → save checkpoint → schedule next alarm → hibernate |
| Pacing | 6-second delay between alarms (10 calls/min, stays within Workers AI free tier) |
| Crash recovery | On next alarm after crash, DO loads last checkpoint from D1 and resumes |
| Max runtime | DO alarms can chain for hours — no 30s CPU limit concern because each alarm cycle is I/O-bound |
| Rationale | DO alarm API is the only Cloudflare primitive that supports hours-long execution. Each alarm is a fresh invocation — no accumulated memory pressure. D1 checkpoints mean DO state is reconstructable. |

**DO Lifecycle:**

```
1. fetch() → Receive task ID, validate API key
2. alarm() → Load state from D1 checkpoint
3. Execute one BMAD pass (Workers AI call)
4. Save checkpoint to D1 (CloudflareD1Saver)
5. Update task status in deep_planner_tasks
6. Schedule next alarm (6s delay)
7. Hibernate → repeat from step 2
8. On final step completion → write artifact, set status=complete
```

**Wrangler Config Additions:**

```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "DEEP_PLANNER",
        "class_name": "DeepPlannerDO"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_classes": ["DeepPlannerDO"]
    }
  ]
}
```

**Decision: BMAD Workflow Encoding — Hardcoded Python Templates**

| Aspect | Decision |
|--------|----------|
| Prompt storage | Python string constants in `src/prompts.py` |
| Workflow steps | Python enum/list: `INIT → VISION → USERS → SCOPE → METRICS → COMPLETE` |
| Multi-pass logic | Each step runs 3 passes: `draft` → `critique` → `refine`, each a separate Workers AI call |
| Codebase context | Bundled as static text files at deploy time, injected into system prompts |
| Rationale | For MVP with one workflow type, hardcoded prompts are simpler than a template engine. Refactor to D1-stored templates when adding multiple workflow types in Phase 2. |

**Decision: Codebase Context Bundling**

| Aspect | Decision |
|--------|----------|
| Files bundled | CLAUDE.md, `schema/**/*.graphql`, `src/db/schema.ts`, `_bmad/bmm/config.yaml` |
| Bundle method | Copy files into `workers/deep-planner/context/` at build time (pre-deploy script) |
| Injection | Loaded as Python strings, inserted into system prompt as `<codebase_context>` block |
| Size limit | Total context < 8K tokens (Workers AI context window constraint) |
| Rationale | Deploy-time bundling avoids runtime HTTP calls. Static files change rarely. |

### Decision Impact Analysis

**Implementation Sequence:**

1. D1 schema (Drizzle) — `deep_planner_tasks` table + migration
2. GraphQL schema + codegen — types, mutations, queries
3. GraphQL resolvers — CRUD + worker trigger
4. Admin UI page — create form, task list, artifact viewer
5. Worker scaffold — wrangler config, entry.py, DO class
6. BMAD prompts — step templates, multi-pass logic
7. DO execution loop — alarm chain, checkpoint integration
8. Codebase context bundling — pre-deploy script
9. Integration testing — end-to-end task creation → execution → artifact

**Cross-Component Dependencies:**

- D1 schema must be deployed before both app and worker can function
- GraphQL codegen must run after schema changes, before app build
- Worker URL must be configured as env var in the app (for resolver to call)
- Codebase context bundle must be generated before worker deploy

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

7 areas where AI agents could make different choices when implementing Deep Planner across the Python worker and TypeScript app boundary.

### Naming Patterns

**Database Naming (Existing Convention — Enforce):**
- Tables: `snake_case`, plural (`deep_planner_tasks`, not `DeepPlannerTask`)
- Columns: `snake_case` (`checkpoint_count`, `created_at`)
- Follows existing pattern: `jobs`, `companies`, `job_skill_tags`

**GraphQL Naming (Existing Convention — Enforce):**
- Types: `PascalCase` (`DeepPlannerTask`)
- Fields: `camelCase` (`checkpointCount`, `createdAt`)
- Enums: `SCREAMING_SNAKE` (`PENDING`, `RUNNING`)
- Mutations: `camelCase` verb-first (`createDeepPlannerTask`)
- Queries: `camelCase` noun-first (`deepPlannerTasks`)

**Python Worker Naming:**
- Files: `snake_case` (`entry.py`, `prompts.py`, `bmad_workflow.py`)
- Classes: `PascalCase` (`DeepPlannerDO`, `BmadWorkflow`)
- Functions: `snake_case` (`execute_pass`, `load_checkpoint`)
- Constants: `SCREAMING_SNAKE` (`BMAD_STEPS`, `MAX_PASSES_PER_STEP`)

**TypeScript App Naming (Existing Convention — Enforce):**
- Files: `kebab-case` (`deep-planner.ts`, `deep-planner-resolver.ts`)
- Components: `PascalCase` files and exports (`DeepPlannerPage.tsx`)
- Variables: `camelCase`
- Path alias: `@/*` maps to `./src/*`

### Structure Patterns

**New Files — Where Things Go:**

| Component | Path | Owner |
|-----------|------|-------|
| Drizzle schema addition | `src/db/schema.ts` (extend existing) | App |
| GraphQL schema | `schema/deep-planner/schema.graphql` | App |
| Resolvers | `src/apollo/resolvers/deep-planner.ts` | App |
| Admin UI page | `src/app/admin/deep-planner/page.tsx` | App |
| Worker entry | `workers/deep-planner/src/entry.py` | Worker |
| BMAD prompts | `workers/deep-planner/src/prompts.py` | Worker |
| Workflow logic | `workers/deep-planner/src/bmad_workflow.py` | Worker |
| DO class | `workers/deep-planner/src/durable_object.py` | Worker |
| Wrangler config | `workers/deep-planner/wrangler.jsonc` | Worker |
| Context bundle | `workers/deep-planner/context/` | Worker (generated) |
| Migration | `migrations/NNNN_add_deep_planner_tasks.sql` | App |

**Anti-Pattern: Do NOT put worker code in `src/` or app code in `workers/`.**

### Format Patterns

**D1 ↔ GraphQL Data Mapping:**

| D1 Column (snake_case) | GraphQL Field (camelCase) | Transform |
|------------------------|--------------------------|-----------|
| `workflow_type` | `workflowType` | Direct map in resolver |
| `problem_description` | `problemDescription` | Direct map in resolver |
| `checkpoint_count` | `checkpointCount` | Direct map |
| `output_artifact` | `outputArtifact` | Direct map |
| `error_message` | `errorMessage` | Direct map |
| `created_at` | `createdAt` | ISO string (no transform needed) |
| `status` | `status` | Map to enum (`pending` → `PENDING`) |

**Timestamps:** ISO 8601 strings everywhere. D1 stores text. GraphQL returns `DateTime` scalar (string). No integer timestamps.

**Status Enum Mapping:**
- D1: lowercase text (`pending`, `running`, `complete`, `failed`)
- GraphQL: uppercase enum (`PENDING`, `RUNNING`, `COMPLETE`, `FAILED`)
- Python: string constants matching D1 values
- Resolver maps between them

### Communication Patterns

**Worker Trigger Protocol:**

```
GraphQL Resolver → HTTP POST to worker URL
  Headers: { Authorization: "Bearer ${API_KEY}", Content-Type: "application/json" }
  Body: { "taskId": "ulid-here" }
  Response: { "status": "accepted" } (202)
```

- Resolver does NOT wait for worker completion — fire-and-forget after 202
- Worker validates API key, returns 401 if invalid
- Worker returns 404 if task ID not found in D1
- Worker returns 409 if task is already running

**D1 Status Update Protocol (Worker → D1):**
- Worker writes directly via D1 binding (not gateway)
- Update `status`, `current_step`, `checkpoint_count`, `updated_at` after each pass
- Write `output_artifact` only on completion (not partial updates)
- Write `error_message` only on failure

### Process Patterns

**Error Handling — Worker Side:**

| Error Type | D1 Status | Error Message Pattern |
|-----------|-----------|----------------------|
| Workers AI timeout | `failed` | `"Workers AI call timed out on step {step}, pass {pass}"` |
| Workers AI rate limit | Keep `running` | Retry with backoff (max 3 retries), then `failed` |
| Pyodide crash | `failed` | `"Runtime error: {exception}"` |
| DO eviction | Keep `running` | Next alarm resumes from checkpoint (no explicit error) |
| Invalid LLM output | Keep `running` | Log warning, retry the pass |
| D1 write failure | `failed` | `"Checkpoint write failed: {error}"` |

**Error Handling — App Side (Resolver):**
- Worker HTTP call failure → return task with status `pending` (let user retry)
- D1 query failure → throw GraphQL error with `INTERNAL_SERVER_ERROR` code
- Admin auth failure → throw GraphQL error with `FORBIDDEN` code

**Stale Status Detection:**
- If task status is `running` and `updated_at` is > 30 minutes old, UI shows "Stale — may have crashed"

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow existing naming conventions from CLAUDE.md (snake_case DB, camelCase GraphQL, kebab-case files)
- Place new files in the paths specified in the Structure Patterns table above
- Use Drizzle ORM for all DB queries — no raw SQL strings
- Use `isAdminEmail()` guard on all Deep Planner GraphQL operations
- Use ISO 8601 strings for all timestamps
- Map D1 snake_case columns to GraphQL camelCase fields in resolvers

**Anti-Patterns:**
- Never import worker code from `src/` or vice versa — they are separate deployments
- Never use the D1 gateway from the worker — use direct D1 binding
- Never store checkpoint data in the `deep_planner_tasks` table — that's `CloudflareD1Saver`'s job
- Never write raw SQL in resolvers — use Drizzle
- Never skip `pnpm codegen` after modifying `schema/deep-planner/schema.graphql`

## Project Structure & Boundaries

### FR Category → Component Mapping

| FR Category | Architectural Component | Location |
|------------|------------------------|----------|
| Task Management (FR1-FR5) | GraphQL resolvers + Admin UI | `src/apollo/resolvers/`, `src/app/admin/` |
| Workflow Execution (FR6-FR10) | Python Worker + DO | `workers/deep-planner/src/` |
| State Persistence (FR11-FR14) | CloudflareD1Saver + D1 | `workers/deep-planner/src/`, `src/db/schema.ts` |
| Status Tracking (FR15-FR18) | Resolvers + UI polling | `src/apollo/resolvers/`, `src/app/admin/` |
| Auth (FR19-FR20) | Existing Clerk + isAdminEmail | `src/apollo/resolvers/` (reuse) |
| Output Generation (FR21-FR23) | BMAD prompts + DO logic | `workers/deep-planner/src/` |

### New Files & Directories (Deep Planner Addition)

```
nomadically.work/                          # existing project root
├── migrations/
│   └── NNNN_add_deep_planner_tasks.sql    # NEW — Drizzle migration
├── schema/
│   └── deep-planner/
│       └── schema.graphql                 # NEW — GraphQL types, queries, mutations
├── scripts/
│   └── bundle-deep-planner-context.ts     # NEW — pre-deploy context bundler
├── src/
│   ├── app/
│   │   └── admin/
│   │       └── deep-planner/
│   │           └── page.tsx               # NEW — admin UI (create, list, view)
│   ├── apollo/
│   │   └── resolvers/
│   │       └── deep-planner.ts            # NEW — query + mutation resolvers
│   ├── db/
│   │   └── schema.ts                      # MODIFY — add deep_planner_tasks table
│   ├── graphql/
│   │   └── deep-planner.graphql           # NEW — client-side query/mutation documents
│   └── __generated__/                     # AUTO — regenerated by pnpm codegen
│       ├── hooks.tsx
│       ├── types.ts
│       └── resolvers-types.ts
└── workers/
    └── deep-planner/                      # NEW — entire directory
        ├── wrangler.jsonc                 # Worker + DO config
        ├── requirements.txt               # Python dependencies
        ├── src/
        │   ├── entry.py                   # Worker entrypoint (fetch handler → DO)
        │   ├── durable_object.py          # DeepPlannerDO class (alarm loop)
        │   ├── bmad_workflow.py            # BMAD step sequencer + multi-pass logic
        │   └── prompts.py                 # BMAD prompt templates (product brief)
        └── context/                       # GENERATED — bundled at deploy time
            ├── claude-md.txt              # CLAUDE.md content
            ├── graphql-schema.txt         # Merged schema/**/*.graphql
            └── db-schema.txt              # src/db/schema.ts content
```

### Architectural Boundaries

**Boundary 1: App ↔ Worker (HTTP)**

```
Next.js App (Vercel)  ──HTTP POST──→  Deep Planner Worker (Cloudflare)
     │                                       │
     │ reads D1 via gateway                  │ writes D1 via binding
     └──────────── D1 Database ──────────────┘
```

- App and worker never share code — separate runtimes (Node.js vs Pyodide)
- Communication is one-way: app triggers worker, worker writes to D1, app reads from D1
- No callback from worker to app — polling only

**Boundary 2: Worker Entrypoint ↔ Durable Object**

```
entry.py (fetch handler)
  │
  ├── Validates API key
  ├── Looks up task in D1
  └── Forwards to DO instance (by task ID)
        │
        DeepPlannerDO
        ├── alarm() → runs one BMAD pass
        ├── Reads/writes D1 (checkpoints + task status)
        └── Calls Workers AI (LLM inference)
```

- `entry.py` handles HTTP routing and auth only — no business logic
- `DeepPlannerDO` owns all execution logic — BMAD workflow, LLM calls, checkpointing
- DO is instantiated per task ID — one DO instance per running task

**Boundary 3: BMAD Workflow ↔ LLM Interface**

```
bmad_workflow.py                    prompts.py
  │                                    │
  ├── Step sequencer                   ├── System prompt templates
  ├── Multi-pass orchestration         ├── Step-specific prompts
  └── Output assembly                  └── Codebase context injection
        │
        └── ChatCloudflareWorkersAI (langchain-cloudflare)
```

- `bmad_workflow.py` decides what to do (step ordering, pass logic, completion detection)
- `prompts.py` decides what to say (prompt content, context injection)
- Neither module calls D1 or Workers AI directly — they return prompts/decisions, the DO handles execution

**Boundary 4: D1 Shared Database**

| Table | Written By | Read By |
|-------|-----------|---------|
| `deep_planner_tasks` | Worker (via binding) | App (via gateway), Worker (via binding) |
| `langgraph_checkpoints` | Worker (CloudflareD1Saver) | Worker (CloudflareD1Saver) |
| All other tables | App (via gateway) | App (via gateway) |

- Deep Planner tables are isolated from existing tables — no foreign keys to `jobs`, `companies`, etc.
- No risk of data contention — single writer (one DO per task)

### Data Flow

```
1. Admin UI → createDeepPlannerTask mutation
2. Resolver → INSERT into deep_planner_tasks (status: pending)
3. Resolver → HTTP POST to worker URL with task ID
4. Worker fetch() → validate API key → instantiate DO
5. DO alarm() loop:
   a. Load checkpoint from D1
   b. Determine current BMAD step + pass
   c. Build prompt (prompts.py + codebase context)
   d. Call Workers AI (ChatCloudflareWorkersAI)
   e. Save checkpoint (CloudflareD1Saver)
   f. Update task row (status, current_step, checkpoint_count)
   g. Schedule next alarm (6s) → hibernate
6. On completion: write output_artifact, set status=complete
7. Admin UI polls deepPlannerTask(id) → sees status=complete → renders artifact
```

### Development Workflow

| Action | Command | Notes |
|--------|---------|-------|
| Add DB table | Edit `src/db/schema.ts` → `pnpm db:generate` → `pnpm db:migrate` → `pnpm db:push` | |
| Add GraphQL schema | Edit `schema/deep-planner/schema.graphql` → `pnpm codegen` | |
| Dev worker locally | `cd workers/deep-planner && wrangler dev` | Needs D1 binding configured |
| Deploy worker | `wrangler deploy --config workers/deep-planner/wrangler.jsonc` | Run context bundler first |
| Bundle context | `pnpm tsx scripts/bundle-deep-planner-context.ts` | Pre-deploy step |
| Deploy app | `pnpm deploy` | Vercel |
| Stream worker logs | `wrangler tail --config workers/deep-planner/wrangler.jsonc` | |

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All decisions align — Python Worker + DO + D1 binding + Workers AI binding are Cloudflare-native with no conflicts. GraphQL mutations/queries use existing Apollo Server 5 + Drizzle patterns. Admin UI follows existing Next.js App Router + Radix UI + Clerk patterns.

**Pattern Consistency:** No contradictions — snake_case DB → camelCase GraphQL → PascalCase types consistent with existing codebase. Worker code in `workers/`, app code in `src/` — clean separation. API key for worker trigger, Clerk for admin UI — both proven patterns.

**Structure Alignment:** Project structure supports all decisions — DO class separate from entry point, BMAD prompts isolated in `prompts.py`, context bundle generated at deploy time.

### Requirements Coverage Validation

**Functional Requirements:** 23/23 covered. Task Mgmt (FR1-5) → resolvers + UI. Workflow Exec (FR6-10) → DO + bmad_workflow. State Persist (FR11-14) → CloudflareD1Saver. Status Track (FR15-18) → D1 writes + polling. Auth (FR19-20) → Clerk + API key. Output Gen (FR21-23) → prompts + context injection.

**Non-Functional Requirements:** 13/13 covered. Performance (NFR1-5) → DO pacing, D1 writes, 6h max. Reliability (NFR6-10) → D1 source of truth, alarm resume, error taxonomy. Integration (NFR11-13) → Cloudflare-native bindings, deploy-time bundling.

### Implementation Readiness Validation

**Decision Completeness:** All critical decisions documented with table schemas, GraphQL types, wrangler config snippets, and DO lifecycle. No ambiguous items.

**Structure Completeness:** Every new file has a defined path and owner. No orphan components.

**Pattern Completeness:** Naming, format, communication, and error handling patterns specified with examples and anti-patterns.

### Gap Analysis Results

**No Critical Gaps.**

**Important Gaps (non-blocking):**
1. Python DO support — validate early in PoC. Fallback: TypeScript DO that calls Python worker for LLM
2. Workers AI model selection per BMAD step — decide during implementation
3. Total prompt size validation — codebase context + BMAD prompt + artifact must fit model context window

### Architecture Completeness Checklist

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — brownfield project with proven patterns, narrow scope, single user

**Key Strengths:**
- Builds on proven Python Worker pattern (process-jobs)
- Clean architectural boundaries — app and worker fully independent
- D1 as single source of truth eliminates state management complexity
- DO alarm loop is crash-resilient by design
- All 36 requirements (23 FR + 13 NFR) have explicit architectural coverage

**Areas for Future Enhancement:**
- Python DO stability validation (early PoC priority)
- Workers AI model benchmarking per BMAD step
- Monitoring/alerting (post-MVP)
- Multi-workflow type support (Phase 2)
