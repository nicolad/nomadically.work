"""db.py — D1 helpers, stores report_trace_id for Langfuse score updates."""

import json


async def get_job(db, job_id: int) -> dict | None:
    row = await db.prepare(
        "SELECT id,title,company_key AS company,location,url,status,"
        "description,report_trace_id,is_remote_eu,tags FROM jobs WHERE id=?"
    ).bind(job_id).first()
    if not row:
        return None
    result = {k: getattr(row, k, None)
              for k in ["id","title","company","location","url",
                        "status","description","report_trace_id","tags"]}
    result["remote"] = bool(getattr(row, "is_remote_eu", False))
    return result


async def get_trace_id(db, job_id: int) -> str | None:
    row = await db.prepare(
        "SELECT report_trace_id FROM jobs WHERE id=?"
    ).bind(job_id).first()
    return getattr(row, "report_trace_id", None) if row else None


async def save_analysis(db, job_id: int, analysis: dict) -> None:
    await db.prepare("""
        UPDATE jobs SET
          report_reason      = ?,
          report_confidence  = ?,
          report_reasoning   = ?,
          report_tags        = ?,
          report_action      = ?,
          report_trace_id    = ?,
          report_reviewed_at = datetime('now'),
          updated_at         = datetime('now')
        WHERE id = ?
    """).bind(
        analysis["reason"],
        analysis["confidence"],
        analysis["reasoning"],
        json.dumps(analysis["tags"]),
        analysis["action"],
        analysis.get("trace_id"),
        job_id,
    ).run()


async def restore_job(db, job_id: int) -> None:
    await db.prepare(
        "UPDATE jobs SET status='enhanced', report_action='auto_restored', "
        "updated_at=datetime('now') WHERE id=?"
    ).bind(job_id).run()


async def confirm_report(db, job_id: int) -> None:
    await db.prepare(
        "UPDATE jobs SET report_action='confirmed', updated_at=datetime('now') WHERE id=?"
    ).bind(job_id).run()


async def get_reported_jobs(db, limit: int = 50, offset: int = 0) -> list[dict]:
    result = await db.prepare(
        "SELECT * FROM v_reported_review_queue LIMIT ? OFFSET ?"
    ).bind(limit, offset).all()
    rows = result.results if hasattr(result, "results") else []
    return [_row(r) for r in rows]


async def get_stats(db) -> dict:
    row = await db.prepare("""
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN report_action='pending'       THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN report_action='escalated'     THEN 1 ELSE 0 END) AS escalated,
          SUM(CASE WHEN report_action='auto_restored' THEN 1 ELSE 0 END) AS auto_restored,
          SUM(CASE WHEN report_action='confirmed'     THEN 1 ELSE 0 END) AS confirmed,
          AVG(report_confidence) AS avg_confidence,
          SUM(CASE WHEN report_reason='spam'          THEN 1 ELSE 0 END) AS spam,
          SUM(CASE WHEN report_reason='irrelevant'    THEN 1 ELSE 0 END) AS irrelevant,
          SUM(CASE WHEN report_reason='misclassified' THEN 1 ELSE 0 END) AS misclassified,
          SUM(CASE WHEN report_reason='false_positive'THEN 1 ELSE 0 END) AS false_positive
        FROM jobs WHERE status='reported' OR report_action IS NOT NULL
    """).first()
    return _row(row)


async def log_event(db, job_id: int, event_type: str,
                    actor: str = "system", payload: dict | None = None) -> None:
    await db.prepare(
        "INSERT INTO job_report_events (job_id,event_type,actor,payload) VALUES (?,?,?,?)"
    ).bind(job_id, event_type, actor, json.dumps(payload or {})).run()


def _row(row) -> dict:
    if not row:
        return {}
    keys = [
        "id","title","company","location","url","status","description",
        "report_reason","report_confidence","report_reasoning","report_tags",
        "report_action","report_trace_id","report_reviewed_at","updated_at",
        "total","pending","escalated","auto_restored","confirmed","avg_confidence",
        "spam","irrelevant","misclassified","false_positive",
    ]
    return {k: v for k in keys if (v := getattr(row, k, None)) is not None}
