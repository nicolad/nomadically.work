"""EU Classifier — Centralized Cloudflare Python Worker.

Single-responsibility worker that owns all EU remote job classification logic:
  - Deterministic signal extraction from ATS metadata
  - Keyword heuristic for unambiguous cases (Tier 0)
  - Workers AI via langchain-cloudflare LCEL chain (Tier 1 — free)
  - DeepSeek API fallback (Tier 2 — paid)

Pipeline: extract signals -> heuristic -> Workers AI -> DeepSeek fallback

Endpoints:
  GET  /health         — D1 + AI binding health check
  POST /classify       — Batch classify jobs at status='role-match'
  POST /classify-one   — Classify a single job by ID
  POST /               — Enqueue to CF Queue for async processing

Triggers:
  Cron (every 6h)      — Classify all pending jobs
  Queue consumer       — Process queued classification requests

Based on the langchain-cloudflare Python Worker pattern.
LangChain features used:
  - ChatCloudflareWorkersAI — Workers AI binding for free classification
  - ChatPromptTemplate — reusable, parameterised prompt templates
  - LCEL chain (prompt | model) — composable classification pipeline
"""

import asyncio
import json

from workers import Response, WorkerEntrypoint

from db import d1_all, d1_run, to_js_obj, to_py
from signals import extract_eu_signals, format_signals
from heuristic import keyword_eu_classify
from chain import classify_with_workers_ai, classify_with_deepseek
from models import JobClassification


# -------------------------------------------------------------------------
# HTTP fetch with retry (JS fetch for Pyodide)
# -------------------------------------------------------------------------

from js import JSON as JsJSON, fetch


async def sleep_ms(ms: int):
    """Async sleep using asyncio (Pyodide-compatible)."""
    await asyncio.sleep(ms / 1000)


async def fetch_json(
    url: str,
    method: str = "GET",
    headers: dict | None = None,
    body: str | None = None,
    retries: int = 2,
) -> dict:
    """Fetch JSON from a URL using JS fetch with retry support."""
    last_err = None

    for attempt in range(retries + 1):
        try:
            opts: dict = {"method": method}
            if headers:
                opts["headers"] = headers
            if body:
                opts["body"] = body

            response = await fetch(url, to_js_obj(opts))

            if response.status == 429 or 500 <= response.status <= 599:
                if attempt == retries:
                    text = await response.text()
                    raise Exception(f"HTTP {response.status}: {text}")
                backoff = min(5000, 300 * (2 ** attempt))
                await sleep_ms(backoff)
                continue

            if not response.ok:
                text = await response.text()
                raise Exception(f"HTTP {response.status}: {text}")

            data = await response.json()
            return to_py(data)

        except Exception as e:
            last_err = e
            if attempt == retries:
                break
            backoff = min(5000, 300 * (2 ** attempt))
            await sleep_ms(backoff)

    raise last_err or Exception("Unknown network error in fetch_json")


# -------------------------------------------------------------------------
# Job status enum values
# -------------------------------------------------------------------------

STATUS_ROLE_MATCH   = "role-match"
STATUS_ROLE_NOMATCH = "role-nomatch"
STATUS_ENHANCED     = "enhanced"
STATUS_EU_REMOTE    = "eu-remote"
STATUS_NON_EU       = "non-eu"


# -------------------------------------------------------------------------
# Core classification pipeline
# -------------------------------------------------------------------------

async def classify_single_job(
    job: dict,
    ai_binding,
    api_key: str | None,
    base_url: str,
    model: str,
) -> tuple[JobClassification | None, str]:
    """Run the full three-tier classification pipeline on a single job.

    Returns (classification, source) where source is one of:
      "heuristic", "workers-ai", "deepseek"
    """
    eu_signals   = extract_eu_signals(job)
    signals_text = format_signals(eu_signals)

    classification: JobClassification | None = None
    wa_result:      JobClassification | None = None
    source = "workers-ai"

    # Tier 0 -- Keyword heuristic (free, no LLM)
    heuristic_result = keyword_eu_classify(job, eu_signals)
    if heuristic_result is not None:
        return heuristic_result, "heuristic"

    # Tier 1 -- Workers AI (primary, free)
    if ai_binding:
        wa_result = await classify_with_workers_ai(job, ai_binding, signals_text)
        if wa_result and wa_result.confidence == "high":
            return wa_result, "workers-ai"

    # Tier 2 -- DeepSeek fallback
    if api_key:
        classification = await classify_with_deepseek(
            job, api_key, base_url, model, signals_text,
            fetch_json_fn=fetch_json,
        )
        return classification, "deepseek"

    # Accept Workers AI as-is when no DeepSeek key
    if wa_result is not None:
        return wa_result, "workers-ai"

    return None, "none"


async def classify_job_and_persist(
    db, job: dict, ai_binding, api_key: str | None,
    base_url: str, model: str,
) -> dict:
    """Classify a single job and persist the result to D1.

    Returns a stats dict for aggregation.
    """
    classification, source = await classify_single_job(
        job, ai_binding, api_key, base_url, model,
    )

    if classification is None:
        return {"error": True}

    is_eu      = classification.isRemoteEU
    confidence = classification.confidence
    evidence   = f"title:{job.get('title','')[:100]} | loc:{job.get('location','N/A')[:80]}"
    reason     = f"[{source}] {classification.reason} | evidence:{evidence}"
    score      = {"high": 0.9, "medium": 0.6, "low": 0.3}.get(confidence, 0.3)
    job_status = STATUS_EU_REMOTE if is_eu else STATUS_NON_EU

    await d1_run(
        db,
        """
        UPDATE jobs
        SET score = ?, score_reason = ?, status = ?,
            is_remote_eu = ?, remote_eu_confidence = ?, remote_eu_reason = ?,
            updated_at = datetime('now')
        WHERE id = ?
        """,
        [score, reason, job_status,
         1 if is_eu else 0, confidence, classification.reason,
         job["id"]],
    )

    return {
        "isRemoteEU": is_eu,
        "confidence": confidence,
        "source": source,
    }


async def classify_batch(db, env, limit: int = 50) -> dict:
    """Classify all jobs at status='role-match' (+ enhanced/role-nomatch).

    Three-tier strategy:
      1. Workers AI via langchain LCEL (free) -- use directly if high confidence.
      2. DeepSeek fallback (paid) -- if Workers AI fails or is uncertain.
      3. Accept Workers AI as-is if no DeepSeek key is configured.
    """
    api_key    = getattr(env, "DEEPSEEK_API_KEY", None) or getattr(env, "OPENAI_API_KEY", None)
    base_url   = getattr(env, "DEEPSEEK_BASE_URL", None) or "https://api.deepseek.com/beta"
    model      = getattr(env, "DEEPSEEK_MODEL", None) or "deepseek-chat"
    ai_binding = getattr(env, "AI", None)

    if not ai_binding and not api_key:
        raise Exception(
            "No classification backend available. "
            "Provide either the AI binding (Workers AI) or DEEPSEEK_API_KEY."
        )

    print("Phase 3 -- Fetching jobs ready for EU classification...")

    rows = await d1_all(
        db,
        """SELECT id, title, location, description,
                  country, workplace_type, offices, categories,
                  ashby_is_remote, ashby_secondary_locations, ashby_address,
                  source_kind
           FROM jobs WHERE status IN (?, ?, ?) ORDER BY created_at DESC LIMIT ?""",
        [STATUS_ROLE_MATCH, STATUS_ROLE_NOMATCH, STATUS_ENHANCED, limit],
    )

    print(f"Found {len(rows)} jobs to classify")

    stats = {
        "processed": 0, "euRemote": 0, "nonEuRemote": 0,
        "errors": 0, "workersAI": 0, "deepseek": 0, "heuristic": 0,
    }

    for job in rows:
        try:
            print(f"\nClassifying job {job['id']}: {job.get('title')}")

            result = await classify_job_and_persist(
                db, job, ai_binding, api_key, base_url, model,
            )

            if result.get("error"):
                print(f"   No classification produced")
                stats["errors"] += 1
                continue

            source = result["source"]
            is_eu  = result["isRemoteEU"]
            conf   = result["confidence"]

            stats["processed"] += 1
            if is_eu:
                stats["euRemote"] += 1
            else:
                stats["nonEuRemote"] += 1

            if source == "heuristic":
                stats["heuristic"] += 1
            elif source == "workers-ai":
                stats["workersAI"] += 1
            elif source == "deepseek":
                stats["deepseek"] += 1

            print(f"   {'EU Remote' if is_eu else 'Non-EU'} ({conf}) [{source}]")

            # Rate limit: Workers AI is same-machine, DeepSeek needs throttling
            await sleep_ms(200 if source == "deepseek" else 50)

        except Exception as e:
            print(f"   Error classifying job {job['id']}: {e}")
            stats["errors"] += 1

    return stats


# =========================================================================
# Worker Entrypoint
# =========================================================================

class Default(WorkerEntrypoint):
    """Centralized EU classification worker.

    Owns all EU remote classification logic:
      - Signal extraction from ATS metadata
      - Keyword heuristic (Tier 0)
      - Workers AI via LangChain LCEL (Tier 1)
      - DeepSeek API fallback (Tier 2)
    """

    # MARK: - Request Routing

    async def fetch(self, request, env):
        """Handle incoming HTTP requests."""
        cors_headers = {
            "Access-Control-Allow-Origin":  "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }

        try:
            if request.method == "OPTIONS":
                return Response.json({}, status=200, headers=cors_headers)

            url  = request.url
            path = url.split("/")[-1].split("?")[0] if "/" in url else ""

            if path == "health":
                return await self.handle_health(cors_headers)

            if request.method != "POST":
                return Response.json(
                    {"success": False, "error": "Method not allowed. Use POST."},
                    status=405,
                    headers=cors_headers,
                )

            # Optional auth
            cron_secret = getattr(self.env, "CRON_SECRET", None)
            if cron_secret:
                auth_header = request.headers.get("Authorization") or ""
                if auth_header.replace("Bearer ", "", 1) != cron_secret:
                    return Response.json(
                        {"success": False, "error": "Unauthorized"},
                        status=401,
                        headers=cors_headers,
                    )

            if path == "classify":
                return await self.handle_classify(request, cors_headers)
            elif path == "classify-one":
                return await self.handle_classify_one(request, cors_headers)
            else:
                return await self.handle_enqueue(request, cors_headers)

        except Exception as e:
            print(f"Error processing request: {e}")
            return Response.json(
                {"success": False, "error": str(e)},
                status=500,
                headers=cors_headers,
            )

    # MARK: - Scheduled (Cron) Handler

    async def scheduled(self, event, env, ctx):
        """Cron trigger -- classify all pending jobs.

        Configured via [triggers].crons in wrangler.jsonc.
        Runs every 6 hours.
        """
        print("Cron: Starting EU classification pipeline...")
        try:
            db = self.env.DB
            stats = await classify_batch(db, self.env, 10000)
            print(
                f"Cron complete -- classified={stats['processed']} "
                f"eu={stats['euRemote']} non-eu={stats['nonEuRemote']} "
                f"heuristic={stats['heuristic']} "
                f"workersAI={stats['workersAI']} deepseek={stats['deepseek']}"
            )
        except Exception as e:
            print(f"Error in cron: {e}")

    # MARK: - Queue Consumer

    async def queue(self, batch, env, ctx):
        """Consume messages from the eu-classifier queue.

        Supported actions:
          classify     -- Batch classify pending jobs
          classify-one -- Classify a single job by ID
        """
        for message in batch.messages:
            try:
                body   = to_py(message.body)
                action = body.get("action", "classify")
                limit  = body.get("limit", 10000)
                db     = self.env.DB

                print(f"Queue message: action={action}, limit={limit}")

                if action == "classify-one":
                    job_id = body.get("job_id")
                    if job_id:
                        rows = await d1_all(
                            db,
                            """SELECT id, title, location, description,
                                      country, workplace_type, offices, categories,
                                      ashby_is_remote, ashby_secondary_locations, ashby_address,
                                      source_kind
                               FROM jobs WHERE id = ? LIMIT 1""",
                            [job_id],
                        )
                        if rows:
                            api_key  = getattr(self.env, "DEEPSEEK_API_KEY", None) or getattr(self.env, "OPENAI_API_KEY", None)
                            base_url = getattr(self.env, "DEEPSEEK_BASE_URL", None) or "https://api.deepseek.com/beta"
                            model    = getattr(self.env, "DEEPSEEK_MODEL", None) or "deepseek-chat"
                            result = await classify_job_and_persist(
                                db, rows[0], getattr(self.env, "AI", None),
                                api_key, base_url, model,
                            )
                            print(f"   Classified job {job_id}: {result}")
                else:
                    stats = await classify_batch(db, self.env, limit)
                    print(f"   Classified: {stats['processed']}, EU: {stats['euRemote']}")

                message.ack()

            except Exception as e:
                print(f"Queue message failed: {e}")
                message.retry()

    # MARK: - HTTP Handlers

    async def handle_health(self, cors_headers: dict):
        """Health check -- verifies D1 and optional bindings are available."""
        if not hasattr(self.env, "DB"):
            return Response.json(
                {"error": "D1 binding not configured"}, status=400, headers=cors_headers,
            )

        try:
            rows = await d1_all(self.env.DB, "SELECT 1 as value")
            return Response.json({
                "status":    "healthy",
                "database":  "connected",
                "queue":     hasattr(self.env, "EU_CLASSIFIER_QUEUE"),
                "workersAI": hasattr(self.env, "AI"),
                "deepseek":  bool(getattr(self.env, "DEEPSEEK_API_KEY", None)),
                "value":     rows[0]["value"] if rows else None,
            }, headers=cors_headers)
        except Exception as e:
            return Response.json(
                {"status": "unhealthy", "error": str(e)},
                status=500, headers=cors_headers,
            )

    async def handle_classify(self, request, cors_headers: dict):
        """Batch classify jobs at status='role-match'."""
        limit = await self._parse_limit(request)
        stats = await classify_batch(self.env.DB, self.env, limit)
        return Response.json(
            {"success": True, "message": f"Classified {stats['processed']} jobs", "stats": stats},
            headers=cors_headers,
        )

    async def handle_classify_one(self, request, cors_headers: dict):
        """Classify a single job by ID.

        POST /classify-one
        Body: { "job_id": <number> }
        Response: { "success": true, "isRemoteEU": bool, "confidence": "...", "reason": "..." }

        Runs the full signal-extraction + heuristic + LLM pipeline on the
        requested job regardless of its current status, and saves the result
        to D1 before returning.
        """
        try:
            body   = to_py(await request.json())
            job_id = body.get("job_id")
        except Exception:
            return Response.json(
                {"success": False, "error": "Invalid JSON body -- expected { job_id }"},
                status=400,
                headers=cors_headers,
            )

        if not job_id:
            return Response.json(
                {"success": False, "error": "Missing required field: job_id"},
                status=400,
                headers=cors_headers,
            )

        rows = await d1_all(
            self.env.DB,
            """SELECT id, title, location, description,
                      country, workplace_type, offices, categories,
                      ashby_is_remote, ashby_secondary_locations, ashby_address,
                      source_kind
               FROM jobs WHERE id = ? LIMIT 1""",
            [job_id],
        )

        if not rows:
            return Response.json(
                {"success": False, "error": f"Job {job_id} not found"},
                status=404,
                headers=cors_headers,
            )

        api_key    = getattr(self.env, "DEEPSEEK_API_KEY", None) or getattr(self.env, "OPENAI_API_KEY", None)
        base_url   = getattr(self.env, "DEEPSEEK_BASE_URL", None) or "https://api.deepseek.com/beta"
        model      = getattr(self.env, "DEEPSEEK_MODEL", None) or "deepseek-chat"
        ai_binding = getattr(self.env, "AI", None)

        classification, source = await classify_single_job(
            rows[0], ai_binding, api_key, base_url, model,
        )

        if classification is None:
            return Response.json(
                {"success": False, "error": "Classification produced no result"},
                status=500,
                headers=cors_headers,
            )

        # Persist result
        is_eu      = classification.isRemoteEU
        confidence = classification.confidence
        evidence   = f"title:{rows[0].get('title','')[:100]} | loc:{rows[0].get('location','N/A')[:80]}"
        reason     = f"[{source}] {classification.reason} | evidence:{evidence}"
        score      = {"high": 0.9, "medium": 0.6, "low": 0.3}.get(confidence, 0.3)
        job_status = STATUS_EU_REMOTE if is_eu else STATUS_NON_EU

        await d1_run(
            self.env.DB,
            """
            UPDATE jobs
            SET score = ?, score_reason = ?, status = ?,
                is_remote_eu = ?, remote_eu_confidence = ?, remote_eu_reason = ?,
                updated_at = datetime('now')
            WHERE id = ?
            """,
            [score, reason, job_status,
             1 if is_eu else 0, confidence, classification.reason,
             job_id],
        )

        return Response.json(
            {
                "success":    True,
                "isRemoteEU": is_eu,
                "confidence": confidence,
                "reason":     classification.reason,
                "source":     source,
            },
            headers=cors_headers,
        )

    async def handle_enqueue(self, request, cors_headers: dict):
        """Enqueue a classification job to the CF Queue -- returns immediately."""
        action = "classify"
        limit  = 10000
        try:
            body   = to_py(await request.json())
            action = body.get("action", "classify")
            raw    = body.get("limit")
            if isinstance(raw, (int, float)) and raw > 0:
                limit = int(raw)
        except Exception:
            pass

        queue = getattr(self.env, "EU_CLASSIFIER_QUEUE", None)
        if not queue:
            return Response.json(
                {"success": False, "error": "Queue binding not configured"},
                status=500,
                headers=cors_headers,
            )

        await queue.send(to_js_obj({"action": action, "limit": limit}))
        print(f"Enqueued: action={action}, limit={limit}")

        return Response.json(
            {"success": True, "message": f"Queued '{action}' for up to {limit} jobs", "queued": True},
            headers=cors_headers,
        )

    # MARK: - Utilities

    async def _parse_limit(self, request) -> int:
        """Parse optional limit from request body JSON, defaulting to 10000."""
        try:
            body  = to_py(await request.json())
            limit = body.get("limit")
            if isinstance(limit, (int, float)) and limit > 0:
                return int(limit)
        except Exception:
            pass
        return 10000
