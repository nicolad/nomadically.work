/**
 * Cloudflare Workers Cron — ATS Job Ingestion Trigger
 *
 * Runs daily at midnight UTC to trigger ingestion from known ATS sources
 * (Greenhouse, Lever, Ashby, Workable) stored in the job_sources D1 table.
 *
 * Discovery of new sources is handled separately via:
 * - ashby-crawler (Rust/WASM worker for Common Crawl)
 * - Manual addition via admin UI or scripts
 */

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

async function triggerIngestion(env: Env, sourceCount: number): Promise<void> {
  // Method 1: Via insert-jobs HTTP endpoint (direct)
  if (env.INSERT_JOBS_URL) {
    try {
      const url = `${env.INSERT_JOBS_URL}/ingest?limit=${Math.min(sourceCount, 20)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          stats?: { jobsInserted?: number };
        };
        console.log(
          `Triggered ingestion via HTTP: ${data.stats?.jobsInserted ?? 0} jobs inserted`,
        );
        return;
      }
      console.error(`Ingestion HTTP trigger failed: ${res.status}`);
    } catch (err) {
      console.error("Ingestion HTTP trigger error:", err);
    }
  }

  // Method 2: The insert-jobs worker will pick up stale sources on its own cron
  console.log(
    "No INSERT_JOBS_URL configured — insert-jobs worker cron will pick up new sources automatically",
  );
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
      const stats = await getSourceStats(env.DB);
      await triggerIngestion(env, stats.stale);

      return new Response(
        JSON.stringify({
          message: `Triggered ingestion for ${stats.stale} stale sources`,
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
    console.log("Cron: Starting ATS job ingestion cycle...");

    try {
      const stats = await getSourceStats(env.DB);

      console.log(
        `ATS sources: ${stats.total} total, ${stats.stale} stale. By kind:`,
        stats.byKind,
      );

      if (stats.stale > 0) {
        console.log(`Triggering ingestion for ${stats.stale} stale sources...`);
        ctx.waitUntil(triggerIngestion(env, stats.stale));
      } else {
        console.log("All sources recently synced — nothing to do.");
      }

      // Mark sync timestamp on sources we're about to ingest
      await env.DB.prepare(
        `UPDATE job_sources
         SET last_synced_at = datetime('now')
         WHERE last_synced_at IS NULL
            OR last_synced_at < datetime('now', '-24 hours')`,
      ).run();

      console.log("Cron job completed");
    } catch (error) {
      console.error("Cron job failed:", error);
      throw error;
    }
  },
};
