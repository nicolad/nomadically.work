---
stepsCompleted: [1, 2, 3, 4]
status: complete
completedAt: '2026-02-23'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
---

# nomadically.work - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for nomadically.work Deep Planner, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1: Admin can create a deep planner task by specifying workflow type, problem description, and context
- FR2: Admin can view a list of all deep planner tasks with their current status
- FR3: Admin can view a single task's full output artifact as rendered markdown
- FR4: Admin can see checkpoint count and timestamps for each task
- FR5: System assigns "pending" status to newly created tasks
- FR6: System can execute a BMAD product brief workflow autonomously without human input
- FR7: System executes each BMAD step through multiple passes (draft → self-critique → refine → finalize)
- FR8: System injects codebase context (CLAUDE.md, GraphQL schema, DB schema) into planning prompts
- FR9: System uses free Workers AI models for all LLM inference
- FR10: System paces LLM calls to stay within Workers AI rate limits
- FR11: System checkpoints workflow state to D1 after each pass
- FR12: System can resume workflow execution from the last checkpoint after failure
- FR13: System persists partial output artifacts when a task fails mid-execution
- FR14: System tracks checkpoint count per task for audit visibility
- FR15: System updates task status through lifecycle states (pending → running → complete → failed)
- FR16: Admin can poll for task status updates from the admin UI
- FR17: System records failure reason when a task fails
- FR18: System records total run time for completed tasks
- FR19: Only admin users can access the deep planner UI and API operations
- FR20: All GraphQL mutations and queries for deep planner require admin email verification
- FR21: System produces a structured markdown artifact following BMAD product brief template format
- FR22: Output artifact contains properly sectioned content (executive summary, vision, users, scope, metrics)
- FR23: Output artifact reflects codebase-specific context (actual schemas, architecture patterns, existing infrastructure)

### NonFunctional Requirements

- NFR1: Individual Workers AI calls complete within 30 seconds (model inference timeout)
- NFR2: D1 checkpoint writes complete within 2 seconds per checkpoint
- NFR3: DO alarm pacing allows at least 10 LLM calls per minute while staying within Workers AI free tier rate limits
- NFR4: Full BMAD product brief workflow completes within 6 hours (target: 2-4 hours)
- NFR5: Admin UI task list query returns within 1 second
- NFR6: No workflow progress is lost on DO eviction — D1 is the single source of truth
- NFR7: Worker resumes from last D1 checkpoint within 1 alarm cycle after failure
- NFR8: Partial artifacts are preserved and readable when a task fails mid-execution
- NFR9: Task status accurately reflects current state (no stale "running" status on crashed tasks)
- NFR10: System handles Workers AI temporary unavailability with retry + backoff (max 3 retries per call)
- NFR11: Worker uses Cloudflare-native bindings only (D1 binding, Workers AI binding, DO binding)
- NFR12: GraphQL mutations trigger the worker via HTTP POST to the worker URL
- NFR13: Codebase context files are bundled with the worker at deploy time (not fetched at runtime)

### Additional Requirements

- Brownfield extension — existing `process-jobs` Python Worker pattern as starter
- D1 two-table design: `deep_planner_tasks` (Drizzle) + `langgraph_checkpoints` (CloudflareD1Saver)
- API key auth for worker endpoint (same pattern as D1 gateway)
- DO alarm-based execution loop with 6s pacing
- BMAD prompts hardcoded in Python (`src/prompts.py`)
- Codebase context bundled at deploy time via `scripts/bundle-deep-planner-context.ts`
- GraphQL schema in `schema/deep-planner/schema.graphql` with codegen
- Implementation sequence: D1 schema → GraphQL → resolvers → admin UI → worker → prompts → DO loop → context bundler → integration test

### FR Coverage Map

FR1:  Epic 1 — Create task (workflow type, problem, context)
FR2:  Epic 1 — View task list with status
FR3:  Epic 1 — View single task artifact (markdown)
FR4:  Epic 1 — See checkpoint count and timestamps
FR5:  Epic 1 — Pending status on creation
FR6:  Epic 2 — Autonomous BMAD product brief execution
FR7:  Epic 2 — Multi-pass per step (draft → critique → refine)
FR8:  Epic 2 — Codebase context injection
FR9:  Epic 2 — Free Workers AI models
FR10: Epic 2 — Rate limit pacing
FR11: Epic 3 — D1 checkpoint after each pass
FR12: Epic 3 — Resume from last checkpoint
FR13: Epic 3 — Persist partial artifacts on failure
FR14: Epic 3 — Track checkpoint count
FR15: Epic 1 — Status lifecycle (pending → running → complete → failed)
FR16: Epic 1 — Poll for status updates
FR17: Epic 1 — Record failure reason
FR18: Epic 1 — Record total run time
FR19: Epic 1 — Admin-only access
FR20: Epic 1 — Admin email verification
FR21: Epic 2 — Structured markdown artifact
FR22: Epic 2 — Properly sectioned content
FR23: Epic 2 — Codebase-specific output

## Epic List

### Epic 1: Task Assignment & Management
Admin can create deep planning tasks, view them in a list with status, and read completed artifacts — the core assign-and-review loop.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR15, FR16, FR17, FR18, FR19, FR20

### Epic 2: Autonomous BMAD Execution
A created task runs autonomously for hours, executing the BMAD product brief workflow through multi-pass reasoning, and delivers a finished artifact grounded in the actual codebase.
**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR21, FR22, FR23

### Epic 3: Checkpoint Persistence & Crash Recovery
Long-running tasks survive worker crashes and DO evictions — no progress is ever lost, and failed tasks show exactly where they stopped with partial output preserved.
**FRs covered:** FR11, FR12, FR13, FR14

## Epic 1: Task Assignment & Management

Admin can create deep planning tasks, view them in a list with status, and read completed artifacts — the core assign-and-review loop.

### Story 1.1: D1 Schema & GraphQL API for Deep Planner Tasks

As an admin,
I want a data layer and API for deep planner tasks,
So that tasks can be created, queried, and tracked through the system.

**Acceptance Criteria:**

**Given** the Drizzle schema in `src/db/schema.ts`
**When** the `deep_planner_tasks` table is added with columns (id, workflow_type, problem_description, context, status, current_step, checkpoint_count, output_artifact, error_message, started_at, completed_at, created_at, updated_at)
**Then** `pnpm db:generate` produces a migration file and `pnpm db:push` applies it to D1

**Given** the GraphQL schema at `schema/deep-planner/schema.graphql`
**When** `DeepPlannerTask` type, `DeepPlannerStatus` enum, queries (`deepPlannerTasks`, `deepPlannerTask(id)`), and mutation (`createDeepPlannerTask`) are defined
**Then** `pnpm codegen` generates types, resolver types, and hooks without errors

**Given** resolvers at `src/apollo/resolvers/deep-planner.ts`
**When** `createDeepPlannerTask` mutation is called with workflowType, problemDescription, and optional context
**Then** a new row is inserted with status `pending`, a ULID id, and current timestamps
**And** the mutation returns the created task

**Given** any deep planner GraphQL operation
**When** called by a non-admin user (fails `isAdminEmail()` check)
**Then** the resolver throws a `Forbidden` error

### Story 1.2: Admin UI — Task Creation & List View

As an admin,
I want a page at `/admin/deep-planner` to create tasks and see all existing tasks,
So that I can assign planning work and track its progress.

**Acceptance Criteria:**

**Given** the admin navigates to `/admin/deep-planner`
**When** the page loads
**Then** a task list is displayed showing all deep planner tasks with status badge, workflow type, checkpoint count, and timestamps
**And** the page is only accessible to authenticated admin users (Clerk + `isAdminEmail()`)

**Given** the admin clicks "New Task"
**When** they fill in workflow type (selector), problem description (textarea), and optional context (textarea) and submit
**Then** the `createDeepPlannerTask` mutation is called and the new task appears in the list with status `PENDING`

**Given** the task list is displayed
**When** any task has status `RUNNING`
**Then** the UI polls `deepPlannerTask(id)` every 10 seconds and updates the status badge, checkpoint count, and current step

**Given** a task with status `FAILED`
**When** the admin views the task list
**Then** the error message is displayed alongside the status badge

### Story 1.3: Admin UI — Artifact Viewer

As an admin,
I want to click a completed task and read its full output artifact as rendered markdown,
So that I can review the generated BMAD planning artifact.

**Acceptance Criteria:**

**Given** a task with status `COMPLETE` and a non-null `outputArtifact`
**When** the admin clicks the task in the list
**Then** the full markdown artifact is rendered in a detail view with proper heading structure, sections, and formatting

**Given** a task with status `FAILED` and a non-null `outputArtifact`
**When** the admin clicks the task
**Then** the partial artifact is rendered with a banner indicating it's incomplete

**Given** the artifact detail view
**When** displayed
**Then** the task metadata is shown (workflow type, checkpoint count, started_at, completed_at/error_message, total run time)

## Epic 2: Autonomous BMAD Execution

A created task runs autonomously for hours, executing the BMAD product brief workflow through multi-pass reasoning, and delivers a finished artifact grounded in the actual codebase.

### Story 2.1: Worker Scaffold & DO Trigger

As an admin,
I want the system to accept a task and start a Durable Object to execute it,
So that tasks transition from `pending` to `running` when triggered.

**Acceptance Criteria:**

**Given** the `workers/deep-planner/` directory with `wrangler.jsonc` configured for Python worker, D1 binding, Workers AI binding, and Durable Object binding (`DeepPlannerDO`)
**When** `wrangler dev` is run
**Then** the worker starts and responds to HTTP requests

**Given** the GraphQL resolver calls the worker URL with `POST { taskId }` and valid API key
**When** the worker's `fetch()` handler receives the request
**Then** it validates the API key, looks up the task in D1, updates status to `running` and `started_at`, instantiates a DO by task ID, and returns `202 Accepted`

**Given** an invalid API key
**When** the worker receives the request
**Then** it returns `401 Unauthorized`

**Given** a task already in `running` status
**When** the worker receives a trigger for the same task ID
**Then** it returns `409 Conflict`

### Story 2.2: BMAD Prompt Templates & Codebase Context

As an admin,
I want the worker to have BMAD product brief prompts and codebase context baked in,
So that the autonomous execution produces structured, codebase-grounded output.

**Acceptance Criteria:**

**Given** `workers/deep-planner/src/prompts.py`
**When** the BMAD product brief workflow steps are defined (INIT, VISION, USERS, SCOPE, METRICS, COMPLETE)
**Then** each step has a system prompt template with placeholders for codebase context and accumulated artifact

**Given** each BMAD step
**When** multi-pass prompts are defined
**Then** three pass types exist: `draft` (generate), `critique` (self-review), and `refine` (improve based on critique)

**Given** `scripts/bundle-deep-planner-context.ts`
**When** the script runs
**Then** it copies CLAUDE.md, merged `schema/**/*.graphql`, and `src/db/schema.ts` into `workers/deep-planner/context/` as text files
**And** total bundled context is under 8K tokens

**Given** prompt templates in `prompts.py`
**When** codebase context is loaded from `context/` directory
**Then** it is injected into system prompts as a `<codebase_context>` block

### Story 2.3: DO Alarm Execution Loop & Artifact Generation

As an admin,
I want the Durable Object to execute the full BMAD workflow via alarm-chained LLM calls and produce a finished artifact,
So that I can assign a task and return to a complete planning document.

**Acceptance Criteria:**

**Given** a DO instantiated for a task
**When** `alarm()` fires
**Then** the DO determines the current BMAD step and pass, builds the prompt, calls Workers AI via `ChatCloudflareWorkersAI`, and stores the LLM response

**Given** the DO completes one LLM pass
**When** the response is received
**Then** the DO updates `deep_planner_tasks` (status, current_step, checkpoint_count, updated_at) and schedules the next alarm with a 6-second delay

**Given** rate limiting on Workers AI free tier
**When** the DO paces calls at ~10/minute (6s between alarms)
**Then** the workflow stays within free tier limits

**Given** all BMAD steps and passes are complete
**When** the final refinement pass of the COMPLETE step finishes
**Then** the DO assembles the full artifact markdown (executive summary, vision, users, scope, metrics), writes it to `output_artifact`, sets status to `complete`, records `completed_at`, and does NOT schedule another alarm

**Given** the generated artifact
**When** the admin reads it
**Then** it follows BMAD product brief template format with properly sectioned content reflecting the actual codebase schemas and architecture

## Epic 3: Checkpoint Persistence & Crash Recovery

Long-running tasks survive worker crashes and DO evictions — no progress is ever lost, and failed tasks show exactly where they stopped with partial output preserved.

### Story 3.1: LangGraph D1 Checkpointing Integration

As an admin,
I want every LLM pass checkpointed to D1,
So that no progress is lost if the worker crashes mid-execution.

**Acceptance Criteria:**

**Given** `langgraph-checkpoint-cloudflare-d1` is imported in the DO
**When** `CloudflareD1Saver` is initialized with the D1 binding
**Then** it creates/uses the `langgraph_checkpoints` table (managed by the library)

**Given** the DO completes an LLM pass
**When** the checkpoint is saved
**Then** the full workflow state (current step, pass number, accumulated artifact, LLM responses) is persisted to D1 via `CloudflareD1Saver`
**And** the `checkpoint_count` in `deep_planner_tasks` is incremented

**Given** a task with 18 expected passes (6 steps x 3 passes)
**When** the workflow runs to completion
**Then** 18 checkpoint writes are recorded in D1 and `checkpoint_count` reflects this

### Story 3.2: Resume from Checkpoint & Failure Handling

As an admin,
I want failed tasks to preserve their partial output and resume from the last checkpoint,
So that hours of work are never lost and I can see exactly where things stopped.

**Acceptance Criteria:**

**Given** a DO that crashed or was evicted after completing step 3 (9 checkpoints)
**When** the next alarm fires or the task is re-triggered
**Then** the DO loads the last checkpoint from D1 via `CloudflareD1Saver` and resumes execution from step 4, pass 1

**Given** a Workers AI call that times out or returns an error
**When** the DO catches the error
**Then** it retries with exponential backoff (max 3 retries per call)
**And** if all retries fail, it sets task status to `failed` with error message `"Workers AI call failed on step {step}, pass {pass} after 3 retries"`

**Given** a task that fails mid-execution
**When** the error handler runs
**Then** the partial artifact (all completed steps so far) is written to `output_artifact`
**And** `error_message` is set with a descriptive failure reason
**And** `status` is set to `failed`

**Given** a task with status `running` and `updated_at` older than 30 minutes
**When** the admin views it in the UI
**Then** a "Stale — may have crashed" indicator is shown alongside the status
