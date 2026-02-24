---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
status: complete
completedAt: '2026-02-23'
inputDocuments:
  - product-brief (from Trigger.dev task 01KJ59YWDY5DRZZBBQ9QKDQRYH - provided inline)
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
  projectContext: 0
classification:
  projectType: web_app + api_backend
  domain: scientific / AI-ML
  complexity: medium
  projectContext: brownfield
---

# Product Requirements Document — Skills-Based Job Matching

**Author:** Vadim | **Date:** 2026-02-23 | **Type:** `web_app + api_backend` | **Context:** brownfield | **Domain:** scientific / AI-ML | **Complexity:** medium

## Executive Summary

**Skills-Based Job Matching** is a brownfield feature addition to nomadically.work that transforms the platform from a job board users browse into one that works for them. Job seekers upload a resume; the system extracts skills via the existing `src/lib/skills/` taxonomy, computes overlap against `jobSkillTags` already stored in D1, and returns a ranked list of remote EU tech jobs weighted by match score.

No new ML infrastructure is required. Cloudflare Vectorize, a curated skill taxonomy with extraction pipeline, and a D1 job database with pre-extracted skill tags already exist. The gap is the absence of a user-facing surface that mirrors the job-side skill extraction onto the candidate side.

**Primary user:** A mid-to-senior EU tech professional (or EU-remote-eligible candidate) who wants to stop scanning job boards and start receiving personalised signal. Today they search by title and keyword; this feature tells them which jobs they actually qualify for and by how much.

**Key differentiator:** Structural skill matching rather than keyword search. nomadically.work has both sides of the equation in structured form — extracted skill tags on jobs and a taxonomy to extract them from resumes — making the match deterministic and explainable ("you have 7 of 9 required skills") rather than opaque. No direct competitor in the EU remote tech niche runs skills-based matching against a curated taxonomy.

## Success Criteria

### User Success

- **Match relevance:** ≥ 70% of recommended jobs rated "relevant" on first interaction (proxied by click-through to job detail or application initiation)
- **Skill extraction accuracy:** Resume skill extraction produces ≥ 80% overlap with skills a user self-identifies — validated via the existing Promptfoo/Vitest eval pipeline in `src/evals/`
- **Time-to-first-match:** User uploads resume and sees ranked results within 10 seconds
- **Explainability:** Every recommended job displays a skill overlap breakdown ("8 of 10 required skills matched") — no black-box scores
- **Return signal:** User returns to the `/resume` or matching surface within 7 days of first use

### Business Success

- **Resume uploads:** ≥ 10 resumes uploaded in the first 2 weeks post-launch
- **Return visit rate:** Users who use matching return at a higher rate than non-matching users (measured via Clerk session data)
- **Platform differentiation:** Feature referenced in at least one public positioning statement (blog post, landing page copy)

### Technical Success

- **Skill extraction pipeline:** Resume → extracted skill tags completes without errors using existing `src/lib/skills/` taxonomy
- **No N+1 queries:** Matching results page loads jobs + skill overlap in ≤ 2 D1 queries (batched via gateway)
- **Zero breaking changes:** Existing jobs, applications, and company flows are unaffected
- **Eval gate:** Skill extraction accuracy ≥ 80% before shipping to production (enforced via `pnpm test:eval`)

### Measurable Outcomes

| Outcome | Target | Measurement |
|---|---|---|
| Skill extraction accuracy | ≥ 80% | Vitest eval suite (`src/evals/`) |
| Match relevance (click-through) | ≥ 70% of top-5 results clicked | Clerk session + D1 event log |
| Time-to-first-match | < 10s end-to-end | Manual timing + Langfuse trace |
| Resume uploads (week 1–2) | ≥ 10 | D1 `resumes` table count |
| Vectorize query p95 (growth) | < 500ms | Cloudflare Workers analytics |

## Product Scope & Roadmap

### Phase 1 — MVP

**Philosophy:** Problem-solving MVP — prove taxonomy-grounded skill extraction + exact overlap matching produces a ranked job list users click on first visit. No growth features until click-through ≥ 70% is validated.

**Resource requirements:** Solo developer. Single Vercel deployment + existing Cloudflare Workers infrastructure. No new infra provisioning.

| Capability | Rationale |
|---|---|
| PDF/text resume upload via `uploadResume` mutation | Entry point — nothing works without this |
| Raw text extraction from uploaded file | PDF → text is the first processing step |
| Skill extraction via `src/lib/skills/` taxonomy | Core matching input — reuses existing pipeline |
| `resumes` D1 table + Drizzle schema | Persistent storage for extracted skills; required for return visits |
| `matchedJobs` query — SQL overlap join against `jobSkillTags` | The actual matching — ranked list by intersection count |
| Per-job skill overlap breakdown (matched / missing counts) | Explainability is a success criterion — not optional |
| `/resume` page — upload form + ranked results | User-facing surface — the feature is invisible without it |
| Clerk auth guard on all resume routes/mutations | Resume data is PII-adjacent |
| Eval coverage ≥ 80% via `pnpm test:eval` | Eval gate before production deploy |

**Launch gate:** ≥ 500 active jobs with `jobSkillTags` rows before enabling the feature.

**Out of scope at MVP:** Vectorize semantic fallback, skill gap learning resources, saved match alerts, resume versioning, Langfuse tracing on extraction calls, recruiter-side reverse matching.

### Phase 2 — Growth

- Vectorize semantic matching for taxonomy misses (e.g. "NextJS" → "Next.js")
- Match score weighting by requirement level (required vs. nice-to-have)
- Skill gap view with missing skills highlighted per job
- Langfuse tracing on extraction calls for production quality monitoring
- Saved matches + new-job alerts when match score exceeds threshold

### Phase 3 — Expansion

- Recruiter-side view: submit job description → ranked candidate list
- Application tracking integration: pre-fill applications with matched skills
- Cross-platform skill graph: infer implicit skills from work history (e.g. "worked at Stripe" → payments, distributed systems)
- EU-specific signal layer: right-to-work, timezone compatibility, salary band on top of skill overlap
- Resume versioning: multiple variants with independent match views

## User Journeys

### Journey 1: Alex finds his fit (Primary — Success Path)

Alex is a mid-level Go developer based in Berlin. Three weeks of passive job hunting — opening the same Remotive and LinkedIn tabs every morning, scanning titles, losing the thread. He hears about nomadically.work through a forum post and sees the "Match your skills" CTA.

He uploads his PDF resume — 2 pages, 5 years of experience. The system extracts 23 skills: Go, PostgreSQL, gRPC, Docker, Kubernetes, AWS, REST APIs, system design, and 15 more. Within 8 seconds a ranked list appears. The top result: a senior backend role at a Berlin-based fintech, **9 of 11 required skills matched**. He hasn't seen this job elsewhere — it was ingested via Ashby two days ago.

He clicks through, applies directly, and bookmarks the match view. Three days later, two new jobs have appeared above the fold.

**Capabilities revealed:** Resume upload, skill extraction pipeline, ranked match query, job detail link-through, persistent match view with freshness.

---

### Journey 2: Sparse resume, unexpected results (Primary — Edge Case)

Priya is a self-taught frontend developer, 2 years of freelance work. Her resume is short — project descriptions, no formal job titles, no employer names.

Extraction returns only 8 skills — React, CSS, Figma, JavaScript, and a few others. The match surface shows 12 jobs ranked. The top result is a mid-level React role requiring 14 skills; she matches 6. The overlap breakdown shows which 8 she has and which 6 she doesn't — TypeScript, Jest, accessibility standards, three others.

She doesn't feel rejected — she sees a clear gap map. She applies to the #3 result (7 of 9 match) and notes the missing skills.

**Capabilities revealed:** Graceful handling of sparse resumes, partial match display (no hard minimum-score filter at MVP), skill gap visibility in overlap breakdown.

---

### Journey 3: Vadim monitors match quality (Admin/Operator)

A week after launch, Vadim opens the admin panel. He sees 14 resume uploads. He runs `pnpm test:eval` — 83% accuracy on the resume extraction test set. Within threshold. He spot-checks two resumes via Drizzle Studio: one false positive where "machine learning" was extracted from an objective statement.

He adds a test case to `src/evals/remote-eu-eval.test.ts`, re-runs — 81%, still above the bar. He notes the pattern in a Langfuse trace comment and ships the fix.

**Capabilities revealed:** Admin visibility into upload counts, eval tooling integration for ongoing quality monitoring, Langfuse tracing for extraction calls.

## Domain-Specific Requirements

### AI/ML Constraints

- **Grounding-First:** All extracted skills validated against `src/lib/skills/` taxonomy — no free-form skill strings stored or matched. Prevents hallucinated skills from polluting match results.
- **Eval Gate:** Resume skill extraction must pass the Vitest eval suite (≥ 80% accuracy) before any production deployment. Enforced via `pnpm test:eval`.
- **Reproducibility:** Identical resume input must produce identical skill output. LLM extraction calls use `temperature: 0` — or use the rule-based extractor path in `src/lib/skills/` where available.
- **Taxonomy Version Lock:** Resume skill tags store a `taxonomy_version` reference. Match results are invalid across taxonomy version boundaries; stale tags must be flagged for re-extraction.

### Integration Constraints

- **`src/lib/skills/` pipeline** — Resume extraction reuses existing skill extraction functions; no parallel implementation.
- **`jobSkillTags` table** — Match queries join against the existing D1 table populated by the ATS ingestion pipeline. No duplicate skill storage.
- **Cloudflare Vectorize** — Semantic fallback for skills not in taxonomy (Phase 2); the existing Vectorize index and `workers/resume-rag/` worker are the integration surface.
- **Langfuse tracing** — LLM extraction calls instrumented via Langfuse for accuracy scoring and debugging (Phase 1: post-MVP; Phase 2: required).

### Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Skill extraction hallucinations | Bad match results | Taxonomy grounding + eval gate before deploy |
| Taxonomy drift invalidating old matches | Stale ranked results | `taxonomy_version` field on resume skill tags |
| Sparse resumes producing zero matches | Poor UX for junior/freelance users | Display partial matches; no minimum skill count floor |
| D1 query performance on large job set | Slow match page | `inArray` subquery pattern (existing in `src/apollo/resolvers/`) |
| Taxonomy too narrow — resume skills don't map | Low match coverage | Vectorize semantic layer in Phase 2; display unmatched skills as user feedback |
| Corpus too small for meaningful results | Irrelevant ranked list | Launch gate: ≥ 500 active jobs with `jobSkillTags` before enabling feature |
| PDF parsing failure | Upload blocked | Accept plain text as fallback at MVP; use pdfjs-dist |

## Innovation & Differentiators

**Taxonomy-grounded structural matching on a curated niche corpus.** Most job boards apply semantic search or keyword overlap across millions of unstructured listings. nomadically.work's innovation: a manually curated EU remote job corpus with pre-extracted structured skill tags, matched against resume skills validated through the same taxonomy. The match is deterministic, explainable, and grounded — not a black-box embedding distance.

**Two-layer matching architecture:**
- Layer 1 (MVP): Exact taxonomy overlap — `jobSkillTags` ∩ resume skill tags, ranked by intersection size
- Layer 2 (Growth): Vectorize semantic fallback — catches skill synonyms and unlisted skills not in the taxonomy

This layered approach ships fast with high precision, and semantic recall improves iteratively without changing the core ranking logic.

**Validation strategy:**
- Eval gate: `pnpm test:eval` enforces ≥ 80% extraction accuracy before any extraction change reaches production
- Click-through as proxy: match relevance validated by whether users click through from the match list
- A/B signal: if resume-matched users apply at a higher rate than non-matched users (comparable jobs, same time window), matching is adding real signal

## Technical Design

### Web App

- **Rendering:** Client-rendered (`"use client"`) — match results are user-specific and cannot be cached or indexed. Next.js App Router.
- **UI components:** Existing Radix UI Themes + Icons. Upload surface requires a file input, a skill tag list, and a job card grid — composable from existing Radix primitives. No new component library.
- **Auth gate:** `/resume` is an authenticated route — Clerk `auth()`. Unauthenticated users are redirected to sign-in. No public match preview.
- **Data fetching:** Apollo Client (already configured) handles `myResume` and `matchedJobs` queries. No additional state library.

### GraphQL Schema Additions

```graphql
# Mutations
uploadResume(file: Upload!): Resume!
extractResumeSkills(resumeId: ID!): Resume!

# Queries
myResume: Resume
matchedJobs(limit: Int, offset: Int): MatchedJobsResult!

# Types
type Resume {
  id: ID!
  userId: String!
  filename: String
  extractedSkills: [String!]!
  taxonomyVersion: String!
  createdAt: DateTime!
  updatedAt: DateTime!
}

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
```

### D1 Schema Addition

`resumes` table: `id`, `user_id`, `filename`, `raw_text`, `extracted_skills` (JSON), `taxonomy_version`, `created_at`, `updated_at`. No changes to `jobSkillTags` — read-only from matching perspective.

### Implementation Notes

- **Auth pattern:** All resume mutations and `matchedJobs` query require `context.userId` (Clerk) — throw if unauthenticated. Consistent with existing guarded mutations.
- **File upload:** `graphql-upload` (existing Apollo Server dependency). `Upload` scalar maps to `File` per `codegen.ts` config.
- **Codegen:** Run `pnpm codegen` after schema additions. Generated into `src/__generated__/types.ts`.
- **No rate limiting at MVP.** Add if abuse patterns emerge post-launch.

## Functional Requirements

### Resume Management

- **FR1:** Authenticated users can upload a resume file (PDF or plain text)
- **FR2:** Authenticated users can view their currently stored resume
- **FR3:** Authenticated users can replace their stored resume with a new upload
- **FR4:** The system extracts raw text content from an uploaded resume file
- **FR5:** The system stores resume data linked to the authenticated user's identity

### Skill Extraction

- **FR6:** The system extracts a list of skills from resume text using the existing skill taxonomy
- **FR7:** The system validates extracted skills against the taxonomy — only taxonomy-recognised skills are stored
- **FR8:** The system stores a taxonomy version reference alongside extracted skill tags
- **FR9:** The system produces deterministic skill extraction output for identical resume input
- **FR10:** The system displays extracted skills to the user after processing

### Job Matching

- **FR11:** Authenticated users can request a ranked list of jobs matched to their resume skills
- **FR12:** The system computes match results by intersecting resume skill tags with job skill tags in D1
- **FR13:** The system ranks matched jobs by overlap count (number of skills matched)
- **FR14:** The system returns match results for partial matches — no minimum score floor
- **FR15:** Each matched job result includes the count of matched skills and total required skills
- **FR16:** Each matched job result includes the list of skills the user possesses that match
- **FR17:** Each matched job result includes the list of required skills the user is missing

### Match Results UI

- **FR18:** Authenticated users can view a ranked list of matched jobs with per-job skill overlap breakdown
- **FR19:** Users can navigate from a matched job result to the full job detail page
- **FR20:** Users can see which specific skills they have and lack for each matched job
- **FR21:** The match results surface indicates when new matching jobs have appeared since the user's last visit

### Authentication & Access Control

- **FR22:** Unauthenticated users are redirected to sign-in when accessing resume or match surfaces
- **FR23:** Resume data is accessible only to the user who uploaded it
- **FR24:** Match results are computed and returned only for the authenticated requesting user

### Evaluation & Quality Gate

- **FR25:** Operators can run the skill extraction eval suite to measure extraction accuracy
- **FR26:** The system enforces a ≥ 80% extraction accuracy gate before production deployment
- **FR27:** Operators can view the count of resumes uploaded via the admin panel

### GraphQL API

- **FR28:** The system exposes an `uploadResume` mutation accepting a file and returning the stored resume
- **FR29:** The system exposes an `extractResumeSkills` mutation triggering skill extraction and returning updated resume
- **FR30:** The system exposes a `myResume` query returning the authenticated user's current resume with extracted skills
- **FR31:** The system exposes a `matchedJobs` query returning paginated matched job results for the authenticated user

## Non-Functional Requirements

### Performance

- **NFR1:** Resume upload + skill extraction completes end-to-end in < 10 seconds for resumes up to 5 pages
- **NFR2:** `matchedJobs` query returns results in < 2 seconds p95 for a corpus of up to 10,000 active jobs
- **NFR3:** Vectorize similarity search (Phase 2) returns results in < 500ms p95
- **NFR4:** Match results page renders first result within 3 seconds of query initiation on standard broadband
- **NFR5:** Match results load in ≤ 2 D1 queries per request (no N+1 pattern)

### Security

- **NFR6:** Resume data is stored scoped to the uploading user's Clerk user ID — cross-user access is not possible
- **NFR7:** Resume raw text and extracted skills are not exposed via any public or unauthenticated endpoint
- **NFR8:** File uploads validated for type (PDF/text only) and size (≤ 5MB) before processing
- **NFR9:** All data in transit encrypted via HTTPS (enforced by Vercel + Cloudflare)
- **NFR10:** No new unauthenticated data exposure — existing Clerk + `context.userId` guard patterns applied consistently

### Accessibility

- **NFR11:** Resume upload form and match results surface meet WCAG 2.1 AA for keyboard navigation and screen reader support (via Radix UI primitives)
- **NFR12:** Skill overlap breakdowns conveyed via text, not colour alone

### Integration

- **NFR13:** Resume skill extraction reuses `src/lib/skills/` extraction functions exclusively — no duplicate implementation
- **NFR14:** Match queries join against the existing `jobSkillTags` D1 table — no separate skill storage
- **NFR15:** LLM extraction calls use `temperature: 0` for deterministic, reproducible output
- **NFR16:** All resume mutations enforce the Clerk auth guard pattern consistent with existing protected mutations in `src/apollo/resolvers/`

### Reliability

- **NFR17:** Skill extraction accuracy ≥ 80% on the Vitest eval test set before any production deployment (`pnpm test:eval`)
- **NFR18:** Feature introduces zero breaking changes to existing jobs, applications, companies, or auth flows
- **NFR19:** Resume data persists across sessions — users returning after ≥ 7 days see previously extracted skills and match results without re-uploading
