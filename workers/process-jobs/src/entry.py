"""Process Jobs — Cloudflare Python Worker.

Three-phase pipeline that runs on D1 directly:
  Phase 1 — ATS Enhancement : Fetch rich data from Greenhouse / Lever / Ashby APIs
  Phase 2 — Role Tagging    : Detect Frontend/React and AI Engineer roles
                               (keyword heuristic → Workers AI → DeepSeek)
  Phase 3 — Classification  : EU-remote classification via Workers AI + DeepSeek

Based on the langchain-cloudflare Python Worker pattern
(see langchain-cloudflare/libs/langchain-cloudflare/examples/workers/src/entry.py).

Langchain features used:
  - ChatCloudflareWorkersAI — Workers AI binding for free tagging & classification
  - ChatPromptTemplate — reusable, parameterised prompt templates
  - LCEL chain (prompt | model) — composable pipeline
  - Pydantic JobClassification / JobRoleTags — validated structured output
  - langgraph-checkpoint-cloudflare-d1 — CloudflareD1Saver for run checkpointing
  - DeepSeek API — fallback when Workers AI is uncertain or unavailable

Pipeline status lifecycle:
  new → enhanced → role-match ──→ eu-remote
                └→ role-nomatch   non-eu

D1 migration (run once before deploying):
  ALTER TABLE jobs ADD COLUMN role_frontend_react INTEGER;
  ALTER TABLE jobs ADD COLUMN role_ai_engineer    INTEGER;
  ALTER TABLE jobs ADD COLUMN role_confidence     TEXT;
  ALTER TABLE jobs ADD COLUMN role_reason         TEXT;
  ALTER TABLE jobs ADD COLUMN role_source         TEXT;
"""

import asyncio
import json
import re
from datetime import datetime, timezone
from enum import Enum
from typing import Literal
from urllib.parse import quote

from js import JSON, fetch
from dataclasses import dataclass, field
from workers import Response, WorkerEntrypoint

# ---------------------------------------------------------------------------
# Skill taxonomy — canonical tags (mirrored from src/lib/skills/taxonomy.ts)
# ---------------------------------------------------------------------------

SKILL_TAGS: frozenset[str] = frozenset({
    # Programming Languages
    "javascript", "typescript", "python", "java", "csharp", "ruby", "php",
    "go", "rust", "swift", "kotlin", "scala", "elixir",
    # Frontend Frameworks
    "react", "vue", "angular", "svelte", "nextjs",
    # Backend Frameworks
    "nodejs", "express", "django", "flask", "laravel", "fastapi", "spring-boot",
    # Mobile
    "react-native", "flutter", "ios", "android",
    # Databases
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "cassandra",
    "dynamodb", "sqlite", "sql",
    # Cloud & DevOps
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ansible",
    "jenkins", "ci-cd", "circleci", "serverless",
    # Architecture
    "microservices", "rest-api", "graphql", "grpc", "websocket", "event-driven",
    # Tools
    "git", "linux", "agile", "tdd", "webpack", "jest", "pytest", "tailwind",
    # Data Science & ML
    "machine-learning", "deep-learning", "tensorflow", "pytorch", "pandas",
    "numpy", "scikit", "nlp", "computer-vision",
    # AI / LLM / GenAI
    "llm", "rag", "prompt-engineering", "fine-tuning", "embeddings",
    "transformers", "agents", "agentic-ai", "langchain", "langgraph",
    "openai", "anthropic", "vercel-ai-sdk", "vector-db", "pinecone",
    "weaviate", "chromadb", "mlops", "huggingface", "model-evaluation",
    "structured-output", "function-calling", "mastra", "langfuse", "promptfoo",
    # Cloudflare ecosystem
    "cloudflare-workers", "cloudflare-workers-ai", "cloudflare-d1", "cloudflare-vectorize",
    # Frontend (extended)
    "next-auth", "radix-ui", "shadcn-ui", "storybook", "playwright", "cypress",
    "vitest", "react-query", "zustand", "apollo-client", "remix", "astro",
    # Backend (extended)
    "drizzle-orm", "prisma", "trpc", "hono", "bun", "deno",
})

# langchain-cloudflare — Workers AI binding integration (PyPI)
from langchain_cloudflare import ChatCloudflareWorkersAI
from langchain_core.prompts import ChatPromptTemplate

# langgraph-checkpoint-cloudflare-d1 removed (saves ~8MB sqlalchemy).
# CloudflareD1Saver checkpointing is best-effort and now a no-op.


# ---------------------------------------------------------------------------
# Job status enum — drives the processing pipeline
# ---------------------------------------------------------------------------

class JobStatus(str, Enum):
    """Status values for the three-phase job processing pipeline.

    Lifecycle:
      new → enhanced → role-match → eu-remote | non-eu
                    └→ role-nomatch  (terminal — skips EU classification)
    """
    NEW          = "new"           # Ingested, needs ATS enhancement
    ENHANCED     = "enhanced"      # ATS data fetched, ready for role tagging
    ROLE_MATCH   = "role-match"    # Target role confirmed — proceed to Phase 3
    ROLE_NOMATCH = "role-nomatch"  # Not a target role — terminal, skip Phase 3
    EU_REMOTE    = "eu-remote"     # Classified as fully remote EU position
    NON_EU       = "non-eu"        # Classified as NOT remote EU
    ERROR        = "error"         # Processing failed


# ---------------------------------------------------------------------------
# Pydantic models for structured output
# ---------------------------------------------------------------------------

@dataclass
class JobRoleTags:
    """Role tagging result from Phase 2."""
    isFrontendReact: bool = False
    isAIEngineer:    bool = False
    confidence:      str  = "low"   # "high" | "medium" | "low"
    reason:          str  = ""

    def __post_init__(self):
        self.reason = str(self.reason)[:500] if self.reason else ""

    @classmethod
    def model_validate(cls, data: dict) -> "JobRoleTags":
        return cls(
            isFrontendReact=bool(data.get("isFrontendReact", False)),
            isAIEngineer=bool(data.get("isAIEngineer", False)),
            confidence=str(data.get("confidence", "low")),
            reason=str(data.get("reason", "")),
        )


@dataclass
class ExtractedSkill:
    """A single skill extracted from a job description."""
    tag:        str  = ""
    level:      str  = "preferred"  # "required" | "preferred" | "nice"
    confidence: float = 0.7
    evidence:   str   = ""

    def __post_init__(self):
        self.evidence = str(self.evidence)[:300] if self.evidence else ""
        self.confidence = max(0.0, min(1.0, float(self.confidence)))


@dataclass
class JobSkillOutput:
    """Structured output for Phase 4 skill extraction."""
    skills: list = field(default_factory=list)

    @classmethod
    def model_validate(cls, data: dict) -> "JobSkillOutput":
        raw_skills = data.get("skills") or []
        skills = []
        for s in raw_skills:
            if isinstance(s, dict):
                skills.append(ExtractedSkill(
                    tag=str(s.get("tag", "")),
                    level=str(s.get("level", "preferred")),
                    confidence=float(s.get("confidence", 0.7)),
                    evidence=str(s.get("evidence", "")),
                ))
            elif isinstance(s, ExtractedSkill):
                skills.append(s)
        return cls(skills=skills)


@dataclass
class JobClassification:
    """EU-remote classification result from Phase 3.

    Accepts both camelCase (isRemoteEU) and snake_case (is_remote_eu) keys.
    """
    isRemoteEU: bool = False
    confidence: str  = "low"  # "high" | "medium" | "low"
    reason:     str  = ""

    @classmethod
    def model_validate(cls, data: dict) -> "JobClassification":
        is_eu = data.get("isRemoteEU", data.get("is_remote_eu", False))
        return cls(
            isRemoteEU=bool(is_eu),
            confidence=str(data.get("confidence", "low")),
            reason=str(data.get("reason", "")),
        )


# ---------------------------------------------------------------------------
# Prompt templates (langchain ChatPromptTemplate)
# ---------------------------------------------------------------------------

# Phase 2 — Role Tagging
ROLE_TAGGING_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a job-classification specialist. "
        "Analyze job postings to identify target roles: Frontend/React engineers and AI/ML/LLM engineers. "
        "Return structured JSON with clear confidence assessment.",
    ),
    (
        "human",
        """Analyze this job posting and classify the role type.

JOB DETAILS:
- Title:       {title}
- Location:    {location}
- Description: {description}

CLASSIFICATION GUIDANCE:

FRONTEND/REACT INDICATOR:
- Look for: React, Vue, Angular, Next.js, TypeScript, JavaScript, HTML/CSS
- Look for: "Frontend Engineer", "UI Engineer", "Web Developer", "Full Stack (React focus)"
- HIGH confidence if: Title explicitly mentions React/Frontend AND description has React/JS frameworks

AI/ML/LLM ENGINEER INDICATOR:
- Look for: AI, Machine Learning, LLM, RAG, embeddings, vector search, transformers, PyTorch
- Look for: "AI Engineer", "ML Engineer", "Data Scientist (ML-focused)", "LLM Engineer"
- Look for: "NLP", "computer vision", "deep learning", "neural networks", "fine-tuning"
- HIGH confidence if: Title or description explicitly includes AI/ML terminology

DUAL ROLES:
- Both can be true for "AI-powered React engineer" or "ML + Frontend" roles

CONFIDENCE LEVELS:
- HIGH: Role title or opening sentence clearly indicates specialization + skills match
- MEDIUM: Role could be either, mixed signals, or senior generalista with tech requirements
- LOW: Insufficient information, generic "engineer" title, or unclear skill requirements

Return ONLY valid JSON (no markdown):
{{
  "isFrontendReact": boolean,
  "isAIEngineer": boolean,
  "confidence": "high" | "medium" | "low",
  "reason": "Brief explanation of classification"
}}""",
    ),
])

# Phase 4 — Skill Extraction
SKILL_EXTRACTION_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a technical recruiter extracting skills from job descriptions. "
        "Only output canonical skill tags from the provided list. "
        "Do not invent tags. Return valid JSON only, no markdown.",
    ),
    (
        "human",
        """Extract technical skills from this job posting.

ALLOWED TAGS (use ONLY these exact strings): {tags}

JOB:
- Title: {title}
- Description: {description}

For each skill found, output:
- tag: exact string from the allowed list
- level: "required" (must-have), "preferred" (nice-to-have but important), or "nice" (bonus)
- confidence: 0.0-1.0 how certain you are this skill applies
- evidence: short quote from the description that supports this skill (min 10 chars)

Return ONLY valid JSON:
{{"skills": [{{"tag": "...", "level": "required|preferred|nice", "confidence": 0.0, "evidence": "..."}}]}}""",
    ),
])

# Phase 3 — EU Remote Classification
CLASSIFICATION_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are an expert at classifying job postings for Remote EU eligibility. "
        "A Remote EU position must be FULLY REMOTE and allow work from EU member countries. "
        "Return structured JSON output with clear reasoning.",
    ),
    (
        "human",
        """Classify this job posting as Remote EU or not.

JOB DETAILS:
- Title: {title}
- Location: {location}
- Description: {description}

STRUCTURED SIGNALS (from ATS metadata — trust these over raw text):
{structured_signals}

CLASSIFICATION RULES (apply in order):

0. NEGATIVE SIGNALS (highest priority — override all other rules):
   - "US only", "must be based in US", "US work authorization required" → isRemoteEU: false (high confidence)
   - "No EU applicants", "cannot accept from EU" → isRemoteEU: false (high confidence)
   - Swiss-only work permit in DACH context → isRemoteEU: false (high confidence)
   - These override worldwide/EMEA/EU timezone when present

1. FULLY REMOTE REQUIREMENT: Must explicitly state "remote", "fully remote", or similar.
   - Hybrid, office-based, or on-site positions → isRemoteEU: false
   - "Remote support" (providing remote support from an office) is NOT remote work

2. ATS METADATA SHORTCUTS (when available):
   - EU country code + ATS remote flag → isRemoteEU: true (high confidence)
   - ATS workplace_type = "not remote" → isRemoteEU: false (high confidence)

3. EXPLICIT EU MENTIONS: Look for clear EU indicators:
   - "Remote - EU", "EU only", "EU members only" → isRemoteEU: true (high confidence)
   - Specific EU countries only (e.g., "Germany, France, Spain") → isRemoteEU: true

4. WORK AUTHORIZATION: Strong signal for EU remote:
   - "EU work authorization", "EU passport", "EU residency" → isRemoteEU: true

5. REGIONAL SHORTHANDS:
   - "DACH" (Germany, Austria, Switzerland) → isRemoteEU: true (medium confidence — 2 of 3 are EU)
   - "Nordics" (Sweden, Finland, Denmark + Norway, Iceland) → isRemoteEU: true (medium confidence — 3 of 5 are EU)
   - "Benelux" (Belgium, Netherlands, Luxembourg) → isRemoteEU: true (high confidence — all EU)
   - "CEE" / "Central & Eastern Europe" → isRemoteEU: true (medium confidence — mostly EU)

6. BROADER REGIONS (EU workers are generally eligible):
   - "EMEA" + EU work auth → isRemoteEU: true (high confidence)
   - "EMEA" alone → isRemoteEU: true (medium confidence)
   - "Europe" without EU specification → isRemoteEU: true (medium confidence)
   - "EU + UK + Switzerland" (mixed) → isRemoteEU: true (medium confidence)

7. TIMEZONE SIGNALS:
   - "EU Timezone" → isRemoteEU: true (medium confidence)
   - "CET ± N hours", "European business hours" → isRemoteEU: true (medium confidence)
   - "CET timezone" alone (no EU context) → isRemoteEU: false (medium — not exclusive to EU)

8. WORLDWIDE / GLOBAL:
   - Worldwide + negative signals (US only etc.) → isRemoteEU: false (high confidence)
   - Worldwide + EU country/office in signals → isRemoteEU: true (medium confidence)
   - Worldwide + no EU specifics → isRemoteEU: true (LOW confidence — downgraded)

9. SPECIFIC COUNTRIES/REGIONS:
   - UK only (post-Brexit) → isRemoteEU: false
   - Switzerland only → isRemoteEU: false

10. CONFIDENCE LEVELS:
   - HIGH: Explicit EU mention, clear remote status, work authorization required, all-EU region, negative signals
   - MEDIUM: Mixed regions (includes EU), EEA, Europe, EMEA, DACH, Nordics, EU timezone, CET±N
   - LOW: Too vague, worldwide with no EU specifics, preference (not requirement)

RESPOND ONLY WITH VALID JSON:
{{
  "isRemoteEU": true/false,
  "confidence": "high" | "medium" | "low",
  "reason": "Brief explanation referencing the classification rules applied"
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
        stmt = stmt.bind(*JSON.parse(json.dumps(params)))
    result = await stmt.all()
    return to_py(result.results)


async def d1_run(db, sql: str, params: list | None = None):
    """Execute a D1 write statement (INSERT/UPDATE/DELETE)."""
    stmt = db.prepare(sql)
    if params:
        stmt = stmt.bind(*JSON.parse(json.dumps(params)))
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


# ---------------------------------------------------------------------------
# Shared LLM utilities
# ---------------------------------------------------------------------------

def _extract_json_object(raw: str) -> str:
    """Extract the first valid JSON object from an LLM response string.

    Handles:
      - Markdown fences: ```json ... ```
      - Leading preamble text before the opening brace
      - Trailing text or explanation after the closing brace

    Raises ValueError if no JSON object can be found.
    """
    # Strip markdown fences
    raw = re.sub(r"```(?:json)?", "", raw).strip()
    start = raw.find("{")
    end   = raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError(f"No JSON object found in LLM output: {raw[:200]!r}")
    return raw[start : end + 1]


def _guard_content(content) -> str | None:
    """Normalise Workers AI content, guarding against JsNull / JsProxy.

    Workers AI can return JsNull as the AIMessage.content field in the
    Pyodide environment. This helper converts the value to a clean Python
    string or returns None to signal the caller to escalate.
    """
    if content is None:
        return None
    # Detect JsProxy (pyodide.ffi) at runtime without importing pyodide
    if str(type(content)) == "<class 'pyodide.ffi.JsProxy'>":
        s = str(content)
        if not s or s.lower() in ("jsnull", "undefined", "null"):
            return None
        return s
    s = str(content).strip()
    return s if s else None


# =========================================================================
# Phase 1 — ATS Enhancement
# Fetch rich data from Greenhouse / Lever / Ashby public APIs and persist
# into D1. Mirrors ingestion logic but fully self-contained for CF Workers.
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
            set_parts = [f"{c} = ?" for c in cols]
            set_parts += ["status = ?", "updated_at = datetime('now')"]
            vals.append(JobStatus.ENHANCED.value)
            sql = f"UPDATE jobs SET {', '.join(set_parts)} WHERE id = ?"
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

    stats = {"enhanced": 0, "errors": 0}

    for job in rows:
        print(f"🔄 Enhancing {job.get('source_kind')} job {job['id']}: {job.get('title')}")
        result = await enhance_job(db, job)

        if result["enhanced"]:
            stats["enhanced"] += 1
            print("   ✅ Enhanced")
        else:
            stats["errors"] += 1
            print(f"   ❌ {result.get('error', 'unknown')}")
            # Advance status anyway so the job is not stuck in Phase 1
            try:
                await d1_run(
                    db,
                    "UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?",
                    [JobStatus.ENHANCED.value, job["id"]],
                )
                print("   ⏩ Advanced to 'enhanced' despite ATS error")
            except Exception as advance_err:
                print(f"   ⚠️  Could not advance status: {advance_err}")
        # Pace to avoid ATS rate-limits (Lever: 2 req/sec)
        await sleep_ms(300)

    print(
        f"✅ Enhancement complete: {stats['enhanced']} enhanced, "
        f"{stats['errors']} errors"
    )
    return stats


# =========================================================================
# Phase 2 — Role Tagging
#   Detects whether each job is a target role (Frontend/React or AI Engineer).
#   Non-target roles are marked terminal (role-nomatch) and never reach
#   Phase 3, saving EU-classification API costs.
#
#   Three-tier strategy (cheapest first):
#     Tier 1 — Keyword heuristic  (free, CPU-only)
#     Tier 2 — Workers AI via langchain  (free, Cloudflare quota)
#     Tier 3 — DeepSeek API  (paid, fallback only)
# =========================================================================

# Workers AI model shared by Phase 2 and Phase 3
WORKERS_AI_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8"

# Keywords that signal a hard non-target role — prevents false positives
# when backend job descriptions incidentally mention ML tooling.
_NON_TARGET_PATTERN = re.compile(
    r"\b(backend engineer|java developer|\.net developer|devops engineer"
    r"|data analyst|data scientist|platform engineer|sre|site reliability)\b"
)


def _keyword_role_tag(job: dict) -> JobRoleTags | None:
    """Tier 1: fast keyword heuristic — no LLM calls.

    Returns a high-confidence JobRoleTags when signals are clear, or None
    to indicate the caller should escalate to Tier 2 (Workers AI).

    The heuristic errs on the side of returning None when uncertain so that
    ambiguous jobs get a proper LLM review rather than being silently dropped.
    """
    title = (job.get("title") or "").lower()
    # Truncate description to avoid re scanning huge strings for simple patterns
    desc  = (job.get("description") or "")[:5000].lower()
    text  = f"{title}\n{desc}"

    # Hard exclusion — explicit non-target backend/infra roles (title only
    # to avoid false drops from incidental mentions in descriptions)
    if _NON_TARGET_PATTERN.search(title):
        return JobRoleTags(
            isFrontendReact=False,
            isAIEngineer=False,
            confidence="high",
            reason="Heuristic: explicit non-target role",
        )

    # Frontend / React signals (need both tech + role signal to be high-confidence)
    has_react    = bool(re.search(r"\breact(\.js)?\b", text)) or "next.js" in text
    has_frontend = bool(re.search(r"\b(frontend|ui engineer|web ui)\b", text))

    # AI Engineer signals
    has_ai_title = bool(re.search(r"\b(ai engineer|ml engineer|llm engineer|ai/ml)\b", text))
    has_ai_stack = any(
        x in text for x in
        ["machine learning", "llm", "rag", "embedding", "vector db", "fine-tun"]
    )

    if has_react and has_frontend:
        return JobRoleTags(
            isFrontendReact=True,
            isAIEngineer=bool(has_ai_title and has_ai_stack),  # dual-role allowed
            confidence="high",
            reason="Heuristic: React + frontend keywords",
        )

    if has_ai_title and has_ai_stack:
        return JobRoleTags(
            isFrontendReact=False,
            isAIEngineer=True,
            confidence="high",
            reason="Heuristic: AI engineer title + stack keywords",
        )

    return None  # Ambiguous — escalate to LLM


def _normalise_role_keys(raw: dict) -> dict:
    """Map alternate key spellings from different LLMs into the JobRoleTags schema.

    Some models return snake_case, others return camelCase, and some add
    extra underscores or drop the 'is' prefix. This covers the common variants.
    """
    KEY_MAP = {
        "frontend_react":    "isFrontendReact",
        "is_frontend_react": "isFrontendReact",
        "frontend":          "isFrontendReact",
        "react":             "isFrontendReact",
        "ai_engineer":       "isAIEngineer",
        "is_ai_engineer":    "isAIEngineer",
        "ai":                "isAIEngineer",
        "ml_engineer":       "isAIEngineer",
    }
    return {KEY_MAP.get(k, k): v for k, v in raw.items()}


def _normalise_classification_keys(raw: dict) -> dict:
    """Normalise LLM key variants into the JobClassification schema."""
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


async def _tag_with_workers_ai(job: dict, ai_binding) -> JobRoleTags | None:
    """Tier 2: Workers AI role tagging via langchain LCEL chain.

    Returns a validated JobRoleTags or None on any failure.
    None signals the caller to escalate to Tier 3 (DeepSeek).

    We do NOT use with_structured_output() because in the Pyodide Workers
    environment the AI binding can return JsNull as AIMessage.content,
    which crashes langchain's Pydantic validator. We parse raw text instead.
    """
    if ai_binding is None:
        return None

    try:
        llm   = ChatCloudflareWorkersAI(
            model_name=WORKERS_AI_MODEL,
            binding=ai_binding,
            temperature=0.2,
        )
        chain = ROLE_TAGGING_PROMPT | llm

        response = await chain.ainvoke({
            "title":       job.get("title", "N/A"),
            "location":    job.get("location") or "Not specified",
            "description": (job.get("description") or "")[:6000],
        })

        content_str = _guard_content(response.content)
        if not content_str:
            print("   ⚠️  Workers AI (role tag) returned null content")
            return None

        json_str   = _extract_json_object(content_str)
        raw        = json.loads(json_str)
        normalised = _normalise_role_keys(raw)
        return JobRoleTags.model_validate(normalised)

    except Exception as e:
        print(f"   ⚠️  Workers AI role tag failed: {e}")
        return None


async def _tag_with_deepseek(
    job: dict, api_key: str, base_url: str, model: str
) -> JobRoleTags | None:
    """Tier 3: DeepSeek role tagging fallback.

    Uses fetch_json (JS fetch wrapper) — no httpx needed in CF Workers.
    response_format=json_object eliminates the need for _extract_json_object.
    Returns None on any failure so the caller can apply a safe default.
    """
    prompt_msgs = ROLE_TAGGING_PROMPT.format_messages(
        title       = job.get("title", "N/A"),
        location    = job.get("location") or "Not specified",
        description = (job.get("description") or "")[:6000],
    )
    role_map = {"system": "system", "human": "user", "ai": "assistant"}
    messages = [{"role": role_map.get(m.type, m.type), "content": m.content} for m in prompt_msgs]

    try:
        url     = f"{base_url.rstrip('/')}/chat/completions"
        payload = json.dumps({
            "model":           model,
            "temperature":     0.1,
            "max_tokens":      300,
            "response_format": {"type": "json_object"},
            "messages":        messages,
        })

        data = await fetch_json(
            url,
            method  = "POST",
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type":  "application/json",
            },
            body    = payload,
            retries = 2,
        )

        content = (
            (data.get("choices") or [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        if not content.strip():
            raise ValueError("Empty content in DeepSeek response")

        raw        = json.loads(content)
        normalised = _normalise_role_keys(raw)
        return JobRoleTags.model_validate(normalised)

    except Exception as e:
        print(f"   ⚠️  DeepSeek role tag failed: {e}")
        return None


async def _run_role_tier_pipeline(
    job: dict,
    ai_binding,
    api_key: str | None,
    base_url: str,
    model: str,
    stats: dict,
) -> tuple[JobRoleTags, str]:
    """Run the three-tier role tagging pipeline for a single job.

    Returns (tags, source_label) where source_label is one of:
      'heuristic', 'workers-ai', 'deepseek', 'none'
    """
    # Tier 1 — Keyword heuristic
    tags = _keyword_role_tag(job)
    if tags and tags.confidence == "high":
        return tags, "heuristic"

    # Tier 2 — Workers AI
    wa_tags = None
    if ai_binding:
        wa_tags = await _tag_with_workers_ai(job, ai_binding)
        if wa_tags and wa_tags.confidence == "high":
            stats["workersAI"] += 1
            return wa_tags, "workers-ai"

    # Tier 3 — DeepSeek fallback (only if key provided and tier 2 didn't give high confidence)
    if api_key:
        ds_tags = await _tag_with_deepseek(job, api_key, base_url, model)
        if ds_tags:
            stats["deepseek"] += 1
            return ds_tags, "deepseek"

    # Accept whatever Workers AI returned (medium/low or None)
    if wa_tags:
        stats["workersAI"] += 1
        return wa_tags, "workers-ai"

    return JobRoleTags(
        isFrontendReact=False,
        isAIEngineer=False,
        confidence="low",
        reason="All tagging tiers failed or returned no result",
    ), "none"


async def _persist_role_tags(
    db,
    job_id,
    tags: JobRoleTags,
    source: str,
    next_status: JobStatus,
) -> None:
    """Write role tag columns + new status to D1.

    Falls back to a status-only update if the schema migration hasn't been
    run yet so that the pipeline continues even in partially migrated envs.
    """
    sql = """
        UPDATE jobs
        SET role_frontend_react = ?,
            role_ai_engineer    = ?,
            role_confidence     = ?,
            role_reason         = ?,
            role_source         = ?,
            status              = ?,
            updated_at          = datetime('now')
        WHERE id = ?
    """
    params = [
        int(tags.isFrontendReact),
        int(tags.isAIEngineer),
        tags.confidence,
        tags.reason,
        source,
        next_status.value,
        job_id,
    ]
    try:
        await d1_run(db, sql, params)
    except Exception as e:
        # Schema migration may not have run — degrade gracefully
        print(f"   ⚠️  Full role tag persist failed ({e}). Falling back to status-only update.")
        await d1_run(
            db,
            "UPDATE jobs SET status = ?, updated_at = datetime('now') WHERE id = ?",
            [next_status.value, job_id],
        )


async def tag_roles_for_enhanced_jobs(
    db,
    ai_binding,
    deepseek_api_key: str | None = None,
    deepseek_base_url: str       = "https://api.deepseek.com/beta",
    deepseek_model: str          = "deepseek-chat",
    limit: int                   = 50,
) -> dict:
    """Phase 2: Tag target roles for all jobs with status='enhanced'.

    Decision logic for next_status:
      - High-confidence non-match → ROLE_NOMATCH (terminal, skips Phase 3)
      - Target role found OR uncertain result → ROLE_MATCH (proceeds to Phase 3)

    Uncertain jobs become ROLE_MATCH (fail-open): a false positive costs one
    extra EU-classification call, but a false negative permanently discards
    a valid job. The asymmetry favours keeping the job in the pipeline.
    """
    print("🔍 Phase 2 — Finding jobs with status='enhanced'...")

    rows = await d1_all(
        db,
        "SELECT id, title, location, description FROM jobs WHERE status = ? ORDER BY created_at DESC LIMIT ?",
        [JobStatus.ENHANCED.value, limit],
    )

    print(f"📋 Found {len(rows)} jobs to role-tag")

    stats = {
        "processed": 0, "targetRole": 0, "irrelevant": 0,
        "errors": 0, "workersAI": 0, "deepseek": 0,
    }

    for job in rows:
        job_id = job.get("id", "unknown")
        try:
            print(f"🏷️  Role-tagging job {job_id}: {job.get('title')}")

            tags, source = await _run_role_tier_pipeline(
                job, ai_binding, deepseek_api_key, deepseek_base_url, deepseek_model, stats
            )

            is_target   = tags.isFrontendReact or tags.isAIEngineer
            next_status = (
                JobStatus.ROLE_NOMATCH
                if (not is_target and tags.confidence == "high")
                else JobStatus.ROLE_MATCH
            )

            label = "🎯 Match" if next_status == JobStatus.ROLE_MATCH else "⏭️  No-match"
            print(f"   {label} [{source}] ({tags.confidence}) — {tags.reason}")

            await _persist_role_tags(db, job_id, tags, source, next_status)

            stats["processed"] += 1
            if next_status == JobStatus.ROLE_NOMATCH:
                stats["irrelevant"] += 1
            elif is_target:
                stats["targetRole"] += 1

        except Exception as e:
            # Per-job exception: log and continue so one bad job doesn't block the batch
            print(f"   ❌ Unhandled error tagging job {job_id}: {e}")
            stats["errors"] += 1

        # Most jobs handled by keyword heuristic (no API call)
        await sleep_ms(100)

    print(
        f"✅ Role tagging complete: {stats['targetRole']} target, "
        f"{stats['irrelevant']} irrelevant, {stats['errors']} errors"
    )
    return stats


# =========================================================================
# Phase 3 — EU Remote Classification
#   Primary: Workers AI via langchain LCEL chain (free, fast)
#   Fallback: DeepSeek API for uncertain or failed Workers AI results
#
#   Only runs on jobs at status='role-match' — irrelevant jobs never
#   reach this phase, which is the primary cost-saving mechanism.
#
#   Three-tier strategy (cheapest first):
#     Tier 0 — Keyword heuristic + ATS signals  (free, CPU-only)
#     Tier 1 — Workers AI via langchain          (free, Cloudflare quota)
#     Tier 2 — DeepSeek API                      (paid, fallback only)
# =========================================================================

# EU member state + EEA ISO 3166-1 alpha-2 codes
EU_ISO_CODES: frozenset[str] = frozenset({
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
    "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
    "PL", "PT", "RO", "SK", "SI", "ES", "SE",
    # EEA (EU labour market access)
    "NO", "IS", "LI",
})

# EU + EEA country names (lowercase) for text matching
EU_COUNTRY_NAMES: frozenset[str] = frozenset({
    "austria", "belgium", "bulgaria", "croatia", "cyprus", "czech republic",
    "czechia", "denmark", "estonia", "finland", "france", "germany", "greece",
    "hungary", "ireland", "italy", "latvia", "lithuania", "luxembourg", "malta",
    "netherlands", "poland", "portugal", "romania", "slovakia", "slovenia",
    "spain", "sweden",
    # EEA
    "norway", "iceland", "liechtenstein",
})

# Country name → ISO code mapping (covers common ATS values)
_COUNTRY_NAME_TO_ISO: dict[str, str] = {
    "austria": "AT", "belgium": "BE", "bulgaria": "BG", "croatia": "HR",
    "cyprus": "CY", "czech republic": "CZ", "czechia": "CZ", "denmark": "DK",
    "estonia": "EE", "finland": "FI", "france": "FR", "germany": "DE",
    "greece": "GR", "hungary": "HU", "ireland": "IE", "italy": "IT",
    "latvia": "LV", "lithuania": "LT", "luxembourg": "LU", "malta": "MT",
    "netherlands": "NL", "poland": "PL", "portugal": "PT", "romania": "RO",
    "slovakia": "SK", "slovenia": "SI", "spain": "ES", "sweden": "SE",
    # EEA
    "norway": "NO", "iceland": "IS", "liechtenstein": "LI",
    # Non-EU (for correct negative classification)
    "united states": "US", "united kingdom": "GB", "switzerland": "CH",
    "canada": "CA", "australia": "AU", "new zealand": "NZ",
    "japan": "JP", "singapore": "SG", "india": "IN", "brazil": "BR",
    "israel": "IL", "south korea": "KR", "china": "CN",
}


# Negative signal patterns — US-only, no-EU, Swiss-only
_NEGATIVE_EU_PATTERN = re.compile(
    r"\b("
    r"us only|us-only|united states only"
    r"|must be based in the us|must be based in the united states"
    r"|us work authorization|authorized to work in the united states"
    r"|us citizens? (?:and|or) permanent residents?"
    r"|no eu applicants?|cannot accept applications? from eu"
    r"|outside the european union"
    r"|must be based in switzerland|swiss work permit"
    r")\b",
    re.IGNORECASE,
)

# EU timezone / business hours patterns
_EU_TIMEZONE_PATTERN = re.compile(
    r"("
    r"\beu\s*timezone\b"
    r"|\beuropean business hours\b"
    r"|cet\s*[±+-]\s*\d"
    r"|[±+-]\s*\d+\s*hours?\s*cet"
    r"|\boverlap with (?:cet|european)\b"
    r")",
    re.IGNORECASE,
)


def _extract_eu_signals(job: dict) -> dict:
    """Extract deterministic EU-related signals from ATS-enriched job data.

    Returns a dict of boolean/string signals that the keyword heuristic
    and LLM prompt can use for classification.
    """
    signals: dict = {
        "ats_remote": False,
        "eu_country_code": False,
        "country_code": None,
        "negative_signals": [],
        "eu_timezone": False,
        "eu_countries_in_location": [],
        "all_locations": [],
    }

    # ATS remote flag — from ashby_is_remote or workplace_type
    ashby_remote = job.get("ashby_is_remote")
    workplace = (job.get("workplace_type") or "").lower()
    location_lower = (job.get("location") or "").lower().strip()
    if (ashby_remote == 1 or ashby_remote is True
            or workplace == "remote"
            or location_lower == "remote"
            or location_lower.startswith("remote ")):
        signals["ats_remote"] = True

    # Country code → EU membership check
    # Accept ISO codes (2-3 uppercase letters) or full country names
    raw_country = (job.get("country") or "").strip()
    country = raw_country.upper()
    if country and re.fullmatch(r"[A-Z]{2,3}", country):
        # Already an ISO code
        signals["country_code"] = country
        if country in EU_ISO_CODES:
            signals["eu_country_code"] = True
    elif raw_country:
        # Try mapping full country name → ISO code
        iso = _COUNTRY_NAME_TO_ISO.get(raw_country.lower())
        if iso:
            signals["country_code"] = iso
            if iso in EU_ISO_CODES:
                signals["eu_country_code"] = True

    # Fallback: extract country from ashby_address if still no country_code
    if not signals["country_code"]:
        try:
            addr = job.get("ashby_address")
            if isinstance(addr, str):
                addr = json.loads(addr)
            if isinstance(addr, dict):
                postal = addr.get("postalAddress") or addr
                addr_country = (postal.get("addressCountry") or "").strip()
                addr_locality = (postal.get("addressLocality") or "").strip()
                # Try addressCountry first, then addressLocality as fallback
                for candidate in [addr_country, addr_locality]:
                    if not candidate:
                        continue
                    upper = candidate.upper()
                    if re.fullmatch(r"[A-Z]{2,3}", upper):
                        signals["country_code"] = upper
                        if upper in EU_ISO_CODES:
                            signals["eu_country_code"] = True
                        break
                    iso = _COUNTRY_NAME_TO_ISO.get(candidate.lower())
                    if iso:
                        signals["country_code"] = iso
                        if iso in EU_ISO_CODES:
                            signals["eu_country_code"] = True
                        break
        except Exception:
            pass

    # Negative signals via regex on description
    desc = (job.get("description") or "")[:8000].lower()
    location = (job.get("location") or "").lower()
    full_text = f"{location} {desc}"
    for m in _NEGATIVE_EU_PATTERN.finditer(full_text):
        signals["negative_signals"].append(m.group(0))

    # EU timezone / business hours
    if _EU_TIMEZONE_PATTERN.search(full_text):
        signals["eu_timezone"] = True

    # EU country names in location string
    for name in EU_COUNTRY_NAMES:
        if name in location:
            signals["eu_countries_in_location"].append(name)

    # Aggregate all ATS locations
    all_locs: list[str] = []
    if job.get("location"):
        all_locs.append(job["location"])

    # offices (Greenhouse JSON array)
    try:
        offices = job.get("offices")
        if isinstance(offices, str):
            offices = json.loads(offices)
        if isinstance(offices, list):
            for o in offices:
                name = o.get("name") or o.get("location") if isinstance(o, dict) else str(o)
                if name:
                    all_locs.append(name)
    except Exception:
        pass

    # categories.allLocations (Ashby/Lever JSON)
    try:
        cats = job.get("categories")
        if isinstance(cats, str):
            cats = json.loads(cats)
        if isinstance(cats, dict):
            for loc in (cats.get("allLocations") or []):
                if loc and loc not in all_locs:
                    all_locs.append(loc)
    except Exception:
        pass

    # ashby_secondary_locations
    try:
        sec = job.get("ashby_secondary_locations")
        if isinstance(sec, str):
            sec = json.loads(sec)
        if isinstance(sec, list):
            for s in sec:
                loc_name = s.get("location") if isinstance(s, dict) else str(s)
                if loc_name and loc_name not in all_locs:
                    all_locs.append(loc_name)
    except Exception:
        pass

    signals["all_locations"] = all_locs
    return signals


def _keyword_eu_classify(job: dict, signals: dict) -> JobClassification | None:
    """Tier 0: deterministic EU classification heuristic.

    Returns high-confidence results only for unambiguous cases.
    Returns None for anything ambiguous → falls through to LLM.
    """
    location = (job.get("location") or "").lower()

    # Negative signals → reject
    if signals["negative_signals"]:
        return JobClassification(
            isRemoteEU=False,
            confidence="high",
            reason=f"Heuristic: negative signals found: {', '.join(signals['negative_signals'][:3])}",
        )

    # ATS says not remote and location is not remote → reject
    if not signals["ats_remote"] and "remote" not in location:
        # Only if there's strong on-site signal
        desc_lower = (job.get("description") or "").lower()
        if ("on-site" in desc_lower or "onsite" in desc_lower or "hybrid" in location
                or "in office" in desc_lower):
            return JobClassification(
                isRemoteEU=False,
                confidence="high",
                reason="Heuristic: not a remote position",
            )

    # EU country code + remote flag → accept
    if signals["eu_country_code"] and signals["ats_remote"]:
        return JobClassification(
            isRemoteEU=True,
            confidence="high",
            reason=f"Heuristic: EU country code ({signals['country_code']}) + ATS remote flag",
        )

    # Explicit "Remote - EU" / "Remote | EU" in location
    if re.search(r"\bremote\b.*\beu\b(?!\s*timezone)", location, re.IGNORECASE):
        return JobClassification(
            isRemoteEU=True,
            confidence="high",
            reason="Heuristic: explicit 'Remote EU' in location",
        )

    # EU country in location + remote → accept (e.g., "Oslo, Norway" + remote flag)
    if signals["eu_countries_in_location"] and signals["ats_remote"]:
        countries = ", ".join(signals["eu_countries_in_location"][:3])
        return JobClassification(
            isRemoteEU=True,
            confidence="high",
            reason=f"Heuristic: EU/EEA country in location ({countries}) + ATS remote flag",
        )

    # Worldwide remote: ATS remote flag + no country code + no negative signals
    # Policy: worldwide remote jobs are available to EU workers
    if signals["ats_remote"] and not signals["country_code"]:
        return JobClassification(
            isRemoteEU=True,
            confidence="medium",
            reason="Heuristic: worldwide remote (ATS remote flag, no country restriction)",
        )

    # Non-EU country but ATS remote + description signals worldwide/global scope
    # → treat as worldwide remote
    desc_lower = (job.get("description") or "").lower()
    if signals["ats_remote"] and signals["country_code"] and not signals["eu_country_code"]:
        _worldwide_pattern = re.compile(
            r"\b(global(?:ly)?|worldwide|anywhere in the world|work from anywhere"
            r"|distributed team|fully distributed|remote.first"
            r"|remote.friendly|location.agnostic)\b",
            re.IGNORECASE,
        )
        worldwide_match = _worldwide_pattern.search(desc_lower)
        if worldwide_match:
            return JobClassification(
                isRemoteEU=True,
                confidence="medium",
                reason=f"Heuristic: non-EU HQ ({signals['country_code']}) but worldwide remote ({worldwide_match.group(0)})",
            )

    # Check description for explicit EU eligibility even without ATS signals
    if signals["ats_remote"]:
        eu_desc_match = re.search(
            r"\b(eu\s+(?:based|eligible|residents?|citizens?|work\s*(?:authorization|permit))"
            r"|european\s+(?:union|economic\s+area)"
            r"|remote.*\beu\b"
            r"|emea)"
            r"\b",
            desc_lower,
            re.IGNORECASE,
        )
        if eu_desc_match:
            return JobClassification(
                isRemoteEU=True,
                confidence="medium",
                reason=f"Heuristic: EU signal in description ({eu_desc_match.group(0)})",
            )

    return None  # Ambiguous — escalate to LLM


def _format_signals(signals: dict) -> str:
    """Format extracted signals as a text block for the LLM prompt."""
    parts: list[str] = []

    if signals["ats_remote"]:
        parts.append("- ATS remote flag: YES")
    if signals["country_code"]:
        eu_label = " (EU member)" if signals["eu_country_code"] else " (NOT EU)"
        parts.append(f"- Country code: {signals['country_code']}{eu_label}")
    if signals["negative_signals"]:
        parts.append(f"- Negative signals: {', '.join(signals['negative_signals'][:5])}")
    if signals["eu_timezone"]:
        parts.append("- EU timezone/business hours signal detected")
    if signals["eu_countries_in_location"]:
        parts.append(f"- EU countries in location: {', '.join(signals['eu_countries_in_location'][:5])}")
    if len(signals["all_locations"]) > 1:
        parts.append(f"- All ATS locations: {', '.join(signals['all_locations'][:8])}")

    return "\n".join(parts) if parts else "- No structured ATS signals available"

def _build_classification_chain(ai_binding):
    """Build the langchain LCEL EU-classification chain."""
    llm = ChatCloudflareWorkersAI(
        model_name=WORKERS_AI_MODEL,
        binding=ai_binding,
        temperature=0.2,
    )
    return CLASSIFICATION_PROMPT | llm


async def classify_with_workers_ai(job: dict, ai_binding, signals_text: str = "") -> JobClassification | None:
    """Phase 3 Tier 1: EU classification via Workers AI + langchain LCEL chain.

    Returns a validated JobClassification or None if unavailable/failed.
    Does NOT use with_structured_output() — see _guard_content() docstring.
    """
    if ai_binding is None:
        return None

    try:
        chain    = _build_classification_chain(ai_binding)
        response = await chain.ainvoke({
            "title":       job.get("title", "N/A"),
            "location":    job.get("location") or "Not specified",
            "description": (job.get("description") or "")[:6000],
            "structured_signals": signals_text or "None available",
        })

        content_str = _guard_content(response.content)
        if not content_str:
            print("   ⚠️  Workers AI (classify) returned null content")
            return None

        json_str   = _extract_json_object(content_str)
        raw        = json.loads(json_str)
        normalised = _normalise_classification_keys(raw)
        return JobClassification.model_validate(normalised)

    except Exception as e:
        print(f"   ⚠️  Workers AI classification failed: {e}")
        return None


async def classify_with_deepseek(
    job: dict, api_key: str, base_url: str, model: str, signals_text: str = ""
) -> JobClassification:
    """Phase 3 Tier 2: EU classification via DeepSeek API.

    Called only when Workers AI fails or returns low/medium confidence.
    Uses fetch_json (JS fetch) — no httpx needed in CF Workers.
    Never raises — returns a low-confidence default on any error.
    """
    prompt_msgs = CLASSIFICATION_PROMPT.format_messages(
        title       = job.get("title", "N/A"),
        location    = job.get("location") or "Not specified",
        description = (job.get("description") or "")[:6000],
        structured_signals = signals_text or "None available",
    )
    role_map = {"system": "system", "human": "user", "ai": "assistant"}
    messages = [{"role": role_map.get(m.type, m.type), "content": m.content} for m in prompt_msgs]

    try:
        url     = f"{base_url.rstrip('/')}/chat/completions"
        payload = json.dumps({
            "model":           model,
            "temperature":     0.3,
            "response_format": {"type": "json_object"},
            "messages":        messages,
        })

        data = await fetch_json(
            url,
            method  = "POST",
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type":  "application/json",
            },
            body    = payload,
            retries = 3,
        )

        content = (
            (data.get("choices") or [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        if not content.strip():
            raise ValueError("Empty content in DeepSeek classify response")

        raw        = json.loads(content)
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
    """Phase 3: EU-remote classify all jobs at status='role-match'.

    Strategy:
      1. Workers AI via langchain LCEL (free) — use directly if high confidence.
      2. DeepSeek fallback (paid) — if Workers AI fails or is uncertain.
      3. Accept Workers AI as-is if no DeepSeek key is configured.
    """
    api_key  = getattr(env, "DEEPSEEK_API_KEY", None) or getattr(env, "OPENAI_API_KEY", None)
    base_url = getattr(env, "DEEPSEEK_BASE_URL", None) or "https://api.deepseek.com/beta"
    model    = getattr(env, "DEEPSEEK_MODEL", None) or "deepseek-chat"
    ai_binding = getattr(env, "AI", None)

    if not ai_binding and not api_key:
        raise Exception(
            "No classification backend available. "
            "Provide either the AI binding (Workers AI) or DEEPSEEK_API_KEY."
        )

    print("🔍 Phase 3 — Fetching jobs ready for EU classification...")

    rows = await d1_all(
        db,
        """SELECT id, title, location, description,
                  country, workplace_type, offices, categories,
                  ashby_is_remote, ashby_secondary_locations, ashby_address,
                  source_kind
           FROM jobs WHERE status IN (?, ?, ?) ORDER BY created_at DESC LIMIT ?""",
        [JobStatus.ROLE_MATCH.value, JobStatus.ROLE_NOMATCH.value,
         JobStatus.ENHANCED.value, limit],
    )

    print(f"📋 Found {len(rows)} jobs to classify")

    stats = {
        "processed": 0, "euRemote": 0, "nonEuRemote": 0,
        "errors": 0, "workersAI": 0, "deepseek": 0,
    }

    for job in rows:
        try:
            print(f"\n🤖 Classifying job {job['id']}: {job.get('title')}")

            # Tier 0 — Extract ATS signals and try keyword heuristic
            eu_signals = _extract_eu_signals(job)
            signals_text = _format_signals(eu_signals)

            classification: JobClassification | None = None
            wa_result:      JobClassification | None = None
            source = "workers-ai"

            # Tier 0 — Keyword heuristic (free, no LLM)
            heuristic_result = _keyword_eu_classify(job, eu_signals)
            if heuristic_result is not None:
                classification = heuristic_result
                source = "heuristic"
                stats.setdefault("heuristic", 0)
                stats["heuristic"] += 1
                print(f"   ⚡ Heuristic ({heuristic_result.confidence}): {heuristic_result.reason}")

            # Tier 1 — Workers AI (primary, free) — only if heuristic didn't resolve
            if classification is None and ai_binding:
                wa_result = await classify_with_workers_ai(job, ai_binding, signals_text)
                if wa_result and wa_result.confidence == "high":
                    classification = wa_result
                    stats["workersAI"] += 1
                    print("   ⚡ Workers AI (high confidence)")

            # Tier 2 — DeepSeek fallback
            if classification is None and api_key:
                classification = await classify_with_deepseek(job, api_key, base_url, model, signals_text)
                source = "deepseek"
                stats["deepseek"] += 1
                print("   🔄 DeepSeek fallback")

            # Accept Workers AI as-is when no DeepSeek key
            if classification is None and wa_result is not None:
                classification = wa_result
                stats["workersAI"] += 1
                print("   ⚡ Workers AI (accepted, no DeepSeek fallback)")

            if classification is None:
                print("   ❌ No classification produced")
                stats["errors"] += 1
                continue

            is_eu       = classification.isRemoteEU
            confidence  = classification.confidence
            # evidence: key text excerpts that informed this classification decision
            evidence    = f"title:{job.get('title','')[:100]} | loc:{job.get('location','N/A')[:80]}"
            reason      = f"[{source}] {classification.reason} | evidence:{evidence}"
            score       = {"high": 0.9, "medium": 0.6, "low": 0.3}.get(confidence, 0.3)
            job_status  = JobStatus.EU_REMOTE.value if is_eu else JobStatus.NON_EU.value

            print(f"   {'✅ EU Remote' if is_eu else '❌ Non-EU'} ({confidence}): {reason}")

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

            stats["processed"] += 1
            if is_eu:
                stats["euRemote"] += 1
            else:
                stats["nonEuRemote"] += 1

            # Workers AI: same-machine binding, no rate limit
            # DeepSeek: 200ms sufficient to stay under rate limits
            await sleep_ms(200 if source == "deepseek" else 50)

        except Exception as e:
            print(f"   ❌ Error classifying job {job['id']}: {e}")
            stats["errors"] += 1

    return stats


# =========================================================================
# Phase 4 — Skill Extraction
#   Extracts canonical skill tags from classified job descriptions.
#   Runs on jobs that have been classified (eu-remote / non-eu / role-match)
#   but have no entries yet in job_skill_tags.
#
#   Same two-tier strategy as Phase 2/3:
#     Tier 1 — Workers AI via langchain  (free)
#     Tier 2 — DeepSeek API              (paid fallback)
# =========================================================================

_TAGS_STR = ", ".join(sorted(SKILL_TAGS))


async def _extract_with_workers_ai(
    job: dict, ai_binding
) -> list[ExtractedSkill] | None:
    """Tier 1: skill extraction via Workers AI."""
    if ai_binding is None:
        return None
    try:
        llm   = ChatCloudflareWorkersAI(
            model_name=WORKERS_AI_MODEL,
            binding=ai_binding,
            temperature=0.1,
        )
        chain = SKILL_EXTRACTION_PROMPT | llm
        response = await chain.ainvoke({
            "tags":        _TAGS_STR,
            "title":       job.get("title", "N/A"),
            "description": (job.get("description") or "")[:6000],
        })
        content_str = _guard_content(response.content)
        if not content_str:
            return None
        json_str = _extract_json_object(content_str)
        raw      = json.loads(json_str)
        output   = JobSkillOutput.model_validate(raw)
        return output.skills
    except Exception as e:
        print(f"   ⚠️  Workers AI skill extraction failed: {e}")
        return None


async def _extract_with_deepseek(
    job: dict, api_key: str, base_url: str, model: str
) -> list[ExtractedSkill] | None:
    """Tier 2: skill extraction via DeepSeek fallback."""
    prompt_msgs = SKILL_EXTRACTION_PROMPT.format_messages(
        tags        = _TAGS_STR,
        title       = job.get("title", "N/A"),
        description = (job.get("description") or "")[:6000],
    )
    role_map = {"system": "system", "human": "user", "ai": "assistant"}
    messages = [{"role": role_map.get(m.type, m.type), "content": m.content} for m in prompt_msgs]

    try:
        url     = f"{base_url.rstrip('/')}/chat/completions"
        payload = json.dumps({
            "model":           model,
            "temperature":     0.1,
            "max_tokens":      1000,
            "response_format": {"type": "json_object"},
            "messages":        messages,
        })
        data = await fetch_json(
            url,
            method  = "POST",
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type":  "application/json",
            },
            body    = payload,
            retries = 2,
        )
        content = (
            (data.get("choices") or [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        if not content.strip():
            raise ValueError("Empty content in DeepSeek skill extraction response")
        raw    = json.loads(content)
        output = JobSkillOutput.model_validate(raw)
        return output.skills
    except Exception as e:
        print(f"   ⚠️  DeepSeek skill extraction failed: {e}")
        return None


async def extract_skills_for_job(
    db,
    job: dict,
    ai_binding,
    api_key:  str | None,
    base_url: str,
    model:    str,
) -> dict:
    """Extract and persist skills for a single job into job_skill_tags."""
    skills: list[ExtractedSkill] | None = None

    # Tier 1 — Workers AI
    if ai_binding:
        skills = await _extract_with_workers_ai(job, ai_binding)

    # Tier 2 — DeepSeek fallback
    if not skills and api_key:
        skills = await _extract_with_deepseek(job, api_key, base_url, model)

    if not skills:
        return {"extracted": 0}

    # Validate: only canonical tags, evidence required (min 8 chars), max 30 skills
    valid = [
        s for s in skills
        if s.tag in SKILL_TAGS and len(s.evidence.strip()) >= 8
    ][:30]

    if not valid:
        return {"extracted": 0}

    # Upsert: delete existing then insert fresh batch
    await d1_run(db, "DELETE FROM job_skill_tags WHERE job_id = ?", [job["id"]])
    for s in valid:
        await d1_run(
            db,
            """INSERT OR REPLACE INTO job_skill_tags
               (job_id, tag, level, confidence, evidence, extracted_at, version)
               VALUES (?, ?, ?, ?, ?, datetime('now'), 'skills-v1')""",
            [job["id"], s.tag, s.level, round(s.confidence, 3), s.evidence],
        )

    return {"extracted": len(valid)}


async def extract_skills_for_classified_jobs(
    db,
    env,
    limit: int = 50,
) -> dict:
    """Phase 4: Extract skills for classified jobs that have no skill tags yet.

    Targets eu-remote, non-eu, and role-match jobs without existing job_skill_tags rows.
    Runs after Phase 3 so the description has been enhanced by Phase 1.
    """
    api_key  = getattr(env, "DEEPSEEK_API_KEY", None) or getattr(env, "OPENAI_API_KEY", None)
    base_url = getattr(env, "DEEPSEEK_BASE_URL", None) or "https://api.deepseek.com/beta"
    model    = getattr(env, "DEEPSEEK_MODEL", None) or "deepseek-chat"
    ai_binding = getattr(env, "AI", None)

    print("🔍 Phase 4 — Finding classified jobs without skill tags...")

    rows = await d1_all(
        db,
        """
        SELECT j.id, j.title, j.description
        FROM jobs j
        LEFT JOIN job_skill_tags t ON t.job_id = j.id
        WHERE j.status IN ('eu-remote', 'non-eu', 'role-match')
          AND j.description IS NOT NULL
          AND t.job_id IS NULL
        ORDER BY j.created_at DESC
        LIMIT ?
        """,
        [limit],
    )

    print(f"📋 Found {len(rows)} jobs needing skill extraction")

    stats = {"processed": 0, "extracted": 0, "errors": 0}

    for job in rows:
        job_id = job.get("id", "unknown")
        try:
            print(f"🔬 Extracting skills for job {job_id}: {job.get('title')}")
            result = await extract_skills_for_job(
                db, job, ai_binding, api_key, base_url, model
            )
            stats["processed"] += 1
            stats["extracted"] += result["extracted"]
            print(f"   ✅ {result['extracted']} skills extracted")
        except Exception as e:
            print(f"   ❌ Error extracting skills for job {job_id}: {e}")
            stats["errors"] += 1

        await sleep_ms(200)

    print(
        f"✅ Skill extraction complete: {stats['extracted']} skills across "
        f"{stats['processed']} jobs, {stats['errors']} errors"
    )
    return stats


# =========================================================================
# Worker Entrypoint
# =========================================================================

class Default(WorkerEntrypoint):
    """Main Worker entrypoint for the four-phase job processing pipeline.

    Phases:
      1. enhance  — ATS data enrichment (new → enhanced)
      2. tag      — Role tagging (enhanced → role-match | role-nomatch)
      3. classify — EU-remote classification (role-match → eu-remote | non-eu)
      4. extract  — Skill tag extraction (classified → job_skill_tags populated)
    """

    # MARK: - Request Routing

    async def fetch(self, request, env):
        """Handle incoming HTTP requests."""
        cors_headers = {
            "Access-Control-Allow-Origin":  "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }

        try:
            if request.method == "OPTIONS":
                return Response.json({}, status=200, headers=cors_headers)

            url  = request.url
            path = url.split("/")[-1].split("?")[0] if "/" in url else ""

            if path == "health":
                return await self.handle_health()

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

            if path == "enhance":
                return await self.handle_enhance(request, cors_headers)
            elif path == "tag":
                return await self.handle_tag(request, cors_headers)
            elif path == "classify":
                return await self.handle_classify(request, cors_headers)
            elif path == "extract":
                return await self.handle_extract(request, cors_headers)
            elif path == "process-sync":
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
        """Cron trigger — runs all four phases (enhance → tag → classify → extract).

        Configured via [triggers].crons in wrangler.jsonc.
        Runs every 6 hours. Phase 1/2 are fast (ATS fetch + keyword heuristic),
        Phase 3/4 involve LLM calls so use smaller batches.
        """
        print("🔄 Cron: Starting four-phase pipeline...")
        try:
            db = self.env.DB

            enhance_stats  = await enhance_unenhanced_jobs(db, 50)
            tag_stats      = await tag_roles_for_enhanced_jobs(
                db, getattr(self.env, "AI", None),
                deepseek_api_key  = getattr(self.env, "DEEPSEEK_API_KEY", None),
                deepseek_base_url = getattr(self.env, "DEEPSEEK_BASE_URL", "https://api.deepseek.com/beta"),
                deepseek_model    = getattr(self.env, "DEEPSEEK_MODEL", "deepseek-chat"),
                limit             = 50,
            )
            classify_stats = await classify_unclassified_jobs(db, self.env, 30)
            skill_stats    = await extract_skills_for_classified_jobs(db, self.env, 30)

            stats = self._merge_stats(enhance_stats, tag_stats, classify_stats, skill_stats)
            print(f"✅ Cron complete — {self._stats_summary(stats)}")
            self._save_run_checkpoint(stats)

        except Exception as e:
            print(f"❌ Error in cron: {e}")

    # MARK: - Queue Consumer

    async def queue(self, batch, env, ctx):
        """Consume messages from the process-jobs queue.

        Supported actions:
          enhance  — Phase 1 only
          tag      — Phase 2 only
          classify — Phase 3 only
          extract  — Phase 4 only (skill extraction)
          process  — All four phases (default)
        """
        for message in batch.messages:
            try:
                body   = to_py(message.body)
                action = body.get("action", "process")
                limit  = body.get("limit", 50)
                db     = self.env.DB

                print(f"📨 Queue message: action={action}, limit={limit}")

                if action == "enhance":
                    stats = await enhance_unenhanced_jobs(db, limit)
                    print(f"   Enhanced: {stats['enhanced']}, Errors: {stats['errors']}")

                elif action == "tag":
                    stats = await tag_roles_for_enhanced_jobs(
                        db, getattr(self.env, "AI", None),
                        deepseek_api_key  = getattr(self.env, "DEEPSEEK_API_KEY", None),
                        deepseek_base_url = getattr(self.env, "DEEPSEEK_BASE_URL", "https://api.deepseek.com/beta"),
                        deepseek_model    = getattr(self.env, "DEEPSEEK_MODEL", "deepseek-chat"),
                        limit             = limit,
                    )
                    print(f"   Tagged: {stats['processed']}, Target: {stats['targetRole']}, Skip: {stats['irrelevant']}")

                elif action == "classify":
                    stats = await classify_unclassified_jobs(db, self.env, limit)
                    print(f"   Classified: {stats['processed']}, EU: {stats['euRemote']}")

                elif action == "extract":
                    stats = await extract_skills_for_classified_jobs(db, self.env, limit)
                    print(f"   Skills: {stats['extracted']} extracted across {stats['processed']} jobs")

                else:  # "process" — full pipeline
                    enhance_stats  = await enhance_unenhanced_jobs(db, limit)
                    tag_stats      = await tag_roles_for_enhanced_jobs(
                        db, getattr(self.env, "AI", None),
                        deepseek_api_key  = getattr(self.env, "DEEPSEEK_API_KEY", None),
                        deepseek_base_url = getattr(self.env, "DEEPSEEK_BASE_URL", "https://api.deepseek.com/beta"),
                        deepseek_model    = getattr(self.env, "DEEPSEEK_MODEL", "deepseek-chat"),
                        limit             = limit,
                    )
                    classify_stats = await classify_unclassified_jobs(db, self.env, limit)
                    skill_stats    = await extract_skills_for_classified_jobs(db, self.env, limit)
                    stats = self._merge_stats(enhance_stats, tag_stats, classify_stats, skill_stats)
                    print(f"\n✅ Queue pipeline complete — {self._stats_summary(stats)}")
                    self._save_run_checkpoint(stats)

                message.ack()

            except Exception as e:
                print(f"❌ Queue message failed: {e}")
                message.retry()

    # MARK: - HTTP Handlers

    async def handle_health(self):
        """Health check — verifies D1 and optional bindings are available."""
        if not hasattr(self.env, "DB"):
            return Response.json({"error": "D1 binding not configured"}, status=400)

        try:
            rows = await d1_all(self.env.DB, "SELECT 1 as value")
            return Response.json({
                "status":     "healthy",
                "database":   "connected",
                "queue":      hasattr(self.env, "PROCESS_JOBS_QUEUE"),
                "workersAI":  hasattr(self.env, "AI"),
                "deepseek":   bool(getattr(self.env, "DEEPSEEK_API_KEY", None)),
                "value":      rows[0]["value"] if rows else None,
            })
        except Exception as e:
            return Response.json({"status": "unhealthy", "error": str(e)}, status=500)

    async def handle_enqueue(self, request, cors_headers: dict):
        """Enqueue a processing job to the CF Queue — returns immediately."""
        action = "process"
        limit  = 50
        try:
            body   = to_py(await request.json())
            action = body.get("action", "process")
            raw    = body.get("limit")
            if isinstance(raw, (int, float)) and raw > 0:
                limit = int(raw)
        except Exception:
            pass

        queue = getattr(self.env, "PROCESS_JOBS_QUEUE", None)
        if not queue:
            return Response.json(
                {"success": False, "error": "Queue binding not configured"},
                status=500,
                headers=cors_headers,
            )

        await queue.send(to_js_obj({"action": action, "limit": limit}))
        print(f"📤 Enqueued: action={action}, limit={limit}")

        return Response.json(
            {"success": True, "message": f"Queued '{action}' for up to {limit} jobs", "queued": True},
            headers=cors_headers,
        )

    async def handle_enhance(self, request, cors_headers: dict):
        """Run Phase 1 only — ATS enhancement (new → enhanced)."""
        limit = await self._parse_limit(request)
        stats = await enhance_unenhanced_jobs(self.env.DB, limit)
        return Response.json(
            {"success": True, "message": f"Enhanced {stats['enhanced']} jobs", "stats": stats},
            headers=cors_headers,
        )

    async def handle_tag(self, request, cors_headers: dict):
        """Run Phase 2 only — role tagging (enhanced → role-match | role-nomatch)."""
        limit = await self._parse_limit(request)
        stats = await tag_roles_for_enhanced_jobs(
            self.env.DB,
            getattr(self.env, "AI", None),
            deepseek_api_key  = getattr(self.env, "DEEPSEEK_API_KEY", None),
            deepseek_base_url = getattr(self.env, "DEEPSEEK_BASE_URL", "https://api.deepseek.com/beta"),
            deepseek_model    = getattr(self.env, "DEEPSEEK_MODEL", "deepseek-chat"),
            limit             = limit,
        )
        return Response.json(
            {
                "success": True,
                "message": f"Tagged {stats['processed']} jobs ({stats['targetRole']} target, {stats['irrelevant']} skipped)",
                "stats":   stats,
            },
            headers=cors_headers,
        )

    async def handle_classify(self, request, cors_headers: dict):
        """Run Phase 3 only — EU-remote classification (role-match → eu-remote | non-eu)."""
        limit = await self._parse_limit(request)
        stats = await classify_unclassified_jobs(self.env.DB, self.env, limit)
        return Response.json(
            {"success": True, "message": f"Classified {stats['processed']} jobs", "stats": stats},
            headers=cors_headers,
        )

    async def handle_extract(self, request, cors_headers: dict):
        """Run Phase 4 only — skill extraction for classified jobs."""
        limit = await self._parse_limit(request)
        stats = await extract_skills_for_classified_jobs(self.env.DB, self.env, limit)
        return Response.json(
            {
                "success": True,
                "message": f"Extracted {stats['extracted']} skills across {stats['processed']} jobs",
                "stats":   stats,
            },
            headers=cors_headers,
        )

    async def handle_process(self, request, cors_headers: dict):
        """Run the full four-phase pipeline synchronously (useful for debugging).

        For production use the queue endpoint instead to avoid hitting
        CF Worker CPU/wall-clock limits on large batches.
        """
        limit = await self._parse_limit(request)
        db    = self.env.DB

        enhance_stats  = await enhance_unenhanced_jobs(db, limit)
        tag_stats      = await tag_roles_for_enhanced_jobs(
            db, getattr(self.env, "AI", None),
            deepseek_api_key  = getattr(self.env, "DEEPSEEK_API_KEY", None),
            deepseek_base_url = getattr(self.env, "DEEPSEEK_BASE_URL", "https://api.deepseek.com/beta"),
            deepseek_model    = getattr(self.env, "DEEPSEEK_MODEL", "deepseek-chat"),
            limit             = limit,
        )
        classify_stats = await classify_unclassified_jobs(db, self.env, limit)
        skill_stats    = await extract_skills_for_classified_jobs(db, self.env, limit)

        stats   = self._merge_stats(enhance_stats, tag_stats, classify_stats, skill_stats)
        message = self._stats_summary(stats)

        print(f"\n✅ Pipeline complete — {message}")
        self._save_run_checkpoint(stats)

        return Response.json(
            {"success": True, "message": message, "stats": stats},
            headers=cors_headers,
        )

    # MARK: - Utilities

    def _merge_stats(self, enhance: dict, tag: dict, classify: dict, skills: dict | None = None) -> dict:
        """Merge per-phase stats dicts into a single flat summary dict."""
        s = skills or {}
        return {
            "enhanced":        enhance.get("enhanced", 0),
            "enhanceErrors":   enhance.get("errors", 0),
            "tagged":          tag.get("processed", 0),
            "targetRole":      tag.get("targetRole", 0),
            "irrelevant":      tag.get("irrelevant", 0),
            "tagErrors":       tag.get("errors", 0),
            "processed":       classify.get("processed", 0),
            "euRemote":        classify.get("euRemote", 0),
            "nonEuRemote":     classify.get("nonEuRemote", 0),
            "classifyErrors":  classify.get("errors", 0),
            "skillsExtracted": s.get("extracted", 0),
            "skillJobs":       s.get("processed", 0),
            "skillErrors":     s.get("errors", 0),
            "workersAI":       tag.get("workersAI", 0) + classify.get("workersAI", 0),
            "deepseek":        tag.get("deepseek", 0)  + classify.get("deepseek", 0),
        }

    def _stats_summary(self, stats: dict) -> str:
        """One-line human-readable summary of a merged stats dict."""
        return (
            f"enhanced={stats['enhanced']} "
            f"tagged={stats['tagged']} (skip={stats['irrelevant']}) "
            f"classified={stats['processed']} "
            f"eu={stats['euRemote']} "
            f"skills={stats.get('skillsExtracted', 0)} "
            f"workersAI={stats['workersAI']} deepseek={stats['deepseek']}"
        )

    def _save_run_checkpoint(self, stats: dict):
        """No-op — langgraph-checkpoint-cloudflare-d1 removed to save ~8MB."""
        print(f"   ℹ️  Checkpoint skipped (langgraph-checkpoint removed for size)")

    async def _parse_limit(self, request) -> int:
        """Parse optional limit from request body JSON, defaulting to 50."""
        try:
            body  = to_py(await request.json())
            limit = body.get("limit")
            if isinstance(limit, (int, float)) and limit > 0:
                return int(limit)
        except Exception:
            pass
        return 50
