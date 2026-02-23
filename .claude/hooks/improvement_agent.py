#!/usr/bin/env python3
"""
improvement_agent.py — Processes the improvement queue from stop_hook.py.
Reads low-scoring sessions, generates concrete improvement suggestions via
Claude Sonnet, and logs results to Langfuse.

Spawned as a subprocess by stop_hook.py when CC_AUTO_IMPROVE=true.
"""

import fcntl
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# ── Fail-open imports ─────────────────────────────────────────────────────────
try:
    import anthropic
except Exception:
    sys.exit(0)

try:
    from langfuse import Langfuse
except Exception:
    Langfuse = None  # type: ignore

# ── Config ────────────────────────────────────────────────────────────────────
STATE_DIR       = Path.home() / ".claude" / "state"
QUEUE_FILE      = STATE_DIR / "improvement_queue.json"
IMPROVEMENTS_DIR = STATE_DIR / "improvements"
LOG_FILE        = STATE_DIR / "improvement_agent.log"
DEBUG           = os.environ.get("CC_DEBUG", "").lower() == "true"


# ── Logging ───────────────────────────────────────────────────────────────────
def log(level: str, msg: str) -> None:
    try:
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(LOG_FILE, "a") as f:
            f.write(f"{ts} [{level}] {msg}\n")
    except Exception:
        pass


# ── Queue management ─────────────────────────────────────────────────────────
def load_queue() -> List[Dict]:
    try:
        if QUEUE_FILE.exists():
            return json.loads(QUEUE_FILE.read_text())
    except Exception:
        pass
    return []


def save_queue(q: List[Dict]) -> None:
    """Atomic write with lock."""
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    lock_path = STATE_DIR / "improvement_queue.lock"
    with open(lock_path, "w") as lock_file:
        fcntl.flock(lock_file, fcntl.LOCK_EX)
        try:
            tmp = STATE_DIR / f"improvement_queue.{os.getpid()}.tmp"
            tmp.write_text(json.dumps(q, indent=2))
            tmp.replace(QUEUE_FILE)
        finally:
            fcntl.flock(lock_file, fcntl.LOCK_UN)


# ── Transcript loading (duplicated from stop_hook for independence) ──────────
def load_transcript(path: Path) -> List[Dict]:
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


def build_summary_from_transcript(msgs: List[Dict]) -> str:
    """Build a condensed text summary from transcript messages."""
    parts = []
    for msg in msgs:
        role = get_role(msg)
        if role in ("user", "assistant"):
            text = extract_text(get_content(msg))
            if text:
                parts.append(f"{role.upper()}: {text[:500]}")
    return "\n\n".join(parts[-20:])  # Last 20 messages, truncated


# ── Improvement generation ───────────────────────────────────────────────────
IMPROVEMENT_PROMPT = """You are an AI system improvement analyst. A Claude Code session scored poorly. Analyze it and provide concrete, actionable improvement suggestions.

SESSION SUMMARY:
{summary}

SCORES:
{scores}

SUBAGENT: {subagent}
AGENT VERSION: {agent_version}

Provide your analysis as JSON with this structure:
{{
  "diagnosis": "What went wrong in 1-2 sentences",
  "root_causes": ["List of specific root causes"],
  "suggestions": [
    {{
      "target": "Which file/prompt/instruction to change",
      "change": "Exact change to make (not vague)",
      "rationale": "Why this fixes the root cause",
      "priority": "high|medium|low"
    }}
  ],
  "affected_dimensions": ["List of score dimensions that were lowest"]
}}

Return ONLY valid JSON, no prose."""


def _strip_markdown_fences(text: str) -> str:
    if text.startswith("```"):
        parts = text.split("```", 2)
        inner = parts[1] if len(parts) > 1 else text
        if inner.startswith("json"):
            inner = inner[4:]
        return inner.rsplit("```", 1)[0].strip()
    return text


def generate_improvement(session_entry: Dict, transcript_summary: str) -> Optional[Dict]:
    """Generate improvement suggestions for a low-scoring session."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None

    client = anthropic.Anthropic(api_key=api_key)
    scores_text = json.dumps(session_entry.get("scores", {}), indent=2)
    prompt = IMPROVEMENT_PROMPT.format(
        summary=transcript_summary[:3000],
        scores=scores_text,
        subagent=session_entry.get("subagent", "unknown"),
        agent_version=session_entry.get("agent_version", "unknown"),
    )

    try:
        resp = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = _strip_markdown_fences(resp.content[0].text.strip())
        return json.loads(raw)
    except json.JSONDecodeError as e:
        log("ERROR", f"Improvement JSON parse failed: {e}")
        return None
    except Exception as e:
        log("ERROR", f"Improvement generation failed: {e}")
        return None


# ── Langfuse logging ─────────────────────────────────────────────────────────
def log_to_langfuse(session_id: str, suggestions: Dict) -> None:
    if not Langfuse:
        return
    public_key = os.environ.get("LANGFUSE_PUBLIC_KEY")
    secret_key = os.environ.get("LANGFUSE_SECRET_KEY")
    host = os.environ.get("LANGFUSE_BASE_URL", "https://cloud.langfuse.com")
    if not public_key or not secret_key:
        return

    try:
        lf = Langfuse(public_key=public_key, secret_key=secret_key, host=host)
        trace = lf.trace(
            name="Improvement Agent",
            tags=["improvement-agent", "claude-code"],
            metadata={
                "source_session_id": session_id,
                "suggestion_count": len(suggestions.get("suggestions", [])),
            },
            input={"session_id": session_id},
            output=suggestions,
        )
        lf.flush()
    except Exception as e:
        log("ERROR", f"Langfuse logging failed: {e}")


# ── Main ──────────────────────────────────────────────────────────────────────
def main() -> int:
    q = load_queue()
    if not q:
        log("INFO", "Improvement queue empty, nothing to process")
        return 0

    IMPROVEMENTS_DIR.mkdir(parents=True, exist_ok=True)
    processed_ids = []

    for entry in q:
        session_id = entry.get("session_id", "unknown")
        transcript_path = entry.get("transcript_path")

        try:
            # Load and summarize transcript
            if transcript_path and Path(transcript_path).exists():
                msgs = load_transcript(Path(transcript_path))
                transcript_summary = build_summary_from_transcript(msgs)
            else:
                # Fall back to the stored summary
                summary = entry.get("summary", {})
                turns = summary.get("turns", [])
                transcript_summary = "\n\n".join(
                    f"USER: {t.get('user', '')[:500]}\nASSISTANT: {t.get('assistant', '')[:500]}"
                    for t in turns[-10:]
                )

            if not transcript_summary:
                log("WARN", f"No transcript data for session {session_id}, skipping")
                processed_ids.append(session_id)
                continue

            # Generate improvements
            suggestions = generate_improvement(entry, transcript_summary)
            if not suggestions:
                log("WARN", f"No suggestions generated for session {session_id}")
                processed_ids.append(session_id)
                continue

            # Write suggestions file
            output_path = IMPROVEMENTS_DIR / f"{session_id}.json"
            output_data = {
                "session_id": session_id,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "scores": entry.get("scores", {}),
                "suggestions": suggestions,
            }
            tmp = IMPROVEMENTS_DIR / f"{session_id}.{os.getpid()}.tmp"
            tmp.write_text(json.dumps(output_data, indent=2))
            tmp.replace(output_path)

            # Log to Langfuse
            log_to_langfuse(session_id, suggestions)

            log("INFO", f"Generated improvements for session {session_id}")
            processed_ids.append(session_id)

        except Exception as e:
            log("ERROR", f"Failed to process session {session_id}: {e}")
            processed_ids.append(session_id)  # Remove from queue to avoid infinite retry

    # Remove processed sessions from queue (atomic)
    remaining = [e for e in q if e.get("session_id") not in processed_ids]
    save_queue(remaining)
    log("INFO", f"Processed {len(processed_ids)} sessions, {len(remaining)} remaining")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        try:
            log("ERROR", f"Unexpected: {e}")
        except Exception:
            pass
        sys.exit(0)  # fail-open
