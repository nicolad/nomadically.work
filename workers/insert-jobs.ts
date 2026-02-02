/**
 * Cloudflare Worker for Inserting Jobs into Turso
 * Accepts POST requests with job data and inserts them into the database
 */

import { createClient, type Client } from "@libsql/client";

interface Env {
  TURSO_DB_URL: string;
  TURSO_DB_AUTH_TOKEN: string;
  API_SECRET?: string; // Optional API key for authentication
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

function validateJob(job: JobInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields based on schema
  if (!job.title?.trim()) {
    errors.push("title is required");
  }

  if (!job.companyKey?.trim()) {
    errors.push("companyKey is required");
  }

  if (!job.url?.trim()) {
    errors.push("url is required");
  }

  if (!job.externalId?.trim()) {
    errors.push("externalId is required");
  }

  if (!job.sourceKind?.trim()) {
    errors.push("sourceKind is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

async function insertJob(
  turso: Client,
  job: JobInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const now = new Date().toISOString();

    const args: (string | number | null)[] = [
      job.externalId!,
      job.sourceId || null,
      job.sourceKind!,
      job.companyKey!,
      job.title!,
      job.location || null,
      job.url!,
      job.description || null,
      job.postedAt || now,
      job.score || null,
      job.scoreReason || null,
      job.status || "new",
      now, // created_at
      now, // updated_at
      now, // updated_at for UPDATE clause
    ];

    const result = await turso.execute({
      sql: `INSERT INTO jobs (
        external_id,
        source_id,
        source_kind,
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_kind, company_key, external_id) DO UPDATE SET
        source_id = excluded.source_id,
        title = excluded.title,
        location = excluded.location,
        url = excluded.url,
        description = excluded.description,
        posted_at = excluded.posted_at,
        score = excluded.score,
        score_reason = excluded.score_reason,
        status = excluded.status,
        updated_at = ?`,
      args,
    });

    return {
      success: true,
      id: result.lastInsertRowid?.toString() || job.externalId,
    };
  } catch (error) {
    console.error("Failed to insert job:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export default {
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
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed. Use POST to insert jobs.",
        }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Optional authentication
    if (env.API_SECRET) {
      const authHeader = request.headers.get("Authorization");
      const providedSecret = authHeader?.replace("Bearer ", "");
      if (providedSecret !== env.API_SECRET) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unauthorized",
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    try {
      // Parse request body
      const body = (await request.json()) as InsertJobsRequest;

      if (!body.jobs || !Array.isArray(body.jobs)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Request body must contain a 'jobs' array",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Validate jobs
      const validationResults = body.jobs.map((job, index) => ({
        index,
        ...validateJob(job),
      }));

      const invalidJobs = validationResults.filter((r) => !r.valid);
      if (invalidJobs.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Some jobs failed validation",
            invalidJobs: invalidJobs.map((j) => ({
              index: j.index,
              errors: j.errors,
            })),
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Create Turso client
      const turso = createClient({
        url: env.TURSO_DB_URL,
        authToken: env.TURSO_DB_AUTH_TOKEN,
      });

      // Insert jobs
      const results = await Promise.all(
        body.jobs.map((job) => insertJob(turso, job)),
      );

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      console.log(
        `✅ Inserted ${successful.length}/${body.jobs.length} jobs successfully`,
      );

      return new Response(
        JSON.stringify({
          success: failed.length === 0,
          message: `Inserted ${successful.length}/${body.jobs.length} jobs`,
          data: {
            totalJobs: body.jobs.length,
            successCount: successful.length,
            failCount: failed.length,
            successfulIds: successful.map((r) => r.id),
            failures: failed.map((r) => r.error),
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("❌ Error processing request:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  },
};
