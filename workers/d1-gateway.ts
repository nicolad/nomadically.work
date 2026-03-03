/**
 * D1 Gateway Worker
 *
 * Fast, purpose-built API for accessing D1 from Vercel.
 * Uses Workers binding API for lowest latency + highest throughput.
 *
 * DO NOT expose arbitrary SQL over HTTP.
 * Each endpoint is designed for a specific query pattern with proper indexing.
 *
 * @see https://developers.cloudflare.com/d1/tutorials/build-an-api-to-access-d1/
 */

export interface Env {
  DB: D1Database;
  API_KEY: string;
  ALLOWED_ORIGIN?: string;
}

const WORKER = "d1-gateway";

interface WorkerLog {
  worker: string;
  action: string;
  level: "info" | "warn" | "error";
  duration_ms?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

function log(entry: WorkerLog): void {
  const output = { ...entry, timestamp: new Date().toISOString() };
  if (entry.level === "error") {
    console.error(JSON.stringify(output));
  } else {
    console.log(JSON.stringify(output));
  }
}

function getBearer(req: Request): string | null {
  const h = req.headers.get("authorization");
  const m = h ? /^Bearer\s+(.+)$/i.exec(h) : null;
  return m?.[1] ?? null;
}

function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function errorResponse(message: string, status: number): Response {
  return json({ error: message }, { status });
}

function corsHeaders(env: Env): Record<string, string> {
  return {
    "access-control-allow-origin": env.ALLOWED_ORIGIN || "https://nomadically.work",
  };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const start = Date.now();
    const url = new URL(req.url);

    // CORS preflight — allow before auth check
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": env.ALLOWED_ORIGIN || "https://nomadically.work",
          "access-control-allow-methods": "GET, POST",
          "access-control-allow-headers": "authorization, content-type",
          "access-control-max-age": "86400",
        },
      });
    }

    // Auth check
    if (getBearer(req) !== env.API_KEY) {
      log({ worker: WORKER, action: "auth", level: "warn", metadata: { path: url.pathname } });
      return errorResponse("Unauthorized", 401);
    }

    try {
      // ========================================
      // Jobs endpoints
      // ========================================

      // GET /jobs - Cacheable job listings
      if (req.method === "GET" && url.pathname === "/jobs") {
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
        const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
        const status = url.searchParams.get("status") || "active";

        const rows = await env.DB
          .prepare(
            `SELECT id, external_id, company_key, title, location, url, posted_at, status
             FROM jobs
             WHERE status = ?
             ORDER BY posted_at DESC, created_at DESC
             LIMIT ? OFFSET ?`
          )
          .bind(status, limit, offset)
          .raw();

        log({
          worker: WORKER, action: "get-jobs", level: "info",
          duration_ms: Date.now() - start,
          metadata: { limit, offset, status, rowCount: rows.length },
        });

        return json(
          { rows },
          {
            headers: {
              "cache-control": "public, max-age=0, s-maxage=5, stale-while-revalidate=60",
              ...corsHeaders(env),
            },
          },
        );
      }

      // GET /jobs/:id - Single job detail
      if (req.method === "GET" && url.pathname.startsWith("/jobs/")) {
        const id = url.pathname.split("/")[2];

        // Use exact-match only — LIKE with user input risks wildcard expansion
        const row = await env.DB
          .prepare(
            `SELECT * FROM jobs WHERE id = ? OR external_id = ? LIMIT 1`
          )
          .bind(id, id)
          .first();

        if (!row) {
          log({
            worker: WORKER, action: "get-job", level: "info",
            duration_ms: Date.now() - start,
            metadata: { id, found: false },
          });
          return errorResponse("Job not found", 404);
        }

        log({
          worker: WORKER, action: "get-job", level: "info",
          duration_ms: Date.now() - start,
          metadata: { id, found: true },
        });

        return json(
          { job: row },
          {
            headers: {
              "cache-control": "public, max-age=0, s-maxage=10, stale-while-revalidate=120",
              ...corsHeaders(env),
            },
          },
        );
      }

      // POST /jobs/batch - Batched job queries (fast!)
      if (req.method === "POST" && url.pathname === "/jobs/batch") {
        const body = (await req.json().catch(() => null)) as {
          status?: string;
          company_key?: string;
          limit?: number;
        } | null;

        if (!body) {
          return errorResponse("Bad Request", 400);
        }

        const limit = Math.min(body.limit ?? 20, 100);
        const status = body.status || "active";

        const queries = [
          env.DB.prepare("SELECT COUNT(*) as total FROM jobs WHERE status = ?").bind(status),
          env.DB.prepare(
            `SELECT id, external_id, company_key, title, location, url, posted_at
             FROM jobs
             WHERE status = ?
             ORDER BY posted_at DESC
             LIMIT ?`
          ).bind(status, limit),
        ];

        if (body.company_key) {
          queries.push(
            env.DB.prepare(
              "SELECT COUNT(*) as company_total FROM jobs WHERE status = ? AND company_key = ?"
            ).bind(status, body.company_key)
          );
        }

        const results = await env.DB.batch(queries);

        log({
          worker: WORKER, action: "batch-jobs", level: "info",
          duration_ms: Date.now() - start,
          metadata: { status, limit, queries: queries.length },
        });

        return json({
          total: (results[0].results?.[0] as any)?.total ?? 0,
          jobs: results[1].results ?? [],
          company_total: body.company_key ? (results[2]?.results?.[0] as any)?.company_total : null,
        });
      }

      // ========================================
      // User Settings endpoints
      // ========================================

      // GET /user-settings/:userId
      if (req.method === "GET" && url.pathname.startsWith("/user-settings/")) {
        const userId = url.pathname.split("/")[2];

        const settings = await env.DB
          .prepare("SELECT * FROM user_settings WHERE user_id = ? LIMIT 1")
          .bind(userId)
          .first();

        log({
          worker: WORKER, action: "get-user-settings", level: "info",
          duration_ms: Date.now() - start,
          metadata: { found: !!settings },
        });

        return json(
          { settings },
          {
            headers: {
              "cache-control": "private, max-age=30",
              ...corsHeaders(env),
            },
          },
        );
      }

      // POST /user-settings - Update user settings
      if (req.method === "POST" && url.pathname === "/user-settings") {
        const body = (await req.json().catch(() => null)) as {
          user_id: string;
          email_notifications?: boolean;
          daily_digest?: boolean;
          excluded_companies?: string[];
          [key: string]: any;
        } | null;

        if (!body?.user_id) {
          return errorResponse("Missing user_id", 400);
        }

        const fields: string[] = [];
        const values: any[] = [];

        if (body.email_notifications !== undefined) {
          fields.push("email_notifications = ?");
          values.push(body.email_notifications ? 1 : 0);
        }
        if (body.daily_digest !== undefined) {
          fields.push("daily_digest = ?");
          values.push(body.daily_digest ? 1 : 0);
        }
        if (body.excluded_companies !== undefined) {
          fields.push("excluded_companies = ?");
          values.push(JSON.stringify(body.excluded_companies));
        }

        if (fields.length === 0) {
          return errorResponse("No fields to update", 400);
        }

        fields.push("updated_at = CURRENT_TIMESTAMP");
        values.push(body.user_id);

        await env.DB
          .prepare(
            `UPDATE user_settings SET ${fields.join(", ")} WHERE user_id = ?`
          )
          .bind(...values)
          .run();

        const updated = await env.DB
          .prepare("SELECT * FROM user_settings WHERE user_id = ? LIMIT 1")
          .bind(body.user_id)
          .first();

        log({
          worker: WORKER, action: "update-user-settings", level: "info",
          duration_ms: Date.now() - start,
          metadata: { fieldsUpdated: fields.length - 1 },
        });

        return json({ settings: updated });
      }

      // ========================================
      // Companies endpoints
      // ========================================

      // GET /companies
      if (req.method === "GET" && url.pathname === "/companies") {
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
        const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

        const rows = await env.DB
          .prepare(
            `SELECT id, key, name, logo_url, website, category, score
             FROM companies
             ORDER BY score DESC, name ASC
             LIMIT ? OFFSET ?`
          )
          .bind(limit, offset)
          .raw();

        log({
          worker: WORKER, action: "get-companies", level: "info",
          duration_ms: Date.now() - start,
          metadata: { limit, offset, rowCount: rows.length },
        });

        return json(
          { rows },
          {
            headers: {
              "cache-control": "public, max-age=0, s-maxage=30, stale-while-revalidate=300",
              ...corsHeaders(env),
            },
          },
        );
      }

      // Health check
      if (req.method === "GET" && url.pathname === "/health") {
        const result = await env.DB.prepare("SELECT 1 as ok").first();
        const healthy = result?.ok === 1;

        log({
          worker: WORKER, action: "health", level: healthy ? "info" : "error",
          duration_ms: Date.now() - start,
          metadata: { db: healthy },
        });

        return json({
          status: healthy ? "ok" : "degraded",
          db: healthy,
          timestamp: new Date().toISOString(),
        });
      }

      log({
        worker: WORKER, action: "not-found", level: "warn",
        metadata: { method: req.method, path: url.pathname },
      });

      return errorResponse("Not Found", 404);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log({
        worker: WORKER, action: url.pathname, level: "error",
        duration_ms: Date.now() - start,
        error: errorMsg,
        metadata: { method: req.method, path: url.pathname },
      });
      return errorResponse("Internal server error", 500);
    }
  },
};
