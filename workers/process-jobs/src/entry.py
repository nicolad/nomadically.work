"""Process Jobs — Cloudflare Python Worker.

Two-phase pipeline that runs on D1 directly:
  Phase 1 — ATS Enhancement: Fetch rich data from Greenhouse / Lever / Ashby APIs
  Phase 2 — Classification: Workers AI structured-output classification
             via langchain-cloudflare, with DeepSeek API fallback

Based on the langchain-cloudflare Python Worker pattern
(see langchain-cloudflare/libs/langchain-cloudflare/examples/workers/src/entry.py).

Langchain features used:
  - ChatCloudflareWorkersAI — Workers AI binding for free classification
  - ChatPromptTemplate — reusable, parameterised prompt templates
  - LCEL chain (prompt | model) — composable pipeline
  - Pydantic JobClassification model — validated structured output
  - langgraph-checkpoint-cloudflare-d1 — CloudflareD1Saver for run checkpointing
  - DeepSeek API — fallback classification when Workers AI is uncertain
"""

import asyncio
import json
import re
from datetime import datetime, timezone
from enum import Enum
from typing import Literal
from urllib.parse import quote

from js import JSON, fetch
from pydantic import BaseModel, Field
from workers import Response, WorkerEntrypoint

# langchain-cloudflare — Workers AI binding integration (PyPI)
from langchain_cloudflare import ChatCloudflareWorkersAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate

# langgraph-checkpoint-cloudflare-d1 — pipeline run checkpointing (PyPI)
from langgraph_checkpoint_cloudflare_d1 import CloudflareD1Saver


# ---------------------------------------------------------------------------
# Job status enum — drives the processing pipeline
# ---------------------------------------------------------------------------

class JobStatus(str, Enum):
    """Status values for the job processing pipeline.

    Lifecycle: new → enhanced → eu_remote | non_eu | error
    Each status determines which phase of processing runs next.
    """
    NEW = "new"                # Just ingested, needs ATS enhancement
    ENHANCED = "enhanced"      # ATS data fetched, ready for classification
    EU_REMOTE = "eu-remote"    # Classified as fully remote EU position
    NON_EU = "non-eu"          # Classified as NOT remote EU
    ERROR = "error"            # Processing failed


# ---------------------------------------------------------------------------
# Pydantic models for structured output
# ---------------------------------------------------------------------------

class JobClassification(BaseModel):
    """Classification result for a job posting.

    Used with ChatCloudflareWorkersAI.with_structured_output() to get
    validated, typed responses from the LLM without manual JSON parsing.
    Accepts both camelCase and snake_case keys from different LLMs.
    """

    model_config = {"populate_by_name": True}

    isRemoteEU: bool = Field(
        alias="is_remote_eu",
        description="Whether this job is a fully remote EU position",
    )
    confidence: Literal["high", "medium", "low"] = Field(
        description="Confidence level of the classification",
    )
    reason: str = Field(
        description="Brief explanation for the classification decision",
    )


# ---------------------------------------------------------------------------
# Prompt templates (langchain ChatPromptTemplate)
# ---------------------------------------------------------------------------

CLASSIFICATION_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a job classification expert. "
        "Determine whether the given job posting is a fully Remote EU position. "
        "Return structured JSON output.",
    ),
    (
        "human",
        """Analyze this job posting and determine if it is a Remote EU position.

Title: {title}
Location: {location}
Description: {description}

Consider:
- EMEA includes non-EU countries (UK post-Brexit, Switzerland, Middle East)
- CET timezone is not exclusive to EU
- UK is not part of EU since Brexit
- EU work authorization suggests EU remote
- Must be fully remote, not hybrid or onsite

Respond ONLY with a JSON object using exactly these keys:
{{
  "isRemoteEU": true/false,
  "confidence": "high" | "medium" | "low",
  "reason": "brief explanation"
}}""",
    ),
])


# ---------------------------------------------------------------------------
# Helpers: JS ↔ Python conversion
# Uses the JSON round-trip pattern from langchain_cloudflare/bindings.py
# ---------------------------------------------------------------------------

def to_js_obj(d: dict):
    """Convert a Python dict to a JS object via JSON round-trip."""
    return JSON.parse(json.dumps(d))


def to_py(js_val):
    """Convert a JS proxy value to a Python dict/list via JSON round-trip."""
    return json.loads(JSON.stringify(js_val))


# ---------------------------------------------------------------------------
# D1 helpers
# ---------------------------------------------------------------------------

async def d1_all(db, sql: str, params: list | None = None) -> list[dict]:
    """Execute a D1 SELECT and return rows as Python list of dicts."""
    stmt = db.prepare(sql)
    if params:
        js_params = JSON.parse(json.dumps(params))
        stmt = stmt.bind(*js_params)
    result = await stmt.all()
    return to_py(result.results)


async def d1_run(db, sql: str, params: list | None = None):
    """Execute a D1 write statement (INSERT/UPDATE/DELETE)."""
    stmt = db.prepare(sql)
    if params:
        js_params = JSON.parse(json.dumps(params))
        stmt = stmt.bind(*js_params)
    await stmt.run()


# ---------------------------------------------------------------------------
# HTTP fetch with retry
# ---------------------------------------------------------------------------

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

            # Retry on rate-limit or server errors
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


# =========================================================================
# Phase 1 — ATS Enhancement
# Fetch rich data from Greenhouse / Lever / Ashby public APIs and
# persist directly into D1.  Mirrors the logic in src/ingestion/*.ts
# but fully self-contained so it runs on the CF Workers runtime.
# =========================================================================

# --- URL Parsers ----------------------------------------------------------

def parse_greenhouse_url(external_id: str) -> dict | None:
    """Parse a Greenhouse URL into board_token + job_post_id.

    Handles both job-boards.greenhouse.io and boards.greenhouse.io:
      https://job-boards.greenhouse.io/grafanalabs/jobs/5802159004
    """
    try:
        # Rudimentary URL parsing (no urllib.parse.urlparse in Pyodide stdlib)
        match = re.search(r"greenhouse\.io/([^/]+)/jobs/([^/?#]+)", external_id)
        if match:
            return {"board_token": match.group(1), "job_post_id": match.group(2)}
    except Exception:
        pass
    return None


def parse_lever_url(external_id: str) -> dict | None:
    """Parse a Lever URL into site + posting_id.

    Example: https://jobs.lever.co/leverdemo/abc-123
    """
    try:
        match = re.search(r"lever\.co/([^/]+)/([^/?#]+)", external_id)
        if match:
            return {"site": match.group(1), "posting_id": match.group(2)}
    except Exception:
        pass
    return None


def parse_ashby_url(external_id: str, company_key: str | None = None) -> dict | None:
    """Parse an Ashby URL into board_name + job_id.

    Handles two formats:
      - Full URL: https://jobs.ashbyhq.com/livekit/f152aa9f-...
      - Bare UUID: f152aa9f-... (uses company_key as board_name)
    """
    try:
        match = re.search(r"ashbyhq\.com/([^/]+)/([^/?#]+)", external_id)
        if match:
            return {"board_name": match.group(1), "job_id": match.group(2)}
    except Exception:
        pass

    # Bare UUID fallback — use company_key as board name
    if company_key and not external_id.startswith("http"):
        return {"board_name": company_key, "job_id": external_id}

    return None


# --- ATS Data Fetchers ---------------------------------------------------

async def fetch_greenhouse_data(board_token: str, job_post_id: str) -> dict:
    url = (
        f"https://boards-api.greenhouse.io/v1/boards/"
        f"{quote(board_token)}/jobs/{quote(job_post_id)}?questions=true"
    )
    return await fetch_json(url)


async def fetch_lever_data(site: str, posting_id: str) -> dict:
    """Fetch from Lever — tries global endpoint first, then EU."""
    for base in [
        "https://api.lever.co/v0/postings",
        "https://api.eu.lever.co/v0/postings",
    ]:
        url = f"{base}/{quote(site)}/{quote(posting_id)}"
        try:
            return await fetch_json(url)
        except Exception as e:
            if "404" in str(e):
                continue
            raise
    raise Exception(
        f"Lever posting {posting_id} not found on site {site} (global & EU)"
    )


async def fetch_ashby_data(board_name: str, job_id: str) -> dict:
    """Fetch from Ashby — tries single-job endpoint, falls back to board listing."""
    direct_url = (
        f"https://api.ashbyhq.com/posting-api/job-board/"
        f"{quote(board_name)}/job/{quote(job_id)}"
    )
    try:
        posting = await fetch_json(direct_url)
        # If no compensation, try board listing which supports it
        if not posting.get("compensation"):
            try:
                board_url = (
                    f"https://api.ashbyhq.com/posting-api/job-board/"
                    f"{quote(board_name)}?includeCompensation=true"
                )
                board = await fetch_json(board_url)
                match = next(
                    (j for j in (board.get("jobs") or []) if j.get("id") == job_id),
                    None,
                )
                if match:
                    return match
            except Exception:
                pass
        return posting
    except Exception:
        pass

    # Fallback: board listing
    board_url = (
        f"https://api.ashbyhq.com/posting-api/job-board/"
        f"{quote(board_name)}?includeCompensation=true"
    )
    board = await fetch_json(board_url)
    posting = next(
        (
            j
            for j in (board.get("jobs") or [])
            if j.get("id") == job_id or (j.get("jobUrl") or "").find(job_id) >= 0
        ),
        None,
    )
    if not posting:
        raise Exception(
            f'Ashby job not found on board "{board_name}" with ID "{job_id}".'
        )
    return posting


# --- D1 Update Builders --------------------------------------------------

def _json_col(val) -> str | None:
    """Serialize a value to JSON for D1 TEXT column, or None."""
    if val is None:
        return None
    return json.dumps(val)


def build_greenhouse_update(data: dict) -> tuple[list[str], list]:
    """Build column=? pairs and params for a Greenhouse job update."""
    cols = [
        "absolute_url", "internal_job_id", "requisition_id", "company_name",
        "first_published", "language",
    ]
    vals = [data.get(c) for c in cols]

    # JSON columns
    json_cols = [
        "metadata", "departments", "offices", "questions",
        "location_questions", "compliance", "demographic_questions",
        "data_compliance",
    ]
    for c in json_cols:
        cols.append(c)
        vals.append(_json_col(data.get(c, [])))

    # Optional overrides
    if data.get("content"):
        cols.append("description")
        vals.append(data["content"])
    loc = (data.get("location") or {})
    if isinstance(loc, dict) and loc.get("name"):
        cols.append("location")
        vals.append(loc["name"])

    return cols, vals


def build_lever_update(data: dict) -> tuple[list[str], list]:
    """Build column=? pairs and params for a Lever job update."""
    cols = []
    vals = []

    def _add(col, val):
        cols.append(col)
        vals.append(val)

    _add("absolute_url", data.get("hostedUrl") or data.get("applyUrl"))
    _add("company_name", data.get("text"))
    _add("description", data.get("description") or data.get("descriptionPlain"))
    _add("location", (data.get("categories") or {}).get("location"))
    _add("categories", _json_col(data.get("categories")))
    _add("workplace_type", data.get("workplaceType"))
    _add("country", data.get("country"))
    _add("opening", data.get("opening"))
    _add("opening_plain", data.get("openingPlain"))
    _add("description_body", data.get("descriptionBody"))
    _add("description_body_plain", data.get("descriptionBodyPlain"))
    _add("additional", data.get("additional"))
    _add("additional_plain", data.get("additionalPlain"))
    _add("lists", _json_col(data.get("lists", [])))

    created = data.get("createdAt")
    if isinstance(created, (int, float)):
        _add("ats_created_at", datetime.fromtimestamp(created / 1000, tz=timezone.utc).isoformat())
    else:
        _add("ats_created_at", created)

    return cols, vals


def build_ashby_update(data: dict, board_name: str) -> tuple[list[str], list]:
    """Build column=? pairs and params for an Ashby job update.

    Writes both common columns and Ashby-specific columns
    (ashby_department, ashby_team, ashby_employment_type, etc.).
    """
    cols = []
    vals = []

    def _add(col, val):
        cols.append(col)
        vals.append(val)

    # Common columns
    _add("absolute_url", data.get("jobUrl") or data.get("applyUrl"))
    _add("company_name", board_name)
    _add("description", data.get("descriptionHtml") or data.get("descriptionPlain"))
    _add("location", data.get("locationName") or data.get("location"))
    _add("workplace_type", "remote" if data.get("isRemote") else None)

    address = data.get("address") or {}
    postal = address.get("postalAddress") or {}
    _add("country", postal.get("addressCountry"))
    _add("ats_created_at", data.get("publishedAt"))

    # Ashby-specific columns
    _add("ashby_department", data.get("department"))
    _add("ashby_team", data.get("team"))
    _add("ashby_employment_type", data.get("employmentType"))
    is_remote = data.get("isRemote")
    _add("ashby_is_remote", (1 if is_remote else 0) if is_remote is not None else None)
    is_listed = data.get("isListed")
    _add("ashby_is_listed", (1 if is_listed else 0) if is_listed is not None else None)
    _add("ashby_published_at", data.get("publishedAt"))
    _add("ashby_job_url", data.get("jobUrl"))
    _add("ashby_apply_url", data.get("applyUrl"))
    _add("ashby_secondary_locations", _json_col(data.get("secondaryLocations")))
    _add("ashby_compensation", _json_col(data.get("compensation")))
    _add("ashby_address", _json_col(data.get("address")))

    # Categories — aggregated view for compatibility
    categories = {
        "department": data.get("department"),
        "team": data.get("team"),
        "location": data.get("location"),
        "allLocations": list(filter(None, [
            data.get("location"),
            *(
                loc.get("location")
                for loc in (data.get("secondaryLocations") or [])
            ),
        ])),
    }
    _add("categories", _json_col(categories))

    return cols, vals


# --- Enhancement Orchestrators -------------------------------------------

async def enhance_job(db, job: dict) -> dict:
    """Enhance a single job by fetching from its ATS API and updating D1."""
    kind = (job.get("source_kind") or "").lower()

    try:
        cols: list[str] = []
        vals: list = []

        if kind == "greenhouse":
            parsed = parse_greenhouse_url(job["external_id"])
            if not parsed:
                return {"enhanced": False, "error": "Cannot parse Greenhouse URL"}
            data = await fetch_greenhouse_data(
                parsed["board_token"], parsed["job_post_id"]
            )
            cols, vals = build_greenhouse_update(data)

        elif kind == "lever":
            parsed = parse_lever_url(job["external_id"])
            if not parsed:
                return {"enhanced": False, "error": "Cannot parse Lever URL"}
            data = await fetch_lever_data(parsed["site"], parsed["posting_id"])
            cols, vals = build_lever_update(data)

        elif kind == "ashby":
            parsed = parse_ashby_url(job["external_id"], job.get("company_key"))
            if not parsed:
                return {"enhanced": False, "error": "Cannot parse Ashby URL"}
            data = await fetch_ashby_data(parsed["board_name"], parsed["job_id"])
            cols, vals = build_ashby_update(data, parsed["board_name"])

        else:
            return {"enhanced": False, "error": f"Unsupported source_kind: {kind}"}

        if cols:
            # Always mark updated_at and advance status to 'enhanced'
            set_parts = [f"{c} = ?" for c in cols]
            set_parts.append(f"status = ?")
            vals.append(JobStatus.ENHANCED.value)
            set_parts.append("updated_at = datetime('now')")
            set_clause = ", ".join(set_parts)
            sql = f"UPDATE jobs SET {set_clause} WHERE id = ?"
            vals.append(job["id"])
            await d1_run(db, sql, vals)

        return {"enhanced": True}

    except Exception as e:
        return {"enhanced": False, "error": str(e)}


async def enhance_unenhanced_jobs(db, limit: int = 50) -> dict:
    """Phase 1: Enhance jobs with status='new'.

    Picks up newly ingested jobs and fetches rich ATS data.
    On success, advances status to 'enhanced'.
    """
    print("🔍 Phase 1 — Finding jobs with status='new'...")

    rows = await d1_all(
        db,
        """
        SELECT id, external_id, source_kind, company_key, title,
               location, description, url, absolute_url
        FROM jobs
        WHERE (status IS NULL OR status = ?)
          AND source_kind IN ('greenhouse', 'lever', 'ashby')
        ORDER BY created_at DESC
        LIMIT ?
        """,
        [JobStatus.NEW.value, limit],
    )

    print(f"📋 Found {len(rows)} jobs to enhance")

    stats = {"enhanced": 0, "skipped": 0, "errors": 0}

    for job in rows:
        print(f"🔄 Enhancing {job.get('source_kind')} job {job['id']}: {job.get('title')}")
        result = await enhance_job(db, job)
        if result["enhanced"]:
            stats["enhanced"] += 1
            print("   ✅ Enhanced")
        else:
            stats["errors"] += 1
            error_msg = result.get("error", "unknown")
            print(f"   ❌ {error_msg}")
            # Advance to 'enhanced' even on ATS error so the job proceeds
            # to classification with whatever data it has from ingestion.
            # This prevents infinite retries for jobs whose ATS postings
            # have been taken down.
            try:
                await d1_run(
                    db,
                    "UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?",
                    [JobStatus.ENHANCED.value, job["id"]],
                )
                print(f"   ⏩ Advanced to 'enhanced' despite ATS error")
            except Exception as advance_err:
                print(f"   ⚠️  Could not advance status: {advance_err}")
        # Pace to avoid ATS rate-limits
        await sleep_ms(500)

    print(
        f"✅ Enhancement complete: {stats['enhanced']} enhanced, "
        f"{stats['errors']} errors"
    )
    return stats


# =========================================================================
# Phase 2 — Classification
#   Primary: Workers AI via langchain with_structured_output (free, fast)
#   Fallback: DeepSeek API for uncertain or failed Workers AI results
# =========================================================================

# Workers AI model (free, no API key needed)
WORKERS_AI_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8"


def _normalise_classification_keys(raw: dict) -> dict:
    """Normalise arbitrary key names from LLMs into JobClassification schema.

    Handles both camelCase (isRemoteEU) and snake_case (is_remote_eu_position)
    variants that different models may emit.
    """
    normalised = {}
    for k, v in raw.items():
        lk = k.lower().replace("_", "").replace("-", "")
        if lk in ("isremoteeu", "isremoteeuposition", "remoteeu"):
            normalised["isRemoteEU"] = v
        elif lk == "confidence":
            normalised["confidence"] = v
        elif lk in ("reason", "explanation"):
            normalised["reason"] = v
        else:
            normalised[k] = v
    return normalised


def _build_chain(ai_binding):
    """Build the langchain LCEL classification chain.

    Returns: CLASSIFICATION_PROMPT | llm

    NOTE: We intentionally skip with_structured_output() because in the
    Pyodide/Workers environment, Workers AI can return JsNull as the
    AIMessage.content field, which breaks langchain's AIMessage validator.
    Instead we parse the raw text response ourselves.
    """
    llm = ChatCloudflareWorkersAI(
        model_name=WORKERS_AI_MODEL,
        binding=ai_binding,
        temperature=0.2,
    )
    return CLASSIFICATION_PROMPT | llm


async def classify_with_workers_ai(
    job: dict, ai_binding
) -> JobClassification | None:
    """Classify a job using Workers AI + langchain LCEL chain.

    Returns a validated JobClassification or None if unavailable/failed.
    Uses the LCEL chain (CLASSIFICATION_PROMPT | llm) for prompt formatting
    and LLM invocation, then parses the raw text into a Pydantic model.

    NOTE: We do NOT use with_structured_output() because in the Pyodide
    Workers environment, the AI binding can return JsNull as the AIMessage
    content field, which crashes langchain's AIMessage pydantic validator.
    """
    if ai_binding is None:
        return None

    try:
        chain = _build_chain(ai_binding)
        response = await chain.ainvoke({
            "title": job.get("title", "N/A"),
            "location": job.get("location") or "Not specified",
            "description": job.get("description") or "Not specified",
        })

        # Guard against JsNull content from Workers AI binding
        content = response.content
        if content is None or str(type(content)) == "<class 'pyodide.ffi.JsProxy'>":
            raw_str = str(content) if content else ""
            if not raw_str or raw_str == "jsnull" or raw_str == "undefined":
                print("   ⚠️  Workers AI returned null content")
                return None
            content = raw_str

        content_str = str(content).strip()
        if not content_str:
            return None

        # Strip markdown code fences if the model wraps output
        if content_str.startswith("```"):
            content_str = re.sub(r"^```(?:json)?\s*", "", content_str)
            content_str = re.sub(r"\s*```$", "", content_str)

        # Extract JSON if embedded in surrounding text
        json_match = re.search(r"\{[^{}]*\}", content_str, re.DOTALL)
        if json_match:
            content_str = json_match.group(0)

        raw = json.loads(content_str)
        normalised = _normalise_classification_keys(raw)
        return JobClassification.model_validate(normalised)

    except Exception as e:
        print(f"   ⚠️  Workers AI classification failed: {e}")
        return None


async def classify_with_deepseek(
    job: dict, api_key: str, base_url: str, model: str
) -> JobClassification:
    """Fallback: classify using DeepSeek API (OpenAI-compatible).

    Called only when Workers AI fails or returns low/medium confidence.
    Uses raw HTTP since langchain-openai is not available in Pyodide.
    Response is parsed into a JobClassification Pydantic model for validation.
    """
    prompt = CLASSIFICATION_PROMPT.format_messages(
        title=job.get("title", "N/A"),
        location=job.get("location") or "Not specified",
        description=job.get("description") or "Not specified",
    )

    # Convert langchain messages to OpenAI-compatible format
    # langchain uses "human"/"ai" but OpenAI API expects "user"/"assistant"
    role_map = {"system": "system", "human": "user", "ai": "assistant"}
    messages = [{"role": role_map.get(m.type, m.type), "content": m.content} for m in prompt]

    try:
        url = f"{base_url.rstrip('/')}/chat/completions"
        payload = json.dumps({
            "model": model,
            "temperature": 0.3,
            "response_format": {"type": "json_object"},
            "messages": messages,
        })

        data = await fetch_json(
            url,
            method="POST",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            body=payload,
            retries=3,
        )

        content = (
            (data.get("choices") or [{}])[0]
            .get("message", {})
            .get("content", "")
        )

        if not content.strip():
            raise Exception("No content in DeepSeek response")

        # Normalise arbitrary key names from DeepSeek into expected schema
        raw = json.loads(content)
        normalised = _normalise_classification_keys(raw)
        return JobClassification.model_validate(normalised)

    except Exception as e:
        print(f"   ⚠️  DeepSeek classification failed: {e}")
        return JobClassification(
            isRemoteEU=False,
            confidence="low",
            reason=f"Classification failed: {e}",
        )


async def classify_unclassified_jobs(db, env, limit: int = 50) -> dict:
    """Phase 2: Classify unclassified jobs.

    Strategy (inverted from the original — Workers AI is now primary):
      1. Try Workers AI via langchain structured output chain (free, fast).
         If it returns a high-confidence result, use it directly.
      2. If Workers AI fails or returns low/medium confidence,
         fall back to DeepSeek API for a second opinion.

    This saves DeepSeek API costs by using the free Workers AI model
    for the majority of classifications.
    """
    # DeepSeek config — only needed as fallback
    api_key = getattr(env, "DEEPSEEK_API_KEY", None) or getattr(
        env, "OPENAI_API_KEY", None
    )
    base_url = (
        getattr(env, "DEEPSEEK_BASE_URL", None) or "https://api.deepseek.com/beta"
    )
    model = getattr(env, "DEEPSEEK_MODEL", None) or "deepseek-chat"

    # Workers AI binding for langchain chain
    ai_binding = getattr(env, "AI", None)

    if not ai_binding and not api_key:
        raise Exception(
            "No classification backend available. "
            "Need either AI binding (Workers AI) or DEEPSEEK_API_KEY."
        )

    print("🔍 Phase 2 — Fetching unclassified jobs...")

    rows = await d1_all(
        db,
        """
        SELECT id, title, location, description, status, score
        FROM jobs
        WHERE status = ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
        [JobStatus.ENHANCED.value, limit],
    )

    print(f"📋 Found {len(rows)} jobs to classify")

    stats = {
        "processed": 0,
        "euRemote": 0,
        "nonEuRemote": 0,
        "errors": 0,
        "workersAI": 0,
        "deepseek": 0,
    }

    for job in rows:
        try:
            print(f"\n🤖 Classifying job {job['id']}: {job.get('title')}")

            classification: JobClassification | None = None
            result: JobClassification | None = None
            source = "workers-ai"

            # Step 1 — Workers AI via langchain LCEL chain (primary)
            if ai_binding:
                result = await classify_with_workers_ai(job, ai_binding)
                if result and result.confidence == "high":
                    classification = result
                    stats["workersAI"] += 1
                    print(f"   ⚡ Workers AI (high confidence)")

            # Step 2 — DeepSeek fallback (low/medium confidence or failure)
            if classification is None and api_key:
                classification = await classify_with_deepseek(
                    job, api_key, base_url, model
                )
                source = "deepseek"
                stats["deepseek"] += 1
                print(f"   🔄 DeepSeek fallback")

            # Step 3 — If no DeepSeek key, accept Workers AI result as-is
            if classification is None and result is not None:
                classification = result
                stats["workersAI"] += 1
                print(f"   ⚡ Workers AI (accepted, no DeepSeek fallback)")

            if classification is None:
                print(f"   ❌ No classification produced")
                stats["errors"] += 1
                continue

            is_eu = classification.isRemoteEU
            confidence = classification.confidence
            reason = f"[{source}] {classification.reason}"

            label = "✅ EU Remote" if is_eu else "❌ Non-EU"
            print(f"   Result: {label} ({confidence})")
            print(f"   Reason: {reason}")

            score = {"high": 0.9, "medium": 0.6, "low": 0.3}.get(confidence, 0.3)
            job_status = JobStatus.EU_REMOTE.value if is_eu else JobStatus.NON_EU.value

            await d1_run(
                db,
                """
                UPDATE jobs
                SET score = ?, score_reason = ?, status = ?,
                    updated_at = datetime('now')
                WHERE id = ?
                """,
                [score, reason, job_status, job["id"]],
            )

            stats["processed"] += 1
            if is_eu:
                stats["euRemote"] += 1
            else:
                stats["nonEuRemote"] += 1

            # Pacing
            await sleep_ms(1000)

        except Exception as e:
            print(f"❌ Error classifying job {job['id']}: {e}")
            stats["errors"] += 1

    return stats


# =========================================================================
# Worker Entrypoint — follows langchain-cloudflare pattern
# =========================================================================

class Default(WorkerEntrypoint):
    """Main Worker entrypoint for job processing pipeline.

    Based on langchain-cloudflare/libs/langchain-cloudflare/examples/workers/src/entry.py.
    Uses the same WorkerEntrypoint + D1 binding pattern.
    """

    # MARK: - Request Routing

    async def fetch(self, request, env):
        """Handle incoming HTTP requests."""
        cors_headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }

        try:
            if request.method == "OPTIONS":
                return Response.json({}, status=200, headers=cors_headers)

            # Route based on path
            url = request.url
            path = url.split("/")[-1].split("?")[0] if "/" in url else ""

            if path == "health":
                return await self.handle_health()

            if request.method != "POST":
                return Response.json(
                    {
                        "success": False,
                        "error": (
                            "Method not allowed. Use POST to trigger "
                            "enhancement & classification."
                        ),
                    },
                    status=405,
                    headers=cors_headers,
                )

            # Authentication
            cron_secret = getattr(self.env, "CRON_SECRET", None)
            if cron_secret:
                auth_header = request.headers.get("Authorization") or ""
                provided = auth_header.replace("Bearer ", "", 1)
                if provided != cron_secret:
                    return Response.json(
                        {"success": False, "error": "Unauthorized"},
                        status=401,
                        headers=cors_headers,
                    )

            if path == "enhance":
                return await self.handle_enhance(request, cors_headers)
            elif path == "classify":
                return await self.handle_classify(request, cors_headers)
            elif path == "process-sync":
                # Synchronous — runs full pipeline inline (for debugging)
                return await self.handle_process(request, cors_headers)
            else:
                # Default: enqueue via CF Queue for async processing
                return await self.handle_enqueue(request, cors_headers)

        except Exception as e:
            print(f"❌ Error processing request: {e}")
            return Response.json(
                {"success": False, "error": str(e)},
                status=500,
                headers=cors_headers,
            )

    # MARK: - Scheduled (Cron) Handler

    async def scheduled(self, event, env, ctx):
        """Cron trigger — runs full pipeline (enhance + classify).

        Configured via [triggers].crons in wrangler.jsonc.
        Runs every 6 hours with a limit of 20 jobs per run.
        """
        print("🔄 Cloudflare Cron: Starting job enhancement & classification...")
        try:
            db = self.env.DB

            # Phase 1 — ATS Enhancement
            enhance_stats = await enhance_unenhanced_jobs(db, 20)

            # Phase 2 — Classification (Workers AI + DeepSeek)
            classify_stats = await classify_unclassified_jobs(db, self.env, 20)

            stats = {
                "enhanced": enhance_stats["enhanced"],
                "enhanceErrors": enhance_stats["errors"],
                "processed": classify_stats["processed"],
                "euRemote": classify_stats["euRemote"],
                "nonEuRemote": classify_stats["nonEuRemote"],
                "errors": classify_stats["errors"],
                "workersAI": classify_stats.get("workersAI", 0),
                "deepseek": classify_stats.get("deepseek", 0),
            }

            print(f"✅ Cron complete: Enhanced {stats['enhanced']}, classified {stats['processed']} jobs")

            # Checkpoint the run
            self._save_run_checkpoint(stats)

        except Exception as e:
            print(f"❌ Error in cron: {e}")

    # MARK: - Queue Consumer

    async def queue(self, batch, env, ctx):
        """Consume messages from the process-jobs queue.

        Each message triggers the full pipeline (enhance → classify).
        Message body: {"action": "process"|"enhance"|"classify", "limit": int}
        """
        for message in batch.messages:
            try:
                body = to_py(message.body)
                action = body.get("action", "process")
                limit = body.get("limit", 50)
                db = self.env.DB

                print(f"📨 Queue message: action={action}, limit={limit}")

                if action == "enhance":
                    stats = await enhance_unenhanced_jobs(db, limit)
                    print(f"   Enhanced: {stats['enhanced']}, Errors: {stats['errors']}")

                elif action == "classify":
                    stats = await classify_unclassified_jobs(db, self.env, limit)
                    print(f"   Classified: {stats['processed']}, EU: {stats['euRemote']}")

                else:
                    # Full pipeline
                    enhance_stats = await enhance_unenhanced_jobs(db, limit)
                    classify_stats = await classify_unclassified_jobs(db, self.env, limit)

                    stats = {
                        "enhanced": enhance_stats["enhanced"],
                        "enhanceErrors": enhance_stats["errors"],
                        "processed": classify_stats["processed"],
                        "euRemote": classify_stats["euRemote"],
                        "nonEuRemote": classify_stats["nonEuRemote"],
                        "errors": classify_stats["errors"],
                        "workersAI": classify_stats.get("workersAI", 0),
                        "deepseek": classify_stats.get("deepseek", 0),
                    }

                    print(f"\n✅ Queue pipeline complete!")
                    print(f"   Enhanced: {stats['enhanced']}")
                    print(f"   Workers AI: {stats['workersAI']}")
                    print(f"   DeepSeek fallback: {stats['deepseek']}")
                    print(f"   Classified: {stats['processed']}")
                    print(f"   EU Remote: {stats['euRemote']}")
                    print(f"   Non-EU: {stats['nonEuRemote']}")
                    print(f"   Errors: {stats['errors'] + stats['enhanceErrors']}")

                    # Checkpoint the run
                    self._save_run_checkpoint(stats)

                message.ack()

            except Exception as e:
                print(f"❌ Queue message failed: {e}")
                message.retry()

    # MARK: - Handlers

    async def handle_health(self):
        """Health check — verifies D1 binding is available."""
        if not hasattr(self.env, "DB"):
            return Response.json(
                {"error": "D1 binding not configured"}, status=400
            )

        try:
            rows = await d1_all(self.env.DB, "SELECT 1 as value")
            return Response.json(
                {
                    "status": "healthy",
                    "database": "connected",
                    "queue": hasattr(self.env, "PROCESS_JOBS_QUEUE"),
                    "workersAI": hasattr(self.env, "AI"),
                    "value": rows[0]["value"] if rows else None,
                }
            )
        except Exception as e:
            return Response.json(
                {"status": "unhealthy", "error": str(e)}, status=500
            )

    async def handle_enqueue(self, request, cors_headers: dict):
        """Enqueue a processing job to the CF Queue — returns immediately."""
        # Parse body once (request.json() can only be consumed once)
        action = "process"
        limit = 50
        try:
            data = await request.json()
            body = to_py(data)
            action = body.get("action", "process")
            raw_limit = body.get("limit")
            if isinstance(raw_limit, (int, float)) and raw_limit > 0:
                limit = int(raw_limit)
        except Exception:
            pass

        queue = getattr(self.env, "PROCESS_JOBS_QUEUE", None)
        if not queue:
            return Response.json(
                {"success": False, "error": "Queue binding not configured"},
                status=500,
                headers=cors_headers,
            )

        message = {"action": action, "limit": limit}
        await queue.send(to_js_obj(message))

        print(f"📤 Enqueued: action={action}, limit={limit}")

        return Response.json(
            {
                "success": True,
                "message": f"Queued '{action}' for up to {limit} jobs",
                "queued": True,
                "stats": None,
            },
            headers=cors_headers,
        )

    async def handle_enhance(self, request, cors_headers: dict):
        """Run Phase 1 only — ATS enhancement."""
        limit = await self._parse_limit(request)
        db = self.env.DB
        stats = await enhance_unenhanced_jobs(db, limit)
        return Response.json(
            {
                "success": True,
                "message": f"Enhanced {stats['enhanced']} jobs",
                "stats": stats,
            },
            headers=cors_headers,
        )

    async def handle_classify(self, request, cors_headers: dict):
        """Run Phase 2 only — DeepSeek classification."""
        limit = await self._parse_limit(request)
        db = self.env.DB
        stats = await classify_unclassified_jobs(db, self.env, limit)
        return Response.json(
            {
                "success": True,
                "message": f"Classified {stats['processed']} jobs",
                "stats": stats,
            },
            headers=cors_headers,
        )

    async def handle_process(self, request, cors_headers: dict):
        """Run full pipeline — Phase 1 (enhance) then Phase 2 (classify).

        After completion, saves a lightweight checkpoint of the run stats
        via langgraph-checkpoint-cloudflare-d1 (CloudflareD1Saver).
        """
        limit = await self._parse_limit(request)
        db = self.env.DB

        # Phase 1
        enhance_stats = await enhance_unenhanced_jobs(db, limit)

        # Phase 2
        classify_stats = await classify_unclassified_jobs(db, self.env, limit)

        stats = {
            "enhanced": enhance_stats["enhanced"],
            "enhanceErrors": enhance_stats["errors"],
            "processed": classify_stats["processed"],
            "euRemote": classify_stats["euRemote"],
            "nonEuRemote": classify_stats["nonEuRemote"],
            "errors": classify_stats["errors"],
            "workersAI": classify_stats.get("workersAI", 0),
            "deepseek": classify_stats.get("deepseek", 0),
        }

        message = (
            f"Enhanced {stats['enhanced']}, "
            f"classified {stats['processed']} jobs"
        )

        print(f"\n✅ Pipeline complete!")
        print(f"   Enhanced: {stats['enhanced']}")
        print(f"   Workers AI: {stats['workersAI']}")
        print(f"   DeepSeek fallback: {stats['deepseek']}")
        print(f"   Classified: {stats['processed']}")
        print(f"   EU Remote: {stats['euRemote']}")
        print(f"   Non-EU: {stats['nonEuRemote']}")
        print(f"   Errors: {stats['errors'] + stats['enhanceErrors']}")

        # Checkpoint the run via langgraph-checkpoint-cloudflare-d1
        self._save_run_checkpoint(stats)

        return Response.json(
            {"success": True, "message": message, "stats": stats},
            headers=cors_headers,
        )

    # MARK: - Utilities

    def _save_run_checkpoint(self, stats: dict):
        """Save a pipeline run checkpoint via langgraph-checkpoint-cloudflare-d1.

        Uses CloudflareD1Saver (sync, REST API) to persist a lightweight record
        of each pipeline run. This lets us track run history and resume from
        known-good states.

        Requires CF_ACCOUNT_ID, CF_D1_DATABASE_ID, CF_D1_API_TOKEN env vars
        (or the corresponding wrangler secrets).
        """
        try:
            account_id = getattr(self.env, "CF_ACCOUNT_ID", None)
            database_id = getattr(self.env, "CF_D1_DATABASE_ID", None)
            api_token = getattr(self.env, "CF_D1_API_TOKEN", None)

            if not all([account_id, database_id, api_token]):
                print("   ℹ️  Checkpoint skipped (CF_ACCOUNT_ID/CF_D1_DATABASE_ID/CF_D1_API_TOKEN not set)")
                return

            saver = CloudflareD1Saver(
                account_id=account_id,
                database_id=database_id,
                api_token=api_token,
            )
            saver.setup()

            # Build a minimal checkpoint payload
            from langgraph.checkpoint.base import create_checkpoint, empty_checkpoint

            checkpoint = create_checkpoint(empty_checkpoint(), None, 1)
            run_ts = datetime.now(timezone.utc).isoformat()
            metadata = {
                "source": "process-jobs-worker",
                "step": 1,
                "writes": None,
                "run_ts": run_ts,
                **stats,
            }

            config = {
                "configurable": {
                    "thread_id": f"process-jobs-{run_ts[:10]}",
                    "checkpoint_ns": "",
                }
            }

            saver.put(config, checkpoint, metadata, {})
            print(f"   💾 Checkpoint saved (thread: {config['configurable']['thread_id']})")

        except Exception as e:
            # Checkpoint is best-effort — never fail the pipeline
            print(f"   ⚠️  Checkpoint save failed: {e}")

    async def _parse_limit(self, request) -> int:
        """Parse optional limit from request body JSON."""
        try:
            data = await request.json()
            body = to_py(data)
            limit = body.get("limit")
            if isinstance(limit, (int, float)) and limit > 0:
                return int(limit)
        except Exception:
            pass
        return 50
