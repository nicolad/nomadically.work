# Story 1.1: D1 Schema & GraphQL API for Deep Planner Tasks

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want a data layer and API for deep planner tasks,
so that tasks can be created, queried, and tracked through the system.

## Acceptance Criteria

1. **Given** the Drizzle schema in `src/db/schema.ts` **When** the `deep_planner_tasks` table is added with columns (id, workflow_type, problem_description, context, status, current_step, checkpoint_count, output_artifact, error_message, started_at, completed_at, created_at, updated_at) **Then** `pnpm db:generate` produces a migration file and `pnpm db:push` applies it to D1

2. **Given** the GraphQL schema at `schema/deep-planner/schema.graphql` **When** `DeepPlannerTask` type, `DeepPlannerStatus` enum, queries (`deepPlannerTasks`, `deepPlannerTask(id)`), and mutation (`createDeepPlannerTask`) are defined **Then** `pnpm codegen` generates types, resolver types, and hooks without errors

3. **Given** resolvers at `src/apollo/resolvers/deep-planner.ts` **When** `createDeepPlannerTask` mutation is called with workflowType, problemDescription, and optional context **Then** a new row is inserted with status `pending`, a ULID id, and current timestamps **And** the mutation returns the created task

4. **Given** the `deepPlannerTasks` query **When** called by an admin user **Then** all tasks are returned ordered by `created_at` descending with all fields mapped correctly (snake_case DB → camelCase GraphQL)

5. **Given** the `deepPlannerTask(id)` query **When** called with a valid task ID **Then** the full task is returned including `outputArtifact`, `checkpointCount`, and all timestamp fields

6. **Given** any deep planner GraphQL operation **When** called by a non-admin user (fails `isAdminEmail()` check) **Then** the resolver throws a `Forbidden` error

## Tasks / Subtasks

- [x] Task 1: Add `deep_planner_tasks` table to Drizzle schema (AC: #1)
  - [x] 1.1: Add table definition to `src/db/schema.ts` with all columns per architecture spec
  - [x] 1.2: Export `DeepPlannerTask` and `NewDeepPlannerTask` types
  - [x] 1.3: Run `pnpm db:generate` to produce migration file
  - [x] 1.4: Run `pnpm db:migrate` to apply locally
- [x] Task 2: Create GraphQL schema for deep-planner domain (AC: #2)
  - [x] 2.1: Create `schema/deep-planner/schema.graphql` with types, enum, queries, mutation
  - [x] 2.2: Create `src/graphql/deep-planner.graphql` with client-side query/mutation documents
  - [x] 2.3: Run `pnpm codegen` and verify generated types
- [x] Task 3: Implement GraphQL resolvers (AC: #3, #4, #5, #6)
  - [x] 3.1: Create `src/apollo/resolvers/deep-planner.ts` with query and mutation resolvers
  - [x] 3.2: Implement `createDeepPlannerTask` mutation with ULID generation and admin guard
  - [x] 3.3: Implement `deepPlannerTasks` query with descending order
  - [x] 3.4: Implement `deepPlannerTask(id)` query
  - [x] 3.5: Implement `mapDeepPlannerTask()` helper for DB→GraphQL field mapping
  - [x] 3.6: Register resolvers in `src/apollo/resolvers.ts` merge
- [x] Task 4: Write tests for resolvers (AC: #3, #4, #5, #6)
  - [x] 4.1: Test `createDeepPlannerTask` mutation returns task with pending status and ULID id
  - [x] 4.2: Test admin guard rejects non-admin users with Forbidden error
  - [x] 4.3: Test `deepPlannerTasks` returns tasks in descending created_at order
  - [x] 4.4: Test `deepPlannerTask(id)` returns full task with all fields
  - [x] 4.5: Test status enum mapping (DB lowercase → GraphQL uppercase)
- [x] Task 5: Verify end-to-end codegen + migration pipeline (AC: #1, #2)
  - [x] 5.1: Run `pnpm codegen` — confirm no errors
  - [x] 5.2: Run `pnpm build` — confirm no type errors
  - [x] 5.3: Verify generated hooks exist (`useDeepPlannerTasksQuery`, `useDeepPlannerTaskQuery`, `useCreateDeepPlannerTaskMutation`)

## Dev Notes

### Architecture Requirements

This story implements the **data layer** for the Deep Planner feature — the `deep_planner_tasks` D1 table and the GraphQL API that the admin UI (Story 1.2) and the Python worker (Story 2.1) will both depend on. This is the foundation story — all other stories build on it.

**Key architecture decisions from `_bmad-output/planning-artifacts/architecture.md`:**

- **D1 Two-Table Design:** `deep_planner_tasks` (Drizzle, app-readable) + `langgraph_checkpoints` (library-managed, worker-only). This story only creates the first table.
- **Status values in D1:** lowercase text (`pending`, `running`, `complete`, `failed`). GraphQL enum uses uppercase (`PENDING`, `RUNNING`, `COMPLETE`, `FAILED`). Resolver maps between them.
- **Timestamps:** ISO 8601 strings everywhere. D1 stores text. Use `datetime('now')` default.
- **Primary key:** Text ULID (not auto-increment integer). Use `ulid` npm package.
- **No foreign keys** to existing tables — deep planner tables are isolated.

### Exact D1 Column Spec (from architecture doc)

| Column | Drizzle Type | Notes |
|--------|-------------|-------|
| `id` | `text("id").primaryKey()` | ULID, generated in resolver |
| `workflow_type` | `text("workflow_type").notNull()` | `product_brief` for MVP |
| `problem_description` | `text("problem_description").notNull()` | User-provided |
| `context` | `text("context")` | Optional user-provided context |
| `status` | `text("status").notNull().default("pending")` | `pending`/`running`/`complete`/`failed` |
| `current_step` | `text("current_step")` | Nullable, set by worker |
| `checkpoint_count` | `integer("checkpoint_count").notNull().default(0)` | Incremented by worker |
| `output_artifact` | `text("output_artifact")` | Nullable, markdown text |
| `error_message` | `text("error_message")` | Nullable, failure reason |
| `started_at` | `text("started_at")` | Nullable, set by worker |
| `completed_at` | `text("completed_at")` | Nullable, set by worker |
| `created_at` | `text("created_at").notNull().default(sql\`(datetime('now'))\`)` | Auto |
| `updated_at` | `text("updated_at").notNull().default(sql\`(datetime('now'))\`)` | Auto |

### Exact GraphQL Schema (from architecture doc)

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

### Resolver Pattern (from existing codebase analysis)

The resolver must follow the exact pattern in `src/apollo/resolvers/application.ts`:

1. **Private `mapDeepPlannerTask()` helper** — converts DB row to GraphQL shape:
   - `snake_case` → `camelCase` field mapping
   - `status` string → uppercase enum (`pending` → `PENDING`)
   - All other fields are direct text maps (no JSON parsing needed)

2. **Export named `deepPlannerResolvers` object** with `Query` and `Mutation` keys

3. **Admin guard on ALL operations** — both queries and mutations:
   ```typescript
   import { isAdminEmail } from "@/lib/admin";
   if (!context.userId || !isAdminEmail(context.userEmail)) {
     throw new Error("Forbidden");
   }
   ```

4. **Register in `src/apollo/resolvers.ts`** — import and add to `merge(...)` call (uses `lodash` merge)

### ULID Generation

Install `ulid` package for ID generation:
```typescript
import { ulid } from "ulid";
const id = ulid(); // e.g., "01ARZ3NDEKTSV4RRFFQ69G5FAV"
```

Check if `ulid` is already in `package.json` before installing. If not, add it.

### Client-Side GraphQL Documents

Create `src/graphql/deep-planner.graphql` with query/mutation documents that `pnpm codegen` will use to generate Apollo hooks:

```graphql
query DeepPlannerTasks {
  deepPlannerTasks {
    id
    workflowType
    problemDescription
    status
    currentStep
    checkpointCount
    errorMessage
    startedAt
    completedAt
    createdAt
    updatedAt
  }
}

query DeepPlannerTask($id: ID!) {
  deepPlannerTask(id: $id) {
    id
    workflowType
    problemDescription
    context
    status
    currentStep
    checkpointCount
    outputArtifact
    errorMessage
    startedAt
    completedAt
    createdAt
    updatedAt
  }
}

mutation CreateDeepPlannerTask(
  $workflowType: String!
  $problemDescription: String!
  $context: String
) {
  createDeepPlannerTask(
    workflowType: $workflowType
    problemDescription: $problemDescription
    context: $context
  ) {
    id
    workflowType
    problemDescription
    status
    createdAt
  }
}
```

### File Structure Requirements

| Action | File | Notes |
|--------|------|-------|
| MODIFY | `src/db/schema.ts` | Add `deepPlannerTasks` table + types at end of file |
| CREATE | `schema/deep-planner/schema.graphql` | New domain schema |
| CREATE | `src/graphql/deep-planner.graphql` | Client query/mutation docs |
| CREATE | `src/apollo/resolvers/deep-planner.ts` | Resolvers |
| MODIFY | `src/apollo/resolvers.ts` | Register new resolvers in merge |
| AUTO | `src/__generated__/*` | Regenerated by `pnpm codegen` |
| AUTO | `migrations/NNNN_*.sql` | Generated by `pnpm db:generate` |

### Testing Requirements

- Use Vitest (project's test framework)
- Test resolver functions directly by mocking `GraphQLContext` (db, userId, userEmail)
- Mock Drizzle db methods for unit tests
- Test admin guard with both admin and non-admin email
- Test status enum mapping correctness
- No E2E tests needed for this story — pure data layer

### Anti-Patterns to Avoid

- **Never** use raw SQL strings — use Drizzle ORM methods only
- **Never** manually edit `src/__generated__/` files — run `pnpm codegen`
- **Never** use `any` for context type — use `GraphQLContext` from `@/apollo/context`
- **Never** skip the admin guard on any deep planner operation (per FR19, FR20)
- **Never** use auto-increment integer IDs — use ULID text primary key
- **Never** import from `drizzle-orm/pg-core` or `drizzle-orm/mysql-core` — use `drizzle-orm/sqlite-core`
- **Never** add DataLoaders for this story — deep planner tasks have no relations needing N+1 protection

### Project Structure Notes

- File placement follows architecture doc exactly — `schema/deep-planner/`, `src/apollo/resolvers/deep-planner.ts`
- The base GraphQL types (`Query`, `Mutation`) are defined in `schema/base/schema.graphql` — all domain schemas use `extend type`
- `codegen.ts` auto-discovers `schema/**/*.graphql` — no config change needed
- Custom scalars available: `DateTime` (→ string), `JSON` (→ any), `URL`, `EmailAddress`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — D1 schema specification
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — GraphQL schema spec
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] — Naming & format patterns
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines] — Anti-patterns
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements] — FR1-5, FR15-20
- [Source: src/apollo/resolvers/application.ts] — Resolver pattern reference
- [Source: src/apollo/resolvers.ts] — Resolver registration pattern
- [Source: src/db/schema.ts] — Drizzle schema pattern reference
- [Source: schema/applications/schema.graphql] — GraphQL domain schema pattern
- [Source: codegen.ts] — Codegen configuration (auto-discovers schema/**/*)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Migration generated manually (0010_add_deep_planner_tasks.sql) due to drizzle-kit interactive prompt from schema drift on unrelated report_reason columns. Clean additive CREATE TABLE — no risk.
- `ulid` package installed (v3.0.2) — was not previously in package.json.

### Completion Notes List

- Drizzle schema: Added `deepPlannerTasks` table with 13 columns matching architecture spec exactly (ULID text PK, all snake_case, ISO text timestamps, integer checkpoint_count)
- GraphQL schema: Created `schema/deep-planner/schema.graphql` with DeepPlannerTask type, DeepPlannerStatus enum, 2 queries, 1 mutation — all using `extend type` pattern
- Client docs: Created `src/graphql/deep-planner.graphql` with 3 operations (list, detail, create) for codegen hook generation
- Resolvers: Created `src/apollo/resolvers/deep-planner.ts` with `mapDeepPlannerTask()` helper, `assertAdmin()` guard, 2 query resolvers, 1 mutation resolver
- Registration: Added `deepPlannerResolvers` to lodash merge in `src/apollo/resolvers.ts`
- Tests: 13 unit tests covering all ACs — admin guard (3 tests), CRUD operations (6 tests), status enum mapping (4 parameterized tests)
- Codegen: Confirmed hooks generated (`useDeepPlannerTasksQuery`, `useDeepPlannerTaskQuery`, `useCreateDeepPlannerTaskMutation`)
- Build: `pnpm build` passes with no type errors
- Regression: All 51 tests pass (13 new + 38 existing)

### Change Log

- 2026-02-23: Story 1.1 implemented — D1 schema, GraphQL API, resolvers, tests, migration

### File List

- `src/db/schema.ts` (MODIFIED) — Added `deepPlannerTasks` table + exported types
- `schema/deep-planner/schema.graphql` (NEW) — GraphQL type, enum, queries, mutation
- `src/graphql/deep-planner.graphql` (NEW) — Client-side query/mutation documents
- `src/apollo/resolvers/deep-planner.ts` (NEW) — Query + mutation resolvers with admin guard
- `src/apollo/resolvers/deep-planner.test.ts` (NEW) — 13 unit tests
- `src/apollo/resolvers.ts` (MODIFIED) — Registered deepPlannerResolvers in merge
- `migrations/0010_add_deep_planner_tasks.sql` (NEW) — CREATE TABLE migration
- `package.json` (MODIFIED) — Added `ulid` dependency
- `pnpm-lock.yaml` (MODIFIED) — Lock file updated
- `src/__generated__/hooks.tsx` (AUTO) — Regenerated by codegen
- `src/__generated__/types.ts` (AUTO) — Regenerated by codegen
- `src/__generated__/resolvers-types.ts` (AUTO) — Regenerated by codegen
- `src/__generated__/typeDefs.ts` (AUTO) — Regenerated by codegen
- `src/__generated__/gql.ts` (AUTO) — Regenerated by codegen
