"""
langfuse_client.py
──────────────────
Pure fetch()-based Langfuse REST client for CF Python Workers.
No Node SDK, no OpenTelemetry, no filesystem.

Covers exactly what the reported-jobs pipeline needs:
  • create_trace()         — one per job report analysis
  • create_generation()    — one per DeepSeek call (pass 1 + pass 2)
  • post_score()           — label_accuracy + confidence after LLM
  • update_score()         — human_label after admin confirms/restores
  • create_dataset_item()  — every admin decision becomes ground truth
"""

import base64
import json
from datetime import datetime, timezone
from js import fetch, Headers


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class LangfuseClient:

    def __init__(self, env):
        self._host = getattr(env, "LANGFUSE_HOST", "https://cloud.langfuse.com")
        raw        = f"{env.LANGFUSE_PUBLIC_KEY}:{env.LANGFUSE_SECRET_KEY}"
        self._auth = base64.b64encode(raw.encode()).decode()

    def _url(self, path: str) -> str:
        return f"{self._host}{path}"

    async def _req(self, method: str, path: str, body: dict | None = None) -> dict:
        h = Headers.new()
        h.set("Content-Type", "application/json")
        h.set("Authorization", f"Basic {self._auth}")

        kw = {"method": method, "headers": h}
        if body is not None:
            kw["body"] = json.dumps(body)

        resp = await fetch(self._url(path), **kw)
        text = await resp.text()

        if not resp.ok:
            raise RuntimeError(f"Langfuse {method} {path} → {resp.status}: {text[:200]}")

        return json.loads(text) if text.strip() else {}

    # ── Tracing ────────────────────────────────────────────────────────────

    async def create_trace(self, *, id: str, name: str, input: dict,
                           metadata: dict | None = None,
                           tags: list | None = None) -> dict:
        return await self._req("POST", "/api/public/traces", {
            "id":       id,
            "name":     name,
            "input":    input,
            "metadata": metadata or {},
            "tags":     tags or ["job_reporter"],
        })

    async def create_generation(self, *, trace_id: str, id: str, name: str,
                                 model: str, input: list, output: dict,
                                 start_time: str, end_time: str) -> dict:
        return await self._req("POST", "/api/public/generations", {
            "traceId":   trace_id,
            "id":        id,
            "name":      name,
            "model":     model,
            "input":     input,
            "output":    output,
            "startTime": start_time,
            "endTime":   end_time,
        })

    async def post_score(self, *, trace_id: str, name: str,
                         value: float, comment: str = "") -> dict:
        return await self._req("POST", "/api/public/scores", {
            "traceId":  trace_id,
            "name":     name,
            "value":    value,
            "comment":  comment,
            "dataType": "NUMERIC",
        })

    # ── Datasets (ground truth from admin decisions) ───────────────────────

    async def ensure_dataset(self, name: str) -> dict:
        """Create dataset if missing — idempotent, safe to call every time."""
        return await self._req("POST", "/api/public/datasets", {
            "name":        name,
            "description": "Admin-confirmed job report ground truth",
        })

    async def create_dataset_item(self, *, dataset_name: str,
                                  input: dict, expected_output: dict,
                                  metadata: dict | None = None) -> dict:
        return await self._req("POST", "/api/public/dataset-items", {
            "datasetName":    dataset_name,
            "input":          input,
            "expectedOutput": expected_output,
            "metadata":       metadata or {},
        })
