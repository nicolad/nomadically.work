---
stepsCompleted: [1, 2, 3, 4]
status: complete
completedAt: '2026-02-23'
inputDocuments:
  - _bmad-output/planning-artifacts/prd-skills-based-matching-2026-02-23.md
  - _bmad-output/planning-artifacts/architecture-skills-based-matching-2026-02-23.md
workflowType: 'epics-and-stories'
project_name: 'nomadically.work'
user_name: 'Vadim'
date: '2026-02-23'
---

# nomadically.work - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for nomadically.work — Skills-Based Job Matching feature, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Authenticated users can upload a resume file (PDF or plain text)
FR2: Authenticated users can view their currently stored resume
FR3: Authenticated users can replace their stored resume with a new upload
FR4: The system extracts raw text content from an uploaded resume file
FR5: The system stores resume data linked to the authenticated user's identity
FR6: The system extracts a list of skills from resume text using the existing skill taxonomy
FR7: The system validates extracted skills against the taxonomy — only taxonomy-recognised skills are stored
FR8: The system stores a taxonomy version reference alongside extracted skill tags
FR9: The system produces deterministic skill extraction output for identical resume input
FR10: The system displays extracted skills to the user after processing
FR11: Authenticated users can request a ranked list of jobs matched to their resume skills
FR12: The system computes match results by intersecting resume skill tags with job skill tags in D1
FR13: The system ranks matched jobs by overlap count (number of skills matched)
FR14: The system returns match results for partial matches — no minimum score floor
FR15: Each matched job result includes the count of matched skills and total required skills
FR16: Each matched job result includes the list of skills the user possesses that match
FR17: Each matched job result includes the list of required skills the user is missing
FR18: Authenticated users can view a ranked list of matched jobs with per-job skill overlap breakdown
FR19: Users can navigate from a matched job result to the full job detail page
FR20: Users can see which specific skills they have and lack for each matched job
FR21: The match results surface indicates when new matching jobs have appeared since the user's last visit
FR22: Unauthenticated users are redirected to sign-in when accessing resume or match surfaces
FR23: Resume data is accessible only to the user who uploaded it
FR24: Match results are computed and returned only for the authenticated requesting user
FR25: Operators can run the skill extraction eval suite to measure extraction accuracy
FR26: The system enforces a ≥ 80% extraction accuracy gate before production deployment
FR27: Operators can view the count of resumes uploaded via the admin panel
FR28: The system exposes an `uploadResume` mutation accepting a file and returning the stored resume
FR29: The system exposes an `extractResumeSkills` mutation triggering skill extraction and returning updated resume
FR30: The system exposes a `myResume` query returning the authenticated user's current resume with extracted skills
FR31: The system exposes a `matchedJobs` query returning paginated matched job results for the authenticated user

### NonFunctional Requirements

NFR1: Resume upload + skill extraction completes end-to-end in < 10 seconds for resumes up to 5 pages
NFR2: `matchedJobs` query returns results in < 2 seconds p95 for a corpus of up to 10,000 active jobs
NFR3: Vectorize similarity search (Phase 2) returns results in < 500ms p95
NFR4: Match results page renders first result within 3 seconds of query initiation on standard broadband
NFR5: Match results load in ≤ 2 D1 queries per request (no N+1 pattern)
NFR6: Resume data is stored scoped to the uploading user's Clerk user ID — cross-user access is not possible
NFR7: Resume raw text and extracted skills are not exposed via any public or unauthenticated endpoint
NFR8: File uploads validated for type (PDF/text only) and size (≤ 5MB) before processing
NFR9: All data in transit encrypted via HTTPS (enforced by Vercel + Cloudflare)
NFR10: No new unauthenticated data exposure — existing Clerk + `context.userId` guard patterns applied consistently
NFR11: Resume upload form and match results surface meet WCAG 2.1 AA for keyboard navigation and screen reader support (via Radix UI primitives)
NFR12: Skill overlap breakdowns conveyed via text, not colour alone
NFR13: Resume skill extraction reuses `src/lib/skills/` extraction functions exclusively — no duplicate implementation
NFR14: Match queries join against the existing `jobSkillTags` D1 table — no separate skill storage
NFR15: LLM extraction calls use `temperature: 0` for deterministic, reproducible output
NFR16: All resume mutations enforce the Clerk auth guard pattern consistent with existing protected mutations in `src/apollo/resolvers/`
NFR17: Skill extraction accuracy ≥ 80% on the Vitest eval test set before any production deployment (`pnpm test:eval`)
NFR18: Feature introduces zero breaking changes to existing jobs, applications, companies, or auth flows
NFR19: Resume data persists across sessions — users returning after ≥ 7 days see previously extracted skills and match results without re-uploading

### Additional Requirements

**From Architecture — Implementation Sequence (dependency-ordered):**
- Step 1: `src/db/schema.ts` — append `resumes` table → run `pnpm db:generate && pnpm db:push`
- Step 2: `schema/resume/resume.graphql` — new types + `extend type Mutation/Query` → run `pnpm codegen`
- Step 3: `src/lib/skills/extract-from-resume.ts` — standalone extraction function + eval coverage (`pnpm test:eval` ≥ 80%)
- Step 4: `src/apollo/resolvers/resume/` — 4 resolver files + merge into `src/apollo/resolvers/index.ts`
- Step 5: `src/app/resume/page.tsx` + `src/components/resume/` — upload form + match results UI
- Step 6: Admin panel extension for upload count display (FR27)

**From Architecture — Critical Implementation Patterns (enforced for all stories):**
- Auth guard `if (!context.userId) throw new GraphQLError(...)` as FIRST statement in every resume resolver
- Data isolation: `eq(resumes.user_id, context.userId)` in every `resumes` query — never return cross-user rows
- Resume upsert: `.onConflictDoUpdate({ target: resumes.user_id })` — one resume per user at DB level (FR3)
- SQL-only matching: `inArray + groupBy + orderBy(desc(count))` — never application-layer loop (NFR5)
- `missingSkills[]` computed as `Set(jobSkills) - Set(resumeSkills)` in resolver after fetching all tags for matched job IDs
- JSON parse: `extracted_skills` parsed at resolver level, not in field resolvers
- PDF parsing server-side via `pdfjs-dist` in `uploadResume` resolver
- File validation (type: `application/pdf` or `text/plain`; size: ≤ 5MB) before any processing
- `extractSkillsFromResume()` must be a standalone exported async function — callable by resolver and eval suite
- Run `pnpm codegen` after any `schema/resume/` change before implementing resolvers

**From Architecture — Schema Constraints:**
- New `schema/resume/resume.graphql` with `extend type Mutation` / `extend type Query` — no edits to existing schema files
- New Drizzle table `resumes`: `id`, `user_id`, `filename`, `raw_text`, `extracted_skills` (JSON text), `taxonomy_version`, `created_at`, `updated_at`
- `user_id` indexed for per-user query performance
- `taxonomy_version` set at extraction time from `src/lib/skills/` version constant

**From Architecture — Infrastructure Constraints:**
- No new Cloudflare Workers — all processing in existing `/api/graphql` route
- Standard `pnpm deploy` — no wrangler changes required
- Eval gate: `pnpm test:eval` ≥ 80% before merging extraction function (hard gate, not advisory)
- Launch gate: ≥ 500 active jobs with `jobSkillTags` rows before enabling the feature (feature flag or manual check)

### FR Coverage Map

FR1: Epic 1 — Upload resume file
FR2: Epic 1 — View stored resume
FR3: Epic 1 — Replace resume (upsert)
FR4: Epic 1 — Extract raw text from file
FR5: Epic 1 — Store resume linked to user
FR6: Epic 1 — Extract skills from taxonomy
FR7: Epic 1 — Validate skills against taxonomy
FR8: Epic 1 — Store taxonomy version reference
FR9: Epic 1 — Deterministic extraction output
FR10: Epic 1 — Display extracted skills to user
FR11: Epic 2 — Request ranked matched jobs
FR12: Epic 2 — SQL intersection match computation
FR13: Epic 2 — Rank by overlap count
FR14: Epic 2 — Return partial matches (no floor)
FR15: Epic 2 — Matched count + total required per job
FR16: Epic 2 — List of matched skills per job
FR17: Epic 2 — List of missing skills per job
FR18: Epic 2 — Ranked match list with breakdown UI
FR19: Epic 2 — Navigate to job detail from match result
FR20: Epic 2 — Skill have/lack breakdown per job
FR21: Epic 2 — Freshness indicator for new matched jobs
FR22: Epic 1 — Redirect unauthenticated to sign-in
FR23: Epic 1 — Resume data per-user only
FR24: Epic 2 — Match results per-user only
FR25: Epic 3 — Run eval suite
FR26: Epic 3 — Enforce ≥ 80% accuracy gate
FR27: Epic 3 — Admin upload count display
FR28: Epic 1 — `uploadResume` mutation
FR29: Epic 1 — `extractResumeSkills` mutation
FR30: Epic 1 — `myResume` query
FR31: Epic 2 — `matchedJobs` query

## Epic List

### Epic 1: Resume Upload & Skill Profile
A user can upload their resume (PDF or text), have their skills extracted against the taxonomy, and view their personal skill profile — the complete foundation that makes matching possible.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR22, FR23, FR28, FR29, FR30

### Epic 2: Skill-Based Job Match Discovery
A user with a skill profile can request a ranked list of matched jobs showing exactly how many required skills they have and which ones they're missing — letting them discover relevant EU remote roles without scanning job boards.
**FRs covered:** FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR24, FR31

### Epic 3: Extraction Quality Gate & Admin Visibility
Operators can run the skill extraction eval suite, enforce the ≥ 80% accuracy gate before production deploy, and view upload counts in the admin panel.
**FRs covered:** FR25, FR26, FR27

---

## Epic 1: Resume Upload & Skill Profile

A user can upload their resume (PDF or text), have their skills extracted against the taxonomy, and view their personal skill profile — the complete foundation that makes matching possible.

### Story 1.1: Resume Upload, Storage & GraphQL Schema

As an authenticated user,
I want to upload my resume (PDF or plain text),
So that it is stored in the system and I have a persistent profile ready for skill extraction.

**Acceptance Criteria:**

**Given** `src/db/schema.ts` is extended with the `resumes` table (id, user_id, filename, raw_text, extracted_skills, taxonomy_version, created_at, updated_at) with `user_id` indexed
**When** `pnpm db:generate && pnpm db:push` is run
**Then** the migration is applied to D1 without errors
**And** no existing tables (jobs, jobSkillTags, companies, applications) are modified

**Given** `schema/resume/resume.graphql` defines `Resume`, `MatchedJob`, `MatchedJobsResult` types and `extend type Mutation { uploadResume(file: Upload!): Resume! extractResumeSkills(resumeId: ID!): Resume! }` and `extend type Query { myResume: Resume matchedJobs(limit: Int, offset: Int): MatchedJobsResult! }`
**When** `pnpm codegen` is run
**Then** types, resolver types, and Apollo hooks are generated in `src/__generated__/` without errors

**Given** an authenticated user submits a PDF or plain text file via the `uploadResume` mutation
**When** the `upload-resume.ts` resolver runs
**Then** it checks `context.userId` first — throws `GraphQLError("Unauthorized", { extensions: { code: "UNAUTHENTICATED" } })` if absent
**And** validates file type (`application/pdf` or `text/plain`) — throws `GraphQLError("Invalid file type")` on failure
**And** validates file size (≤ 5MB) — throws `GraphQLError("File too large")` on failure
**And** extracts raw text from the file (PDF via `pdfjs-dist`, plain text directly)
**And** upserts to `resumes` via `.onConflictDoUpdate({ target: resumes.user_id })` — replacing any prior resume for the user
**And** returns the stored `Resume` object with `extractedSkills: []` (extraction not yet run)

**Given** `resumeResolvers` is exported from `src/apollo/resolvers/resume/index.ts`
**When** it is merged into the root resolver map in `src/apollo/resolvers/index.ts`
**Then** the `uploadResume` mutation is accessible and returns a valid `Resume` via `/api/graphql`

---

### Story 1.2: Skill Extraction Function & Mutation

As an authenticated user,
I want my stored resume's skills to be extracted against the skill taxonomy,
So that I have a validated, deterministic skill profile I can use for job matching.

**Acceptance Criteria:**

**Given** `src/lib/skills/extract-from-resume.ts` exports `async function extractSkillsFromResume(text: string, taxonomy: string[]): Promise<{ skills: string[]; taxonomyVersion: string }>`
**When** called with resume text and the taxonomy array
**Then** it calls the LLM with `temperature: 0` for deterministic output
**And** returns only skills present in the taxonomy — all unrecognised strings are filtered out
**And** returns the `taxonomyVersion` constant from `src/lib/skills/`
**And** produces identical output for identical input on repeated calls

**Given** the `extractResumeSkills` mutation is called by an authenticated user with a valid `resumeId`
**When** the `extract-resume-skills.ts` resolver runs
**Then** it checks `context.userId` first — throws `GraphQLError("Unauthorized")` if absent
**And** loads the resume from D1 with `eq(resumes.user_id, context.userId)` — throws `GraphQLError("Resume not found")` if absent
**And** calls `extractSkillsFromResume(resume.raw_text, taxonomy)` from `src/lib/skills/extract-from-resume.ts`
**And** updates the `resumes` row: `extracted_skills` (JSON-serialised array), `taxonomy_version`, `updated_at`
**And** returns the updated `Resume` object with populated `extractedSkills`

**Given** `extracted_skills` is stored as JSON text in D1
**When** the resolver reads it back
**Then** it parses via `JSON.parse(resume.extracted_skills) as string[]` at the resolver level — not inside a field resolver

---

### Story 1.3: Resume Profile Page

As an authenticated user,
I want a `/resume` page where I can upload my resume and see my extracted skill profile,
So that I have a single place to manage my skills and trigger extraction.

**Acceptance Criteria:**

**Given** an unauthenticated user navigates to `/resume`
**When** the Clerk auth check in `src/app/resume/page.tsx` runs
**Then** they are redirected to the Clerk sign-in page

**Given** an authenticated user with no existing resume navigates to `/resume`
**When** the `myResume` query returns `null`
**Then** the upload form (`resume-upload-form.tsx`) is displayed with a file input accepting `.pdf,.txt`, an upload button, and placeholder text

**Given** an authenticated user submits a resume via the upload form
**When** `uploadResume` mutation completes and then `extractResumeSkills` mutation completes
**Then** a loading state (spinner or skeleton) is shown during processing
**And** on success, extracted skill tags are displayed via `skill-tag-list.tsx`
**And** the `resumeId` from the upload response is used to trigger the extraction mutation

**Given** an authenticated user with an existing resume navigates to `/resume`
**When** the `myResume` query returns their resume with extracted skills
**Then** their extracted skill tags are displayed immediately without requiring a re-upload (NFR19)
**And** a "Replace resume" affordance is visible to re-trigger the upload flow

**Given** the `myResume` resolver in `my-resume.ts`
**When** called by an authenticated user
**Then** it checks `context.userId` first — throws `GraphQLError("Unauthorized")` if absent
**And** queries `resumes` with `eq(resumes.user_id, context.userId)`
**And** returns `null` if no resume exists (not an error condition)

---

## Epic 2: Skill-Based Job Match Discovery

A user with a skill profile can request a ranked list of matched jobs showing exactly how many required skills they have and which ones they're missing — letting them discover relevant EU remote roles without scanning job boards.

### Story 2.1: `matchedJobs` Query API

As an authenticated user with a skill profile,
I want to query a ranked list of jobs matched to my extracted skills,
So that I receive relevant job results ordered by how well they fit my background.

**Acceptance Criteria:**

**Given** the `matchedJobs` resolver in `resolvers/resume/matched-jobs.ts`
**When** called by an unauthenticated user
**Then** it throws `GraphQLError("Unauthorized", { extensions: { code: "UNAUTHENTICATED" } })`

**Given** an authenticated user calls `matchedJobs` but has no resume
**When** the resolver queries `resumes` with `eq(resumes.user_id, context.userId)` and finds no row
**Then** it throws `GraphQLError("No resume found. Please upload your resume first.")`

**Given** an authenticated user with extracted skills calls `matchedJobs`
**When** the resolver executes
**Then** Query 1 retrieves ranked job IDs: `SELECT job_id, count(*) FROM jobSkillTags WHERE tag IN (resumeSkills) GROUP BY job_id ORDER BY count(*) DESC LIMIT limit+1 OFFSET offset`
**And** Query 2 batch-fetches job details: `SELECT * FROM jobs WHERE id IN (matchedJobIds)`
**And** total D1 queries ≤ 2 (NFR5 — no N+1)

**Given** the ranked job IDs and resume skills
**When** computing per-job skill breakdown
**Then** for each matched job, `matchedSkills` = intersection of resume skills and job skill tags
**And** `missingSkills` = `Set(jobSkills) - Set(resumeSkills)`
**And** `matchScore` = `matchedSkills.length / totalRequired` (float)
**And** `totalMatched` and `totalRequired` integers are populated on each `MatchedJob`

**Given** partial matches exist (user has fewer skills than required)
**When** results are assembled
**Then** they are included in the results — no minimum score floor applied (FR14)

**Given** `limit` and `offset` arguments are provided
**When** results are assembled
**Then** `hasMore` = `rows.length > limit` (no extra COUNT query)
**And** returned jobs list is sliced to `limit`

---

### Story 2.2: Match Results UI with Skill Breakdown & Freshness

As an authenticated user,
I want to see my ranked matched jobs on the `/resume` page with per-job skill breakdowns and freshness indicators,
So that I can spot the best opportunities and know when new ones have appeared since my last visit.

**Acceptance Criteria:**

**Given** an authenticated user with extracted skills is on the `/resume` page
**When** the `matchedJobs` query (Apollo `useQuery`) completes
**Then** a ranked list of `MatchedJob` cards is rendered via `matched-job-card.tsx`
**And** each card displays: job title, company name, `totalMatched / totalRequired` skill count, matched skills list, missing skills list

**Given** skill overlap data is displayed on a matched job card
**When** matched and missing skills are rendered
**Then** they are conveyed via labelled text groups (e.g. "You have:", "You're missing:") — not colour alone (NFR12)
**And** both lists are accessible to screen readers (NFR11)

**Given** a matched job card is displayed
**When** the user clicks the job title or "View job" link
**Then** they navigate to the full job detail page (existing job detail route) (FR19)

**Given** a job's `postedAt` timestamp is after the user's resume `updatedAt` timestamp
**When** the job card is rendered
**Then** a "New" indicator is shown on the card (FR21)

**Given** the `matchedJobs` query is in a loading state
**When** Apollo `loading` is `true`
**Then** skeleton card placeholders are shown in place of results (NFR4)

**Given** an authenticated user has no extracted skills (empty `extractedSkills` array)
**When** the match results section renders
**Then** a prompt is shown: "Upload your resume to see matched jobs" with a link to the upload form — no empty list is shown

---

## Epic 3: Extraction Quality Gate & Admin Visibility

Operators can run the skill extraction eval suite, enforce the ≥ 80% accuracy gate before production deploy, and view upload counts in the admin panel.

### Story 3.1: Resume Extraction Eval Coverage & Quality Gate

As an operator,
I want the eval suite to include resume skill extraction test cases,
So that I can measure extraction accuracy and enforce the ≥ 80% gate before any production deployment.

**Acceptance Criteria:**

**Given** `src/evals/remote-eu-eval.test.ts` is extended with resume extraction test cases
**When** the test cases are added
**Then** they cover at minimum: correct taxonomy skill identification, rejection of non-taxonomy strings, determinism (same input → same output across runs), sparse resume handling (short/thin resume), and edge cases (empty text input)

**Given** `pnpm test:eval` is run after the extraction function is implemented
**When** all test cases execute against `extractSkillsFromResume()`
**Then** accuracy is reported as a percentage
**And** if accuracy is < 80%, the test suite fails — blocking any production deployment of the extraction function (FR26)

**Given** the test suite passes at ≥ 80%
**When** the operator reviews the output
**Then** accuracy percentage, total test count, and pass/fail breakdown are visible in the test output (FR25)

---

### Story 3.2: Admin Panel Resume Upload Count

As an operator,
I want to see the total count of resumes uploaded in the admin panel,
So that I can monitor adoption of the skills matching feature after launch.

**Acceptance Criteria:**

**Given** an admin user navigates to the admin panel
**When** the resume metrics section is displayed
**Then** the total count of rows in the `resumes` D1 table is shown as a metric (FR27)

**Given** the data fetch for the resume count
**When** executed
**Then** it uses the `isAdminEmail()` guard — throws `Forbidden` for non-admin users
**And** executes `SELECT count(*) FROM resumes` via Drizzle (`db.select({ count: count() }).from(resumes)`)
**And** the result is displayed as a metric card consistent with existing admin panel UI patterns
