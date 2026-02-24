/**
 * Cloudflare Workers Janitor — ATS Pipeline Orchestrator
 *
 * Runs daily at midnight UTC. Three automatic phases:
 *   1. Sync   — pull new boards from greenhouse_boards / lever_boards / ashby_boards
 *               into the unified job_sources table (INSERT OR IGNORE).
 *   2. Cleanup — remove dead sources (consecutive_errors >= 5) and archive their jobs.
 *   3. Ingest  — trigger insert-jobs worker to fetch jobs from all stale sources.
 *
 * No manual intervention required. New boards flow in automatically as the
 * ashby-crawler and other discovery workers populate the per-ATS board tables.
 */

import { log, generateTraceId } from "./lib/logger";

const WORKER = "janitor";

interface Env {
  DB: D1Database;
  APP_URL: string;
  CRON_SECRET?: string;

  /** Queue binding to trigger insert-jobs ingestion after discovery */
  INGESTION_QUEUE?: Queue<{ action: "ingest"; maxSources: number }>;

  /** Direct URL of insert-jobs worker (fallback if queue binding unavailable) */
  INSERT_JOBS_URL?: string;
}

type Queue<T = unknown> = {
  send(message: T): Promise<void>;
};

type ScheduledEvent = {
  scheduledTime: number;
  cron: string;
};

type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
};

type JobSource = {
  kind: "greenhouse" | "lever" | "ashby" | "workable" | "onhires" | "unknown";
  company_key: string;
  canonical_url: string | null;
  first_seen_at: string;
  last_synced_at: string | null;
};

// ---------------------------------------------------------------------------
// Phase 1: Sync new boards into job_sources
// ---------------------------------------------------------------------------

/**
 * Copies newly discovered boards from the per-ATS discovery tables
 * (greenhouse_boards, lever_boards, ashby_boards) into the unified
 * job_sources table. INSERT OR IGNORE means existing rows are untouched.
 */
async function syncNewBoards(
  db: D1Database,
  traceId: string,
): Promise<{ added: number }> {
  const results = await db.batch([
    db.prepare(
      `INSERT OR IGNORE INTO job_sources (kind, company_key, canonical_url, first_seen_at)
       SELECT 'greenhouse', token, url, first_seen
       FROM greenhouse_boards
       WHERE is_active = 1`,
    ),
    db.prepare(
      `INSERT OR IGNORE INTO job_sources (kind, company_key, canonical_url, first_seen_at)
       SELECT 'lever', site, url, first_seen
       FROM lever_boards
       WHERE is_active = 1`,
    ),
    db.prepare(
      `INSERT OR IGNORE INTO job_sources (kind, company_key, canonical_url, first_seen_at)
       SELECT 'ashby', slug, url, first_seen
       FROM ashby_boards
       WHERE is_active = 1`,
    ),
  ]);

  const added = results.reduce((sum, r) => sum + (r.meta?.changes ?? 0), 0);

  if (added > 0) {
    log({
      worker: WORKER, action: "sync-boards", level: "info", traceId,
      metadata: { added },
    });
  }

  return { added };
}

// ---------------------------------------------------------------------------
// Phase 2: Dead board cleanup
// ---------------------------------------------------------------------------

/**
 * Finds sources with consecutive_errors >= threshold (set by insert-jobs when
 * the ATS API returns a 4xx), archives their jobs, and deletes the source row.
 */
async function cleanupDeadBoards(
  db: D1Database,
  traceId: string,
  threshold = 5,
): Promise<{ deactivated: number; jobsArchived: number }> {
  const dead = await db
    .prepare(
      `SELECT id, kind, company_key
       FROM job_sources
       WHERE consecutive_errors >= ?`,
    )
    .bind(threshold)
    .all<{ id: number; kind: string; company_key: string }>();

  const rows = dead.results ?? [];
  if (rows.length === 0) {
    return { deactivated: 0, jobsArchived: 0 };
  }

  let jobsArchived = 0;
  for (const source of rows) {
    log({
      worker: WORKER, action: "dead-board-found", level: "warn", traceId,
      metadata: { sourceId: source.id, kind: source.kind, companyKey: source.company_key },
    });

    // Archive all active jobs from this source
    const archiveResult = await db
      .prepare(
        `UPDATE jobs
         SET status = 'archived', updated_at = datetime('now')
         WHERE source_id = ? AND status NOT IN ('reported', 'archived')`,
      )
      .bind(source.id)
      .run();
    jobsArchived += archiveResult.meta?.changes ?? 0;

    // Remove the dead source
    await db.prepare(`DELETE FROM job_sources WHERE id = ?`).bind(source.id).run();
  }

  log({
    worker: WORKER, action: "dead-board-cleanup", level: "info", traceId,
    metadata: { deactivated: rows.length, jobsArchived },
  });

  return { deactivated: rows.length, jobsArchived };
}

// ---------------------------------------------------------------------------
// ATS source stats
// ---------------------------------------------------------------------------

async function getSourceStats(
  db: D1Database,
): Promise<{
  total: number;
  stale: number;
  byKind: Record<string, number>;
}> {
  const totalResult = await db
    .prepare("SELECT COUNT(*) as count FROM job_sources")
    .first<{ count: number }>();

  // Sources not synced in 24h
  const staleResult = await db
    .prepare(
      `SELECT COUNT(*) as count FROM job_sources
       WHERE last_synced_at IS NULL
          OR last_synced_at < datetime('now', '-24 hours')`,
    )
    .first<{ count: number }>();

  const kindResults = await db
    .prepare(
      "SELECT kind, COUNT(*) as count FROM job_sources GROUP BY kind",
    )
    .all<{ kind: string; count: number }>();

  const byKind: Record<string, number> = {};
  for (const row of kindResults.results ?? []) {
    byKind[row.kind] = row.count;
  }

  return {
    total: totalResult?.count ?? 0,
    stale: staleResult?.count ?? 0,
    byKind,
  };
}

// ---------------------------------------------------------------------------
// Phase 3: Trigger job ingestion
// ---------------------------------------------------------------------------

async function triggerIngestion(env: Env, sourceCount: number, traceId: string): Promise<void> {
  // Method 1: Via insert-jobs HTTP endpoint (direct)
  if (env.INSERT_JOBS_URL) {
    try {
      const url = `${env.INSERT_JOBS_URL}/ingest?limit=${sourceCount}`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Trace-Id": traceId,
        },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          stats?: { jobsInserted?: number };
        };
        log({
          worker: WORKER, action: "trigger-ingestion", level: "info", traceId,
          metadata: { method: "http", jobsInserted: data.stats?.jobsInserted ?? 0 },
        });
        return;
      }
      log({
        worker: WORKER, action: "trigger-ingestion", level: "error", traceId,
        error: `HTTP ${res.status}`, metadata: { method: "http" },
      });
    } catch (err) {
      log({
        worker: WORKER, action: "trigger-ingestion", level: "error", traceId,
        error: err instanceof Error ? err.message : String(err),
        metadata: { method: "http" },
      });
    }
  }

  // Method 2: The insert-jobs worker will pick up stale sources on its own cron
  log({
    worker: WORKER, action: "trigger-ingestion", level: "info", traceId,
    metadata: { method: "deferred", reason: "No INSERT_JOBS_URL configured" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // GET /health
    if (url.pathname === "/health") {
      try {
        const stats = await getSourceStats(env.DB);
        return new Response(
          JSON.stringify({ status: "healthy", ...stats }),
          { headers: { "Content-Type": "application/json" } },
        );
      } catch (err) {
        log({
          worker: WORKER, action: "health", level: "error",
          error: err instanceof Error ? err.message : String(err),
        });
        return new Response(
          JSON.stringify({ status: "unhealthy", error: String(err) }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    // GET /sources — list all known ATS sources
    if (url.pathname === "/sources") {
      const limit = Number(url.searchParams.get("limit") || "100");
      const kind = url.searchParams.get("kind");

      let query = "SELECT * FROM job_sources";
      const params: string[] = [];
      if (kind) {
        query += " WHERE kind = ?";
        params.push(kind);
      }
      query += " ORDER BY first_seen_at DESC LIMIT ?";
      params.push(String(limit));

      const result = await env.DB.prepare(query)
        .bind(...params)
        .all<JobSource>();

      return new Response(
        JSON.stringify({
          sources: result.results ?? [],
          count: result.results?.length ?? 0,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        message: "ATS pipeline orchestrator. Endpoints: /health, /sources",
        hint: "Cron runs daily at midnight UTC: (1) sync new boards, (2) clean dead boards, (3) trigger ingestion. All automatic.",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  },

  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const traceId = generateTraceId();
    const start = Date.now();

    log({ worker: WORKER, action: "scheduled-start", level: "info", traceId });

    try {
      // Phase 1: Sync new boards discovered by crawlers into job_sources
      const sync = await syncNewBoards(env.DB, traceId);

      // Phase 2: Remove dead boards (repeated 4xx) and archive their jobs
      const cleanup = await cleanupDeadBoards(env.DB, traceId);

      // Phase 3: Trigger ingestion of stale sources
      const stats = await getSourceStats(env.DB);

      log({
        worker: WORKER, action: "source-stats", level: "info", traceId,
        metadata: {
          total: stats.total,
          stale: stats.stale,
          byKind: stats.byKind,
          newBoardsSynced: sync.added,
          deadBoardsRemoved: cleanup.deactivated,
          jobsArchived: cleanup.jobsArchived,
        },
      });

      if (stats.stale > 0) {
        ctx.waitUntil(triggerIngestion(env, stats.stale, traceId));
      } else {
        log({ worker: WORKER, action: "no-stale-sources", level: "info", traceId });
      }

      // Mark sync timestamp on sources we're about to ingest
      await env.DB.prepare(
        `UPDATE job_sources
         SET last_synced_at = datetime('now')
         WHERE last_synced_at IS NULL
            OR last_synced_at < datetime('now', '-24 hours')`,
      ).run();

      log({
        worker: WORKER, action: "scheduled-complete", level: "info", traceId,
        duration_ms: Date.now() - start,
        metadata: {
          newBoardsSynced: sync.added,
          deadBoardsRemoved: cleanup.deactivated,
          jobsArchived: cleanup.jobsArchived,
        },
      });
    } catch (error) {
      log({
        worker: WORKER, action: "scheduled-failed", level: "error", traceId,
        error: error instanceof Error ? error.message : String(error),
        duration_ms: Date.now() - start,
      });
      throw error;
    }
  },
};
