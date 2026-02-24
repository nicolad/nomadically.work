"""LangChain LCEL chains for EU remote classification.

Two-tier LLM strategy:
  Tier 1 -- Workers AI via langchain-cloudflare (free, Cloudflare quota)
  Tier 2 -- DeepSeek API (paid, fallback only)
"""

import json
import re

from .constants import WORKERS_AI_MODEL
from .models import JobClassification
from .prompts import CLASSIFICATION_PROMPT

# langchain-cloudflare -- Workers AI binding integration (PyPI)
from langchain_cloudflare import ChatCloudflareWorkersAI


# -------------------------------------------------------------------------
# Shared LLM utilities
# -------------------------------------------------------------------------

def _extract_json_object(raw: str) -> str:
    """Extract the first valid JSON object from an LLM response string.

    Handles:
      - Markdown fences: ```json ... ```
      - Leading preamble text before the opening brace
      - Trailing text or explanation after the closing brace

    Raises ValueError if no JSON object can be found.
    """
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
    if str(type(content)) == "<class 'pyodide.ffi.JsProxy'>":
        s = str(content)
        if not s or s.lower() in ("jsnull", "undefined", "null"):
            return None
        return s
    s = str(content).strip()
    return s if s else None


def _normalise_classification_keys(raw: dict) -> dict:
    """Map alternate key spellings into the canonical JobClassification schema.

    LLMs may return snake_case or camelCase variants depending on the model.
    """
    normalised = dict(raw)
    # isRemoteEU variants
    for alt in ("is_remote_eu", "isRemoteEu", "is_remote_EU", "isremoteeu"):
        if alt in normalised and "isRemoteEU" not in normalised:
            normalised["isRemoteEU"] = normalised.pop(alt)
    return normalised


# -------------------------------------------------------------------------
# Tier 1 -- Workers AI (via langchain-cloudflare)
# -------------------------------------------------------------------------

def build_classification_chain(ai_binding):
    """Build the langchain LCEL EU-classification chain."""
    llm = ChatCloudflareWorkersAI(
        model_name=WORKERS_AI_MODEL,
        binding=ai_binding,
        temperature=0.2,
    )
    return CLASSIFICATION_PROMPT | llm


async def classify_with_workers_ai(
    job: dict, ai_binding, signals_text: str = ""
) -> JobClassification | None:
    """Tier 1: EU classification via Workers AI + langchain LCEL chain.

    Returns a validated JobClassification or None if unavailable/failed.
    Does NOT use with_structured_output() -- see _guard_content() docstring.
    """
    if ai_binding is None:
        return None

    try:
        chain    = build_classification_chain(ai_binding)
        response = await chain.ainvoke({
            "title":       job.get("title", "N/A"),
            "location":    job.get("location") or "Not specified",
            "description": (job.get("description") or "")[:6000],
            "structured_signals": signals_text or "None available",
        })

        content_str = _guard_content(response.content)
        if not content_str:
            print("   Workers AI (classify) returned null content")
            return None

        json_str   = _extract_json_object(content_str)
        raw        = json.loads(json_str)
        normalised = _normalise_classification_keys(raw)
        return JobClassification.model_validate(normalised)

    except Exception as e:
        print(f"   Workers AI classification failed: {e}")
        return None


# -------------------------------------------------------------------------
# Tier 2 -- DeepSeek API (fallback)
# -------------------------------------------------------------------------

async def classify_with_deepseek(
    job: dict,
    api_key: str,
    base_url: str,
    model: str,
    signals_text: str = "",
    *,
    fetch_json_fn=None,
) -> JobClassification:
    """Tier 2: EU classification via DeepSeek API.

    Called only when Workers AI fails or returns low/medium confidence.
    Uses the provided fetch_json_fn for HTTP calls (injected from the
    worker entrypoint to use JS fetch in the Pyodide environment).
    Never raises -- returns a low-confidence default on any error.
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

        if fetch_json_fn is None:
            raise ValueError("fetch_json_fn is required for DeepSeek API calls")

        data = await fetch_json_fn(
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
        print(f"   DeepSeek classification failed: {e}")
        return JobClassification(
            isRemoteEU=False,
            confidence="low",
            reason=f"Classification failed: {e}",
        )
