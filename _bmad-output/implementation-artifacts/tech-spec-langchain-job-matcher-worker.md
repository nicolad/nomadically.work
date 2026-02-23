---
title: 'LangChain Job Matcher Worker — Role-Aware Matching'
slug: 'langchain-job-matcher-worker'
created: '2026-02-23'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['python3.12', 'cloudflare-workers', 'langchain-cloudflare', 'langchain-core', 'workers-ai-llama-3.3-70b', 'd1-sqlite', 'typescript', 'apollo-server-5', 'drizzle-orm']
files_to_modify:
  - workers/job-matcher/wrangler.jsonc
  - workers/job-matcher/src/entry.py
  - workers/job-matcher/src/__init__.py
  - workers/job-matcher/pyproject.toml
  - src/apollo/resolvers/skill-matching.ts
  - .env.example
code_patterns:
  - 'WorkerEntrypoint class Default pattern (workers/process-jobs/src/entry.py)'
  - 'd1_all/to_py helpers with JS JSON round-trip (process-jobs:362-395)'
  - 'D1 IN clause: ",".join(["?"] * len(params)) with flat bind list'
  - 'self.env.AI.run() for Workers AI (resume-rag:173-196)'
  - 'CORS + _authenticate + _extract_path helpers (resume-rag:372-428)'
  - 'Thin HTTP proxy resolver replacing SQL in skill-matching.ts'
test_patterns: ['manual curl + wrangler dev smoke test']
---

# Tech-Spec: LangChain Job Matcher Worker — Role-Aware Matching

**Created:** 2026-02-23

## Overview

### Problem Statement

The current `matchedJobs` GraphQL resolver (`src/apollo/resolvers/skill-matching.ts:51`) ranks jobs by raw tag-count SQL with no minimum match floor and no role category gate:

```sql
SELECT job_id, count(*) FROM job_skill_tags
WHERE tag IN (user_skills)
GROUP BY job_id ORDER BY count(*) DESC
```

A single shared tag is sufficient to surface a job. When the LLM skill extractor over-generalises a job like "3D Furniture Designer @ Scale Army" with a generic tag (`javascript`, `python`), it appears in Vadim's results even though he targets AI Engineer or React Developer roles. There is no concept of "desired role" anywhere in the system.

### Solution

Replace the `matchedJobs` resolver entirely with an HTTP call to a new Python Cloudflare Worker (`workers/job-matcher/`). The worker uses Workers AI (Llama 3.3 70B) to:

1. Pre-filter candidate jobs by SQL skill overlap (≥1 matching tag, from D1 via binding)
2. Batch-score all candidate job titles against hard-coded target roles in a **single LLM call**
3. Drop jobs with `role_score < 0.4`
4. Rank survivors by composite score: `role_score × 0.6 + skill_overlap_ratio × 0.4`
5. Return results in the **same JSON shape** as the current resolver — zero frontend changes required

### Scope

**In Scope:**
- New `workers/job-matcher/` Python Cloudflare Worker with D1 + AI bindings
- `POST /match-jobs` endpoint authenticated via `API_KEY` secret
- Hard-coded target roles: `["AI Engineer", "Machine Learning Engineer", "React Developer", "Frontend Developer", "Full Stack Developer"]`
- Replace `matchedJobs` resolver body in `src/apollo/resolvers/skill-matching.ts` with thin HTTP proxy
- Add `JOB_MATCHER_URL` + `JOB_MATCHER_API_KEY` to `.env.example`

**Out of Scope:**
- Dynamic per-user target roles (future story)
- Changing the GraphQL schema or query shape
- Modifying `uploadSkillProfile` / `extractSkillProfile` resolvers
- Frontend changes
- Evaluation / Promptfoo tests (follow-up story)

---

## Context for Development

### Codebase Patterns

**Python CF Worker scaffold** — copy from `workers/process-jobs/`:
- `wrangler.jsonc` with `"compatibility_flags": ["python_workers"]`, D1 binding `DB`, AI binding `AI`
- `pyproject.toml` identical deps: `langchain-cloudflare`, `langchain-core>=0.3.81,<2.0.0`, `webtypy>=0.1.7`
- **No `pydantic`** (Pyodide's built-in only); **no `langsmith`** package
- Entry: `class Default(WorkerEntrypoint)` in `src/entry.py`; empty `src/__init__.py` required

**D1 query helpers** — copy verbatim from `workers/process-jobs/src/entry.py:362-395`:
```python
from js import JSON

def to_py(js_val):
    return json.loads(JSON.stringify(js_val))

async def d1_all(db, sql: str, params: list | None = None) -> list[dict]:
    stmt = db.prepare(sql)
    if params:
        stmt = stmt.bind(*JSON.parse(json.dumps(params)))
    result = await stmt.all()
    return to_py(result.results)
```

**D1 IN clause** — build placeholder string, pass flat list:
```python
placeholders = ",".join(["?"] * len(skills))
rows = await d1_all(self.env.DB,
    f"SELECT DISTINCT job_id FROM job_skill_tags WHERE tag IN ({placeholders})",
    skills)
```
Guard: if `len(skills) == 0`, return empty immediately — never execute `IN ()`.

**Workers AI call** — same as `resume-rag/src/entry.py:381-407`:
```python
from js import JSON as JsJSON
from pyodide.ffi import to_js

result = await self.env.AI.run(
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    to_js({"messages": messages}, dict_converter=lambda d: JsJSON.stringify(d)),
)
result_dict = json.loads(JsJSON.stringify(result))
text = result_dict.get("response", "")
```

**CORS / auth / path helpers** — copy from `resume-rag/src/entry.py:372-428`:
- `_cors_headers` property — identical headers
- `_authenticate(self, request)` — checks `X-API-Key` header vs `self.env.API_KEY`; skips check if secret unset
- `_extract_path(url)` — returns last URL path segment

**DB schema** (confirmed from `src/db/schema.ts`):
- `jobs`: `id` INTEGER PK, `title` TEXT, `url` TEXT, `location` TEXT, `posted_at` TEXT, `company_id` INTEGER, `company_key` TEXT, `is_remote_eu` INTEGER (stored as `0`/`1`)
- `job_skill_tags`: composite PK `(job_id, tag)`, `level` TEXT (required/preferred/nice), `confidence` REAL
- `resumes`: `extracted_skills` TEXT (JSON array of skill-tag strings)

**`is_remote_eu` SQL**: use `WHERE is_remote_eu = 1` — SQLite stores booleans as integer.

**Resolver proxy** — `fetch()` is native in Node 18+/Next.js, no import needed. The worker response JSON passes through directly — same shape as the old resolver output.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `workers/process-jobs/src/entry.py` | `to_py`, `d1_all`, `WorkerEntrypoint`, `ChatPromptTemplate` usage |
| `workers/process-jobs/wrangler.jsonc` | D1 + AI binding config template |
| `workers/process-jobs/pyproject.toml` | Exact Python deps to copy |
| `workers/resume-rag/src/entry.py` | `_cors_headers`, `_authenticate`, `_extract_path`, `AI.run()` pattern |
| `src/apollo/resolvers/skill-matching.ts` | Resolver to replace — `matchedJobs` body is lines 51–160 |
| `src/apollo/context.ts` | `GraphQLContext` type reference |
| `src/db/schema.ts` | Confirmed `jobs`, `job_skill_tags`, `resumes` table shapes |
| `.env.example` | Where to append new env vars |

### Technical Decisions

- **Single batch LLM call**: all candidate titles in one prompt (up to 50), not one call per job — keeps latency under ~2s
- **Role score threshold**: `0.4` hard-coded as `ROLE_SCORE_THRESHOLD` constant — easy to tune later
- **Composite formula**: `role_score × 0.6 + (matched_count / total_required) × 0.4`; if `total_required == 0`, use `role_score` only
- **No LangChain chains**: plain `self.env.AI.run()` is sufficient — `langchain_core` imported only for `ChatPromptTemplate` to structure the messages list cleanly
- **Empty skills guard**: return `{"jobs": [], "totalCount": 0, "hasMore": false}` before any DB query if skills list is empty
- **D1 database ID**: `632b9c57-8262-40bd-86c2-bc08beab713b` (from `workers/process-jobs/wrangler.jsonc`)

---

## Implementation Plan

### Tasks

- [x] **Task 1: Create `workers/job-matcher/wrangler.jsonc`**
  - File: `workers/job-matcher/wrangler.jsonc`
  - Action: Create new file with the following content exactly:
    ```jsonc
    {
      "name": "nomadically-work-job-matcher",
      "main": "src/entry.py",
      "compatibility_date": "2025-11-02",
      "compatibility_flags": ["python_workers"],
      "ai": { "binding": "AI", "remote": true },
      "d1_databases": [{
        "binding": "DB",
        "database_name": "nomadically-work-db",
        "database_id": "632b9c57-8262-40bd-86c2-bc08beab713b",
        "remote": true
      }],
      "observability": {
        "enabled": true,
        "logs": { "enabled": true, "invocation_logs": true, "head_sampling_rate": 1.0 }
      }
    }
    ```
  - Notes: No cron trigger, no queues — HTTP-only worker

- [x] **Task 2: Create `workers/job-matcher/pyproject.toml`**
  - File: `workers/job-matcher/pyproject.toml`
  - Action: Copy `workers/process-jobs/pyproject.toml` verbatim, then change `name` to `"nomadically-work-job-matcher"` and `description` to `"Cloudflare Python Worker for LangChain-powered role-aware job matching"`. Keep all deps identical.
  - Notes: Do not add any new packages — `langchain-cloudflare` + `langchain-core` are sufficient

- [x] **Task 3: Create `workers/job-matcher/src/__init__.py`**
  - File: `workers/job-matcher/src/__init__.py`
  - Action: Create empty file (required by Python module structure)
  - Notes: No content needed

- [x] **Task 4: Implement `workers/job-matcher/src/entry.py`**
  - File: `workers/job-matcher/src/entry.py` (new file, ~180 lines)
  - Action: Implement the full worker with this structure:

    **Imports & constants** (top of file):
    ```python
    import json
    from urllib.parse import urlparse
    from js import JSON, JSON as JsJSON
    from pyodide.ffi import to_js
    from workers import Response, WorkerEntrypoint
    from langchain_core.prompts import ChatPromptTemplate

    TARGET_ROLES = [
        "AI Engineer", "Machine Learning Engineer",
        "React Developer", "Frontend Developer", "Full Stack Developer",
    ]
    ROLE_SCORE_THRESHOLD = 0.4
    MAX_CANDIDATES = 50
    LLM_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
    ```

    **Module-level helpers** (copy verbatim from `process-jobs/src/entry.py:362-395`):
    ```python
    def to_py(js_val):
        return json.loads(JSON.stringify(js_val))

    async def d1_all(db, sql: str, params: list | None = None) -> list[dict]:
        stmt = db.prepare(sql)
        if params:
            stmt = stmt.bind(*JSON.parse(json.dumps(params)))
        result = await stmt.all()
        return to_py(result.results)

    def _extract_path(url: str) -> str:
        path = urlparse(url).path.rstrip("/")
        return path.rsplit("/", 1)[-1] if "/" in path else path
    ```

    **`class Default(WorkerEntrypoint)`** with these methods:

    `_cors_headers` property — copy from `resume-rag/src/entry.py:373-380`

    `_authenticate(self, request)` — copy from `resume-rag/src/entry.py:409-428`

    `_score_titles_with_llm(self, titles: list[str]) -> dict[str, float]`:
    ```python
    async def _score_titles_with_llm(self, titles: list[str]) -> dict[str, float]:
        if not titles:
            return {}
        target_str = ", ".join(TARGET_ROLES)
        titles_str = "\n".join(f"- {t}" for t in titles)
        prompt = (
            f'You are a job relevance scorer. Target roles: {target_str}.\n'
            f'For each job title below, return a JSON object mapping the exact title '
            f'to a score from 0.0 to 1.0, where 1.0 = perfect match for target roles '
            f'and 0.0 = completely unrelated.\n'
            f'Example output: {{"AI Engineer": 0.95, "3D Furniture Designer": 0.02}}\n'
            f'Respond ONLY with valid JSON. No explanation, no markdown.\n\n'
            f'Titles:\n{titles_str}'
        )
        messages = [
            {"role": "system", "content": "You are a JSON-only job relevance scorer."},
            {"role": "user", "content": prompt},
        ]
        try:
            result = await self.env.AI.run(
                LLM_MODEL,
                to_js({"messages": messages}, dict_converter=lambda d: JsJSON.stringify(d)),
            )
            result_dict = json.loads(JsJSON.stringify(result))
            text = result_dict.get("response", "")
            # Strip markdown code fences if present
            text = text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            scores = json.loads(text)
            return {k: float(v) for k, v in scores.items() if isinstance(v, (int, float))}
        except Exception:
            return {t: 0.0 for t in titles}  # safe fallback — all filtered out
    ```

    `_handle_match_jobs(self, request)`:
    ```python
    async def _handle_match_jobs(self, request):
        try:
            body = to_py(await request.json())
            user_id = body.get("user_id", "")
            skills = body.get("skills", [])
            limit = min(int(body.get("limit", 20)), 50)
            offset = int(body.get("offset", 0))

            if not user_id or not skills:
                return Response.json(
                    {"jobs": [], "totalCount": 0, "hasMore": False},
                    headers=self._cors_headers
                )

            # Step 1: Get candidate job IDs that have ≥1 matching skill tag
            ph = ",".join(["?"] * len(skills))
            candidate_rows = await d1_all(
                self.env.DB,
                f"""SELECT DISTINCT jst.job_id, j.title
                    FROM job_skill_tags jst
                    JOIN jobs j ON j.id = jst.job_id
                    WHERE jst.tag IN ({ph}) AND j.is_remote_eu = 1
                    LIMIT {MAX_CANDIDATES}""",
                skills,
            )
            if not candidate_rows:
                return Response.json(
                    {"jobs": [], "totalCount": 0, "hasMore": False},
                    headers=self._cors_headers
                )

            # Step 2: LLM role-score all candidate titles in one call
            id_to_title = {r["job_id"]: r["title"] for r in candidate_rows}
            titles = list(id_to_title.values())
            scores = await self._score_titles_with_llm(titles)
            # Map job_id -> role_score (match by title string)
            title_to_score = scores
            job_role_scores = {
                jid: title_to_score.get(title, 0.0)
                for jid, title in id_to_title.items()
            }

            # Step 3: Filter by threshold
            passing_ids = [
                jid for jid, s in job_role_scores.items()
                if s >= ROLE_SCORE_THRESHOLD
            ]
            if not passing_ids:
                return Response.json(
                    {"jobs": [], "totalCount": 0, "hasMore": False},
                    headers=self._cors_headers
                )

            # Step 4: Fetch all skill tags for passing jobs
            ph2 = ",".join(["?"] * len(passing_ids))
            tag_rows = await d1_all(
                self.env.DB,
                f"SELECT job_id, tag FROM job_skill_tags WHERE job_id IN ({ph2})",
                passing_ids,
            )
            skills_set = set(skills)
            job_tags: dict[int, list[str]] = {}
            for row in tag_rows:
                job_tags.setdefault(row["job_id"], []).append(row["tag"])

            # Step 5: Compute composite scores and rank
            ranked = []
            for jid in passing_ids:
                role_score = job_role_scores[jid]
                job_tag_set = set(job_tags.get(jid, []))
                matched = [t for t in skills if t in job_tag_set]
                missing = [t for t in job_tag_set if t not in skills_set]
                total_req = len(job_tag_set)
                overlap = len(matched) / total_req if total_req > 0 else 0.0
                composite = role_score * 0.6 + overlap * 0.4
                ranked.append({
                    "job_id": jid,
                    "composite": composite,
                    "matched": matched,
                    "missing": missing,
                    "total_req": total_req,
                })
            ranked.sort(key=lambda x: x["composite"], reverse=True)

            total_count = len(ranked)
            has_more = (offset + limit) < total_count
            page = ranked[offset: offset + limit]

            if not page:
                return Response.json(
                    {"jobs": [], "totalCount": total_count, "hasMore": False},
                    headers=self._cors_headers
                )

            # Step 6: Fetch full job rows for page
            page_ids = [r["job_id"] for r in page]
            ph3 = ",".join(["?"] * len(page_ids))
            job_rows = await d1_all(
                self.env.DB,
                f"SELECT id, title, url, location, posted_at, company_id, company_key "
                f"FROM jobs WHERE id IN ({ph3})",
                page_ids,
            )
            job_by_id = {r["id"]: r for r in job_rows}

            result_jobs = []
            for r in page:
                job = job_by_id.get(r["job_id"])
                if not job:
                    continue
                result_jobs.append({
                    "job": job,
                    "matchedSkills": r["matched"],
                    "missingSkills": r["missing"],
                    "matchScore": r["composite"],
                    "totalRequired": r["total_req"],
                    "totalMatched": len(r["matched"]),
                })

            return Response.json({
                "jobs": result_jobs,
                "totalCount": total_count,
                "hasMore": has_more,
            }, headers=self._cors_headers)

        except (ValueError, KeyError) as exc:
            return Response.json(
                {"success": False, "error": str(exc)},
                status=400, headers=self._cors_headers
            )
        except Exception as exc:
            return Response.json(
                {"success": False, "error": f"Internal error: {str(exc)}"},
                status=500, headers=self._cors_headers
            )
    ```

    `fetch(self, request)` dispatcher:
    ```python
    async def fetch(self, request):
        try:
            if request.method == "OPTIONS":
                return Response("", status=204, headers=self._cors_headers)
            path = _extract_path(request.url)
            if path in ("health", "") and request.method == "GET":
                return Response.json({"status": "ok"}, headers=self._cors_headers)
            auth_err = self._authenticate(request)
            if auth_err:
                return auth_err
            if path == "match-jobs" and request.method == "POST":
                return await self._handle_match_jobs(request)
            return Response.json({"error": "Not found"}, status=404, headers=self._cors_headers)
        except Exception as exc:
            return Response.json(
                {"error": f"Request failed: {str(exc)}"},
                status=500, headers=self._cors_headers
            )
    ```

  - Notes: The `langchain_core.prompts.ChatPromptTemplate` import is available but the prompt is built manually (simpler). Keep the import in case it's needed for future chain composition. Do not import `langchain_cloudflare` — `self.env.AI.run()` is used directly.

- [x] **Task 5: Replace `matchedJobs` resolver body in `src/apollo/resolvers/skill-matching.ts`**
  - File: `src/apollo/resolvers/skill-matching.ts`
  - Action: Replace lines 51–160 (the entire `matchedJobs` async function body) with the HTTP proxy implementation below. Then remove the now-unused imports `inArray`, `desc`, `sql` from `drizzle-orm` and `jobSkillTags`, `jobs` from `@/db/schema`.

    New `matchedJobs` body:
    ```typescript
    async matchedJobs(
      _parent: unknown,
      args: QueryMatchedJobsArgs,
      context: GraphQLContext,
    ) {
      if (!context.userId) throw new Error("Unauthorized");

      const limit = Math.min(args.limit ?? 20, 50);
      const offset = args.offset ?? 0;

      const profileRows = await context.db
        .select()
        .from(resumes)
        .where(eq(resumes.user_id, context.userId))
        .limit(1);

      if (profileRows.length === 0) return { jobs: [], totalCount: 0, hasMore: false };

      let resumeSkills: string[] = [];
      try { resumeSkills = JSON.parse(profileRows[0].extracted_skills) as string[]; }
      catch { resumeSkills = []; }

      if (resumeSkills.length === 0) return { jobs: [], totalCount: 0, hasMore: false };

      const workerUrl = process.env.JOB_MATCHER_URL;
      const workerApiKey = process.env.JOB_MATCHER_API_KEY;
      if (!workerUrl) throw new Error("JOB_MATCHER_URL not configured");

      const resp = await fetch(`${workerUrl}/match-jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(workerApiKey ? { "X-API-Key": workerApiKey } : {}),
        },
        body: JSON.stringify({ user_id: context.userId, skills: resumeSkills, limit, offset }),
      });

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Job matcher worker error: ${resp.status} ${err}`);
      }

      return resp.json();
    },
    ```

    Imports to keep: `eq` from `drizzle-orm`; `resumes` from `@/db/schema`
    Imports to remove: `inArray`, `desc`, `sql` from `drizzle-orm`; `jobs`, `jobSkillTags` from `@/db/schema`

  - Notes: The `resp.json()` return passes the worker's `{ jobs, totalCount, hasMore }` directly to Apollo — no mapping needed because the worker returns the same shape. The `job` sub-object fields (`id`, `title`, `url`, etc.) will still be resolved by the existing `Job` field resolvers (company DataLoader, etc.) because Apollo maps them from the plain dict returned.

- [x] **Task 6: Add env vars to `.env.example`**
  - File: `.env.example`
  - Action: Append at the end of the file:
    ```
    # Job Matcher Worker
    JOB_MATCHER_URL=https://nomadically-work-job-matcher.<account>.workers.dev
    JOB_MATCHER_API_KEY=your-job-matcher-api-key
    ```
  - Notes: For local dev use `JOB_MATCHER_URL=http://localhost:8787` and leave `JOB_MATCHER_API_KEY` empty (worker skips auth when `API_KEY` secret is not set)

---

### Acceptance Criteria

- [ ] **AC-1: Role gate blocks irrelevant jobs**
  - Given: User's `resumes.extracted_skills` is `["react", "typescript", "python", "langchain"]`
  - When: `POST /match-jobs` is called with those skills
  - Then: Jobs with titles like "3D Furniture Designer", "Graphic Designer", "Interior Architect" are absent from the response (their `role_score` is below `0.4` and they are filtered)

- [ ] **AC-2: Relevant roles surface and are ranked**
  - Given: User's skills are `["react", "typescript", "python", "langchain"]`
  - When: `POST /match-jobs` is called
  - Then: Jobs with titles "AI Engineer", "Frontend React Developer", "ML Engineer", "Full Stack Developer" appear in results; results are sorted by `matchScore` descending

- [ ] **AC-3: Response shape is unchanged**
  - Given: The updated `matchedJobs` GraphQL resolver is deployed
  - When: The existing `MatchedJobs` query (from `src/graphql/skill-matching.graphql`) is executed via Apollo
  - Then: Response contains `jobs[].job.id`, `jobs[].job.title`, `jobs[].matchedSkills`, `jobs[].missingSkills`, `jobs[].matchScore`, `jobs[].totalRequired`, `jobs[].totalMatched`, `totalCount`, `hasMore` — identical shape to the old resolver

- [ ] **AC-4: Empty profile returns empty gracefully**
  - Given: Authenticated user with no row in the `resumes` table
  - When: `matchedJobs` GraphQL query is executed
  - Then: Returns `{ jobs: [], totalCount: 0, hasMore: false }` with no error

- [ ] **AC-5: Skills list empty returns empty gracefully**
  - Given: User has a resume row with `extracted_skills = "[]"`
  - When: `matchedJobs` GraphQL query is executed
  - Then: Returns `{ jobs: [], totalCount: 0, hasMore: false }` — no DB query to the worker is made

- [ ] **AC-6: Worker auth enforced**
  - Given: `API_KEY` secret is set on the `nomadically-work-job-matcher` worker
  - When: `POST /match-jobs` is called without `X-API-Key` header
  - Then: Worker returns `401 { "success": false, "error": "Unauthorized" }`

- [ ] **AC-7: LLM JSON parse failure is handled gracefully**
  - Given: Workers AI returns malformed JSON (e.g., text with explanation instead of pure JSON)
  - When: `_score_titles_with_llm` tries to parse the response
  - Then: `except` block catches the error, all titles get score `0.0`, worker returns `{ jobs: [], totalCount: 0, hasMore: false }` — no 500 error

- [ ] **AC-8: `JOB_MATCHER_URL` missing throws a clear error**
  - Given: `JOB_MATCHER_URL` env var is not set in the Next.js environment
  - When: `matchedJobs` resolver is called
  - Then: GraphQL error `"JOB_MATCHER_URL not configured"` is returned — not a silent failure

---

## Additional Context

### Dependencies

- `langchain-cloudflare` — already in `process-jobs`, same PyPI package used here
- `langchain-core>=0.3.81` — already in `process-jobs`
- `webtypy>=0.1.7` — already in `process-jobs` (required by langchain-cloudflare)
- No new npm packages in the Next.js app — native `fetch` used in the resolver
- New env vars: `JOB_MATCHER_URL`, `JOB_MATCHER_API_KEY` (both in `.env.example`)
- Wrangler secret to set post-deploy: `wrangler secret put API_KEY --config workers/job-matcher/wrangler.jsonc`

### Testing Strategy

**Local smoke test (worker):**
```bash
wrangler dev --config workers/job-matcher/wrangler.jsonc
# In another terminal:
curl -s -X POST http://localhost:8787/match-jobs \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","skills":["react","typescript","python","langchain"]}' | jq .
```
Verify: `"3D Furniture Designer"` absent; `"AI Engineer"` / `"React Developer"` titles present; `matchScore` values descending.

**Integration test (GraphQL):**
1. Set `JOB_MATCHER_URL=http://localhost:8787` in `.env.local`
2. Run `pnpm dev`
3. Open `http://localhost:3000/api/graphql`
4. Execute `MatchedJobs` query (from `src/graphql/skill-matching.graphql`) with a logged-in session that has an extracted skill profile
5. Confirm response shape matches the `MatchedJobs` fragment fields

**Edge case tests:**
- Call with `skills: []` → expect `{ jobs: [], totalCount: 0, hasMore: false }`
- Call without `X-API-Key` when secret is set → expect `401`
- Call `/health` → expect `{ "status": "ok" }`

## Review Notes

- Adversarial review completed
- Findings: 11 total, 0 fixed, 11 skipped
- Resolution approach: skip

---

### Notes

- **Pre-mortem — LLM title collision**: If two jobs share the exact same title string, they'll share one score entry in the JSON map. This is fine — same title implies same role relevance. No dedup needed.
- **Pre-mortem — D1 `IN ()` with 0 items**: Guarded by early-return when `skills` is empty and when `candidate_rows` is empty — never reaches a `WHERE ... IN ()` with no placeholders.
- **Pre-mortem — Worker latency**: Single LLM call on up to 50 titles adds ~1–2s. Acceptable for a match page. Cache at CF Workers cache layer is a future optimisation.
- **Future**: Replace hard-coded `TARGET_ROLES` with a per-user `desired_roles` field on the `resumes` D1 table — add it as a nullable JSON column, fall back to constants when null.
- **Deploy command**: `wrangler deploy --config workers/job-matcher/wrangler.jsonc`
