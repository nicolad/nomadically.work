# Story 2.1: `matchedJobs` Query API (Skills-Based Matching)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user with a skill profile,
I want to query a ranked list of jobs matched to my extracted skills,
so that I receive relevant job results ordered by how well they fit my background.

## Acceptance Criteria

1. **Given** the `matchedJobs` resolver in `src/apollo/resolvers/skill-matching.ts` **When** called by an unauthenticated user **Then** it throws `Error("Unauthorized")`

2. **Given** an authenticated user calls `matchedJobs` but has no resume **When** the resolver runs **Then** it returns `{ jobs: [], totalCount: 0, hasMore: false }` (not an error)

3. **Given** an authenticated user with extracted skills calls `matchedJobs` **When** `JOB_MATCHER_URL` is set **Then** the resolver POSTs to `${JOB_MATCHER_URL}/match-jobs` with `{ user_id, skills, limit, offset }` **And** returns the response as `MatchedJobsResult`

4. **Given** `workers/job-matcher/src/entry.py` handles a `POST /match-jobs` request **When** called with `{ user_id, skills, limit, offset }` **Then** Step 1 fetches candidate job IDs with matching skill tags (SQL with `is_remote_eu = 1` filter) **And** Step 2 LLM-scores all candidate titles (Workers AI → DeepSeek fallback) **And** Step 3 filters to jobs with role score ≥ 0.4 **And** Step 4 fetches all skill tags for passing jobs **And** Step 5 ranks by composite score (60% role_score + 40% skill_overlap) **And** Step 6 fetches full job rows for the page **And** returns `{ jobs: [...], totalCount: int, hasMore: bool }`

5. **Given** the worker response **When** Apollo resolves `MatchedJob.job` **Then** raw D1 column names (`posted_at`, `company_id`) are correctly mapped by existing `Job` field resolvers (`publishedAt` reads `parent.posted_at`)

6. **Given** `JOB_MATCHER_URL` is not set **When** `matchedJobs` is called **Then** the resolver throws `Error("JOB_MATCHER_URL not configured")`

7. **Given** `workers/job-matcher/wrangler.jsonc` **When** `npm run deploy` is run from `workers/job-matcher/` **Then** the worker deploys to Cloudflare with the `DB` D1 binding and `AI` Workers AI binding attached

## Tasks / Subtasks

- [x] Task 1: Verify resolver delegation (AC: #1, #2, #3, #6)
  - [x] 1.1: Confirm auth guard `if (!context.userId) throw new Error("Unauthorized")` is first statement
  - [x] 1.2: Confirm empty-skills path returns `{ jobs: [], totalCount: 0, hasMore: false }` without calling worker
  - [x] 1.3: Confirm `process.env.JOB_MATCHER_URL` guard — throws if missing
  - [x] 1.4: Confirm POST to `${workerUrl}/match-jobs` with `{ user_id, skills, limit, offset }`
  - [x] 1.5: Confirm `X-API-Key` header sent when `JOB_MATCHER_API_KEY` is set
  - [x] 1.6: Confirm `return resp.json()` passes response directly to Apollo resolver tree
- [x] Task 2: Verify `workers/job-matcher` implementation (AC: #4)
  - [x] 2.1: Confirm `workers/job-matcher/src/entry.py` exists and handles `POST /match-jobs`
  - [x] 2.2: Confirm Step 1 SQL includes `is_remote_eu = 1` filter and `LIMIT MAX_CANDIDATES (50)`
  - [x] 2.3: Confirm LLM scoring (Workers AI model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`) with DeepSeek fallback
  - [x] 2.4: Confirm `ROLE_SCORE_THRESHOLD = 0.4` filter applied before skill overlap computation
  - [x] 2.5: Confirm composite score formula: `role_score * 0.6 + overlap * 0.4`
  - [x] 2.6: Confirm response shape: `{ jobs: [{ job: {id, title, url, location, posted_at, company_id}, matchedSkills, missingSkills, matchScore, totalRequired, totalMatched }], totalCount, hasMore }`
- [x] Task 3: Verify response shape compatibility with GraphQL (AC: #5)
  - [x] 3.1: Confirm `Job.publishedAt` resolver reads `parent.first_published || parent.posted_at` (handles raw worker output)
  - [x] 3.2: Confirm `Job.company` resolver uses DataLoader with `parent.company_id` (handles raw worker output)
  - [x] 3.3: Confirm page.tsx `MatchedJobCard` uses `job.id`, `job.title`, `job.url`, `job.company?.name` — verify these fields are present in worker output
- [x] Task 4: Verify wrangler config and deployment (AC: #7)
  - [x] 4.1: Confirm `workers/job-matcher/wrangler.jsonc` has correct `database_id: "632b9c57-8262-40bd-86c2-bc08beab713b"`
  - [x] 4.2: Confirm `ai` binding is present (required for Workers AI LLM scoring)
  - [x] 4.3: Document: `DEEPSEEK_API_KEY` must be set as Wrangler secret (`wrangler secret put DEEPSEEK_API_KEY --config workers/job-matcher/wrangler.jsonc`)
  - [x] 4.4: Document: after deploy, set `JOB_MATCHER_URL` in Vercel and `.env.local`
- [x] Task 5: Verify build passes
  - [x] 5.1: Run `pnpm build` — confirm no TypeScript errors in skill-matching resolver
  - [x] 5.2: Confirm `useMatchedJobsQuery` hook exists in `src/__generated__/hooks.tsx`

## Dev Notes

### ⚡ CRITICAL: WORKER AND RESOLVER ARE FULLY PRE-IMPLEMENTED

Both `workers/job-matcher/src/entry.py` (Python Cloudflare Worker) and the `matchedJobs` resolver in `src/apollo/resolvers/skill-matching.ts` were built ahead of the sprint. The dev agent's role is to **verify, validate, and document env requirements** — not to implement.

**Existing implementation:**
- Resolver: ✅ `src/apollo/resolvers/skill-matching.ts` lines 51–94
- Worker: ✅ `workers/job-matcher/src/entry.py` (310 lines)
- Wrangler config: ✅ `workers/job-matcher/wrangler.jsonc`

### Massive Architecture Deviation from Spec

The original spec called for a 2-query inline SQL resolver. The actual implementation is an **external Python Cloudflare Worker with hybrid LLM + skill-overlap scoring**:

| Spec Says | Actual Implementation | Reason |
|---|---|---|
| 2 D1 queries, inline SQL | 4+ queries + 1 LLM call, external worker | Better matching quality |
| Pure skill overlap ranking | Composite: 60% role_score + 40% skill_overlap | Role relevance matters |
| `matchScore = matched/total` | `composite = role_score*0.6 + overlap*0.4` | More nuanced |
| No LLM in matching | Workers AI + DeepSeek fallback for role scoring | Quality |
| All in Next.js resolver | External Python Worker at `JOB_MATCHER_URL` | Separation of concerns |
| No auth on worker | No `X-API-Key` validation currently | Known gap — see below |

**Do NOT revert** these deviations — they are product decisions.

### How the Matching Algorithm Works (6 Steps)

```python
# Step 1: Candidates with >=1 matching skill tag, remote EU only
SELECT DISTINCT jst.job_id, j.title
FROM job_skill_tags jst
JOIN jobs j ON j.id = jst.job_id
WHERE jst.tag IN (skills) AND j.is_remote_eu = 1
LIMIT 50  # MAX_CANDIDATES

# Step 2: LLM scores each title (Workers AI → DeepSeek fallback)
# Returns: { "AI Engineer": 0.95, "React Dev": 0.82, ... }
# Model: @cf/meta/llama-3.3-70b-instruct-fp8-fast

# Step 3: Filter jobs with role_score >= 0.4 (ROLE_SCORE_THRESHOLD)

# Step 4: Fetch skill tags for passing jobs
SELECT job_id, tag FROM job_skill_tags WHERE job_id IN (passing_ids)

# Step 5: Composite scoring
composite = role_score * 0.6 + (len(matched) / len(job_tags)) * 0.4
# Sort descending by composite

# Step 6: Paginate + fetch full job rows
SELECT id, title, url, location, posted_at, company_id, company_key
FROM jobs WHERE id IN (page_ids)
```

### Response Shape — Worker Output vs GraphQL Schema

The worker returns raw D1 column names (`posted_at`, `company_id`). This works because Apollo field resolvers handle the mapping:

```
Worker response:              Apollo Job resolver tree:
{                             publishedAt(parent) {
  job: {                        return parent.first_published || parent.posted_at; ✅
    id: number,               }
    title: string,            company(parent) {
    url: string,                return context.loaders.company.load(parent.company_id); ✅
    location: string,         }
    posted_at: string,
    company_id: number,
    company_key: string,
  },
  matchedSkills: string[],
  missingSkills: string[],
  matchScore: float,          // composite score
  totalRequired: int,
  totalMatched: int,
}
```

### `matchedJobs` Resolver — How It Works

```ts
// src/apollo/resolvers/skill-matching.ts
async matchedJobs(_parent, args, context) {
  if (!context.userId) throw new Error("Unauthorized");

  // Load resume profile
  const profileRows = await context.db.select().from(resumes)
    .where(eq(resumes.user_id, context.userId)).limit(1);
  if (profileRows.length === 0) return { jobs: [], totalCount: 0, hasMore: false };

  let resumeSkills = JSON.parse(profileRows[0].extracted_skills);
  if (resumeSkills.length === 0) return { jobs: [], totalCount: 0, hasMore: false };

  // Delegate to external worker
  const workerUrl = process.env.JOB_MATCHER_URL;  // REQUIRED
  if (!workerUrl) throw new Error("JOB_MATCHER_URL not configured");

  const resp = await fetch(`${workerUrl}/match-jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json",
                ...(apiKey ? { "X-API-Key": apiKey } : {}) },
    body: JSON.stringify({ user_id: context.userId, skills: resumeSkills, limit, offset }),
  });

  return resp.json();  // Passes worker response directly to Apollo resolver tree
}
```

### Env Vars Required

| Variable | Location | Required | Notes |
|---|---|---|---|
| `JOB_MATCHER_URL` | `.env.local` + Vercel | **YES** | URL of deployed worker (e.g. `https://nomadically-work-job-matcher.<account>.workers.dev`) |
| `JOB_MATCHER_API_KEY` | `.env.local` + Vercel | No | Optional; worker doesn't currently validate it |
| `DEEPSEEK_API_KEY` | Wrangler secret (in worker) | Recommended | Fallback if Workers AI fails; set via `wrangler secret put` |

### Worker Deployment Commands

```bash
# Deploy the job-matcher worker
cd workers/job-matcher
npm run deploy
# (runs: uv run pywrangler sync && ./scripts/setup_pyodide_deps.sh && npx wrangler deploy)

# Local dev
cd workers/job-matcher
npm run dev

# Set DeepSeek API key as secret
wrangler secret put DEEPSEEK_API_KEY --config workers/job-matcher/wrangler.jsonc

# Stream logs
wrangler tail --config workers/job-matcher/wrangler.jsonc
```

### Python Worker Runtime Notes

- Uses `python_workers` compatibility flag (Pyodide runtime)
- `langchain-core` is vendored via `./scripts/setup_pyodide_deps.sh` into `python_modules/` (no native build needed)
- D1 queries use raw SQL via `db.prepare(sql).bind(*params).all()` — not Drizzle (Python worker can't use Drizzle ORM)
- Workers AI binding: `self.env.AI.run(model, messages)` — handles LLM role scoring directly
- `pyproject.toml` manages Python dependencies via `uv`

### Known Security Gap

The worker has no `X-API-Key` validation — it accepts any request. The Next.js resolver sends `X-API-Key` only if `JOB_MATCHER_API_KEY` is set. This is noted but deferred — do NOT add auth to the worker in this story.

### Anti-Patterns to Avoid

- **Never** inline the matching SQL into the Next.js resolver — the external worker architecture is intentional
- **Never** call the worker with empty `skills` array — the resolver already guards this
- **Never** modify `src/__generated__/` files — they are auto-generated

### File Structure

| File | Status | Notes |
|------|--------|-------|
| `src/apollo/resolvers/skill-matching.ts` | ✅ EXISTS | `matchedJobs` resolver, lines 51–94 |
| `workers/job-matcher/src/entry.py` | ✅ EXISTS | 310-line Python worker |
| `workers/job-matcher/wrangler.jsonc` | ✅ EXISTS | D1 + AI bindings |
| `workers/job-matcher/package.json` | ✅ EXISTS | `dev`, `deploy`, `start` scripts |
| `workers/job-matcher/pyproject.toml` | ✅ EXISTS | Python deps via uv |
| `workers/job-matcher/scripts/setup_pyodide_deps.sh` | ✅ EXISTS | Vendors langchain-core |

### References

- [Source: epics-skills-based-matching-2026-02-23.md#Story 2.1] — Original acceptance criteria
- [Source: architecture-skills-based-matching-2026-02-23.md#Data Architecture] — Spec's 2-query SQL pattern (deviated)
- [Source: workers/job-matcher/src/entry.py] — Actual implementation (6-step LLM+SQL)
- [Source: workers/job-matcher/wrangler.jsonc] — Worker config
- [Source: src/apollo/resolvers/skill-matching.ts#L51] — `matchedJobs` resolver
- [Source: src/apollo/resolvers/job/index.ts#L104] — `publishedAt` field resolver (handles `posted_at`)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `pnpm build` → `✓ Compiled successfully` — no TypeScript errors in skill-matching resolver
- `useMatchedJobsQuery` confirmed at `hooks.tsx:5484`

### Completion Notes List

- All tasks pure verification — both resolver and Python worker fully pre-implemented and correct
- Resolver (lines 51–94): auth guard → empty-skills short-circuit → `JOB_MATCHER_URL` guard → POST `/match-jobs` → `resp.json()`
- `X-API-Key` header conditionally sent when `JOB_MATCHER_API_KEY` env set
- Python worker: 6-step algorithm confirmed — SQL with `is_remote_eu=1`, `LIMIT 50`, Workers AI (`llama-3.3-70b`) + DeepSeek fallback, `ROLE_SCORE_THRESHOLD=0.4`, `composite = role*0.6 + overlap*0.4`, response shape matches GraphQL schema
- `Job.publishedAt` resolver (`index.ts:104`): `parent.first_published || parent.posted_at` handles raw D1 column names from worker
- `Job.company` resolver (`index.ts:83`): DataLoader with `parent.company_id` — compatible with worker output
- wrangler.jsonc: correct `database_id`, `ai` binding, `python_workers` flag all confirmed
- Env requirements documented: `JOB_MATCHER_URL` (required), `JOB_MATCHER_API_KEY` (optional), `DEEPSEEK_API_KEY` (wrangler secret)

### File List

- `workers/job-matcher/src/entry.py` (EXISTING) — Python Cloudflare Worker
- `workers/job-matcher/wrangler.jsonc` (EXISTING) — Worker config
- `src/apollo/resolvers/skill-matching.ts` (EXISTING) — `matchedJobs` resolver
