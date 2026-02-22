"""
llm.py — DeepSeek two-pass classifier with full Langfuse tracing.

Per job analysed, Langfuse receives:
  trace      "job_report_analysis"
    generation "pass1_deepseek_chat"     (always)
    generation "pass2_deepseek_reasoner" (only if pass-1 conf < 0.60)
  score      "confidence"     (raw float)
  score      "label_accuracy" (0.5 = pending, updated to 1.0/0.0 by admin action)
"""

import json
import re
import uuid
from datetime import datetime, timezone
from js import fetch, Headers

from langfuse_client import LangfuseClient


VALID_REASONS  = {"spam", "irrelevant", "misclassified", "false_positive"}
MODEL_FAST     = "deepseek-chat"
MODEL_REASONER = "deepseek-reasoner"

SYSTEM_PROMPT = """You are a job listing quality analyst. Evaluate whether a reported job listing is genuinely problematic.

Classify into exactly one category:
  • spam           — phishing, MLM, pyramid scheme, fake recruiter, fee required
  • irrelevant     — not a job (course, ad, blog post, event, newsletter)
  • misclassified  — real job but wrong category, location, or remote status
  • false_positive — legitimate, correctly listed job

Respond with a single JSON object only. No markdown, no explanation outside JSON:
{
  "reason": "<spam|irrelevant|misclassified|false_positive>",
  "confidence": <float 0.0-1.0>,
  "reasoning": "<2-3 sentences>",
  "tags": ["<phishing|wrong_location|wrong_language|closed_role|agency_spam|unpaid|duplicate|test_listing>"]
}"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _user_prompt(job: dict) -> str:
    desc = (job.get("description") or "")[:1800]
    return (
        f"Title:    {job.get('title','N/A')}\n"
        f"Company:  {job.get('company','N/A')}\n"
        f"Location: {job.get('location','N/A')}\n"
        f"Remote:   {job.get('remote','N/A')}\n"
        f"URL:      {job.get('url','N/A')}\n"
        f"Tags:     {job.get('tags','N/A')}\n"
        f"Previous status: {job.get('prev_status','enhanced')}\n\n"
        f"Description:\n{desc}"
    )


def _parse(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
    match   = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON in response: {raw[:150]}")
    p          = json.loads(match.group())
    reason     = p.get("reason", "").lower().strip()
    confidence = max(0.0, min(1.0, float(p.get("confidence", 0.5))))
    reasoning  = str(p.get("reasoning", "")).strip()[:500]
    tags       = [str(t).lower().strip() for t in (p.get("tags") or [])[:10]]
    return {
        "reason":     reason if reason in VALID_REASONS else "irrelevant",
        "confidence": confidence,
        "reasoning":  reasoning,
        "tags":       tags,
    }


async def _call(gateway_url: str, api_key: str, model: str,
                system: str, user: str) -> tuple[dict, str]:
    """Returns (parsed_result, raw_content)."""
    is_reasoner = model == MODEL_REASONER
    payload     = json.dumps({
        "model":    model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        **({"response_format": {"type": "json_object"}, "temperature": 0.1}
           if not is_reasoner else {}),
        "max_tokens": 600 if is_reasoner else 400,
    })

    h = Headers.new()
    h.set("Content-Type", "application/json")
    h.set("Authorization", f"Bearer {api_key}")

    resp = await fetch(
        f"{gateway_url}/chat/completions",
        method="POST", headers=h, body=payload,
    )
    if not resp.ok:
        raise RuntimeError(f"DeepSeek {model} {resp.status}: {(await resp.text())[:200]}")

    data = json.loads(await resp.text())
    raw  = data["choices"][0]["message"]["content"]
    return _parse(raw), raw


def _action(result: dict, env) -> str:
    auto  = float(getattr(env, "AUTO_RESTORE_THRESHOLD",    "0.85"))
    escl  = float(getattr(env, "CONFIDENCE_ESCALATE",       "0.40"))
    if result["reason"] == "false_positive" and result["confidence"] >= auto:
        return "auto_restored"
    if result["confidence"] < escl:
        return "escalated"
    return "pending"


async def analyze_reported_job(env, job: dict, lf: LangfuseClient) -> dict:
    """
    Classify a reported job with DeepSeek and trace everything to Langfuse.

    Returns the analysis dict including trace_id so db.py can store it
    for later score updates when an admin confirms or restores the job.
    """
    api_key     = env.DEEPSEEK_API_KEY
    gateway_url = env.DEEPSEEK_GATEWAY_URL
    second_op   = float(getattr(env, "CONFIDENCE_SECOND_OPINION", "0.60"))

    trace_id  = str(uuid.uuid4())
    user_msg  = _user_prompt(job)

    # ── Root trace ─────────────────────────────────────────────────────────
    await lf.create_trace(
        id=trace_id,
        name="job_report_analysis",
        input={
            "job_id":      job.get("id"),
            "title":       job.get("title"),
            "company":     job.get("company"),
            "url":         job.get("url"),
            "prev_status": job.get("prev_status"),
        },
        tags=["job_reporter"],
    )

    # ── Pass 1: deepseek-chat ──────────────────────────────────────────────
    t0 = _now()
    try:
        result, raw1 = await _call(gateway_url, api_key, MODEL_FAST, SYSTEM_PROMPT, user_msg)
        t1 = _now()
        model_used = MODEL_FAST

        await lf.create_generation(
            trace_id=trace_id,
            id=str(uuid.uuid4()),
            name="pass1_deepseek_chat",
            model=MODEL_FAST,
            input=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_msg},
            ],
            output={"raw": raw1, "parsed": result},
            start_time=t0,
            end_time=t1,
        )

    except Exception as exc:
        await lf.post_score(trace_id=trace_id, name="label_accuracy",
                            value=0.0, comment=f"pass1 failed: {exc!s:.150}")
        return {
            "reason": "irrelevant", "confidence": 0.0,
            "reasoning": f"LLM error: {exc!s:.200}", "tags": ["llm_error"],
            "action": "escalated", "model_used": MODEL_FAST, "trace_id": trace_id,
        }

    # ── Pass 2: deepseek-reasoner (only when unsure) ───────────────────────
    if result["confidence"] < second_op:
        t2 = _now()
        try:
            result2, raw2 = await _call(
                gateway_url, api_key, MODEL_REASONER, SYSTEM_PROMPT, user_msg
            )
            t3 = _now()
            model_used = MODEL_REASONER

            await lf.create_generation(
                trace_id=trace_id,
                id=str(uuid.uuid4()),
                name="pass2_deepseek_reasoner",
                model=MODEL_REASONER,
                input=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": user_msg},
                ],
                output={"raw": raw2, "parsed": result2},
                start_time=t2,
                end_time=t3,
            )

            result = result2
            result["tags"] = list(set(result.get("tags", []) + ["second_opinion"]))

        except Exception:
            result["tags"].append("reasoner_failed")

    # ── Scores (label_accuracy = 0.5 until admin decides) ─────────────────
    await lf.post_score(
        trace_id=trace_id, name="confidence",
        value=result["confidence"],
        comment=f"reason={result['reason']} model={model_used}",
    )
    await lf.post_score(
        trace_id=trace_id, name="label_accuracy",
        value=0.5, comment="pending admin decision",
    )

    result["action"]     = _action(result, env)
    result["model_used"] = model_used
    result["trace_id"]   = trace_id
    return result
