/**
 * Cloudflare Workers Janitor — ATS Job Ingestion Trigger
 *
 * Runs daily at midnight UTC to trigger ingestion from known ATS sources
 * (Greenhouse, Lever, Ashby, Workable) stored in the job_sources D1 table.
 *
 * Discovery of new sources is handled separately via:
 * - ashby-crawler (Rust/WASM worker for Common Crawl)
 * - Manual addition via admin UI or scripts
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
// Trigger job ingestion
// ---------------------------------------------------------------------------

async function triggerIngestion(env: Env, sourceCount: number, traceId: string): Promise<void> {
  // Method 1: Via insert-jobs HTTP endpoint (direct)
  if (env.INSERT_JOBS_URL) {
    try {
      const url = `${env.INSERT_JOBS_URL}/ingest?limit=${Math.min(sourceCount, 20)}`;
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

    // GET /trigger-ingest — manually trigger ingestion of stale sources
    if (url.pathname === "/trigger-ingest") {
      const traceId = generateTraceId();
      const stats = await getSourceStats(env.DB);
      await triggerIngestion(env, stats.stale, traceId);

      return new Response(
        JSON.stringify({
          message: `Triggered ingestion for ${stats.stale} stale sources`,
          traceId,
          stats,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        message:
          "ATS job ingestion cron worker. Endpoints: /health, /sources, /trigger-ingest",
        hint: "Cron runs daily at midnight UTC to trigger ingestion from known ATS sources.",
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
      const stats = await getSourceStats(env.DB);

      log({
        worker: WORKER, action: "source-stats", level: "info", traceId,
        metadata: { total: stats.total, stale: stats.stale, byKind: stats.byKind },
      });

      if (stats.stale > 0) {
        log({
          worker: WORKER, action: "trigger-ingestion", level: "info", traceId,
          metadata: { staleSources: stats.stale },
        });
        ctx.waitUntil(triggerIngestion(env, stats.stale, traceId));
      } else {
        log({
          worker: WORKER, action: "no-stale-sources", level: "info", traceId,
        });
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
