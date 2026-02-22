"""Cleanup Jobs — Cloudflare Python Worker.

Marks jobs older than 30 days (by posted_at) as stale by emptying their
data columns while preserving identity columns (id, external_id,
source_kind, source_id, company_key). This prevents re-ingestion — the
ON CONFLICT(external_id) upsert will see the row still exists and skip it.

Associated job_skill_tags are explicitly deleted since the row isn't removed
(FK ON DELETE CASCADE only fires on DELETE).

Runs daily at 02:00 UTC via cron trigger.
"""

import json
from datetime import datetime, timedelta, timezone

from js import JSON
from workers import Response, WorkerEntrypoint


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def to_py(js_val):
    """Convert a JS proxy value to a Python dict/list via JSON round-trip."""
    return json.loads(JSON.stringify(js_val))


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
# Core cleanup logic
# ---------------------------------------------------------------------------

BATCH_SIZE = 500
CUTOFF_DAYS = 30

# Columns NULLed on stale — everything except identity/conflict keys.
# NOT NULL columns (title, url, posted_at) get sentinel values.
STALE_UPDATE_SQL = """
    UPDATE jobs SET
        status            = 'stale',
        title             = '[stale]',
        url               = '',
        posted_at         = '1970-01-01T00:00:00Z',
        location          = NULL,
        description       = NULL,
        score             = NULL,
        score_reason      = NULL,
        is_remote_eu      = NULL,
        remote_eu_confidence = NULL,
        remote_eu_reason  = NULL,
        company_id        = NULL,
        ats_data          = NULL,
        absolute_url      = NULL,
        internal_job_id   = NULL,
        requisition_id    = NULL,
        company_name      = NULL,
        first_published   = NULL,
        language          = NULL,
        metadata          = NULL,
        departments       = NULL,
        offices           = NULL,
        questions         = NULL,
        location_questions = NULL,
        compliance        = NULL,
        demographic_questions = NULL,
        data_compliance   = NULL,
        categories        = NULL,
        workplace_type    = NULL,
        country           = NULL,
        opening           = NULL,
        opening_plain     = NULL,
        description_body  = NULL,
        description_body_plain = NULL,
        additional        = NULL,
        additional_plain  = NULL,
        lists             = NULL,
        ats_created_at    = NULL,
        ashby_department  = NULL,
        ashby_team        = NULL,
        ashby_employment_type = NULL,
        ashby_is_remote   = NULL,
        ashby_is_listed   = NULL,
        ashby_published_at = NULL,
        ashby_job_url     = NULL,
        ashby_apply_url   = NULL,
        ashby_secondary_locations = NULL,
        ashby_compensation = NULL,
        ashby_address     = NULL,
        updated_at        = ?
    WHERE id IN ({placeholders})
"""


async def cleanup_old_jobs(db, dry_run: bool = False) -> dict:
    """Mark jobs older than CUTOFF_DAYS as stale.

    Empties data columns, keeps identity columns (id, external_id,
    source_kind, source_id, company_key) so ingestion upserts won't
    re-create the row. Deletes associated skill tags.

    Processes in batches of BATCH_SIZE to stay within D1 limits.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=CUTOFF_DAYS)).isoformat()
    now = datetime.now(timezone.utc).isoformat()

    # Count eligible jobs (not already stale)
    rows = await d1_all(
        db,
        "SELECT count(*) as cnt FROM jobs WHERE posted_at < ? AND (status IS NULL OR status != 'stale')",
        [cutoff],
    )
    stale_count = rows[0]["cnt"] if rows else 0

    if dry_run:
        return {"would_mark_stale": stale_count, "cutoff": cutoff}

    if stale_count == 0:
        print(f"No active jobs older than {CUTOFF_DAYS} days found.")
        return {"marked_stale": 0, "cutoff": cutoff}

    print(f"Found {stale_count} jobs older than {CUTOFF_DAYS} days (cutoff: {cutoff}). Marking stale...")

    total_marked = 0
    while True:
        batch = await d1_all(
            db,
            "SELECT id FROM jobs WHERE posted_at < ? AND (status IS NULL OR status != 'stale') LIMIT ?",
            [cutoff, BATCH_SIZE],
        )
        if not batch:
            break

        ids = [r["id"] for r in batch]
        placeholders = ",".join("?" * len(ids))

        # Delete skill tags for these jobs
        await d1_run(
            db,
            f"DELETE FROM job_skill_tags WHERE job_id IN ({placeholders})",
            ids,
        )

        # Null out data columns, set status = 'stale'
        update_sql = STALE_UPDATE_SQL.format(placeholders=placeholders)
        await d1_run(db, update_sql, [now] + ids)

        total_marked += len(ids)
        print(f"  Marked batch of {len(ids)} stale (total: {total_marked})")

    print(f"Cleanup complete: {total_marked} jobs marked stale.")
    return {"marked_stale": total_marked, "cutoff": cutoff}


async def get_stale_stats(db) -> dict:
    """Return counts of stale-eligible and already-stale jobs."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=CUTOFF_DAYS)).isoformat()
    eligible = await d1_all(
        db,
        "SELECT count(*) as cnt FROM jobs WHERE posted_at < ? AND (status IS NULL OR status != 'stale')",
        [cutoff],
    )
    already_stale = await d1_all(
        db,
        "SELECT count(*) as cnt FROM jobs WHERE status = 'stale'",
    )
    total = await d1_all(db, "SELECT count(*) as cnt FROM jobs")
    return {
        "eligible_for_cleanup": eligible[0]["cnt"] if eligible else 0,
        "already_stale": already_stale[0]["cnt"] if already_stale else 0,
        "total_jobs": total[0]["cnt"] if total else 0,
        "cutoff": cutoff,
        "cutoff_days": CUTOFF_DAYS,
    }


# ---------------------------------------------------------------------------
# Worker entrypoint
# ---------------------------------------------------------------------------

class Default(WorkerEntrypoint):
    """Cleanup worker with cron, queue, and HTTP triggers."""

    async def fetch(self, request, env):
        """Handle incoming HTTP requests.

        GET  /health       — health check
        GET  /stats        — count of stale / eligible jobs
        POST /cleanup      — enqueue a cleanup job
        POST /cleanup/run  — run cleanup immediately
        """
        cors_headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }

        try:
            if request.method == "OPTIONS":
                return Response.json({}, status=200, headers=cors_headers)

            url = request.url
            path = url.split("/")[-1].split("?")[0] if "/" in url else ""

            if path == "health":
                return Response.json(
                    {"status": "ok", "worker": "cleanup-jobs"},
                    headers=cors_headers,
                )

            if path == "stats":
                stats = await get_stale_stats(self.env.DB)
                return Response.json(stats, headers=cors_headers)

            if path == "cleanup" and request.method == "POST":
                await self.env.CLEANUP_JOBS_QUEUE.send({"action": "cleanup"})
                return Response.json(
                    {"status": "queued", "message": "Cleanup job enqueued"},
                    headers=cors_headers,
                )

            if path == "run" and request.method == "POST":
                result = await cleanup_old_jobs(self.env.DB)
                return Response.json(result, headers=cors_headers)

            return Response.json(
                {"error": "Not found", "endpoints": ["/health", "/stats", "/cleanup", "/cleanup/run"]},
                status=404,
                headers=cors_headers,
            )

        except Exception as e:
            print(f"Error: {e}")
            return Response.json(
                {"error": str(e)},
                status=500,
                headers=cors_headers,
            )

    async def scheduled(self, event, env, ctx):
        """Cron trigger — runs daily at 02:00 UTC."""
        print("Cron: Starting job cleanup...")
        try:
            result = await cleanup_old_jobs(self.env.DB)
            print(f"Cron: Cleanup finished — {json.dumps(result)}")
        except Exception as e:
            print(f"Cron: Cleanup failed — {e}")
            raise

    async def queue(self, batch, env, ctx):
        """Consume messages from the cleanup-jobs queue."""
        for message in batch.messages:
            try:
                body = to_py(message.body)
                dry_run = body.get("dry_run", False)
                print(f"Queue: Processing cleanup (dry_run={dry_run})")
                result = await cleanup_old_jobs(self.env.DB, dry_run=dry_run)
                print(f"Queue: Done — {json.dumps(result)}")
                message.ack()
            except Exception as e:
                print(f"Queue: Failed — {e}")
                message.retry()
