"""
worker.py — HTTP producer + CF Queue consumer.

HTTP endpoints (all require X-Worker-Secret header):
  POST /api/report-job      → validates job, writes audit event, enqueues
  POST /api/confirm-report  → admin confirms; posts human_label=1.0 to Langfuse + dataset item
  POST /api/restore-job     → admin restores; posts human_label=0.0 to Langfuse + dataset item
  GET  /api/reported-jobs   → paginated admin review queue
  GET  /api/report-stats    → aggregate counts
  GET  /health

Queue consumer (on_queue):
  For each message → DeepSeek two-pass analysis → save to D1 → Langfuse trace

Migrations:
  Applied automatically on first HTTP request per worker instance AND via
  the daily cron trigger (on_scheduled). The migration runner is idempotent —
  safe to call on every startup. No manual pnpm/wrangler command needed.
"""

import json
from datetime import datetime, timezone
from js import Response, Headers

import db
import llm
import migrations
from langfuse_client import LangfuseClient

# Prevents re-running migrations in the same worker instance lifetime.
_migrations_done = False

DATASET_NAME = "job-report-confirmed-cases"


# ── Helpers ────────────────────────────────────────────────────────────────

def _auth(request, env) -> bool:
    return (request.headers.get("X-Worker-Secret") or "") == env.WORKER_SECRET


def _json(data: dict, status: int = 200) -> Response:
    h = Headers.new()
    h.set("Content-Type", "application/json")
    return Response.new(json.dumps(data), status=status, headers=h)


def _err(msg: str, status: int = 400) -> Response:
    return _json({"error": msg}, status)


def _qs(url: str) -> dict:
    return ({k: v for p in url.split("?", 1)[1].split("&")
             for k, v in [p.split("=", 1)]} if "?" in url else {})


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Admin decision handler (shared by confirm + restore) ──────────────────

async def _handle_admin_decision(
    request, env, *, action: str
) -> Response:
    """
    Shared logic for confirm-report and restore-job.

    Both actions:
      1. Update D1 (report_action column)
      2. Post human_label score to Langfuse trace
      3. Add Langfuse dataset item (ground truth)
      4. Log audit event
    """
    try:
        body = json.loads(await request.text())
    except Exception:
        return _err("Invalid JSON")

    job_id = body.get("jobId")
    actor  = str(body.get("actor", "admin"))
    if not isinstance(job_id, int):
        return _err("jobId must be int")

    job = await db.get_job(env.DB, job_id)
    if not job:
        return _err(f"Job {job_id} not found", 404)

    lf       = LangfuseClient(env)
    trace_id = await db.get_trace_id(env.DB, job_id)

    if action == "confirm":
        await db.confirm_report(env.DB, job_id)
        human_label     = 1.0
        expected_reason = body.get("confirmedReason")
        event_type      = "confirmed"
    else:  # restore
        await db.restore_job(env.DB, job_id)
        human_label     = 0.0
        expected_reason = "false_positive"
        event_type      = "restored"

    # ── Post human_label score to the existing Langfuse trace ─────────────
    if trace_id:
        try:
            await lf.post_score(
                trace_id=trace_id,
                name="human_label",
                value=human_label,
                comment=f"{actor} {event_type} job_id={job_id}",
            )
            await lf.post_score(
                trace_id=trace_id,
                name="label_accuracy",
                value=human_label,
                comment=f"final after admin {event_type}",
            )
        except Exception:
            pass  # don't fail the HTTP response if Langfuse is down

    # ── Add to Langfuse dataset (ground truth for future evals) ───────────
    if expected_reason:
        try:
            await lf.ensure_dataset(DATASET_NAME)
            await lf.create_dataset_item(
                dataset_name=DATASET_NAME,
                input={
                    "title":       job.get("title"),
                    "company":     job.get("company"),
                    "location":    job.get("location"),
                    "url":         job.get("url"),
                    "description": (job.get("description") or "")[:1500],
                    "prev_status": "enhanced",
                },
                expected_output={"reason": expected_reason},
                metadata={
                    "job_id":     job_id,
                    "actor":      actor,
                    "action":     event_type,
                    "trace_id":   trace_id,
                    "decided_at": _now(),
                },
            )
        except Exception:
            pass  # dataset write failure is non-fatal

    await db.log_event(env.DB, job_id, event_type, actor=actor)
    return _json({"ok": True, "jobId": job_id, "action": event_type})


# ── HTTP handlers ──────────────────────────────────────────────────────────

async def handle_report_job(request, env) -> Response:
    try:
        body = json.loads(await request.text())
    except Exception:
        return _err("Invalid JSON")

    job_id      = body.get("jobId")
    reported_by = str(body.get("reportedBy", "unknown"))
    prev_status = str(body.get("prevStatus", "enhanced"))

    if not isinstance(job_id, int):
        return _err("jobId must be int")

    job = await db.get_job(env.DB, job_id)
    if not job:
        return _err(f"Job {job_id} not found", 404)

    await db.log_event(env.DB, job_id, "reported", actor=reported_by,
                       payload={"prev_status": prev_status, "reported_at": _now()})

    await env.JOB_REPORT_QUEUE.send({
        "jobId":       job_id,
        "reportedBy":  reported_by,
        "jobSnapshot": {**job, "prev_status": prev_status},
        "enqueuedAt":  _now(),
    })

    return _json({"ok": True, "jobId": job_id, "status": "queued"}, 202)


async def handle_reported_jobs(request, env) -> Response:
    qs     = _qs(request.url)
    limit  = min(int(qs.get("limit", "50")), 200)
    offset = int(qs.get("offset", "0"))
    jobs   = await db.get_reported_jobs(env.DB, limit, offset)
    return _json({"jobs": jobs, "limit": limit, "offset": offset})


async def handle_stats(env) -> Response:
    return _json({"stats": await db.get_stats(env.DB)})


# ── Router ─────────────────────────────────────────────────────────────────

async def on_fetch(request, env):
    global _migrations_done
    if not _migrations_done:
        try:
            applied = await migrations.run(env.DB)
            if applied:
                print(f"[migrations] applied: {applied}")
        except Exception as exc:
            # Log but don't block traffic — migrations may already be applied
            print(f"[migrations] startup check failed: {exc}")
        _migrations_done = True

    if not _auth(request, env):
        return _err("Unauthorized", 401)

    method = request.method.upper()
    path   = request.url.split("?")[0]

    if path.endswith("/health"):
        return _json({"ok": True, "ts": _now()})
    if path.endswith("/api/report-job")     and method == "POST":
        return await handle_report_job(request, env)
    if path.endswith("/api/confirm-report") and method == "POST":
        return await _handle_admin_decision(request, env, action="confirm")
    if path.endswith("/api/restore-job")    and method == "POST":
        return await _handle_admin_decision(request, env, action="restore")
    if path.endswith("/api/reported-jobs")  and method == "GET":
        return await handle_reported_jobs(request, env)
    if path.endswith("/api/report-stats")   and method == "GET":
        return await handle_stats(env)

    return _err("Not found", 404)


# ── Queue consumer ─────────────────────────────────────────────────────────

async def on_queue(batch, env):
    """
    Processes each reported job:
      1. Run DeepSeek two-pass analysis (traced to Langfuse)
      2. Save results to D1 (includes trace_id for later score updates)
      3. Auto-restore false positives / mark escalated
      4. Log audit event
    """
    lf = LangfuseClient(env)

    for message in batch.messages:
        body     = message.body
        job_id   = body.get("jobId")
        snapshot = body.get("jobSnapshot", {})

        try:
            analysis = await llm.analyze_reported_job(env, snapshot, lf)
            await db.save_analysis(env.DB, job_id, analysis)

            if analysis["action"] == "auto_restored":
                await db.restore_job(env.DB, job_id)
                # Auto-restore = LLM confident it's a false positive
                # Update label_accuracy to 1.0 (we trust above AUTO_RESTORE_THRESHOLD)
                await lf.post_score(
                    trace_id=analysis["trace_id"],
                    name="label_accuracy",
                    value=1.0,
                    comment="auto_restored: confidence above threshold",
                )
                event = "auto_restored"
            else:
                event = "llm_analyzed"

            await db.log_event(env.DB, job_id, event,
                               actor=f"system:llm:{analysis['model_used']}",
                               payload={
                                   "reason":     analysis["reason"],
                                   "confidence": analysis["confidence"],
                                   "action":     analysis["action"],
                                   "trace_id":   analysis["trace_id"],
                               })
            message.ack()

        except Exception as exc:
            try:
                await db.log_event(env.DB, job_id, "llm_error",
                                   payload={"error": str(exc)[:400]})
            except Exception:
                pass
            message.retry()


# ── Cron handler ───────────────────────────────────────────────────────────

async def on_scheduled(controller, env):
    """
    Runs on the daily cron trigger (see wrangler.toml [triggers]).
    Applies any pending migrations and logs the result.
    This guarantees schema is up to date even if the first-fetch path
    was never hit (e.g. idle worker after a fresh deploy).
    """
    try:
        applied = await migrations.run(env.DB)
        if applied:
            print(f"[cron:migrations] applied: {applied}")
        else:
            print("[cron:migrations] all up to date")
    except Exception as exc:
        print(f"[cron:migrations] error: {exc}")
        raise
