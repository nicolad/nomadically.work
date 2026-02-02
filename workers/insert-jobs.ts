/**
 * Cloudflare Worker for Inserting Jobs into Turso
 * Accepts POST requests with job data and inserts them into the database
 */

import { createClient } from "@libsql/client";

interface Env {
  TURSO_DB_URL: string;
  TURSO_DB_AUTH_TOKEN: string;
  API_SECRET?: string; // Optional API key for authentication
}

interface JobInput {
  title?: string;
  company?: string;
  location?: string;
  salary?: string;
  description?: string;
  url?: string;
  publishedDate?: string;
  sourceType?: string;
  sourceCategory?: string;
  sourceDetail?: string;
  guid?: string;
  keywords?: string[];
  employmentType?: string;
  experienceLevel?: string;
  techStack?: string[];
  status?: string;
  applied?: boolean;
  appliedAt?: string;
  isDeveloperRole?: boolean;
  developerConfidence?: string;
  remoteFriendly?: boolean;
}

interface InsertJobsRequest {
  jobs: JobInput[];
}

function validateJob(job: JobInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Add basic validation rules
  if (!job.title?.trim()) {
    errors.push("title is required");
  }

  if (!job.company?.trim()) {
    errors.push("company is required");
  }

  if (!job.url?.trim()) {
    errors.push("url is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

async function insertJob(
  turso: ReturnType<typeof createClient>,
  job: JobInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const now = new Date().toISOString();
    const guid = job.guid || `${job.company}_${job.title}_${Date.now()}`;

    // Convert arrays to JSON strings for storage
    const keywords = job.keywords ? JSON.stringify(job.keywords) : null;
    const techStack = job.techStack ? JSON.stringify(job.techStack) : null;

    const result = await turso.execute({
      sql: `INSERT INTO jobs (
        id,
        title,
        company,
        location,
        salary,
        description,
        url,
        publishedDate,
        sourceType,
        sourceCategory,
        sourceDetail,
        guid,
        keywords,
        employmentType,
        experienceLevel,
        techStack,
        status,
        applied,
        appliedAt,
        isDeveloperRole,
        developerConfidence,
        remoteFriendly,
        createdAt,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guid) DO UPDATE SET
        title = excluded.title,
        company = excluded.company,
        location = excluded.location,
        salary = excluded.salary,
        description = excluded.description,
        url = excluded.url,
        publishedDate = excluded.publishedDate,
        sourceType = excluded.sourceType,
        sourceCategory = excluded.sourceCategory,
        sourceDetail = excluded.sourceDetail,
        keywords = excluded.keywords,
        employmentType = excluded.employmentType,
        experienceLevel = excluded.experienceLevel,
        techStack = excluded.techStack,
        status = excluded.status,
        applied = excluded.applied,
        appliedAt = excluded.appliedAt,
        isDeveloperRole = excluded.isDeveloperRole,
        developerConfidence = excluded.developerConfidence,
        remoteFriendly = excluded.remoteFriendly,
        updatedAt = ?`,
      args: [
        guid, // id (using guid as id)
        job.title || null,
        job.company || null,
        job.location || null,
        job.salary || null,
        job.description || null,
        job.url || null,
        job.publishedDate || null,
        job.sourceType || null,
        job.sourceCategory || null,
        job.sourceDetail || null,
        guid,
        keywords,
        job.employmentType || null,
        job.experienceLevel || null,
        techStack,
        job.status || "new",
        job.applied ? 1 : 0,
        job.appliedAt || null,
        job.isDeveloperRole ? 1 : 0,
        job.developerConfidence || null,
        job.remoteFriendly ? 1 : 0,
        now, // createdAt
        now, // updatedAt
        now, // updatedAt for UPDATE clause
      ],
    });

    return {
      success: true,
      id: guid,
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
