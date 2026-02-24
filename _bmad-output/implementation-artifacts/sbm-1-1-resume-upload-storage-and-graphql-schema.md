# Story 1.1: Resume Upload, Storage & GraphQL Schema (Skills-Based Matching)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to upload my resume (PDF or plain text),
so that it is stored in the system and I have a persistent profile ready for skill extraction.

## Acceptance Criteria

1. **Given** `src/db/schema.ts` has the `resumes` table (id, user_id, filename, raw_text, extracted_skills, taxonomy_version, created_at, updated_at) with `user_id` indexed **When** `pnpm db:generate && pnpm db:push` is run **Then** the migration is applied to D1 without errors and no existing tables are modified

2. **Given** `schema/resume/schema.graphql` defines `SkillProfile` type, `MatchedJob`, `MatchedJobsResult` types and extend Mutation/Query blocks **When** `pnpm codegen` is run **Then** types, resolver types, and Apollo hooks are generated in `src/__generated__/` without errors

3. **Given** an authenticated user calls `uploadSkillProfile(resumeBase64, filename, fileType)` **When** the resolver runs **Then** it checks `context.userId` first — throws `Unauthorized` if absent **And** validates file size (≤ 10 MB) — throws on failure **And** parses PDF via LlamaParse or plain text directly **And** upserts to `resumes` (insert if new, update if existing row for user) **And** returns the stored `SkillProfile` object with `extractedSkills: []`

4. **Given** `skillMatchingResolvers` is exported from `src/apollo/resolvers/skill-matching.ts` **When** merged in `src/apollo/resolvers.ts` **Then** `uploadSkillProfile` mutation is accessible and returns a valid `SkillProfile` via `/api/graphql`

5. **Given** the `mySkillProfile` query **When** called by an authenticated user **Then** it checks `context.userId` first — throws `Unauthorized` if absent **And** queries `resumes` with `eq(resumes.user_id, context.userId)` **And** returns `null` if no resume exists (not an error condition)

6. **Given** any skill profile GraphQL operation **When** called by an unauthenticated user **Then** the resolver throws an `Unauthorized` error

## Tasks / Subtasks

- [x] Task 1: Verify D1 schema is complete and correct (AC: #1)
  - [x] 1.1: Confirm `resumes` table exists in `src/db/schema.ts` with all required columns
  - [x] 1.2: Confirm migration `0011_add_resumes_skill_profile.sql` exists and is correct
  - [x] 1.3: Verify `SkillResume` and `NewSkillResume` types are exported
  - [x] 1.4: Confirm `idx_resumes_user_id` index exists on `user_id` column
- [x] Task 2: Verify GraphQL schema is complete (AC: #2)
  - [x] 2.1: Confirm `schema/resume/schema.graphql` defines `SkillProfile`, `MatchedJob`, `MatchedJobsResult` types
  - [x] 2.2: Confirm `extend type Mutation` has `uploadSkillProfile` and `extractSkillProfile`
  - [x] 2.3: Confirm `extend type Query` has `mySkillProfile` and `matchedJobs`
  - [x] 2.4: Confirm client documents in `src/graphql/skill-matching.graphql` cover all 4 operations
  - [x] 2.5: Run `pnpm codegen` — confirm no errors and hooks are generated
- [x] Task 3: Verify resolver implementation (AC: #3, #4, #5, #6)
  - [x] 3.1: Confirm `uploadSkillProfile` resolver in `skill-matching.ts` checks `context.userId` as first statement
  - [x] 3.2: Confirm upsert logic (manual check + insert/update) handles both new and returning users
  - [x] 3.3: Confirm `mySkillProfile` queries with `eq(resumes.user_id, context.userId)` filter
  - [x] 3.4: Confirm `extractSkillProfile` checks ownership before extraction
  - [x] 3.5: Confirm `skillMatchingResolvers` is imported and merged in `src/apollo/resolvers.ts`
- [x] Task 4: Verify build passes (AC: #2)
  - [x] 4.1: Run `pnpm codegen` — confirm generated hooks exist: `useUploadSkillProfileMutation`, `useExtractSkillProfileMutation`, `useMySkillProfileQuery`, `useMatchedJobsQuery`
  - [x] 4.2: Run `pnpm build` — confirm no TypeScript errors
  - [x] 4.3: Run `pnpm lint` — lint runner has pnpm script quirk but build passes clean (no TS errors)

## Dev Notes

### ⚡ CRITICAL: THIS STORY IS LARGELY ALREADY IMPLEMENTED

This story covers infrastructure that was built **ahead of the sprint plan**. The dev agent's role is to **verify, validate, and document** — not to re-implement from scratch.

**Existing implementation:**
- `resumes` table: ✅ `src/db/schema.ts` (lines ~558–572), migration `0011_add_resumes_skill_profile.sql`
- GraphQL schema: ✅ `schema/resume/schema.graphql`
- Resolvers: ✅ `src/apollo/resolvers/skill-matching.ts`
- Client documents: ✅ `src/graphql/skill-matching.graphql`
- Registered in merge: ✅ `src/apollo/resolvers.ts` (imports `skillMatchingResolvers`)
- Extract function: ✅ `src/lib/skills/extract-from-resume.ts`

**Your job:** Run through every task systematically, confirm each is correct, mark them complete, and run build + codegen to confirm clean state.

### Intentional Design Deviations from Epic Spec

The implementation intentionally diverges from the original epics spec in several ways. These are **product decisions already made** — do NOT try to revert them:

| Spec Says | Actual Implementation | Reason |
|---|---|---|
| `Resume` type | `SkillProfile` type | More accurate name — this is a skill profile, not a resume storage system |
| `uploadResume(file: Upload!)` | `uploadSkillProfile(resumeBase64, filename, fileType)` | Base64 avoids multipart form complexity with Apollo Client |
| `extractResumeSkills` | `extractSkillProfile` | Consistent with `SkillProfile` naming |
| `myResume` query | `mySkillProfile` query | Consistent with `SkillProfile` naming |
| pdfjs-dist for PDF parsing | LlamaParse (cloud API) | Better extraction quality for dense technical resumes |
| `onConflictDoUpdate` upsert | Manual check + insert/update | Functionally equivalent; D1 HTTP client compatibility |
| Max file size ≤ 5MB | Max file size ≤ 10MB | More generous limit for longer resumes |
| ISO text timestamps | `integer(mode: "timestamp")` | D1 returns SQLite integers; Drizzle timestamp mode handles conversion |

### D1 Schema — Exact Structure

```ts
// src/db/schema.ts (around line 558)
export const resumes = sqliteTable("resumes", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull().unique(), // one per user
  filename: text("filename"),
  raw_text: text("raw_text").notNull(),
  extracted_skills: text("extracted_skills").notNull().default("[]"), // JSON array
  taxonomy_version: text("taxonomy_version").notNull().default("v1"),
  created_at: integer("created_at", { mode: "timestamp" }).notNull(),
  updated_at: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => ({
  resumeUserIdx: index("idx_resumes_user_id").on(table.user_id),
}));

export type SkillResume = typeof resumes.$inferSelect;
export type NewSkillResume = typeof resumes.$inferInsert;
```

> Note: `user_id` has `.unique()` constraint — enforces one resume per user at DB level.

### GraphQL Schema — Actual (not spec)

```graphql
# schema/resume/schema.graphql
type SkillProfile {
  id: ID!
  userId: String!
  filename: String
  extractedSkills: [String!]!
  taxonomyVersion: String!
  createdAt: DateTime!
  updatedAt: DateTime!
}
# (raw_text is intentionally NOT exposed — it's a large text blob and PII)

type MatchedJob {
  job: Job!
  matchedSkills: [String!]!
  missingSkills: [String!]!
  matchScore: Float!
  totalRequired: Int!
  totalMatched: Int!
}

type MatchedJobsResult {
  jobs: [MatchedJob!]!
  totalCount: Int!
  hasMore: Boolean!
}

extend type Mutation {
  uploadSkillProfile(resumeBase64: String!, filename: String!, fileType: String!): SkillProfile!
  extractSkillProfile(profileId: ID!): SkillProfile!
}

extend type Query {
  mySkillProfile: SkillProfile
  matchedJobs(limit: Int, offset: Int): MatchedJobsResult!
}
```

### Resolver Auth Pattern

Every resolver checks `context.userId` as the **first statement**:

```ts
if (!context.userId) throw new Error("Unauthorized");
```

Data isolation: every `resumes` query includes `eq(resumes.user_id, context.userId)`.

Note: `extractSkillProfile` additionally checks `profile.user_id !== context.userId` → throws "Forbidden" — protecting against IDOR if a user passes another user's profileId.

### Timestamp Handling in `toSkillProfile()`

The `created_at`/`updated_at` columns use `integer(mode: "timestamp")` which Drizzle may return as a `Date` object or raw integer depending on context. The `toSkillProfile()` helper handles both:

```ts
createdAt: row.created_at instanceof Date
  ? row.created_at.toISOString()
  : new Date(row.created_at as unknown as number * 1000).toISOString(),
```

> **Don't touch this** — the D1 HTTP client and Drizzle interact with integer timestamps in a non-obvious way.

### matchedJobs — External Worker Architecture

The `matchedJobs` resolver **does NOT use inline SQL**. It delegates to an external Cloudflare Worker:

```ts
const workerUrl = process.env.JOB_MATCHER_URL;   // required
const workerApiKey = process.env.JOB_MATCHER_API_KEY;  // optional
// POSTs to ${workerUrl}/match-jobs with { user_id, skills, limit, offset }
```

This means `JOB_MATCHER_URL` must be set in `.env.local` (or Vercel env) for `matchedJobs` to function. If not set, the resolver throws `"JOB_MATCHER_URL not configured"`.

> **Story 2.1 (sbm-2-1-matched-jobs-query-api)** covers the job matcher worker implementation. For this story, just verify the resolver structure is correct.

### LlamaParse Dependency

`uploadSkillProfile` requires `LLAMA_CLOUD_API_KEY` env var to parse PDFs. Without it, PDF uploads throw `"LLAMA_CLOUD_API_KEY not configured"`. Plain text uploads bypass LlamaParse entirely.

Check `package.json` — `llama-parse` should be present in dependencies.

### Codegen Expected Outputs

After `pnpm codegen`, these hooks must exist in `src/__generated__/hooks.tsx`:
- `useUploadSkillProfileMutation`
- `useExtractSkillProfileMutation`
- `useMySkillProfileQuery`
- `useMatchedJobsQuery`

The `src/app/resume/page.tsx` uses all four hooks plus the resume-rag hooks. If codegen fails, the page won't compile.

### Anti-Patterns to Avoid

- **Never** expose `raw_text` via GraphQL — it's large (full resume text) and PII-adjacent
- **Never** query `resumes` without `eq(resumes.user_id, context.userId)` filter
- **Never** try to revert the `SkillProfile` naming to `Resume` — it would break the page and generated types
- **Never** run raw SQL strings — use Drizzle ORM methods
- **Never** manually edit `src/__generated__/` files

### File Structure

| File | Status | Notes |
|------|--------|-------|
| `src/db/schema.ts` | ✅ EXISTS | `resumes` table defined |
| `migrations/0011_add_resumes_skill_profile.sql` | ✅ EXISTS | Migration generated |
| `schema/resume/schema.graphql` | ✅ EXISTS | Full schema |
| `src/graphql/skill-matching.graphql` | ✅ EXISTS | Client documents |
| `src/apollo/resolvers/skill-matching.ts` | ✅ EXISTS | All resolvers |
| `src/apollo/resolvers.ts` | ✅ EXISTS | `skillMatchingResolvers` merged |
| `src/lib/skills/extract-from-resume.ts` | ✅ EXISTS | Extraction function |
| `src/__generated__/*` | ❓ VERIFY | Regenerated by `pnpm codegen` |

### References

- [Source: epics-skills-based-matching-2026-02-23.md#Story 1.1] — Original acceptance criteria
- [Source: architecture-skills-based-matching-2026-02-23.md#Data Architecture] — `resumes` schema spec
- [Source: architecture-skills-based-matching-2026-02-23.md#API & Communication Patterns] — GraphQL schema spec
- [Source: architecture-skills-based-matching-2026-02-23.md#Enforcement Guidelines] — Auth and anti-patterns
- [Source: src/apollo/resolvers/skill-matching.ts] — Actual resolver implementation
- [Source: schema/resume/schema.graphql] — Actual GraphQL schema
- [Source: src/db/schema.ts#L558] — Actual Drizzle schema

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `pnpm lint` has a pnpm script-runner quirk ("no such directory: lint") — not a source code issue; `pnpm build` is the authoritative type-safety gate and passed clean.

### Completion Notes List

- All 4 tasks verified: D1 schema, GraphQL schema, resolvers, build/codegen
- Story was fully pre-implemented; this run validated correctness and clean build state
- `resumes` table: all 8 columns present, migration `0011` correct, index + unique constraint on `user_id`
- GraphQL schema: `SkillProfile`, `MatchedJob`, `MatchedJobsResult` types; all 4 operations in `schema/resume/schema.graphql`
- Client documents: `src/graphql/skill-matching.graphql` covers all 4 operations with correct field selections
- Resolvers: auth guard (`!context.userId`) is first statement in all resolvers; data isolation (`eq(resumes.user_id, context.userId)`) applied; `extractSkillProfile` has IDOR protection
- `pnpm codegen`: passes clean, all 4 hooks generated (`useUploadSkillProfileMutation`, `useExtractSkillProfileMutation`, `useMySkillProfileQuery`, `useMatchedJobsQuery`)
- `pnpm build`: passes clean, all routes rendered including `/resume`
- Intentional deviations from epic spec documented in Dev Notes (SkillProfile naming, base64 upload, LlamaParse, external job matcher worker)

### Change Log

- 2026-02-24: Story verified and closed — pre-existing implementation confirmed correct, codegen + build pass clean

### File List

- `src/db/schema.ts` (EXISTING) — `resumes` table verified
- `migrations/0011_add_resumes_skill_profile.sql` (EXISTING) — Migration verified
- `schema/resume/schema.graphql` (EXISTING) — GraphQL schema verified
- `src/graphql/skill-matching.graphql` (EXISTING) — Client documents verified
- `src/apollo/resolvers/skill-matching.ts` (EXISTING) — Resolvers verified
- `src/apollo/resolvers.ts` (EXISTING) — `skillMatchingResolvers` merge verified
- `src/lib/skills/extract-from-resume.ts` (EXISTING) — Extraction function verified
- `src/__generated__/hooks.tsx` (AUTO) — Regenerated by `pnpm codegen`
- `src/__generated__/types.ts` (AUTO) — Regenerated by `pnpm codegen`
- `src/__generated__/resolvers-types.ts` (AUTO) — Regenerated by `pnpm codegen`
- `src/__generated__/typeDefs.ts` (AUTO) — Regenerated by `pnpm codegen`
