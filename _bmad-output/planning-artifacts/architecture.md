---
stepsCompleted: [1, 2, 3, 4]
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
