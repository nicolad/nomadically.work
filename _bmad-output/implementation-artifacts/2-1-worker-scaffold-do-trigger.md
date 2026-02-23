# Story 2.1: Worker Scaffold & DO Trigger

Status: review

## Story

As an admin,
I want the system to accept a task and start a Durable Object to execute it,
so that tasks transition from `pending` to `running` when triggered.

## Acceptance Criteria

1. **Given** the `workers/deep-planner/` directory with `wrangler.jsonc` configured for Python worker, D1 binding, Workers AI binding, and Durable Object binding (`DeepPlannerDO`) **When** `wrangler dev` is run **Then** the worker starts and responds to HTTP requests

2. **Given** the GraphQL resolver calls the worker URL with `POST { taskId }` and valid API key **When** the worker's `fetch()` handler receives the request **Then** it validates the API key, looks up the task in D1, updates status to `running` and `started_at`, instantiates a DO by task ID, and returns `202 Accepted`

3. **Given** an invalid API key **When** the worker receives the request **Then** it returns `401 Unauthorized`

4. **Given** a task already in `running` status **When** the worker receives a trigger for the same task ID **Then** it returns `409 Conflict`

## Tasks / Subtasks

- [x] Task 1: Create workers/deep-planner/ directory with wrangler.jsonc, pyproject.toml, package.json
- [x] Task 2: Implement entry.py with Default WorkerEntrypoint, routing, auth check
- [x] Task 3: Implement DeepPlannerDO class with fetch handler and alarm scheduling
- [x] Task 4: Add triggerDeepPlannerTask GraphQL mutation + resolver
- [x] Task 5: Add trigger button to admin UI detail page
- [x] Task 6: Run codegen and build

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Completion Notes

- Worker scaffold at `workers/deep-planner/` with Python entry point, DO class, helpers
- Wrangler config with D1, Workers AI, and DO bindings
- HTTP routing: POST /trigger, GET /status/:id, GET /health
- API key auth via X-API-Key header
- GraphQL `triggerDeepPlannerTask` mutation with fire-and-forget worker call
- Admin UI detail page has Start/Retry button for pending/failed tasks

### File List

- `workers/deep-planner/wrangler.jsonc` (NEW) — Worker configuration
- `workers/deep-planner/pyproject.toml` (NEW) — Python dependencies
- `workers/deep-planner/package.json` (NEW) — npm scripts
- `workers/deep-planner/scripts/setup_pyodide_deps.sh` (NEW) — Dependency setup
- `workers/deep-planner/src/__init__.py` (NEW) — Package init
- `workers/deep-planner/src/entry.py` (NEW) — Worker entrypoint with routing
- `workers/deep-planner/src/helpers.py` (NEW) — D1 + JS interop helpers
- `workers/deep-planner/src/durable_object.py` (NEW) — DeepPlannerDO class
- `workers/deep-planner/src/checkpoint.py` (NEW) — Checkpoint persistence
- `schema/deep-planner/schema.graphql` (MODIFIED) — Added triggerDeepPlannerTask mutation
- `src/graphql/deep-planner.graphql` (MODIFIED) — Added trigger mutation document
- `src/apollo/resolvers/deep-planner.ts` (MODIFIED) — Added trigger resolver
- `src/app/admin/deep-planner/[id]/task-detail-client.tsx` (MODIFIED) — Added trigger button
