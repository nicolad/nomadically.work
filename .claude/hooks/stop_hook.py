#!/usr/bin/env python3
"""
stop_hook.py — Claude Code Stop hook
Runs after every session. Does three things:
  1. Sends trace to Langfuse
  2. Scores the session across all four improvement surfaces
  3. If score is low, queues the session for improvement generation
"""

import copy
import fcntl
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# ── Fail-open imports ─────────────────────────────────────────────────────────
try:
    from langfuse import Langfuse, propagate_attributes
except Exception:
    sys.exit(0)

try:
    import anthropic
except Exception:
    anthropic = None

# ── Config ────────────────────────────────────────────────────────────────────
STATE_DIR  = Path.home() / ".claude" / "state"
QUEUE_FILE = STATE_DIR / "improvement_queue.json"
LOG_FILE   = STATE_DIR / "stop_hook.log"

SCORE_THRESHOLD = float(os.environ.get("CC_IMPROVE_THRESHOLD", "0.65"))
AGENT_VERSION   = os.environ.get("AGENT_VERSION", "unknown")
PRODUCT_FEATURE = os.environ.get("PRODUCT_FEATURE", "default")
ACTIVE_SUBAGENT = os.environ.get("ACTIVE_SUBAGENT", "main")
DEBUG           = os.environ.get("CC_DEBUG", "").lower() == "true"

# Keys forwarded to the improvement subprocess (no full-env leak)
_CHILD_ENV_KEYS = {
    "ANTHROPIC_API_KEY", "LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY",
    "LANGFUSE_BASE_URL", "AGENT_VERSION", "PRODUCT_FEATURE",
    "ACTIVE_SUBAGENT", "CC_DEBUG", "PATH", "HOME",
    "TRACE_TO_LANGFUSE", "CC_IMPROVE_THRESHOLD",
}

# ── Logging ───────────────────────────────────────────────────────────────────
def log(level: str, msg: str) -> None:
    try:
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(LOG_FILE, "a") as f:
            f.write(f"{ts} [{level}] {msg}\n")
    except Exception:
        pass

# ── Stdin payload ─────────────────────────────────────────────────────────────
def read_payload() -> Dict[str, Any]:
    try:
        data = sys.stdin.read()
        return json.loads(data) if data.strip() else {}
    except Exception:
        return {}

def extract_session(payload: Dict[str, Any]) -> Tuple[Optional[str], Optional[Path]]:
    session_id = payload.get("sessionId") or payload.get("session_id")
    transcript = payload.get("transcriptPath") or payload.get("transcript_path")
    path = Path(transcript).expanduser().resolve() if transcript else None
    return session_id, path

# ── Transcript parsing ────────────────────────────────────────────────────────
def load_transcript(path: Path) -> List[Dict[str, Any]]:
    msgs = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            msgs.append(json.loads(line))
        except Exception:
            continue
    return msgs

def get_role(msg: Dict) -> Optional[str]:
    t = msg.get("type")
    if t in ("user", "assistant"):
        return t
    m = msg.get("message", {})
    return m.get("role") if isinstance(m, dict) else None

def get_content(msg: Dict) -> Any:
    if "message" in msg and isinstance(msg["message"], dict):
        return msg["message"].get("content")
    return msg.get("content")

def extract_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            x.get("text", "") for x in content
            if isinstance(x, dict) and x.get("type") == "text"
        )
    return ""

def extract_tool_calls(msgs: List[Dict]) -> List[Dict]:
    calls = []
    for msg in msgs:
        if get_role(msg) != "assistant":
            continue
        content = get_content(msg)
        if isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and block.get("type") == "tool_use":
                    calls.append({
                        "name":  block.get("name"),
                        "input": block.get("input", {}),
                    })
    return calls

def get_model(msgs: List[Dict]) -> str:
    for msg in msgs:
        if get_role(msg) == "assistant":
            m = msg.get("message", {})
            if isinstance(m, dict) and m.get("model"):
                return m["model"]
    return "claude"

def build_session_summary(msgs: List[Dict]) -> Dict:
    """Collapse transcript into a clean summary for the scorer."""
    turns: List[Dict] = []
    user_text = ""
    assistant_text = ""

    for msg in msgs:
        role = get_role(msg)
        if role == "user":
            # Only flush a pending turn when there was real user content
            if user_text:
                turns.append({"user": user_text, "assistant": assistant_text})
            user_text = extract_text(get_content(msg))
            assistant_text = ""
        elif role == "assistant":
            assistant_text += extract_text(get_content(msg))

    if user_text:
        turns.append({"user": user_text, "assistant": assistant_text})

    return {
        "turns":      turns,
        "tool_calls": extract_tool_calls(msgs),
        "model":      get_model(msgs),
        "turn_count": len(turns),
    }

# ── Scoring via Claude ────────────────────────────────────────────────────────
SCORE_PROMPT = """You are an evaluation agent for a customer-facing AI product.
Score this session on four dimensions (each 0.0–1.0):

SESSION:
{session_json}

ACTIVE SUBAGENT: {subagent}
AGENT VERSION:   {version}

Evaluate:
1. task_completion   — Did the agent fully address what the user asked? (system prompt quality)
2. tool_efficiency   — Were tools selected and called optimally? (tool usage patterns)
3. skill_adherence   — Did the agent stay within its subagent role and instructions? (skill instructions)
4. routing_accuracy  — Was this the right subagent for the task? (routing logic)

Return ONLY valid JSON, no prose:
{{
  "task_completion":  {{"score": float, "reason": str, "failure_type": str|null}},
  "tool_efficiency":  {{"score": float, "reason": str, "failure_type": str|null}},
  "skill_adherence":  {{"score": float, "reason": str, "failure_type": str|null}},
  "routing_accuracy": {{"score": float, "correct_agent": str|null, "reason": str}}
}}

failure_type options: "ignored_request"|"hallucination"|"incomplete"|"off_topic"|
                      "wrong_tool"|"bad_input"|"redundant_calls"|"tool_failure"|
                      "out_of_role"|"misrouted"|null
"""

_MAX_TURN_CHARS     = 1500   # per turn side (user / assistant)
_MAX_TOOL_INPUT_CHARS = 400  # per tool call input


def _truncate_summary_for_prompt(summary: Dict) -> Dict:
    """Truncate text fields so the serialised JSON is well-formed and token-safe."""
    s = copy.deepcopy(summary)
    for turn in s["turns"]:
        for key in ("user", "assistant"):
            v = turn.get(key, "")
            if len(v) > _MAX_TURN_CHARS:
                turn[key] = v[:_MAX_TURN_CHARS] + "…[truncated]"
    for tc in s.get("tool_calls", []):
        raw = json.dumps(tc.get("input", {}))
        if len(raw) > _MAX_TOOL_INPUT_CHARS:
            tc["input"] = {"_truncated": raw[:_MAX_TOOL_INPUT_CHARS] + "…"}
    return s


def _strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` wrappers that models add despite instructions."""
    if text.startswith("```"):
        parts = text.split("```", 2)
        inner = parts[1] if len(parts) > 1 else text
        if inner.startswith("json"):
            inner = inner[4:]
        return inner.rsplit("```", 1)[0].strip()
    return text


def score_session(summary: Dict) -> Optional[Dict]:
    if not anthropic:
        return None
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None

    client = anthropic.Anthropic(api_key=api_key)
    safe_summary = _truncate_summary_for_prompt(summary)
    prompt = SCORE_PROMPT.format(
        session_json=json.dumps(safe_summary, indent=2),
        subagent=ACTIVE_SUBAGENT,
        version=AGENT_VERSION,
    )
    try:
        resp = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = _strip_markdown_fences(resp.content[0].text.strip())
        return json.loads(raw)
    except json.JSONDecodeError as e:
        log("ERROR", f"score_session JSON parse failed: {e} | raw={raw[:200]}")
        return None
    except Exception as e:
        log("ERROR", f"score_session failed: {e}")
        return None

# ── Queue management (atomic, locked) ────────────────────────────────────────
def load_queue() -> List[Dict]:
    try:
        if QUEUE_FILE.exists():
            return json.loads(QUEUE_FILE.read_text())
    except Exception:
        pass
    return []


def enqueue_session(session_id: str, transcript_path: Path,
                    scores: Dict, summary: Dict) -> None:
    """Add a low-scoring session to the improvement queue (lock-protected, atomic write)."""
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    lock_path = STATE_DIR / "improvement_queue.lock"

    with open(lock_path, "w") as lock_file:
        fcntl.flock(lock_file, fcntl.LOCK_EX)
        try:
            q = load_queue()
            if any(item["session_id"] == session_id for item in q):
                return
            q.append({
                "session_id":      session_id,
                "transcript_path": str(transcript_path),
                "scores":          scores,
                "summary":         summary,
                "subagent":        ACTIVE_SUBAGENT,
                "agent_version":   AGENT_VERSION,
                "product_feature": PRODUCT_FEATURE,
                "queued_at":       datetime.now(timezone.utc).isoformat(),
            })
            tmp = STATE_DIR / f"improvement_queue.{os.getpid()}.tmp"
            tmp.write_text(json.dumps(q, indent=2))
            tmp.replace(QUEUE_FILE)   # atomic rename on POSIX
        finally:
            fcntl.flock(lock_file, fcntl.LOCK_UN)

    dim_scores = [v["score"] for v in scores.values() if isinstance(v, dict) and "score" in v]
    low = min(dim_scores) if dim_scores else 0
    log("INFO", f"Queued session {session_id} for improvement (lowest score: {low:.2f})")

# ── Langfuse emit ─────────────────────────────────────────────────────────────
_MAX_TOOL_OBS_BYTES = 4_000   # Langfuse ingest API limit per event


def emit_to_langfuse(lf: Langfuse, session_id: str,
                     summary: Dict, scores: Optional[Dict],
                     transcript_path: Path) -> None:
    session_text = "\n\n".join(
        f"User: {t['user']}\nAssistant: {t['assistant']}"
        for t in summary["turns"]
    )

    with propagate_attributes(
        session_id=session_id,
        trace_name="Claude Code Session",
        tags=["claude-code", ACTIVE_SUBAGENT, AGENT_VERSION],
    ):
        with lf.start_as_current_observation(
            as_type="span",
            name="Session",
            input=summary["turns"][0]["user"] if summary["turns"] else "",
            metadata={
                "session_id":      session_id,
                "subagent":        ACTIVE_SUBAGENT,
                "agent_version":   AGENT_VERSION,
                "product_feature": PRODUCT_FEATURE,
                "turn_count":      summary["turn_count"],
                "tool_count":      len(summary["tool_calls"]),
                "transcript_path": str(transcript_path),
            },
        ) as span:
            # LLM generation observation
            with lf.start_as_current_observation(
                as_type="generation",
                name="LLM Response",
                model=summary["model"],
                input=session_text[:4000],
                output=summary["turns"][-1]["assistant"][:2000] if summary["turns"] else "",
            ):
                pass

            # Tool observations — cap input size to avoid 413s
            for tc in summary["tool_calls"]:
                inp = tc["input"]
                serialized = json.dumps(inp)
                if len(serialized) > _MAX_TOOL_OBS_BYTES:
                    inp = {"_truncated": serialized[:_MAX_TOOL_OBS_BYTES] + "…"}
                with lf.start_as_current_observation(
                    as_type="tool",
                    name=f"Tool: {tc['name']}",
                    input=inp,
                ):
                    pass

            span.update(
                output=summary["turns"][-1]["assistant"][:2000] if summary["turns"] else "",
                metadata={"scores": scores} if scores else {},
            )

            # Scores attached to the current trace (must be inside the span context)
            if scores:
                for dim, data in scores.items():
                    if isinstance(data, dict) and "score" in data:
                        lf.score_current_trace(
                            name=dim,
                            value=data["score"],
                            comment=data.get("reason", ""),
                            data_type="NUMERIC",
                        )

# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> int:
    if os.environ.get("TRACE_TO_LANGFUSE", "").lower() != "true":
        return 0

    public_key = os.environ.get("LANGFUSE_PUBLIC_KEY")
    secret_key = os.environ.get("LANGFUSE_SECRET_KEY")
    host       = os.environ.get("LANGFUSE_BASE_URL", "https://cloud.langfuse.com")

    if not public_key or not secret_key:
        return 0

    payload = read_payload()
    session_id, transcript_path = extract_session(payload)

    if not session_id or not transcript_path or not transcript_path.exists():
        return 0

    try:
        msgs    = load_transcript(transcript_path)
        summary = build_session_summary(msgs)

        if not summary["turns"]:
            return 0

        scores = score_session(summary)
        if DEBUG and scores:
            log("DEBUG", f"Scores: {json.dumps(scores)}")

        lf = Langfuse(public_key=public_key, secret_key=secret_key, host=host)
        emit_to_langfuse(lf, session_id, summary, scores, transcript_path)
        lf.flush()

        if scores:
            dim_scores = [v["score"] for v in scores.values()
                          if isinstance(v, dict) and "score" in v]
            if dim_scores and min(dim_scores) < SCORE_THRESHOLD:
                enqueue_session(session_id, transcript_path, scores, summary)

                if os.environ.get("CC_AUTO_IMPROVE", "").lower() == "true":
                    import subprocess
                    script = Path.home() / ".claude" / "hooks" / "improvement_agent.py"
                    if not script.exists():
                        log("WARN", f"improvement_agent.py not found at {script}")
                    else:
                        child_env = {k: v for k, v in os.environ.items()
                                     if k in _CHILD_ENV_KEYS}
                        try:
                            subprocess.Popen(
                                ["python3", str(script)],
                                env=child_env,
                                stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL,
                                close_fds=True,
                            )
                        except OSError as e:
                            log("ERROR", f"Failed to launch improvement_agent: {e}")

        log("INFO", f"Session {session_id} processed. "
                    f"Turns: {summary['turn_count']}, Tools: {len(summary['tool_calls'])}")
        return 0

    except Exception as e:
        log("ERROR", f"Unexpected: {e}")
        return 0


if __name__ == "__main__":
    sys.exit(main())
