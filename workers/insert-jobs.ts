/**
 * Cloudflare Worker for Inserting Jobs into Turso + Enqueueing for Processing
 * - Accepts POST requests with job data and inserts/upserts into Turso
 * - Enqueues inserted job IDs into Cloudflare Queue
 * - Queue consumer forwards messages one-by-one to the Next.js webhook
 */

import { createClient, type Client } from "@libsql/client";

// Cloudflare Workers types
type Queue<T = unknown> = {
  send(message: T): Promise<void>;
};

type Message<T = unknown> = {
  body: T;
  ack(): void;
  retry(): void;
};

type MessageBatch<T = unknown> = {
  messages: Message<T>[];
};

type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
};

interface Env {
  TURSO_DB_URL: string;
  TURSO_DB_AUTH_TOKEN: string;

  // Auth for the ingest endpoint (optional)
  API_SECRET?: string;

  // Cloudflare Queue binding
  JOBS_QUEUE: Queue;

  // Next step webhook (e.g. Next.js route handler that runs Mastra)
  NEXT_WEBHOOK_URL: string;

  // Shared secret to authenticate Worker -> Next webhook
  WEBHOOK_SECRET: string;
}

interface JobInput {
  externalId?: string; // Maps to external_id
  sourceId?: number; // Maps to source_id
  sourceKind?: string; // Maps to source_kind (e.g., 'rss', 'api', 'scrape')
  companyKey?: string; // Maps to company_key (normalized company identifier)
  title?: string;
  location?: string;
  url?: string;
  description?: string;
  postedAt?: string; // Maps to posted_at
  score?: number;
  scoreReason?: string; // Maps to score_reason
  status?: string; // Default: 'new'
}

interface InsertJobsRequest {
  jobs: JobInput[];
}

type QueueMessage = {
  jobId: number;
};

function validateJob(job: JobInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!job.title?.trim()) errors.push("title is required");
  if (!job.companyKey?.trim()) errors.push("companyKey is required");
  if (!job.url?.trim()) errors.push("url is required");
  if (!job.externalId?.trim()) errors.push("externalId is required");
  if (!job.sourceKind?.trim()) errors.push("sourceKind is required");

  return { valid: errors.length === 0, errors };
}

function jsonResponse(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

async function insertJob(
  turso: Client,
  job: JobInput,
): Promise<{ success: boolean; jobId?: number; error?: string }> {
  try {
    const now = new Date().toISOString();

    // First, ensure the company exists
    let companyId: number;
    const companyLookup = await turso.execute({
      sql: `SELECT id FROM companies WHERE key = ? LIMIT 1`,
      args: [job.companyKey!],
    });

    if (companyLookup.rows.length > 0) {
      companyId = Number(companyLookup.rows[0].id);
    } else {
      // Create new company
      const companyResult = await turso.execute({
        sql: `
          INSERT INTO companies (key, name, created_at, updated_at)
          VALUES (?, ?, ?, ?)
          RETURNING id
        `,
        args: [job.companyKey!, job.companyKey!, now, now],
      });
      companyId = Number(companyResult.rows[0]?.id ?? companyResult.lastInsertRowid);
    }

    // Default status is "new" (but see conflict behavior below to avoid resetting processed jobs)
    const incomingStatus = (job.status ?? "new").trim();

    const args: (string | number | null)[] = [
      job.externalId!, // 1
      job.sourceId ?? null, // 2
      job.sourceKind!, // 3
      companyId, // 4 - company_id
      job.companyKey!, // 5 - company_key (kept for backward compatibility)
      job.title!, // 6
      job.location ?? null, // 7
      job.url!, // 8
      job.description ?? null, // 9
      job.postedAt ?? now, // 10
      job.score ?? null, // 11
      job.scoreReason ?? null, // 12
      incomingStatus, // 13
      now, // 14 created_at
      now, // 15 updated_at
    ];

    /**
     * Important: ON CONFLICT update tries to avoid clobbering downstream processing.
     * - If a job is already processed (status != 'new'), and we re-ingest it with status 'new',
     *   we keep the existing status (do not reset).
     * - If incoming score/score_reason are null, keep existing values.
     *
     * This prevents re-ingestion from undoing classification/scoring.
     */
    const result = await turso.execute({
      sql: `
        INSERT INTO jobs (
          external_id,
          source_id,
          source_kind,
          company_id,
          company_key,
          title,
          location,
          url,
          description,
          posted_at,
          score,
          score_reason,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_kind, company_key, external_id) DO UPDATE SET
          source_id    = COALESCE(excluded.source_id, jobs.source_id),
          company_id   = excluded.company_id,
          title        = excluded.title,
          location     = COALESCE(excluded.location, jobs.location),
          url          = excluded.url,
          description  = COALESCE(excluded.description, jobs.description),
          posted_at    = excluded.posted_at,
          score        = COALESCE(excluded.score, jobs.score),
          score_reason = COALESCE(excluded.score_reason, jobs.score_reason),
          status = CASE
            WHEN jobs.status IS NOT NULL AND jobs.status != 'new' AND excluded.status = 'new'
              THEN jobs.status
            ELSE excluded.status
          END,
          updated_at   = excluded.updated_at
        RETURNING id;
      `,
      args,
    });

    const row = result.rows?.[0] as { id?: unknown } | undefined;
    const id =
      row?.id != null ? Number(row.id) : Number(result.lastInsertRowid);

    if (!Number.isFinite(id)) {
      // Fallback: if RETURNING isn't available for some reason
      // Try to look up by unique key (source_kind, company_key, external_id)
      const lookup = await turso.execute({
        sql: `SELECT id FROM jobs WHERE source_kind = ? AND company_key = ? AND external_id = ? LIMIT 1`,
        args: [job.sourceKind!, job.companyKey!, job.externalId!],
      });
      const found = lookup.rows?.[0] as { id?: unknown } | undefined;
      const fallbackId = found?.id != null ? Number(found.id) : NaN;
      if (!Number.isFinite(fallbackId)) {
        throw new Error("Inserted/upserted but could not determine job id");
      }
      return { success: true, jobId: fallbackId };
    }

    return { success: true, jobId: id };
  } catch (error) {
    console.error("Failed to insert job:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function forwardToNextWebhook(env: Env, jobId: number): Promise<void> {
  const res = await fetch(env.NEXT_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({ jobId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`NEXT_WEBHOOK failed ${res.status}: ${text}`);
  }
}

export default {
  /**
   * Ingest endpoint: Insert jobs into Turso, then enqueue IDs.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return jsonResponse(
        {
          success: false,
          error: "Method not allowed. Use POST to insert jobs.",
        },
        { status: 405, headers: { ...corsHeaders } },
      );
    }

    // Optional authentication
    if (env.API_SECRET) {
      const authHeader = request.headers.get("Authorization");
      const providedSecret = authHeader?.replace("Bearer ", "");
      if (providedSecret !== env.API_SECRET) {
        return jsonResponse(
          { success: false, error: "Unauthorized" },
          { status: 401, headers: { ...corsHeaders } },
        );
      }
    }

    try {
      // Parse request body
      const body = (await request.json()) as InsertJobsRequest;

      if (!body.jobs || !Array.isArray(body.jobs)) {
        return jsonResponse(
          { success: false, error: "Request body must contain a 'jobs' array" },
          { status: 400, headers: { ...corsHeaders } },
        );
      }

      // Validate jobs
      const validationResults = body.jobs.map((job, index) => ({
        index,
        ...validateJob(job),
      }));

      const invalidJobs = validationResults.filter((r) => !r.valid);
      if (invalidJobs.length > 0) {
        return jsonResponse(
          {
            success: false,
            error: "Some jobs failed validation",
            invalidJobs: invalidJobs.map((j) => ({
              index: j.index,
              errors: j.errors,
            })),
          },
          { status: 400, headers: { ...corsHeaders } },
        );
      }

      // Create Turso client
      const turso = createClient({
        url: env.TURSO_DB_URL,
        authToken: env.TURSO_DB_AUTH_TOKEN,
      });

      // Insert/upsert jobs
      const insertResults = await Promise.all(
        body.jobs.map((job) => insertJob(turso, job)),
      );

      const successful = insertResults.filter(
        (r) => r.success && r.jobId != null,
      );
      const failed = insertResults.filter((r) => !r.success);

      // Enqueue successfully inserted job IDs
      let enqueued = 0;
      for (const r of successful) {
        await env.JOBS_QUEUE.send({ jobId: r.jobId! } satisfies QueueMessage);
        enqueued++;
      }

      console.log(
        `✅ Inserted ${successful.length}/${body.jobs.length} jobs; enqueued ${enqueued}`,
      );

      return jsonResponse(
        {
          success: failed.length === 0,
          message: `Inserted ${successful.length}/${body.jobs.length} jobs; enqueued ${enqueued}`,
          data: {
            totalJobs: body.jobs.length,
            successCount: successful.length,
            failCount: failed.length,
            enqueuedCount: enqueued,
            jobIds: successful.map((r) => r.jobId),
            failures: failed.map((r) => r.error),
          },
        },
        { status: 200, headers: { ...corsHeaders } },
      );
    } catch (error) {
      console.error("❌ Error processing request:", error);
      return jsonResponse(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500, headers: { ...corsHeaders } },
      );
    }
  },

  /**
   * Queue consumer: forwards messages one-by-one to Next.js webhook.
   * Configure wrangler with max_batch_size = 1 for strict per-invocation one-by-one processing.
   */
  async queue(
    batch: MessageBatch<QueueMessage>,
    env: Env,
    _ctx: ExecutionContext,
  ) {
    for (const message of batch.messages) {
      try {
        const { jobId } = message.body;
        await forwardToNextWebhook(env, jobId);
        message.ack();
      } catch (err) {
        console.error("❌ Failed to forward to webhook:", err);
        // Let Cloudflare Queues retry with backoff
        message.retry();
      }
    }
  },
};
