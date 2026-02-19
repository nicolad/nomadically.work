/**
 * Cloudflare Workers Cron — Company Processing & Job Fetching
 *
 * Runs on a schedule (default: every 6 hours) to:
 * 1. Query newly added companies from ashby-crawler (from companies table)
 * 2. Discover/enrich ATS boards for those companies
 * 3. Fetch jobs from discovered ATS sources
 * 4. Store jobs in D1
 *
 * Prerequisites:
 * - D1 database with companies, ats_boards, and jobs tables
 * - Companies populated by ashby-crawler worker
 */

interface Env {
  DB: D1Database;
  PROCESS_JOBS_WORKER_URL?: string;
  PROCESS_JOBS_QUEUE?: Queue<ProcessJobsMessage>;
}

type Queue<T = unknown> = {
  send(message: T): Promise<void>;
  sendBatch(messages: { body: T }[]): Promise<void>;
};

type ProcessJobsMessage = {
  action: "process" | "enhance" | "tag" | "classify";
  limit: number;
};

type ScheduledEvent = {
  scheduledTime: number;
  cron: string;
};

type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
};

interface Company {
  id: number;
  key: string;
  name: string;
  website?: string;
  category?: string;
  created_at: string;
}

interface AshbyBoard {
  id: number;
  board_name: string;
  job_count: number;
  is_active: boolean;
  last_synced_at?: string;
}

interface Job {
  external_id: string;
  source_kind: string;
  company_key: string;
  title: string;
  location?: string;
  url: string;
  description?: string;
  posted_at: string;
}

// ---------------------------------------------------------------------------
// Ashby Job Fetching
// ---------------------------------------------------------------------------

interface AshbyJobPosting {
  id: string;
  title: string;
  jobUrl: string;
  applyUrl?: string;
  description: string;
  isRemote: boolean;
  isListed: boolean;
  team?: {
    id: string;
    name: string;
  };
  department?: {
    id: string;
    name: string;
  };
  employmentType?: string;
  publishedAt?: string;
  secondaryLocations?: Array<{
    location: string;
    address?: {
      addressLocality?: string;
      addressRegion?: string;
      addressCountry?: string;
    };
  }>;
  compensation?: {
    currency?: string;
    tiers?: Array<{
      id: string;
      title: string;
    }>;
  };
}

interface AshbyBoardResponse {
  title: string;
  jobs: AshbyJobPosting[];
}

async function fetchAshbyJobs(boardName: string): Promise<Job[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${boardName}?includeCompensation=true`;
  const jobs: Job[] = [];

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "nomadically-work-cron/1.0",
      },
    });

    if (!response.ok) {
      console.error(`Ashby API error for ${boardName}: ${response.status}`);
      return jobs;
    }

    const data = (await response.json()) as AshbyBoardResponse;

    if (!data.jobs || data.jobs.length === 0) {
      console.log(`No jobs found for Ashby board: ${boardName}`);
      return jobs;
    }

    for (const posting of data.jobs) {
      if (!posting.isListed) continue;

      const location = posting.secondaryLocations?.[0]?.location || "";

      jobs.push({
        external_id: posting.id,
        source_kind: "ashby",
        company_key: boardName,
        title: posting.title,
        location,
        url: posting.jobUrl,
        description: posting.description,
        posted_at: posting.publishedAt || new Date().toISOString(),
      });
    }

    console.log(
      `Fetched ${jobs.length} jobs from Ashby board: ${boardName}`
    );
  } catch (error) {
    console.error(`Error fetching Ashby jobs for ${boardName}:`, error);
  }

  return jobs;
}

// ---------------------------------------------------------------------------
// Greenhouse Job Fetching
// ---------------------------------------------------------------------------

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  internal_job_id: number;
  updated_at: string;
  publication_date: string;
  location?: {
    name?: string;
  };
  content?: string;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

async function fetchGreenhouseJobs(companyKey: string): Promise<Job[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${companyKey}/jobs`;
  const jobs: Job[] = [];

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "nomadically-work-cron/1.0",
      },
    });

    if (!response.ok) {
      console.error(
        `Greenhouse API error for ${companyKey}: ${response.status}`
      );
      return jobs;
    }

    const data = (await response.json()) as GreenhouseResponse;

    if (!data.jobs || data.jobs.length === 0) {
      console.log(`No jobs found for Greenhouse board: ${companyKey}`);
      return jobs;
    }

    for (const job of data.jobs) {
      jobs.push({
        external_id: String(job.internal_job_id),
        source_kind: "greenhouse",
        company_key: companyKey,
        title: job.title,
        location: job.location?.name,
        url: job.absolute_url,
        description: job.content,
        posted_at: job.publication_date || job.updated_at,
      });
    }

    console.log(
      `Fetched ${jobs.length} jobs from Greenhouse board: ${companyKey}`
    );
  } catch (error) {
    console.error(`Error fetching Greenhouse jobs for ${companyKey}:`, error);
  }

  return jobs;
}

// ---------------------------------------------------------------------------
// Lever Job Fetching
// ---------------------------------------------------------------------------

interface LeverJob {
  id: string;
  title: string;
  jobUrl: string;
  applyUrl?: string;
  createdAt: number;
  workplaceType?: string;
  categories?: {
    location?: Array<{ name: string }>;
  };
  descriptionPlain?: string;
}

interface LeverResponse {
  postings: LeverJob[];
}

async function fetchLeverJobs(companyKey: string): Promise<Job[]> {
  const url = `https://api.lever.co/v0/postings/${companyKey}`;
  const jobs: Job[] = [];

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "nomadically-work-cron/1.0",
      },
    });

    if (!response.ok) {
      console.error(`Lever API error for ${companyKey}: ${response.status}`);
      return jobs;
    }

    const data = (await response.json()) as LeverResponse;

    if (!data.postings || data.postings.length === 0) {
      console.log(`No jobs found for Lever board: ${companyKey}`);
      return jobs;
    }

    for (const posting of data.postings) {
      const location = posting.categories?.location?.[0]?.name;

      jobs.push({
        external_id: posting.id,
        source_kind: "lever",
        company_key: companyKey,
        title: posting.title,
        location,
        url: posting.jobUrl,
        description: posting.descriptionPlain,
        posted_at: new Date(posting.createdAt).toISOString(),
      });
    }

    console.log(`Fetched ${jobs.length} jobs from Lever board: ${companyKey}`);
  } catch (error) {
    console.error(`Error fetching Lever jobs for ${companyKey}:`, error);
  }

  return jobs;
}

// ---------------------------------------------------------------------------
// Database Operations
// ---------------------------------------------------------------------------

async function getRecentCompanies(
  db: D1Database,
  hoursAgo: number = 24
): Promise<Company[]> {
  const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

  const result = await db
    .prepare(
      `SELECT id, key, name, website, category, created_at
       FROM companies
       WHERE created_at > ?
       AND category != 'UNKNOWN'
       AND category != 'DIRECTORY'
       ORDER BY created_at DESC
       LIMIT 100`
    )
    .bind(since)
    .all();

  return (result.results as unknown as Company[]) || [];
}

async function getAtsBoards(
  db: D1Database,
  companyId: number
): Promise<AshbyBoard[]> {
  const result = await db
    .prepare(
      `SELECT id, board_name, job_count, is_active, last_synced_at
       FROM ashby_boards
       WHERE board_name IN (
         SELECT company_key FROM ats_boards WHERE company_id = ?
       )
       AND is_active = 1`
    )
    .bind(companyId)
    .all();

  return (result.results as unknown as AshbyBoard[]) || [];
}

async function upsertJob(db: D1Database, job: Job): Promise<void> {
  await db
    .prepare(
      `INSERT INTO jobs (external_id, source_kind, company_key, title, location, url, description, posted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(external_id) DO UPDATE SET
         title = EXCLUDED.title,
         location = EXCLUDED.location,
         url = EXCLUDED.url,
         description = EXCLUDED.description,
         posted_at = EXCLUDED.posted_at,
         updated_at = datetime('now')`
    )
    .bind(
      job.external_id,
      job.source_kind,
      job.company_key,
      job.title,
      job.location || null,
      job.url,
      job.description || null,
      job.posted_at
    )
    .run();
}

// ---------------------------------------------------------------------------
// Main Processing Logic
// ---------------------------------------------------------------------------

async function processCompanies(
  env: Env,
  options: { hoursAgo?: number; maxCompanies?: number } = {}
): Promise<{
  success: boolean;
  stats: {
    companiesProcessed: number;
    jobsDiscovered: number;
    jobsInserted: number;
    errors: string[];
  };
}> {
  const { hoursAgo = 24, maxCompanies = 50 } = options;
  const stats = {
    companiesProcessed: 0,
    jobsDiscovered: 0,
    jobsInserted: 0,
    errors: [] as string[],
  };

  console.log(
    `Processing companies added in the last ${hoursAgo} hours (max: ${maxCompanies})...`
  );

  try {
    const companies = await getRecentCompanies(env.DB, hoursAgo);

    if (companies.length === 0) {
      console.log("No recent companies found");
      return { success: true, stats };
    }

    console.log(`Found ${companies.length} recent companies`);

    for (const company of companies.slice(0, maxCompanies)) {
      console.log(`Processing company: ${company.name} (${company.key})`);
      stats.companiesProcessed++;

      try {
        let jobsToInsert: Job[] = [];

        // Try to fetch from known ATS sources based on company category
        if (company.key) {
          // Try Ashby first (from ashby-crawler discoveries)
          const ashbyJobs = await fetchAshbyJobs(company.key);
          jobsToInsert.push(...ashbyJobs);

          // Try Greenhouse
          const greenhouseJobs = await fetchGreenhouseJobs(company.key);
          jobsToInsert.push(...greenhouseJobs);

          // Try Lever
          const leverJobs = await fetchLeverJobs(company.key);
          jobsToInsert.push(...leverJobs);
        }

        stats.jobsDiscovered += jobsToInsert.length;

        // Insert jobs into D1
        for (const job of jobsToInsert) {
          try {
            await upsertJob(env.DB, job);
            stats.jobsInserted++;
          } catch (error) {
            const msg =
              error instanceof Error ? error.message : String(error);
            stats.errors.push(
              `Failed to insert job ${job.external_id}: ${msg}`
            );
            console.error(
              `Failed to insert job for ${company.key}/${job.external_id}:`,
              error
            );
          }
        }

        // Rate limiting: be nice to ATS APIs
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        stats.errors.push(`Error processing company ${company.key}: ${msg}`);
        console.error(`Error processing company ${company.key}:`, error);
      }
    }

    console.log(
      `Processing complete: ${stats.companiesProcessed} companies, ${stats.jobsDiscovered} jobs discovered, ${stats.jobsInserted} inserted`
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    stats.errors.push(`Fatal error: ${msg}`);
    console.error("Fatal error:", error);
  }

  return { success: stats.errors.length === 0, stats };
}

async function triggerProcessing(env: Env, jobsInserted: number): Promise<void> {
  if (jobsInserted === 0) {
    console.log("No jobs inserted, skipping process-jobs trigger");
    return;
  }

  // Method 1: Via Queue binding (preferred)
  if (env.PROCESS_JOBS_QUEUE) {
    try {
      await env.PROCESS_JOBS_QUEUE.send({
        action: "classify",
        limit: jobsInserted,
      });
      console.log(`Queued job processing for ${jobsInserted} jobs`);
      return;
    } catch (err) {
      console.error("Queue send error:", err);
    }
  }

  // Method 2: Via HTTP (fallback)
  if (env.PROCESS_JOBS_WORKER_URL) {
    try {
      const response = await fetch(env.PROCESS_JOBS_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "classify",
          limit: jobsInserted,
        }),
      });

      if (response.ok) {
        console.log(
          `Triggered process-jobs worker via HTTP for ${jobsInserted} jobs`
        );
      } else {
        console.error(
          `Process-jobs worker returned ${response.status}: ${await response.text()}`
        );
      }
    } catch (err) {
      console.error("Process-jobs HTTP trigger error:", err);
    }
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // GET /health
    if (url.pathname === "/health") {
      try {
        const result = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM companies"
        ).first();
        return new Response(
          JSON.stringify({
            status: "healthy",
            companyCount: result?.count,
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ status: "unhealthy", error: String(err) }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // GET /process?hours=24&limit=50 — manual trigger for testing
    if (url.pathname === "/process") {
      const hours = parseInt(url.searchParams.get("hours") || "24", 10);
      const limit = parseInt(url.searchParams.get("limit") || "50", 10);

      const result = await processCompanies(env, {
        hoursAgo: hours,
        maxCompanies: limit,
      });

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        message: "Company processing cron worker",
        endpoints: [
          "/health",
          "/process?hours=24&limit=50 (manual trigger for testing)",
        ],
        hint: "Cron runs every 6 hours by default. Use /process for manual trigger.",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  },

  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log("Cron: Starting company processing...");

    try {
      const result = await processCompanies(env, {
        hoursAgo: 24,
        maxCompanies: 50,
      });

      console.log(`Processing result:`, result.stats);

      // Trigger job processing if jobs were inserted
      if (result.stats.jobsInserted > 0) {
        ctx.waitUntil(triggerProcessing(env, result.stats.jobsInserted));
      }

      console.log("Cron job completed");
    } catch (error) {
      console.error("Cron job failed:", error);
      throw error;
    }
  },
};
