/**
 * Cloudflare Worker — Job Ingestion + Queue Orchestrator
 *
 * Responsibilities:
 * 1. HTTP endpoint: Accept POST with job data, upsert into D1, enqueue for processing
 * 2. Scheduled (cron): Auto-ingest jobs from discovered ATS sources (job_sources table)
 * 3. Queue consumer: Forward ingested job batches to process-jobs worker queue
 * 4. Stalled job recovery: Re-enqueue jobs stuck in intermediate states
 */

// ---------------------------------------------------------------------------
// Cloudflare Workers types
// ---------------------------------------------------------------------------

type Queue<T = unknown> = {
  send(message: T): Promise<void>;
  sendBatch(messages: { body: T }[]): Promise<void>;
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

type ScheduledEvent = {
  scheduledTime: number;
  cron: string;
};

// ---------------------------------------------------------------------------
// Environment bindings
// ---------------------------------------------------------------------------

interface Env {
  DB: D1Database;

  /** Auth for the ingest endpoint (optional) */
  API_SECRET?: string;

  /** Queue for newly inserted jobs — consumed by this worker to trigger processing */
  JOBS_QUEUE: Queue<QueueMessage>;

  /** Queue for process-jobs worker — triggers the 3-phase pipeline */
  PROCESS_JOBS_QUEUE?: Queue<ProcessJobsMessage>;

  /** Direct URL of the process-jobs worker (fallback if queue binding unavailable) */
  PROCESS_JOBS_URL?: string;

  /** Shared secret for authenticating to process-jobs worker */
  PROCESS_JOBS_SECRET?: string;
}

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

type QueueMessage = {
  jobId: number;
  action?: "process" | "enhance" | "tag" | "classify";
};

type ProcessJobsMessage = {
  action: "process" | "enhance" | "tag" | "classify";
  limit: number;
};

// ---------------------------------------------------------------------------
// Job input/validation
// ---------------------------------------------------------------------------

interface JobInput {
  externalId?: string;
  sourceId?: number;
  sourceKind?: string;
  companyKey?: string;
  title?: string;
  location?: string;
  url?: string;
  description?: string;
  postedAt?: string;
  score?: number;
  scoreReason?: string;
  status?: string;
}

interface InsertJobsRequest {
  jobs: JobInput[];
}

function validateJob(job: JobInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!job.title?.trim()) errors.push("title is required");
  if (!job.companyKey?.trim()) errors.push("companyKey is required");
  if (!job.url?.trim()) errors.push("url is required");
  if (!job.externalId?.trim()) errors.push("externalId is required");
  if (!job.sourceKind?.trim()) errors.push("sourceKind is required");

  // Reject board-only URLs as external_id (e.g. "https://jobs.ashbyhq.com/company/")
  if (job.externalId && job.externalId.includes("://")) {
    try {
      const url = new URL(job.externalId);
      const segments = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
      if (segments.length < 2) {
        errors.push("externalId is a board URL, not a job-specific ID");
      }
    } catch {
      // Not a valid URL — that's fine, treat as opaque ID
    }
  }

  return { valid: errors.length === 0, errors };
}

function jsonResponse(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

// ---------------------------------------------------------------------------
// D1 helpers
// ---------------------------------------------------------------------------

type D1Row = Record<string, unknown>;

async function d1Query(
  db: D1Database,
  sql: string,
  params: (string | number | null)[] = [],
): Promise<{ rows: D1Row[]; meta: { last_row_id: number; changes: number } }> {
  const stmt = db.prepare(sql).bind(...params);
  const result = await stmt.all();
  return {
    rows: (result.results ?? []) as D1Row[],
    meta: {
      last_row_id: result.meta?.last_row_id ?? 0,
      changes: result.meta?.changes ?? 0,
    },
  };
}

async function d1Run(
  db: D1Database,
  sql: string,
  params: (string | number | null)[] = [],
): Promise<{ last_row_id: number; changes: number }> {
  const stmt = db.prepare(sql).bind(...params);
  const result = await stmt.run();
  return {
    last_row_id: result.meta?.last_row_id ?? 0,
    changes: result.meta?.changes ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Job insertion (D1)
// ---------------------------------------------------------------------------

async function insertJob(
  db: D1Database,
  job: JobInput,
): Promise<{ success: boolean; jobId?: number; isNew?: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();

    // Ensure the company exists
    let companyId: number;
    const companyLookup = await d1Query(
      db,
      `SELECT id FROM companies WHERE key = ? LIMIT 1`,
      [job.companyKey!],
    );

    if (companyLookup.rows.length > 0) {
      companyId = Number(companyLookup.rows[0].id);
    } else {
      const companyResult = await d1Run(
        db,
        `INSERT INTO companies (key, name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
        [job.companyKey!, job.companyKey!, now, now],
      );
      companyId = companyResult.last_row_id;
    }

    const incomingStatus = (job.status ?? "new").trim();

    const args: (string | number | null)[] = [
      job.externalId!,
      job.sourceId ?? null,
      job.sourceKind!,
      companyId,
      job.companyKey!,
      job.title!,
      job.location ?? null,
      job.url!,
      job.description ?? null,
      job.postedAt ?? now,
      job.score ?? null,
      job.scoreReason ?? null,
      incomingStatus,
      now,
      now,
    ];

    // Check if job already exists (to determine if this is a new insertion)
    const existing = await d1Query(
      db,
      `SELECT id, status FROM jobs WHERE source_kind = ? AND company_key = ? AND external_id = ? LIMIT 1`,
      [job.sourceKind!, job.companyKey!, job.externalId!],
    );
    const existedBefore = existing.rows.length > 0;
    const existingStatus = existedBefore
      ? String(existing.rows[0].status ?? "new")
      : null;

    // Upsert: ON CONFLICT preserves downstream processing state
    const result = await d1Query(
      db,
      `INSERT INTO jobs (
          external_id, source_id, source_kind, company_id, company_key,
          title, location, url, description, posted_at,
          score, score_reason, status, created_at, updated_at
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
        RETURNING id;`,
      args,
    );

    const row = result.rows?.[0];
    let id = row?.id != null ? Number(row.id) : NaN;

    if (!Number.isFinite(id)) {
      // Fallback lookup
      const lookup = await d1Query(
        db,
        `SELECT id FROM jobs WHERE source_kind = ? AND company_key = ? AND external_id = ? LIMIT 1`,
        [job.sourceKind!, job.companyKey!, job.externalId!],
      );
      id = lookup.rows[0]?.id != null ? Number(lookup.rows[0].id) : NaN;
      if (!Number.isFinite(id)) {
        throw new Error("Inserted/upserted but could not determine job id");
      }
    }

    // A job is "new" (should be enqueued) if it didn't exist or was in 'new' status
    const isNew = !existedBefore || existingStatus === "new";

    return { success: true, jobId: id, isNew };
  } catch (error) {
    console.error("Failed to insert job:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ---------------------------------------------------------------------------
// ATS API fetchers — pull job listings from discovered sources
// ---------------------------------------------------------------------------

interface ATSJob {
  externalId: string;
  title: string;
  url: string;
  location?: string;
  description?: string;
  postedAt?: string;
}

async function fetchWithRetry(
  url: string,
  retries = 2,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        if (attempt === retries) return res;
        await new Promise((r) => setTimeout(r, Math.min(5000, 300 * 2 ** attempt)));
        continue;
      }
      return res;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, Math.min(5000, 300 * 2 ** attempt)));
    }
  }
  throw lastError ?? new Error("Network error");
}

async function fetchGreenhouseJobs(companyKey: string): Promise<ATSJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${companyKey}/jobs?content=true`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    console.error(`Greenhouse ${companyKey}: HTTP ${res.status}`);
    return [];
  }
  const data = (await res.json()) as { jobs?: Array<Record<string, unknown>> };
  return (data.jobs ?? []).map((j) => ({
    externalId: String(j.id ?? ""),
    title: String(j.title ?? ""),
    url: String(j.absolute_url ?? `https://boards.greenhouse.io/${companyKey}/jobs/${j.id}`),
    location: String(
      (j.location as Record<string, unknown>)?.name ?? j.location ?? "",
    ),
    description: typeof j.content === "string" ? j.content.slice(0, 5000) : undefined,
    postedAt: j.updated_at ? String(j.updated_at) : undefined,
  }));
}

async function fetchLeverJobs(companyKey: string): Promise<ATSJob[]> {
  // Try global endpoint first, then EU
  for (const base of [
    `https://api.lever.co/v0/postings/${companyKey}`,
    `https://api.eu.lever.co/v0/postings/${companyKey}`,
  ]) {
    const res = await fetchWithRetry(`${base}?mode=json`);
    if (!res.ok) continue;
    const data = (await res.json()) as Array<Record<string, unknown>>;
    if (!Array.isArray(data) || data.length === 0) continue;

    return data.map((j) => {
      const cats = (j.categories ?? {}) as Record<string, unknown>;
      return {
        externalId: String(j.id ?? ""),
        title: String(j.text ?? ""),
        url: String(j.hostedUrl ?? `https://jobs.lever.co/${companyKey}/${j.id}`),
        location: String(cats.location ?? ""),
        description: typeof j.descriptionPlain === "string"
          ? j.descriptionPlain.slice(0, 5000)
          : undefined,
        postedAt: j.createdAt ? new Date(Number(j.createdAt)).toISOString() : undefined,
      };
    });
  }
  return [];
}

async function fetchAshbyJobs(companyKey: string): Promise<ATSJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${companyKey}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    console.error(`Ashby ${companyKey}: HTTP ${res.status}`);
    return [];
  }
  const data = (await res.json()) as { jobs?: Array<Record<string, unknown>> };
  return (data.jobs ?? []).map((j) => ({
    externalId: String(j.id ?? ""),
    title: String(j.title ?? ""),
    url: String(j.jobUrl ?? `https://jobs.ashbyhq.com/${companyKey}/${j.id}`),
    location: String(j.location ?? ""),
    description: typeof j.descriptionPlain === "string"
      ? j.descriptionPlain.slice(0, 5000)
      : undefined,
    postedAt: j.publishedAt ? String(j.publishedAt) : undefined,
  }));
}

async function fetchWorkableJobs(companyKey: string): Promise<ATSJob[]> {
  const url = `https://apply.workable.com/api/v3/accounts/${companyKey}/jobs`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    console.error(`Workable ${companyKey}: HTTP ${res.status}`);
    return [];
  }
  const data = (await res.json()) as { results?: Array<Record<string, unknown>> };
  return (data.results ?? []).map((j) => ({
    externalId: String(j.shortcode ?? j.id ?? ""),
    title: String(j.title ?? ""),
    url: String(j.url ?? `https://apply.workable.com/${companyKey}/j/${j.shortcode}/`),
    location: String(
      (j.location as Record<string, unknown>)?.city ?? j.location ?? "",
    ),
    postedAt: j.published_on ? String(j.published_on) : undefined,
  }));
}

function getATSFetcher(kind: string): ((key: string) => Promise<ATSJob[]>) | null {
  switch (kind) {
    case "greenhouse":
      return fetchGreenhouseJobs;
    case "lever":
      return fetchLeverJobs;
    case "ashby":
      return fetchAshbyJobs;
    case "workable":
      return fetchWorkableJobs;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Scheduled: Auto-ingest from job_sources
// ---------------------------------------------------------------------------

interface IngestionStats {
  sourcesChecked: number;
  sourcesWithJobs: number;
  jobsInserted: number;
  jobsSkipped: number;
  jobsEnqueued: number;
  errors: string[];
}

async function autoIngestFromSources(
  db: D1Database,
  queue: Queue<QueueMessage>,
  processQueue: Queue<ProcessJobsMessage> | undefined,
  options: { maxSources?: number; stalePeriodHours?: number } = {},
): Promise<IngestionStats> {
  const { maxSources = 20, stalePeriodHours = 12 } = options;

  const stats: IngestionStats = {
    sourcesChecked: 0,
    sourcesWithJobs: 0,
    jobsInserted: 0,
    jobsSkipped: 0,
    jobsEnqueued: 0,
    errors: [],
  };

  // Find sources not fetched recently, ordered by oldest-first
  const staleThreshold = new Date(
    Date.now() - stalePeriodHours * 60 * 60 * 1000,
  ).toISOString();

  const sources = await d1Query(
    db,
    `SELECT id, kind, company_key, canonical_url
     FROM job_sources
     WHERE last_fetched_at IS NULL OR last_fetched_at < ?
     ORDER BY last_fetched_at ASC NULLS FIRST
     LIMIT ?`,
    [staleThreshold, maxSources],
  );

  console.log(`Found ${sources.rows.length} stale sources to ingest`);

  for (const source of sources.rows) {
    const kind = String(source.kind);
    const companyKey = String(source.company_key);
    const sourceId = Number(source.id);

    stats.sourcesChecked++;

    const fetcher = getATSFetcher(kind);
    if (!fetcher) {
      console.log(`  Skipping unsupported ATS kind: ${kind}`);
      continue;
    }

    try {
      // Rate limit between sources
      if (stats.sourcesChecked > 1) {
        await new Promise((r) => setTimeout(r, 500));
      }

      const atsJobs = await fetcher(companyKey);
      if (atsJobs.length === 0) {
        // Still mark as fetched to avoid re-checking immediately
        await d1Run(
          db,
          `UPDATE job_sources SET last_fetched_at = datetime('now') WHERE id = ?`,
          [sourceId],
        );
        continue;
      }

      stats.sourcesWithJobs++;
      console.log(`  ${kind}/${companyKey}: ${atsJobs.length} jobs found`);

      // Batch insert — collect new job IDs for enqueuing
      const newJobIds: number[] = [];
      for (const atsJob of atsJobs) {
        if (!atsJob.externalId || !atsJob.title) continue;

        const result = await insertJob(db, {
          externalId: atsJob.externalId,
          sourceId,
          sourceKind: kind,
          companyKey,
          title: atsJob.title,
          url: atsJob.url,
          location: atsJob.location,
          description: atsJob.description,
          postedAt: atsJob.postedAt,
          status: "new",
        });

        if (result.success && result.jobId) {
          if (result.isNew) {
            newJobIds.push(result.jobId);
            stats.jobsInserted++;
          } else {
            stats.jobsSkipped++;
          }
        }
      }

      // Enqueue new jobs in batches
      if (newJobIds.length > 0 && queue) {
        const batchMessages = newJobIds.map((jobId) => ({
          body: { jobId } as QueueMessage,
        }));
        // sendBatch supports up to 100 messages per call
        for (let i = 0; i < batchMessages.length; i += 100) {
          const chunk = batchMessages.slice(i, i + 100);
          await queue.sendBatch(chunk);
          stats.jobsEnqueued += chunk.length;
        }
      }

      // Update last_fetched_at
      await d1Run(
        db,
        `UPDATE job_sources SET last_fetched_at = datetime('now') WHERE id = ?`,
        [sourceId],
      );
    } catch (err) {
      const msg = `${kind}/${companyKey}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`  Error: ${msg}`);
      stats.errors.push(msg);
    }
  }

  // After ingestion, trigger processing if there are new jobs
  if (stats.jobsInserted > 0) {
    await triggerProcessing(processQueue, stats.jobsInserted);
  }

  return stats;
}

// ---------------------------------------------------------------------------
// Stalled job recovery
// ---------------------------------------------------------------------------

async function recoverStalledJobs(
  db: D1Database,
  queue: Queue<QueueMessage>,
  processQueue: Queue<ProcessJobsMessage> | undefined,
): Promise<{ recovered: number }> {
  // Find jobs stuck in 'new' status for more than 6 hours
  const stalledThreshold = new Date(
    Date.now() - 6 * 60 * 60 * 1000,
  ).toISOString();

  const stalled = await d1Query(
    db,
    `SELECT id FROM jobs
     WHERE status = 'new'
       AND updated_at < ?
     ORDER BY updated_at ASC
     LIMIT 50`,
    [stalledThreshold],
  );

  if (stalled.rows.length === 0) return { recovered: 0 };

  console.log(`Found ${stalled.rows.length} stalled jobs to re-enqueue`);

  // Touch updated_at to prevent immediate re-recovery
  const ids = stalled.rows.map((r) => Number(r.id));
  for (const id of ids) {
    await d1Run(
      db,
      `UPDATE jobs SET updated_at = datetime('now') WHERE id = ?`,
      [id],
    );
  }

  // Re-enqueue in batches
  const batchMessages = ids.map((jobId) => ({
    body: { jobId } as QueueMessage,
  }));
  for (let i = 0; i < batchMessages.length; i += 100) {
    await queue.sendBatch(batchMessages.slice(i, i + 100));
  }

  // Trigger processing
  if (ids.length > 0) {
    await triggerProcessing(processQueue, ids.length);
  }

  return { recovered: ids.length };
}

// ---------------------------------------------------------------------------
// Process-jobs triggering
// ---------------------------------------------------------------------------

async function triggerProcessing(
  processQueue: Queue<ProcessJobsMessage> | undefined,
  jobCount: number,
): Promise<void> {
  if (!processQueue) {
    console.log("  No PROCESS_JOBS_QUEUE binding — skipping process trigger");
    return;
  }

  try {
    // Send a message to process-jobs worker to run the full pipeline
    await processQueue.send({
      action: "process",
      limit: Math.min(jobCount, 50),
    });
    console.log(`  Triggered process-jobs pipeline for up to ${Math.min(jobCount, 50)} jobs`);
  } catch (err) {
    console.error("  Failed to trigger process-jobs:", err);
  }
}

async function triggerProcessingViaHTTP(
  env: Env,
  action: "process" | "enhance" | "tag" | "classify" = "process",
  limit = 50,
): Promise<boolean> {
  if (!env.PROCESS_JOBS_URL) return false;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (env.PROCESS_JOBS_SECRET) {
      headers["Authorization"] = `Bearer ${env.PROCESS_JOBS_SECRET}`;
    }

    const res = await fetch(env.PROCESS_JOBS_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, limit }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`Process-jobs HTTP ${res.status}: ${text}`);
      return false;
    }
    console.log(`  Triggered process-jobs via HTTP (action=${action}, limit=${limit})`);
    return true;
  } catch (err) {
    console.error("  Failed to trigger process-jobs via HTTP:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Worker export
// ---------------------------------------------------------------------------

export default {
  /**
   * HTTP endpoint: Accept POST with job data, upsert into D1, enqueue for processing.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // GET /health — health check
    if (request.method === "GET" && url.pathname === "/health") {
      try {
        const result = await d1Query(env.DB, "SELECT COUNT(*) as count FROM jobs");
        return jsonResponse(
          {
            status: "healthy",
            jobCount: result.rows[0]?.count,
            hasQueue: !!env.JOBS_QUEUE,
            hasProcessQueue: !!env.PROCESS_JOBS_QUEUE,
          },
          { headers: corsHeaders },
        );
      } catch (err) {
        return jsonResponse(
          { status: "unhealthy", error: String(err) },
          { status: 500, headers: corsHeaders },
        );
      }
    }

    // GET /stats — ingestion stats
    if (request.method === "GET" && url.pathname === "/stats") {
      const [sourceCount, jobsByStatus, recentSources] = await Promise.all([
        d1Query(env.DB, `SELECT COUNT(*) as count FROM job_sources`),
        d1Query(env.DB, `SELECT status, COUNT(*) as count FROM jobs GROUP BY status ORDER BY count DESC`),
        d1Query(
          env.DB,
          `SELECT kind, company_key, last_fetched_at
           FROM job_sources
           ORDER BY last_fetched_at DESC NULLS LAST
           LIMIT 10`,
        ),
      ]);

      return jsonResponse(
        {
          totalSources: sourceCount.rows[0]?.count,
          jobsByStatus: jobsByStatus.rows,
          recentlyFetched: recentSources.rows,
        },
        { headers: corsHeaders },
      );
    }

    // GET /ingest — manually trigger source ingestion
    if (request.method === "GET" && url.pathname === "/ingest") {
      const maxSources = Number(url.searchParams.get("limit")) || 20;
      const stats = await autoIngestFromSources(
        env.DB,
        env.JOBS_QUEUE,
        env.PROCESS_JOBS_QUEUE,
        { maxSources },
      );
      return jsonResponse(
        { success: true, message: "Ingestion complete", stats },
        { headers: corsHeaders },
      );
    }

    // POST / — insert jobs directly
    if (request.method !== "POST") {
      return jsonResponse(
        { success: false, error: "Method not allowed. POST to insert jobs, GET /health, /stats, or /ingest." },
        { status: 405, headers: corsHeaders },
      );
    }

    // Optional authentication
    if (env.API_SECRET) {
      const authHeader = request.headers.get("Authorization");
      const providedSecret = authHeader?.replace("Bearer ", "");
      if (providedSecret !== env.API_SECRET) {
        return jsonResponse(
          { success: false, error: "Unauthorized" },
          { status: 401, headers: corsHeaders },
        );
      }
    }

    try {
      const body = (await request.json()) as InsertJobsRequest;

      if (!body.jobs || !Array.isArray(body.jobs)) {
        return jsonResponse(
          { success: false, error: "Request body must contain a 'jobs' array" },
          { status: 400, headers: corsHeaders },
        );
      }

      // Validate
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
            invalidJobs: invalidJobs.map((j) => ({ index: j.index, errors: j.errors })),
          },
          { status: 400, headers: corsHeaders },
        );
      }

      // Insert/upsert jobs
      const insertResults = await Promise.all(
        body.jobs.map((job) => insertJob(env.DB, job)),
      );

      const successful = insertResults.filter((r) => r.success && r.jobId != null);
      const newJobs = successful.filter((r) => r.isNew);
      const failed = insertResults.filter((r) => !r.success);

      // Enqueue only genuinely new jobs
      let enqueued = 0;
      if (newJobs.length > 0) {
        const batchMessages = newJobs.map((r) => ({
          body: { jobId: r.jobId! } as QueueMessage,
        }));
        for (let i = 0; i < batchMessages.length; i += 100) {
          const chunk = batchMessages.slice(i, i + 100);
          await env.JOBS_QUEUE.sendBatch(chunk);
          enqueued += chunk.length;
        }
      }

      // Trigger processing for new jobs
      if (enqueued > 0) {
        await triggerProcessing(env.PROCESS_JOBS_QUEUE, enqueued);
      }

      console.log(
        `Inserted ${successful.length}/${body.jobs.length} jobs (${newJobs.length} new); enqueued ${enqueued}`,
      );

      return jsonResponse(
        {
          success: failed.length === 0,
          message: `Inserted ${successful.length}/${body.jobs.length} jobs (${newJobs.length} new); enqueued ${enqueued}`,
          data: {
            totalJobs: body.jobs.length,
            successCount: successful.length,
            newCount: newJobs.length,
            skippedCount: successful.length - newJobs.length,
            failCount: failed.length,
            enqueuedCount: enqueued,
            jobIds: successful.map((r) => r.jobId),
            failures: failed.map((r) => r.error),
          },
        },
        { status: 200, headers: corsHeaders },
      );
    } catch (error) {
      console.error("Error processing request:", error);
      return jsonResponse(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500, headers: corsHeaders },
      );
    }
  },

  /**
   * Scheduled handler — runs automatically on cron.
   *
   * Two responsibilities:
   * 1. Auto-ingest: Fetch jobs from ATS sources that haven't been checked recently
   * 2. Stalled recovery: Re-enqueue jobs stuck in 'new' status for too long
   */
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    console.log(`Cron triggered: ${event.cron} at ${new Date(event.scheduledTime).toISOString()}`);

    try {
      // Phase 1: Auto-ingest from ATS sources
      console.log("Phase 1: Auto-ingesting from ATS sources...");
      const ingestionStats = await autoIngestFromSources(
        env.DB,
        env.JOBS_QUEUE,
        env.PROCESS_JOBS_QUEUE,
        { maxSources: 15, stalePeriodHours: 12 },
      );
      console.log(
        `Ingestion: ${ingestionStats.sourcesChecked} sources checked, ` +
          `${ingestionStats.jobsInserted} new jobs, ${ingestionStats.jobsEnqueued} enqueued`,
      );

      // Phase 2: Recover stalled jobs
      console.log("Phase 2: Recovering stalled jobs...");
      const recovery = await recoverStalledJobs(
        env.DB,
        env.JOBS_QUEUE,
        env.PROCESS_JOBS_QUEUE,
      );
      console.log(`Recovery: ${recovery.recovered} stalled jobs re-enqueued`);

      // Phase 3: Trigger processing if queue binding not available, use HTTP fallback
      if (!env.PROCESS_JOBS_QUEUE && env.PROCESS_JOBS_URL) {
        const totalNew = ingestionStats.jobsInserted + recovery.recovered;
        if (totalNew > 0) {
          console.log("Phase 3: Triggering process-jobs via HTTP fallback...");
          await triggerProcessingViaHTTP(env, "process", Math.min(totalNew, 50));
        }
      }

      console.log("Scheduled run complete");
    } catch (error) {
      console.error("Scheduled run failed:", error);
    }
  },

  /**
   * Queue consumer — processes batched job IDs and triggers the processing pipeline.
   *
   * Instead of forwarding to a webhook, this accumulates job IDs from the batch
   * and sends a single message to the process-jobs queue to handle them.
   */
  async queue(
    batch: MessageBatch<QueueMessage>,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    const jobIds: number[] = [];

    for (const message of batch.messages) {
      try {
        const { jobId } = message.body;
        if (typeof jobId === "number" && Number.isFinite(jobId)) {
          jobIds.push(jobId);
        }
        message.ack();
      } catch (err) {
        console.error("Failed to process queue message:", err);
        message.retry();
      }
    }

    if (jobIds.length === 0) return;

    console.log(`Queue batch: ${jobIds.length} jobs acknowledged`);

    // Trigger processing for the batch
    const triggered =
      env.PROCESS_JOBS_QUEUE
        ? await triggerProcessing(env.PROCESS_JOBS_QUEUE, jobIds.length).then(() => true)
        : await triggerProcessingViaHTTP(env, "process", jobIds.length);

    if (!triggered) {
      console.log("  No process-jobs trigger available — jobs will be picked up by process-jobs cron");
    }
  },
};
