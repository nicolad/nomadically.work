import asyncio
import json
from typing import Optional
from urllib.parse import urlparse
from js import JSON, JSON as JsJSON, fetch
from pyodide.ffi import to_js
from workers import Response, WorkerEntrypoint

DEEPSEEK_BASE_URL_DEFAULT = "https://api.deepseek.com/beta"
DEEPSEEK_MODEL_DEFAULT    = "deepseek-chat"
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


def _to_js_obj(d: dict):
    return JSON.parse(json.dumps(d))


async def _sleep_ms(ms: int):
    await asyncio.sleep(ms / 1000)


async def _fetch_json(url: str, method: str = "GET", headers: dict | None = None, body: str | None = None, retries: int = 2) -> dict:
    last_err = None
    for attempt in range(retries + 1):
        try:
            opts: dict = {"method": method}
            if headers:
                opts["headers"] = headers
            if body:
                opts["body"] = body
            response = await fetch(url, _to_js_obj(opts))
            if response.status == 429 or 500 <= response.status <= 599:
                if attempt == retries:
                    text = await response.text()
                    raise Exception(f"HTTP {response.status}: {text}")
                await _sleep_ms(min(5000, 300 * (2 ** attempt)))
                continue
            if not response.ok:
                text = await response.text()
                raise Exception(f"HTTP {response.status}: {text}")
            return to_py(await response.json())
        except Exception as e:
            last_err = e
            if attempt == retries:
                break
            await _sleep_ms(min(5000, 300 * (2 ** attempt)))
    raise last_err or Exception("Unknown network error")


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
            return Response.json(
                {"success": False, "error": "Server misconfiguration: API_KEY not set"},
                status=500,
                headers=self._cors_headers,
            )
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

    def _build_scoring_messages(self, titles: list[str]) -> list[dict]:
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
        return [
            {"role": "system", "content": "You are a JSON-only job relevance scorer."},
            {"role": "user", "content": prompt},
        ]

    def _parse_scores(self, text: str) -> dict[str, float]:
        text = text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        scores = json.loads(text)
        return {k: float(v) for k, v in scores.items() if isinstance(v, (int, float))}

    async def _score_titles_with_llm(self, titles: list[str]) -> dict[str, float]:
        if not titles:
            return {}
        messages = self._build_scoring_messages(titles)

        # Tier 1: Workers AI
        workers_ai_err = None
        try:
            result = await self.env.AI.run(
                LLM_MODEL,
                to_js({"messages": messages}, dict_converter=lambda d: JsJSON.stringify(d)),
            )
            result_dict = json.loads(JsJSON.stringify(result))
            return self._parse_scores(result_dict.get("response", ""))
        except Exception as exc:
            workers_ai_err = exc
            print(f"[job-matcher] Workers AI failed, trying DeepSeek fallback: {exc}")

        # Tier 2: DeepSeek fallback
        api_key  = getattr(self.env, "DEEPSEEK_API_KEY", None)
        base_url = getattr(self.env, "DEEPSEEK_BASE_URL", None) or DEEPSEEK_BASE_URL_DEFAULT
        model    = getattr(self.env, "DEEPSEEK_MODEL", None) or DEEPSEEK_MODEL_DEFAULT
        if api_key:
            try:
                payload = json.dumps({
                    "model":           model,
                    "temperature":     0.1,
                    "max_tokens":      500,
                    "response_format": {"type": "json_object"},
                    "messages":        messages,
                })
                data = await _fetch_json(
                    f"{base_url.rstrip('/')}/chat/completions",
                    method  = "POST",
                    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    body    = payload,
                )
                content = (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
                return self._parse_scores(content)
            except Exception as exc:
                raise RuntimeError(f"LLM role-scoring failed (Workers AI: {workers_ai_err}; DeepSeek: {exc})") from exc

        raise RuntimeError(f"LLM role-scoring failed: {workers_ai_err}") from workers_ai_err

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
