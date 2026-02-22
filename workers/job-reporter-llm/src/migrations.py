"""
migrations.py — self-contained schema migration runner.

Maintains a _migrations table in D1. Safe to call on every worker
startup and from the daily cron — idempotent by design.

Each migration is a list of individual statements (D1 only accepts one
statement per prepare().run() call). ALTER TABLE ADD COLUMN and already-
existing objects are silently skipped so re-runs are safe.
"""

MIGRATIONS: list[dict] = [
    {
        "name": "0001_report_columns",
        "statements": [
            # Report columns on jobs
            "ALTER TABLE jobs ADD COLUMN report_reason      TEXT",
            "ALTER TABLE jobs ADD COLUMN report_confidence  REAL",
            "ALTER TABLE jobs ADD COLUMN report_reasoning   TEXT",
            "ALTER TABLE jobs ADD COLUMN report_tags        TEXT",
            "ALTER TABLE jobs ADD COLUMN report_action      TEXT",
            "ALTER TABLE jobs ADD COLUMN report_trace_id    TEXT",
            "ALTER TABLE jobs ADD COLUMN report_reviewed_at TEXT",
            # Audit event log
            """CREATE TABLE IF NOT EXISTS job_report_events (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id     INTEGER NOT NULL REFERENCES jobs(id),
                event_type TEXT    NOT NULL,
                actor      TEXT,
                payload    TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )""",
            "CREATE INDEX IF NOT EXISTS idx_report_events_job ON job_report_events(job_id)",
            "CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)",
            "CREATE INDEX IF NOT EXISTS idx_jobs_action ON jobs(report_action)",
            # Admin review queue view
            """CREATE VIEW IF NOT EXISTS v_reported_review_queue AS
            SELECT
              j.id, j.title, j.company_key AS company, j.url, j.status,
              j.report_reason, j.report_confidence, j.report_reasoning,
              j.report_tags, j.report_action, j.report_trace_id,
              j.report_reviewed_at, j.updated_at
            FROM jobs j
            WHERE j.status = 'reported'
              AND (j.report_action IN ('pending','escalated') OR j.report_action IS NULL)
            ORDER BY
              CASE j.report_action WHEN 'escalated' THEN 0 ELSE 1 END,
              j.updated_at DESC""",
        ],
    },
]


def _is_ignorable(err: Exception) -> bool:
    """True for errors that mean the object already exists (safe to skip)."""
    msg = str(err).lower()
    return any(phrase in msg for phrase in (
        "duplicate column",
        "already exists",
        "table already exists",
        "index already exists",
        "view already exists",
    ))


async def run(db) -> list[str]:
    """
    Apply all pending migrations in order.
    Returns the names of migrations applied in this call.
    """
    # Bootstrap: ensure the migrations-tracking table exists first
    await db.prepare(
        "CREATE TABLE IF NOT EXISTS _migrations "
        "(name TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))"
    ).run()

    applied: list[str] = []

    for migration in MIGRATIONS:
        name = migration["name"]

        row = await db.prepare(
            "SELECT name FROM _migrations WHERE name = ?"
        ).bind(name).first()

        if row:
            continue  # already applied

        for stmt in migration["statements"]:
            try:
                await db.prepare(stmt).run()
            except Exception as exc:
                if _is_ignorable(exc):
                    continue
                raise RuntimeError(
                    f"Migration {name!r} failed on statement: "
                    f"{stmt[:80]!r} — {exc}"
                ) from exc

        await db.prepare(
            "INSERT OR IGNORE INTO _migrations (name) VALUES (?)"
        ).bind(name).run()

        applied.append(name)

    return applied
