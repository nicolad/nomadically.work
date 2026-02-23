import json
from typing import Optional
from urllib.parse import urlparse
from js import JSON, JSON as JsJSON
from pyodide.ffi import to_js
from workers import Response, WorkerEntrypoint
from langchain_core.prompts import ChatPromptTemplate  # available for future chain composition

TARGET_ROLES = [
    "AI Engineer", "Machine Learning Engineer",
    "React Developer", "Frontend Developer", "Full Stack Developer",
]
ROLE_SCORE_THRESHOLD = 0.4
MAX_CANDIDATES = 50
LLM_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"


# ---- Module-level helpers (copied from process-jobs/src/entry.py:362-395) ----

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


# ---- Worker ----

class Default(WorkerEntrypoint):

    @property
    def _cors_headers(self):
        return {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
            "Access-Control-Max-Age": "86400",
        }

    def _authenticate(self, request) -> Optional[Response]:
        """Validate API key. Returns an error Response if invalid, None if ok."""
        expected = getattr(self.env, "API_KEY", None)
        if not expected:
            return None  # no key configured — skip auth
        provided = None
        try:
            provided = (
                request.headers.get("X-API-Key")
                or request.headers.get("x-api-key")
            )
        except Exception:
            pass
        if not provided or provided != expected:
            return Response.json(
                {"success": False, "error": "Unauthorized"},
                status=401,
                headers=self._cors_headers,
            )
        return None

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
