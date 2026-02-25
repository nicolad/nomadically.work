/**
 * Cloudflare Worker — Job Ingestion + Queue Orchestrator
 *
 * Responsibilities:
 * 1. HTTP endpoint: Accept POST with job data, upsert into D1, enqueue for processing
 * 2. Scheduled (cron): Auto-ingest jobs from discovered ATS sources (job_sources table)
 * 3. Queue consumer: Forward ingested job batches to process-jobs worker queue
 * 4. Stalled job recovery: Re-enqueue jobs stuck in intermediate states
 */

import { log, generateTraceId } from "./lib/logger";

const WORKER = "insert-jobs";

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
  traceId?: string;
  action?: "process" | "enhance" | "tag" | "classify";
};

type ProcessJobsMessage = {
  action: "process" | "enhance" | "tag" | "classify";
  limit: number;
  traceId?: string;
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

  // Reject spam company keys where >40% of characters are digits
  if (job.companyKey) {
    const digits = (job.companyKey.match(/\d/g) ?? []).length;
    if (digits / job.companyKey.length > 0.4) {
      errors.push("companyKey looks like a spam/garbage board token (too many digits)");
    }
  }

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
  traceId?: string,
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
    log({
      worker: WORKER, action: "insert-job", level: "error", traceId,
      error: error instanceof Error ? error.message : String(error),
      metadata: { companyKey: job.companyKey, externalId: job.externalId },
    });
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
  /** Per-job company key override — used by multi-company sources (Remotive, Arbeitnow) */
  companyKey?: string;
}

/**
 * Thrown when an ATS board returns a 4xx HTTP error, indicating the board
 * is gone or the company key is invalid (not a transient server-side error).
 */
class ATSFetchError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ATSFetchError";
  }
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
        // Exponential backoff with jitter to avoid thundering herd
        const baseDelay = Math.min(5000, 300 * 2 ** attempt);
        const jitter = Math.random() * baseDelay * 0.5;
        await new Promise((r) => setTimeout(r, baseDelay + jitter));
        continue;
      }
      return res;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt === retries) break;
      const baseDelay = Math.min(5000, 300 * 2 ** attempt);
      const jitter = Math.random() * baseDelay * 0.5;
      await new Promise((r) => setTimeout(r, baseDelay + jitter));
    }
  }
  throw lastError ?? new Error("Network error");
}

async function fetchGreenhouseJobs(companyKey: string): Promise<ATSJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${companyKey}/jobs?content=true`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    log({
      worker: WORKER, action: "fetch-ats", level: "error",
      error: `HTTP ${res.status}`, metadata: { kind: "greenhouse", companyKey },
    });
    if (res.status >= 400 && res.status < 500) {
      throw new ATSFetchError(res.status, `Greenhouse board not found: ${companyKey} (HTTP ${res.status})`);
    }
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
  const endpoints = [
    `https://api.lever.co/v0/postings/${companyKey}`,
    `https://api.eu.lever.co/v0/postings/${companyKey}`,
  ];
  let clientErrorCount = 0;
  for (const base of endpoints) {
    const res = await fetchWithRetry(`${base}?mode=json`);
    if (!res.ok) {
      if (res.status >= 400 && res.status < 500) clientErrorCount++;
      continue;
    }
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
  // Both endpoints returned 4xx — board is gone
  if (clientErrorCount === endpoints.length) {
    throw new ATSFetchError(404, `Lever board not found: ${companyKey}`);
  }
  return [];
}

async function fetchAshbyJobs(companyKey: string): Promise<ATSJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${companyKey}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    log({
      worker: WORKER, action: "fetch-ats", level: "error",
      error: `HTTP ${res.status}`, metadata: { kind: "ashby", companyKey },
    });
    if (res.status >= 400 && res.status < 500) {
      throw new ATSFetchError(res.status, `Ashby board not found: ${companyKey} (HTTP ${res.status})`);
    }
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

function slugifyCompany(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

// Remotive API categories relevant to EU remote tech roles.
// Fetched sequentially to stay within Cloudflare Workers subrequest budget.
const REMOTIVE_CATEGORIES = [
  "software-development",
  "devops-sysadmin",
  "product",
  "data",
  "ai-ml",
  "backend",
  "frontend",
  "fullstack",
  "mobile",
  "design",
  "qa",
  "cybersecurity",
] as const;

function mapRemotiveJob(j: Record<string, unknown>): ATSJob {
  return {
    externalId: String(j.id ?? ""),
    title: String(j.title ?? ""),
    url: String(j.url ?? ""),
    location: String(j.candidate_required_location ?? ""),
    description: typeof j.description === "string" ? j.description.slice(0, 5000) : undefined,
    postedAt: j.publication_date ? String(j.publication_date) : undefined,
    companyKey: slugifyCompany(String(j.company_name ?? "unknown")),
  };
}

async function fetchRemotiveCategory(category: string): Promise<ATSJob[]> {
  const url = `https://remotive.com/api/remote-jobs?category=${category}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    log({
      worker: WORKER, action: "fetch-ats", level: "error",
      error: `HTTP ${res.status}`, metadata: { kind: "remotive", category },
    });
    return [];
  }
  const data = (await res.json()) as { jobs?: Array<Record<string, unknown>> };
  return (data.jobs ?? []).map(mapRemotiveJob);
}

async function fetchRemotiveJobs(_companyKey: string): Promise<ATSJob[]> {
  // Fetch all categories in parallel to stay within HTTP time budget
  const results = await Promise.all(REMOTIVE_CATEGORIES.map(fetchRemotiveCategory));

  const seen = new Set<string>();
  const all: ATSJob[] = [];
  for (const jobs of results) {
    for (const job of jobs) {
      if (job.externalId && !seen.has(job.externalId)) {
        seen.add(job.externalId);
        all.push(job);
      }
    }
  }

  log({
    worker: WORKER, action: "fetch-ats", level: "info",
    metadata: { kind: "remotive", total: all.length, categories: REMOTIVE_CATEGORIES.length },
  });

  return all;
}


async function fetchWorkableJobs(companyKey: string): Promise<ATSJob[]> {
  const url = `https://apply.workable.com/api/v3/accounts/${companyKey}/jobs`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    log({
      worker: WORKER, action: "fetch-ats", level: "error",
      error: `HTTP ${res.status}`, metadata: { kind: "workable", companyKey },
    });
    if (res.status >= 400 && res.status < 500) {
      throw new ATSFetchError(res.status, `Workable board not found: ${companyKey} (HTTP ${res.status})`);
    }
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

async function fetchRemoteOKJobs(_companyKey: string): Promise<ATSJob[]> {
  // RemoteOK returns a JSON array; index 0 is a legal notice object, not a job.
  const res = await fetchWithRetry("https://remoteok.com/api", 2);
  if (!res.ok) {
    log({
      worker: WORKER, action: "fetch-ats", level: "error",
      error: `HTTP ${res.status}`, metadata: { kind: "remoteok" },
    });
    if (res.status >= 400 && res.status < 500 && res.status !== 429) return [];
    return [];
  }
  const data = (await res.json()) as Array<Record<string, unknown>>;
  return data
    .slice(1) // skip the legal notice at index 0
    .filter((j) => j.id && j.position)
    .map((j) => ({
      externalId: String(j.id),
      title: String(j.position ?? ""),
      url: String(j.url ?? `https://remoteok.com/remote-jobs/${j.id}`),
      location: String(j.location ?? ""),
      description: typeof j.description === "string" ? j.description.slice(0, 5000) : undefined,
      postedAt: j.date ? String(j.date) : undefined,
      companyKey: slugifyCompany(String(j.company ?? "unknown")),
    }));
}

async function fetchHimalayasJobs(_companyKey: string): Promise<ATSJob[]> {
  const res = await fetchWithRetry("https://himalayas.app/jobs/api?limit=100", 2);
  if (!res.ok) {
    log({
      worker: WORKER, action: "fetch-ats", level: "error",
      error: `HTTP ${res.status}`, metadata: { kind: "himalayas" },
    });
    if (res.status >= 400 && res.status < 500 && res.status !== 429) return [];
    return [];
  }
  const data = (await res.json()) as { jobs?: Array<Record<string, unknown>> };
  return (data.jobs ?? []).map((j) => {
    const company = j.company as Record<string, unknown> | undefined;
    return {
      externalId: String(j.id ?? j.slug ?? ""),
      title: String(j.title ?? ""),
      url: String(j.applicationUrl ?? j.url ?? ""),
      location: String(j.location ?? ""),
      description: typeof j.description === "string" ? j.description.slice(0, 5000) : undefined,
      postedAt: j.publishedAt ? String(j.publishedAt) : undefined,
      companyKey: slugifyCompany(String(company?.name ?? j.companyName ?? "unknown")),
    };
  });
}

async function fetchJobicyJobs(_companyKey: string): Promise<ATSJob[]> {
  const res = await fetchWithRetry(
    "https://jobicy.com/api/v2/remote-jobs?count=50&geo=worldwide&industry=tech",
    2,
  );
  if (!res.ok) {
    log({
      worker: WORKER, action: "fetch-ats", level: "error",
      error: `HTTP ${res.status}`, metadata: { kind: "jobicy" },
    });
    if (res.status >= 400 && res.status < 500 && res.status !== 429) return [];
    return [];
  }
  const data = (await res.json()) as { jobs?: Array<Record<string, unknown>> };
  return (data.jobs ?? []).map((j) => ({
    externalId: String(j.id ?? ""),
    title: String(j.jobTitle ?? ""),
    url: String(j.url ?? ""),
    location: String(j.jobGeo ?? ""),
    description: typeof j.jobDescription === "string" ? j.jobDescription.slice(0, 5000) : undefined,
    postedAt: j.pubDate ? String(j.pubDate) : undefined,
    companyKey: slugifyCompany(String(j.companyName ?? "unknown")),
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
    case "remotive":
      return fetchRemotiveJobs;
    case "remoteok":
      return fetchRemoteOKJobs;
    case "himalayas":
      return fetchHimalayasJobs;
    case "jobicy":
      return fetchJobicyJobs;
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
  deadBoardsDetected: number;
}

async function autoIngestFromSources(
  db: D1Database,
  options: { maxSources?: number; stalePeriodHours?: number; traceId?: string } = {},
): Promise<IngestionStats> {
  const { maxSources = 500, stalePeriodHours = 12, traceId } = options;

  const stats: IngestionStats = {
    sourcesChecked: 0,
    sourcesWithJobs: 0,
    jobsInserted: 0,
    jobsSkipped: 0,
    jobsEnqueued: 0,
    errors: [],
    deadBoardsDetected: 0,
  };

  // Find sources not fetched recently, ordered by oldest-first
  const staleThreshold = new Date(
    Date.now() - stalePeriodHours * 60 * 60 * 1000,
  ).toISOString();

  // Get total board count for coverage reporting (FR13)
  const totalSourcesResult = await d1Query(
    db,
    `SELECT COUNT(*) as count FROM job_sources`,
  );
  const totalSources = Number(totalSourcesResult.rows[0]?.count ?? 0);

  const sources = await d1Query(
    db,
    `SELECT id, kind, company_key, canonical_url
     FROM job_sources
     WHERE last_fetched_at IS NULL OR last_fetched_at < ?
     ORDER BY last_fetched_at ASC NULLS FIRST
     LIMIT ?`,
    [staleThreshold, maxSources],
  );

  log({
    worker: WORKER, action: "ingest-start", level: "info", traceId,
    metadata: { totalSources, staleSources: sources.rows.length },
  });

  for (const source of sources.rows) {
    const kind = String(source.kind);
    const companyKey = String(source.company_key);
    const sourceId = Number(source.id);

    stats.sourcesChecked++;

    const fetcher = getATSFetcher(kind);
    if (!fetcher) {
      log({
        worker: WORKER, action: "ingest-skip", level: "info", traceId,
        metadata: { kind, companyKey, reason: "unsupported" },
      });
      continue;
    }

    try {
      // Rate limit between sources
      if (stats.sourcesChecked > 1) {
        await new Promise((r) => setTimeout(r, 500));
      }

      log({
        worker: WORKER, action: "board-fetch-start", level: "info", traceId,
        sourceId, metadata: { kind, companyKey },
      });

      const atsJobs = await fetcher(companyKey);
      if (atsJobs.length === 0) {
        log({
          worker: WORKER, action: "board-fetch-result", level: "info", traceId,
          sourceId, metadata: { kind, companyKey, jobsFetched: 0 },
        });
        // Board is alive but has no open positions — reset error counter and mark fetched
        await d1Run(
          db,
          `UPDATE job_sources SET last_fetched_at = datetime('now'), consecutive_errors = 0 WHERE id = ?`,
          [sourceId],
        );
        continue;
      }

      stats.sourcesWithJobs++;
      log({
        worker: WORKER, action: "board-fetch-result", level: "info", traceId,
        sourceId, metadata: { kind, companyKey, jobsFetched: atsJobs.length },
      });

      // Filter valid jobs up-front (spam + missing required fields)
      const validJobs = atsJobs.filter((j) => {
        if (!j.externalId || !j.title) return false;
        const effectiveKey = j.companyKey ?? companyKey;
        const keyDigits = (effectiveKey.match(/\d/g) ?? []).length;
        if (keyDigits / effectiveKey.length > 0.4) {
          log({
            worker: WORKER, action: "ingest-skip", level: "warn", traceId,
            metadata: { kind, companyKey: effectiveKey, reason: "spam-company-key" },
          });
          return false;
        }
        return true;
      });

      // ---------- Batch insert to minimise D1 subrequest usage ----------
      // Without batching: 3-4 subrequests × N jobs per source → hits CF's
      // 1000 subrequest limit for boards with >250 open positions.
      // With db.batch(): 1+1 (companies) + ceil(N/50) (inserts) = ~13 total
      // for a 436-job board vs the previous ~1744.

      const now = new Date().toISOString();

      // Step 1: Ensure all unique companies exist (2 subrequests total)
      const uniqueKeys = [...new Set(validJobs.map((j) => j.companyKey ?? companyKey))];
      if (uniqueKeys.length > 0) {
        await db.batch(
          uniqueKeys.map((key) =>
            db.prepare(
              `INSERT OR IGNORE INTO companies (key, name, created_at, updated_at) VALUES (?, ?, ?, ?)`,
            ).bind(key, key, now, now),
          ),
        );
      }
      const companyRows = uniqueKeys.length > 0
        ? await db.batch(
            uniqueKeys.map((key) =>
              db.prepare(`SELECT id FROM companies WHERE key = ? LIMIT 1`).bind(key),
            ),
          )
        : [];
      const companyIdMap = new Map<string, number>();
      uniqueKeys.forEach((key, i) => {
        const row = (companyRows[i]?.results as Array<{ id: number }> | undefined)?.[0];
        if (row?.id) companyIdMap.set(key, row.id);
      });

      // Step 2: INSERT OR IGNORE jobs in batches of 50 — 1 subrequest per batch
      // INSERT OR IGNORE: new rows return RETURNING id; conflicts return nothing.
      const newJobIds: number[] = [];
      const BATCH_SIZE = 50;
      for (let bi = 0; bi < validJobs.length; bi += BATCH_SIZE) {
        const chunk = validJobs.slice(bi, bi + BATCH_SIZE);
        let batchResults: Awaited<ReturnType<D1Database["batch"]>>;
        try {
          batchResults = await db.batch(
            chunk.map((j) => {
              const effectiveKey = j.companyKey ?? companyKey;
              return db.prepare(
                `INSERT OR IGNORE INTO jobs (
                    external_id, source_id, source_kind, company_id, company_key,
                    title, location, url, description, posted_at,
                    status, created_at, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'), datetime('now'))
                  RETURNING id`,
              ).bind(
                j.externalId,
                sourceId,
                kind,
                companyIdMap.get(effectiveKey) ?? null,
                effectiveKey,
                j.title,
                j.location ?? null,
                j.url ?? "",
                j.description ?? null,
                j.postedAt ?? now,
              );
            }),
          );
        } catch (batchErr) {
          log({
            worker: WORKER, action: "batch-insert", level: "error", traceId,
            error: batchErr instanceof Error ? batchErr.message : String(batchErr),
            metadata: { kind, companyKey, batchIndex: bi, batchSize: chunk.length },
          });
          stats.errors.push(`${kind}/${companyKey} batch[${bi}]: ${batchErr instanceof Error ? batchErr.message : String(batchErr)}`);
          continue;
        }
        for (const r of batchResults) {
          const row = (r.results as Array<{ id: number }> | undefined)?.[0];
          if (row?.id) {
            newJobIds.push(row.id);
            stats.jobsInserted++;
          } else {
            stats.jobsSkipped++;
          }
        }
      }

      // Track inserted count for single trigger at end of ingest (not per-job queue messages)
      stats.jobsEnqueued += newJobIds.length;

      // Update last_fetched_at and reset consecutive_errors on success
      await d1Run(
        db,
        `UPDATE job_sources SET last_fetched_at = datetime('now'), consecutive_errors = 0 WHERE id = ?`,
        [sourceId],
      );
    } catch (err) {
      const isDeadBoard = err instanceof ATSFetchError;
      const msg = `${kind}/${companyKey}: ${err instanceof Error ? err.message : String(err)}`;
      log({
        worker: WORKER, action: "board-fetch-error", level: isDeadBoard ? "warn" : "error", traceId,
        sourceId, error: msg, metadata: { kind, companyKey, isDeadBoard },
      });
      stats.errors.push(msg);

      if (isDeadBoard) {
        stats.deadBoardsDetected++;
        // Increment consecutive_errors — janitor will clean up after threshold is reached
        await d1Run(
          db,
          `UPDATE job_sources
           SET last_fetched_at = datetime('now'),
               consecutive_errors = consecutive_errors + 1
           WHERE id = ?`,
          [sourceId],
        );
      }
    }
  }

  log({
    worker: WORKER, action: "ingest-complete", level: "info", traceId,
    metadata: {
      totalSourcesInDb: totalSources,
      sourcesChecked: stats.sourcesChecked,
      coverageRatio: totalSources > 0
        ? `${stats.sourcesChecked}/${totalSources}`
        : "0/0",
      sourcesWithJobs: stats.sourcesWithJobs,
      jobsInserted: stats.jobsInserted,
      jobsSkipped: stats.jobsSkipped,
      jobsEnqueued: stats.jobsEnqueued,
      errorCount: stats.errors.length,
      deadBoardsDetected: stats.deadBoardsDetected,
    },
  });

  return stats;
}

// ---------------------------------------------------------------------------
// Stalled job recovery
// ---------------------------------------------------------------------------

async function recoverStalledJobs(
  db: D1Database,
  traceId?: string,
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

  log({
    worker: WORKER, action: "recover-stalled", level: "info", traceId,
    metadata: { stalledCount: stalled.rows.length },
  });

  // Touch updated_at to prevent immediate re-recovery
  const ids = stalled.rows.map((r) => Number(r.id));
  for (const id of ids) {
    await d1Run(
      db,
      `UPDATE jobs SET updated_at = datetime('now') WHERE id = ?`,
      [id],
    );
  }

  // Caller sends a single trigger to process-jobs-queue (not per-job messages)
  return { recovered: ids.length };
}

// ---------------------------------------------------------------------------
// Process-jobs triggering
// ---------------------------------------------------------------------------

async function triggerProcessing(
  processQueue: Queue<ProcessJobsMessage> | undefined,
  jobCount: number,
  traceId?: string,
): Promise<void> {
  if (!processQueue) {
    log({
      worker: WORKER, action: "trigger-processing", level: "info", traceId,
      metadata: { skipped: true, reason: "No PROCESS_JOBS_QUEUE binding" },
    });
    return;
  }

  try {
    // Send a message to process-jobs worker to run the full pipeline
    await processQueue.send({
      action: "process",
      limit: Math.min(jobCount, 50),
      traceId,
    });
    log({
      worker: WORKER, action: "trigger-processing", level: "info", traceId,
      metadata: { limit: Math.min(jobCount, 50) },
    });
  } catch (err) {
    log({
      worker: WORKER, action: "trigger-processing", level: "error", traceId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function triggerProcessingViaHTTP(
  env: Env,
  action: "process" | "enhance" | "tag" | "classify" = "process",
  limit = 50,
  traceId?: string,
): Promise<boolean> {
  if (!env.PROCESS_JOBS_URL) return false;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (env.PROCESS_JOBS_SECRET) {
      headers["Authorization"] = `Bearer ${env.PROCESS_JOBS_SECRET}`;
    }
    if (traceId) {
      headers["X-Trace-Id"] = traceId;
    }

    const res = await fetch(env.PROCESS_JOBS_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ action, limit }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      log({
        worker: WORKER, action: "trigger-processing-http", level: "error", traceId,
        error: `HTTP ${res.status}: ${text}`,
      });
      return false;
    }
    log({
      worker: WORKER, action: "trigger-processing-http", level: "info", traceId,
      metadata: { action, limit },
    });
    return true;
  } catch (err) {
    log({
      worker: WORKER, action: "trigger-processing-http", level: "error", traceId,
      error: err instanceof Error ? err.message : String(err),
    });
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
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Trace-Id",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const traceId = request.headers.get("X-Trace-Id") || generateTraceId();

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
        log({
          worker: WORKER, action: "health", level: "error", traceId,
          error: err instanceof Error ? err.message : String(err),
        });
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

    // GET /ingest — manually trigger source ingestion (FR12: manual trigger for fix verification)
    if (request.method === "GET" && url.pathname === "/ingest") {
      const maxSources = Number(url.searchParams.get("limit")) || 500;
      const stats = await autoIngestFromSources(
        env.DB,
        { maxSources, traceId },
      );
      // Single trigger instead of per-job queue messages
      if (stats.jobsInserted > 0) {
        await triggerProcessing(env.PROCESS_JOBS_QUEUE, stats.jobsInserted, traceId);
      }
      return jsonResponse(
        { success: true, message: "Ingestion complete", traceId, stats },
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
        body.jobs.map((job) => insertJob(env.DB, job, traceId)),
      );

      const successful = insertResults.filter((r) => r.success && r.jobId != null);
      const newJobs = successful.filter((r) => r.isNew);
      const failed = insertResults.filter((r) => !r.success);

      // Single trigger for new jobs (1 queue op instead of N_jobs ops)
      if (newJobs.length > 0) {
        await triggerProcessing(env.PROCESS_JOBS_QUEUE, newJobs.length, traceId);
      }

      log({
        worker: WORKER, action: "insert-batch", level: "info", traceId,
        metadata: {
          total: body.jobs.length, success: successful.length,
          new: newJobs.length, failed: failed.length,
        },
      });

      return jsonResponse(
        {
          success: failed.length === 0,
          traceId,
          message: `Inserted ${successful.length}/${body.jobs.length} jobs (${newJobs.length} new)`,
          data: {
            totalJobs: body.jobs.length,
            successCount: successful.length,
            newCount: newJobs.length,
            skippedCount: successful.length - newJobs.length,
            failCount: failed.length,
            jobIds: successful.map((r) => r.jobId),
            failures: failed.map((r) => r.error),
          },
        },
        { status: 200, headers: corsHeaders },
      );
    } catch (error) {
      log({
        worker: WORKER, action: "insert-request", level: "error", traceId,
        error: error instanceof Error ? error.message : String(error),
      });
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
    const traceId = generateTraceId();
    const start = Date.now();

    log({
      worker: WORKER, action: "scheduled-start", level: "info", traceId,
      metadata: { cron: event.cron },
    });

    try {
      // Phase 1: Auto-ingest from ATS sources — no arbitrary cap; process all stale boards
      const ingestionStats = await autoIngestFromSources(
        env.DB,
        { maxSources: 500, stalePeriodHours: 12, traceId },
      );

      // Phase 2: Recover stalled jobs
      const recovery = await recoverStalledJobs(env.DB, traceId);

      // Phase 3: Single trigger to process-jobs (1 queue op instead of N_jobs ops)
      const totalToProcess = ingestionStats.jobsInserted + recovery.recovered;
      if (totalToProcess > 0) {
        await triggerProcessing(env.PROCESS_JOBS_QUEUE, totalToProcess, traceId);
      }

      log({
        worker: WORKER, action: "scheduled-complete", level: "info", traceId,
        duration_ms: Date.now() - start,
        metadata: {
          sourcesChecked: ingestionStats.sourcesChecked,
          jobsInserted: ingestionStats.jobsInserted,
          jobsEnqueued: ingestionStats.jobsEnqueued,
          recovered: recovery.recovered,
          errors: ingestionStats.errors.length,
        },
      });
    } catch (error) {
      log({
        worker: WORKER, action: "scheduled-failed", level: "error", traceId,
        error: error instanceof Error ? error.message : String(error),
        duration_ms: Date.now() - start,
      });
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
    const traceIds = new Set<string>();

    for (const message of batch.messages) {
      try {
        const { jobId, traceId } = message.body;

        if (typeof jobId !== "number" || !Number.isFinite(jobId)) {
          // Log invalid message instead of silently acking
          log({
            worker: WORKER, action: "queue-consume", level: "error",
            traceId,
            error: `Invalid jobId in queue message: ${JSON.stringify(message.body)}`,
          });
          message.ack(); // Still ack to prevent infinite retry of bad messages
          continue;
        }

        jobIds.push(jobId);
        if (traceId) traceIds.add(traceId);
        message.ack();
      } catch (err) {
        log({
          worker: WORKER, action: "queue-consume", level: "error",
          error: err instanceof Error ? err.message : String(err),
        });
        message.retry();
      }
    }

    if (jobIds.length === 0) return;

    const batchTraceId = traceIds.size === 1 ? [...traceIds][0] : generateTraceId();

    log({
      worker: WORKER, action: "queue-batch", level: "info",
      traceId: batchTraceId,
      metadata: { jobCount: jobIds.length, batchSize: batch.messages.length },
    });

    // Trigger processing for the batch
    const triggered =
      env.PROCESS_JOBS_QUEUE
        ? await triggerProcessing(env.PROCESS_JOBS_QUEUE, jobIds.length, batchTraceId).then(() => true)
        : await triggerProcessingViaHTTP(env, "process", jobIds.length, batchTraceId);

    if (!triggered) {
      log({
        worker: WORKER, action: "queue-batch", level: "info",
        traceId: batchTraceId,
        metadata: { deferred: true, reason: "No process-jobs trigger available" },
      });
    }
  },
};
