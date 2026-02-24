---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-02-23'
inputDocuments:
  - _bmad-output/planning-artifacts/prd-skills-based-matching-2026-02-23.md
workflowType: 'architecture'
project_name: 'nomadically.work'
user_name: 'Vadim'
date: '2026-02-23'
---

# Architecture Decision Document

_Skills-Based Job Matching — nomadically.work_

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
31 FRs across 6 areas. Architecturally decomposes into three distinct subsystems:
1. **File ingestion subsystem** — upload, parse, store raw text (FR1–5)
2. **Skill extraction subsystem** — taxonomy-grounded LLM pipeline (FR6–10)
3. **Matching subsystem** — SQL intersection query + GraphQL delivery (FR11–31)

Match computation is pure SQL at MVP — the architectural complexity is in the file ingestion and LLM extraction pipeline, not the ranking.

**Non-Functional Requirements:**
- < 10s total extraction → shapes synchronous vs. async extraction design
- ≤ 2 D1 queries for match results → constrains resolver design, no N+1 allowed
- `temperature: 0` determinism → constrains LLM call site configuration
- ≥ 80% eval gate → requires testable extraction function contract
- Zero breaking changes → schema additions must be strictly additive

**Scale & Complexity:**
- Primary domain: `web_app + api_backend + AI-ML pipeline`
- Complexity level: medium (brownfield, reuses existing infra)
- Architectural components: 6 (upload handler, PDF parser, skill extractor, match resolver, resume page, admin panel extension)

### Technical Constraints & Dependencies

| Constraint | Source | Implication |
|---|---|---|
| Reuse `src/lib/skills/` exclusively | NFR13 | Extraction logic is not a greenfield design choice |
| Join `jobSkillTags` D1 table | NFR14 | Match query is D1-only; no separate index |
| `graphql-upload` for file upload | Tech Design | `Upload` scalar already in Apollo Server config |
| Clerk `context.userId` auth guard | NFR10 / FR22–24 | All resume resolvers need auth check before any DB op |
| Drizzle ORM only — no raw SQL | CLAUDE.md | Match query must use `inArray` subquery pattern |
| `pnpm codegen` required after schema change | CLAUDE.md | Schema changes are a one-way gate |
| D1 gateway for DB access | CLAUDE.md | Queries go through `createD1HttpClient()`, not direct binding |
| 60s Vercel max duration | CLAUDE.md | Async extraction must not block the request thread |

### Cross-Cutting Concerns

- **Authentication:** Every resume route, mutation, and query requires `context.userId` check before any DB operation. Consistent across all 4 API entry points.
- **Data isolation:** All D1 queries against `resumes` must include `where eq(resumes.user_id, context.userId)` — never return rows across users.
- **Eval gate enforcement:** The `extractResumeSkills` code path must be structurally separate enough to be tested in isolation by `pnpm test:eval`.
- **Additive-only schema:** New types (`Resume`, `MatchedJob`, `MatchedJobsResult`) and mutations must not touch existing `Job`, `Company`, or `Application` types.
- **Error propagation:** File parsing failures and extraction errors surface as GraphQL errors with actionable messages, not 500s.

## Starter Template Evaluation

### Primary Technology Domain

`web_app + api_backend` brownfield extension. No starter template applies — the project already exists with a fully established stack.

### Foundation: Existing nomadically.work Stack

**Rationale:** Brownfield feature addition. All decisions conform to existing CLAUDE.md patterns. No new framework, tooling, or styling decisions required.

**Architectural Decisions Already Established:**

- **Language & Runtime:** TypeScript 5.9, ES Modules, `@/*` → `./src/*`
- **Framework:** Next.js 16 App Router — new pages in `src/app/`, client components use `"use client"`
- **Database:** Cloudflare D1 via D1 Gateway. `drizzle(createD1HttpClient() as any)`. Schema in `src/db/schema.ts`
- **API Layer:** Apollo Server 5 GraphQL. Schema in `schema/` (domain-split), resolvers in `src/apollo/resolvers/`, generated types via `pnpm codegen`
- **Auth:** Clerk — `context.userId` / `context.userEmail` in GraphQL context
- **UI:** Radix UI Themes + Icons — no Tailwind, no CSS-in-JS
- **File upload:** `graphql-upload` wired to Apollo Server. `Upload` scalar → `File` type

**New code locations for this feature:**
- `schema/resume/` — new GraphQL schema domain
- `src/apollo/resolvers/resume/` — new resolvers
- `src/app/resume/page.tsx` — new page
- `src/db/schema.ts` — append `resumes` table

## Core Architectural Decisions

### Decision Priority Analysis

**Critical (block implementation):**
- Extraction execution model: **synchronous** for MVP (revisit if p95 > 8s)
- PDF parsing location: **server-side** via `pdfjs-dist` in Apollo resolver
- Resume storage: **D1 text column** (no R2 at MVP)
- Match query strategy: **pure SQL subquery** (single query, `inArray` + `groupBy`)

**Important (shape architecture):**
- Skill extraction entry point: **single exported async function** in `src/lib/skills/` callable by both resolver and eval suite
- GraphQL schema split: **additive-only** — new `schema/resume/` domain folder, no edits to existing schema files

**Deferred (post-MVP):**
- Async extraction + polling (if synchronous exceeds latency budget)
- R2 storage for raw PDF binaries
- Vectorize semantic fallback (Phase 2)
- Langfuse tracing on extraction calls (Phase 2)

### Data Architecture

**`resumes` table — Drizzle schema:**
```ts
export const resumes = sqliteTable("resumes", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),
  filename: text("filename"),
  raw_text: text("raw_text").notNull(),
  extracted_skills: text("extracted_skills").notNull(), // JSON array
  taxonomy_version: text("taxonomy_version").notNull(),
  created_at: integer("created_at", { mode: "timestamp" }).notNull(),
  updated_at: integer("updated_at", { mode: "timestamp" }).notNull(),
});
```

- `user_id` indexed for per-user queries
- `extracted_skills` stored as JSON text, parsed in field resolvers (D1 JSON-as-text pattern)
- `taxonomy_version` set at extraction time from `src/lib/skills/` version constant
- No changes to `jobs`, `jobSkillTags`, or any existing table

**Match query — SQL pattern:**
```ts
// Query 1: get ranked job_ids by skill overlap count
const resumeSkills = JSON.parse(resume.extracted_skills) as string[];
const matched = await db
  .select({ job_id: jobSkillTags.job_id, count: sql`count(*)`.as("count") })
  .from(jobSkillTags)
  .where(inArray(jobSkillTags.tag, resumeSkills))
  .groupBy(jobSkillTags.job_id)
  .orderBy(desc(sql`count(*)`));

// Query 2: batch-fetch job details
const jobs = await db
  .select().from(jobs)
  .where(inArray(jobs.id, matched.map(m => m.job_id)));
```

Total: 2 D1 queries — satisfies NFR5.

### Authentication & Security

- **Guard pattern:** All 4 resume entry points throw `new Error("Unauthorized")` if `!context.userId` — first statement before any DB op.
- **Data isolation:** All `resumes` queries include `eq(resumes.user_id, context.userId)`.
- **File validation:** Type (`application/pdf` or `text/plain`) and size (≤ 5MB) checked in `uploadResume` resolver before any processing.
- **No admin guard needed** — resume mutations are user-owned, not admin-only.

### API & Communication Patterns

- **Schema location:** `schema/resume/resume.graphql` — `extend type Mutation` and `extend type Query` blocks.
- **Resolver location:** `src/apollo/resolvers/resume/index.ts` — export `resumeResolvers` merged into root resolver map.
- **Error handling:** `throw new GraphQLError(message, { extensions: { code } })` for actionable errors.
- **Codegen:** `pnpm codegen` run after schema creation — generates types into `src/__generated__/types.ts`.

### Frontend Architecture

- **Page:** `src/app/resume/page.tsx` — `"use client"`. Clerk `useAuth()` for auth state.
- **Upload:** `<input type="file" accept=".pdf,.txt">` wired to `uploadResume` mutation via `apollo-upload-client`.
- **Results:** `useQuery(MATCHED_JOBS_QUERY)` — sorted `MatchedJob[]`. Each card: title, `totalMatched / totalRequired`, matched skills (green tags), missing skills (grey tags).
- **Loading states:** Apollo `loading` flag — skeleton cards while `matchedJobs` resolves.
- **No new state management** — Apollo Client cache handles everything.

### Infrastructure & Deployment

- **No new workers.** All processing in existing `/api/graphql` route.
- **Migration:** Append `resumes` table to `src/db/schema.ts` → `pnpm db:generate && pnpm db:push`.
- **Deploy:** Standard `pnpm deploy`. No wrangler changes.
- **Eval gate:** `pnpm test:eval` ≥ 80% before merging extraction function.

### Decision Impact Analysis

**Implementation sequence:**
1. D1 schema (`resumes` table) + migration
2. GraphQL schema (`schema/resume/resume.graphql`) + `pnpm codegen`
3. Skill extraction function (`src/lib/skills/extractFromResume.ts`) + eval coverage
4. Resolvers (`uploadResume`, `extractResumeSkills`, `myResume`, `matchedJobs`)
5. Frontend page (`src/app/resume/page.tsx`)
6. Admin panel extension (upload count display)

**Cross-component dependencies:**
- Steps 3 & 4 coupled — extraction function interface must be stable before resolver implementation
- Step 2 precedes step 4 — resolvers use generated types
- Step 1 precedes steps 3 & 4 — `resumes` table must exist before resolver writes

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database (snake_case):**
- Table: `resumes` (plural, lowercase)
- Columns: `user_id`, `raw_text`, `extracted_skills`, `taxonomy_version`, `created_at`, `updated_at`
- Drizzle types: `typeof resumes.$inferSelect` → `Resume`

**GraphQL (camelCase):**
- Types: `Resume`, `MatchedJob`, `MatchedJobsResult`
- Fields: `extractedSkills`, `taxonomyVersion`, `matchedSkills`, `missingSkills`, `matchScore`, `totalRequired`, `totalMatched`
- Mutations: `uploadResume`, `extractResumeSkills`
- Queries: `myResume`, `matchedJobs`

**Files (kebab-case):**
- `schema/resume/resume.graphql`
- `src/apollo/resolvers/resume/index.ts` — merges and exports `resumeResolvers`
- `src/apollo/resolvers/resume/upload-resume.ts`
- `src/apollo/resolvers/resume/extract-resume-skills.ts`
- `src/apollo/resolvers/resume/matched-jobs.ts`
- `src/lib/skills/extract-from-resume.ts`
- `src/app/resume/page.tsx`

### Structure Patterns

**Schema extension — never edit existing schema files:**
```graphql
# schema/resume/resume.graphql
extend type Mutation {
  uploadResume(file: Upload!): Resume!
  extractResumeSkills(resumeId: ID!): Resume!
}

extend type Query {
  myResume: Resume
  matchedJobs(limit: Int, offset: Int): MatchedJobsResult!
}
```

**Eval-testable extraction function — exported standalone:**
```ts
// src/lib/skills/extract-from-resume.ts
export async function extractSkillsFromResume(
  text: string,
  taxonomy: string[]
): Promise<{ skills: string[]; taxonomyVersion: string }> { ... }
```

### Format Patterns

**D1 JSON column — parse at resolver level, not in field resolvers:**
```ts
// ✅ Correct
const skills = JSON.parse(resume.extracted_skills) as string[];

// ❌ Wrong — field resolver N+1 risk
extractedSkills: (parent) => JSON.parse(parent.extracted_skills),
```

### Process Patterns

**Auth guard — first statement in every resolver:**
```ts
if (!context.userId) throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHENTICATED" } });
```

**Data isolation — userId filter on every resumes query:**
```ts
.where(eq(resumes.user_id, context.userId))
```

**Match query — SQL intersection only, never application-layer loop:**
```ts
.where(inArray(jobSkillTags.tag, resumeSkills))
.groupBy(jobSkillTags.job_id)
.orderBy(desc(sql`count(*)`))
```

**Error handling:**
```ts
// Client-facing
throw new GraphQLError("Resume not found", { extensions: { code: "NOT_FOUND" } });
// Internal
console.error("[uploadResume] PDF parse failed:", error);
throw new GraphQLError("Resume processing failed. Please try again.");
```

### Enforcement Guidelines

**All agents MUST:**
- Run `pnpm codegen` after any `schema/resume/` change
- Check `context.userId` as the first statement in every resume resolver
- Include `eq(resumes.user_id, context.userId)` in every `resumes` query
- Use `extractSkillsFromResume()` from `src/lib/skills/extract-from-resume.ts` — never inline extraction
- Use `inArray` + `groupBy` SQL pattern for match queries — never loop in TypeScript
- Use `throw new GraphQLError()` for client-facing errors
- Parse `extracted_skills` JSON at resolver level, not in field resolvers

**Anti-patterns:**
- Adding resume logic to existing resolver files
- Storing skills not in the taxonomy
- Querying `resumes` without a `user_id` filter

## Project Structure & Boundaries

### New Files — Feature Addition

```
nomadically.work/
│
├── schema/
│   └── resume/
│       └── resume.graphql               ← NEW GraphQL types + extend Mutation/Query
│
├── src/
│   ├── app/
│   │   └── resume/
│   │       └── page.tsx                 ← NEW authenticated match surface
│   │
│   ├── apollo/
│   │   └── resolvers/
│   │       └── resume/
│   │           ├── index.ts             ← exports resumeResolvers (merged)
│   │           ├── upload-resume.ts     ← uploadResume mutation
│   │           ├── extract-resume-skills.ts
│   │           ├── my-resume.ts         ← myResume query
│   │           └── matched-jobs.ts      ← matchedJobs query
│   │
│   ├── components/
│   │   └── resume/
│   │       ├── resume-upload-form.tsx
│   │       ├── matched-job-card.tsx
│   │       └── skill-tag-list.tsx
│   │
│   ├── db/
│   │   └── schema.ts                    ← MODIFIED: append resumes table
│   │
│   ├── evals/
│   │   └── remote-eu-eval.test.ts       ← MODIFIED: add resume extraction test cases
│   │
│   ├── graphql/
│   │   └── resume/
│   │       ├── upload-resume.mutation.ts
│   │       ├── extract-resume-skills.mutation.ts
│   │       ├── my-resume.query.ts
│   │       └── matched-jobs.query.ts
│   │
│   └── lib/
│       └── skills/
│           └── extract-from-resume.ts   ← NEW standalone extraction function
│
└── migrations/
    └── XXXX_add_resumes_table.sql       ← AUTO-GENERATED by pnpm db:generate
```

**Files modified (not created):**
- `src/db/schema.ts` — append `resumes` table
- `src/apollo/resolvers/index.ts` — import and merge `resumeResolvers`
- `src/evals/remote-eu-eval.test.ts` — add resume extraction test cases

**Do not edit:**
- `src/__generated__/` — run `pnpm codegen` after schema change
- `migrations/` — run `pnpm db:generate`

### Architectural Boundaries

**API Boundary:** `POST /api/graphql` — all 4 resume operations enter here. Auth via Clerk session → `context.userId`. File upload via `graphql-upload` multipart middleware.

**Data Boundaries:**
- `resumes` table — owned exclusively by resume resolvers; no other resolver writes to it
- `jobSkillTags` table — read-only from matching perspective
- `jobs` table — read-only; fetched in `matchedJobs` query only
- `extractSkillsFromResume()` — pure function, no DB access; callable by resolver and eval suite

**Data Flow:**
```
User uploads file
  → uploadResume (auth → validate → parse PDF → store raw_text → D1 insert)
  → extractResumeSkills (auth → load raw_text → extractSkillsFromResume() → update D1)
  → matchedJobs (auth → load skills → SQL intersection → MatchedJob[])
  → page.tsx renders ranked list
```

### Requirements to Structure Mapping

| FR | File |
|---|---|
| FR1–3 (upload/view/replace) | `resolvers/resume/upload-resume.ts`, `my-resume.ts` |
| FR4 (text extraction) | `lib/skills/extract-from-resume.ts` |
| FR5 (store linked to user) | `db/schema.ts` (`user_id` column) |
| FR6–9 (taxonomy extraction) | `lib/skills/extract-from-resume.ts` |
| FR10 (display skills) | `components/resume/skill-tag-list.tsx` |
| FR11–17 (match + overlap) | `resolvers/resume/matched-jobs.ts` |
| FR18–21 (UI) | `app/resume/page.tsx`, `components/resume/matched-job-card.tsx` |
| FR22–24 (auth/isolation) | Auth guard pattern inline in every resolver |
| FR25–26 (eval gate) | `src/evals/remote-eu-eval.test.ts` |
| FR27 (admin count) | Existing admin panel — minor extension |
| FR28–31 (GraphQL API) | `schema/resume/resume.graphql` + generated types |

### Integration Points

**Internal:**
- `resumeResolvers` merged into root resolver map in `src/apollo/resolvers/index.ts`
- `extractSkillsFromResume()` imported by resolver and eval suite
- Apollo Client documents in `src/graphql/resume/` consumed by page via generated hooks

**External:**
- Clerk: `context.userId` from existing Apollo context middleware — no changes
- D1 Gateway: all queries via `createD1HttpClient()` — no gateway changes
- `src/lib/skills/` taxonomy: imported by `extract-from-resume.ts`

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All decisions operate within the existing locked stack. No version conflicts. Synchronous extraction, server-side PDF parsing, D1 text storage, and SQL intersection queries are mutually compatible and independently testable.

**Pattern Consistency:** Naming conventions (snake_case DB, camelCase GQL, kebab-case files), auth guard placement, data isolation filter, and SQL intersection pattern are consistent across all 6 resolver files and the UI layer.

**Structure Alignment:** New `schema/resume/`, `resolvers/resume/`, `components/resume/`, and `lib/skills/extract-from-resume.ts` map cleanly to existing domain-split conventions without collision.

### Requirements Coverage Validation

- **31/31 FRs architecturally supported** ✅
- **19/19 NFRs architecturally addressed** ✅
- All cross-cutting concerns (auth, isolation, eval gate, additive schema) covered by enforced patterns

### Gap Analysis Results

| Gap | Resolution |
|---|---|
| `missingSkills[]` computation not specified | Fetch all `jobSkillTags` for matched job IDs in query 2; compute `Set(jobSkills) - Set(resumeSkills)` in resolver |
| FR3 (resume replacement) has no upsert spec | `uploadResume` uses Drizzle `.onConflictDoUpdate({ target: resumes.user_id, ... })` — one resume per user |

**No critical gaps remain.**

### Architecture Completeness Checklist

- [x] Project context analysed — 3 subsystems, 8 constraints, 5 cross-cutting concerns
- [x] 4 critical decisions documented with rationale
- [x] Data architecture: Drizzle schema + SQL patterns with exact code
- [x] Auth, security, API, frontend, infra decisions documented
- [x] Naming conventions: DB / GQL / file
- [x] Process patterns: auth guard, data isolation, SQL intersection, error handling
- [x] Complete file tree with new + modified files
- [x] All 31 FRs mapped to specific files
- [x] Integration points documented

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High** — brownfield addition to a well-understood stack; no new infrastructure; all patterns derived from existing CLAUDE.md conventions.

**Key Strengths:**
- Zero new external dependencies
- Extraction function is eval-testable in isolation from day 1
- Match query is a single SQL aggregation — no ML, no ambiguity
- Auth and data isolation patterns copied from existing resolver conventions

**Areas for future enhancement:**
- Async extraction + polling if synchronous p95 > 8s
- Langfuse tracing on `extractSkillsFromResume()` (Phase 2)
- Vectorize semantic fallback (Phase 2)

### Implementation Handoff

**First Implementation Priority:**
1. `src/db/schema.ts` — append `resumes` table → `pnpm db:generate && pnpm db:push`
2. `schema/resume/resume.graphql` — types + `pnpm codegen`
3. `src/lib/skills/extract-from-resume.ts` — extraction function + eval (`pnpm test:eval` ≥ 80%)
4. `src/apollo/resolvers/resume/` — 4 resolvers
5. `src/app/resume/page.tsx` + `src/components/resume/`
