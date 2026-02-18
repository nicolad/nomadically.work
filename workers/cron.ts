/**
 * Cloudflare Workers Cron — Job Source Discovery
 *
 * Runs daily at midnight UTC to discover new ATS job boards via Brave Search.
 * After discovery, triggers the insert-jobs worker to auto-ingest from the
 * newly discovered sources.
 */

interface Env {
  DB: D1Database;
  BRAVE_API_KEY: string;
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

type BraveWebResult = {
  title?: string;
  url?: string;
  description?: string;
  extra_snippets?: string[];
};

type BraveResponse = {
  query?: { more_results_available?: boolean };
  web?: { results?: BraveWebResult[] };
};

type JobSource = {
  kind: "greenhouse" | "lever" | "ashby" | "workable" | "onhires" | "unknown";
  company_key: string;
  canonical_url?: string;
  first_seen_at: number;
};

// ATS domain constants (inlined to avoid cross-worker imports)
const ASHBY_JOBS_DOMAIN = "jobs.ashbyhq.com";
const ASHBY_API_DOMAIN = "api.ashbyhq.com";

const DISCOVERY_QUERIES = [
  {
    kind: "greenhouse",
    q: [
      "site:boards.greenhouse.io",
      '("remote" OR "fully remote" OR "100% remote" OR "work from home")',
      '("Europe" OR EU OR EMEA OR CET OR "GMT+1" OR "GMT+2")',
      "-hybrid -onsite -on-site -office -in-office",
      '-"United States" -"U.S." -Canada -India -Australia',
    ].join(" "),
  },
  {
    kind: "greenhouse",
    q: [
      "site:job-boards.greenhouse.io",
      '("remote" OR "fully remote" OR "100% remote" OR "work from home")',
      '("Europe" OR EU OR EMEA OR CET OR "GMT+1" OR "GMT+2")',
      "-hybrid -onsite -on-site -office -in-office",
      '-"United States" -"U.S." -Canada -India -Australia',
    ].join(" "),
  },
  {
    kind: "lever",
    q: [
      "site:jobs.lever.co",
      '("remote" OR "fully remote" OR "100% remote")',
      '("Europe" OR EU OR EMEA OR CET OR "GMT+1" OR "GMT+2")',
      "-hybrid -onsite -on-site -office -in-office",
      '-"United States" -"U.S." -Canada -India -Australia',
    ].join(" "),
  },
  {
    kind: "ashby",
    q: [
      `site:${ASHBY_JOBS_DOMAIN}`,
      '("remote" OR "fully remote" OR "100% remote")',
      '("Europe" OR EU OR EMEA OR CET OR "GMT+1" OR "GMT+2")',
      "-hybrid -onsite -on-site -office -in-office",
      '-"United States" -"U.S." -Canada -India -Australia',
    ].join(" "),
  },
  {
    kind: "workable",
    q: [
      "(site:apply.workable.com OR site:workable.com)",
      '("remote" OR "fully remote" OR "100% remote")',
      '("Europe" OR EU OR EMEA OR CET OR "GMT+1" OR "GMT+2")',
      "-hybrid -onsite -on-site -office -in-office",
      '-"United States" -"U.S." -Canada -India -Australia',
    ].join(" "),
  },
  {
    kind: "onhires",
    q: [
      "site:onhires.com",
      '("remote" OR "fully remote" OR "100% remote")',
      '("Europe" OR EU OR EMEA OR CET OR "GMT+1" OR "GMT+2")',
      "-hybrid -onsite -on-site -office -in-office",
      '-"United States" -"U.S." -Canada -India -Australia',
    ].join(" "),
  },
] as const;

async function braveSearch(
  apiKey: string,
  params: {
    q: string;
    freshness?: string;
    count?: number;
    offset?: number;
    extra_snippets?: boolean;
  },
): Promise<{
  results: BraveWebResult[];
  more: boolean;
}> {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", params.q);
  if (params.freshness) url.searchParams.set("freshness", params.freshness);
  if (params.count != null)
    url.searchParams.set("count", String(Math.min(20, params.count)));
  if (params.offset != null)
    url.searchParams.set("offset", String(params.offset));
  if (params.extra_snippets) url.searchParams.set("extra_snippets", "true");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
      "Cache-Control": "no-cache",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Brave API ${res.status} ${res.statusText}: ${errorText}`);
    throw new Error(`Brave API ${res.status}: ${errorText}`);
  }

  const data = (await res.json()) as BraveResponse;
  const results = data.web?.results ?? [];
  const more = Boolean(data.query?.more_results_available);

  return { results, more };
}

function looksLikeEuFullyRemote(r: BraveWebResult): boolean {
  const blob = [r.title, r.description, ...(r.extra_snippets ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasRemote =
    /\bremote\b/.test(blob) ||
    /work from home/.test(blob) ||
    /\bwfh\b/.test(blob);

  const hasEuScope =
    /\beurope\b/.test(blob) ||
    /\beu\b/.test(blob) ||
    /\bemea\b/.test(blob) ||
    /\bcet\b/.test(blob) ||
    /gmt\+1|gmt\+2/.test(blob) ||
    /european union/.test(blob);

  const rejects =
    /\bhybrid\b/.test(blob) ||
    /\bonsite\b/.test(blob) ||
    /\bon-site\b/.test(blob) ||
    /\bin[- ]office\b/.test(blob);

  const usOnly =
    /remote\s*(?:-|\(|,)?\s*(?:us|usa|united states)\b/.test(blob) ||
    /\b(us only|usa only|united states only)\b/.test(blob);

  return hasRemote && hasEuScope && !rejects && !usOnly;
}

function extractJobSource(url: string): JobSource | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname;

    const firstSeg = (p: string) => p.match(/^\/([^\/]+)(?:\/|$)/)?.[1];

    if (
      hostname === "boards.greenhouse.io" ||
      hostname === "job-boards.greenhouse.io"
    ) {
      const company = firstSeg(path);
      if (company) {
        return {
          kind: "greenhouse",
          company_key: company,
          canonical_url: `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`,
          first_seen_at: Date.now(),
        };
      }
    }

    if (hostname === "jobs.lever.co") {
      const company = firstSeg(path);
      if (company) {
        return {
          kind: "lever",
          company_key: company,
          canonical_url: `https://api.lever.co/v0/postings/${company}`,
          first_seen_at: Date.now(),
        };
      }
    }

    if (hostname === ASHBY_JOBS_DOMAIN) {
      const company = firstSeg(path);
      if (company) {
        return {
          kind: "ashby",
          company_key: company,
          canonical_url: `https://${ASHBY_API_DOMAIN}/posting-api/job-board/${company}`,
          first_seen_at: Date.now(),
        };
      }
    }

    if (hostname === "apply.workable.com") {
      const company = firstSeg(path);
      if (company) {
        return {
          kind: "workable",
          company_key: company,
          canonical_url: `https://apply.workable.com/api/v3/accounts/${company}/jobs`,
          first_seen_at: Date.now(),
        };
      }
    }

    if (hostname === "onhires.com") {
      const company = firstSeg(path);
      if (company) {
        return {
          kind: "onhires",
          company_key: company,
          canonical_url: `https://onhires.com/${company}/jobs`,
          first_seen_at: Date.now(),
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function discoverJobSources(
  env: Env,
  options: {
    freshness?: string;
    maxPages?: number;
    perPage?: number;
    onlyEuFullyRemote?: boolean;
  } = {},
): Promise<{
  success: boolean;
  message: string;
  stats: {
    queriesRun: number;
    resultsFound: number;
    sourcesExtracted: number;
    errors: string[];
    filteredOut: number;
  };
  sources: JobSource[];
}> {
  const {
    freshness = "pw",
    maxPages = 3,
    perPage = 20,
    onlyEuFullyRemote = true,
  } = options;

  console.log(
    `Discovering jobs via Brave Search (freshness: ${freshness}, pages: ${maxPages}, perPage: ${perPage})...`,
  );

  const discovered = new Map<string, JobSource>();
  const stats = {
    queriesRun: 0,
    resultsFound: 0,
    sourcesExtracted: 0,
    errors: [] as string[],
    filteredOut: 0,
  };

  for (const discoveryQuery of DISCOVERY_QUERIES) {
    for (let page = 0; page < maxPages; page++) {
      try {
        // Rate limit: 1 req/sec for free tier
        if (stats.queriesRun > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1100));
        }

        const offset = page * Math.min(20, perPage);

        const result = await braveSearch(env.BRAVE_API_KEY, {
          q: discoveryQuery.q,
          freshness,
          count: Math.min(20, perPage),
          offset,
          extra_snippets: true,
        });

        stats.queriesRun++;
        stats.resultsFound += result.results.length;

        console.log(
          `  ${discoveryQuery.kind} page=${page} offset=${offset}: ${result.results.length} results`,
        );

        let addedThisPage = 0;

        for (const item of result.results) {
          if (!item.url) continue;

          if (onlyEuFullyRemote && !looksLikeEuFullyRemote(item)) {
            stats.filteredOut++;
            continue;
          }

          const source = extractJobSource(item.url);
          if (!source) continue;

          const key = `${source.kind}:${source.company_key}`;
          if (!discovered.has(key)) {
            discovered.set(key, source);
            stats.sourcesExtracted++;
            addedThisPage++;
            console.log(`    Found ${source.kind}: ${source.company_key}`);
          }
        }

        // Early stop
        if (!result.more) break;
        if (page >= 1 && addedThisPage === 0) break;
        if (result.results.length < Math.min(20, perPage)) break;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        stats.errors.push(`${discoveryQuery.kind} page ${page}: ${msg}`);
        console.error(`Error: ${msg}`);
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    }
  }

  const sources = [...discovered.values()];

  console.log(
    `Brave discovery complete: ${stats.sourcesExtracted} sources found (filtered out: ${stats.filteredOut})`,
  );

  return {
    success: true,
    message: `Found ${stats.sourcesExtracted} job sources from ${stats.queriesRun} queries (filtered out: ${stats.filteredOut})`,
    stats,
    sources,
  };
}

// ---------------------------------------------------------------------------
// Trigger job ingestion after discovery
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
        const data = (await res.json()) as { stats?: { jobsInserted?: number } };
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
        const result = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM job_sources",
        ).first();
        return new Response(
          JSON.stringify({
            status: "healthy",
            sourceCount: result?.count,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ status: "unhealthy", error: String(err) }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    // GET /discover — manual trigger for testing
    if (url.pathname === "/discover") {
      const result = await discoverJobSources(env, {
        freshness: "pm",
        maxPages: 2,
        perPage: 20,
        onlyEuFullyRemote: true,
      });

      // Save sources
      let savedCount = 0;
      for (const source of result.sources) {
        try {
          await env.DB.prepare(
            `INSERT OR IGNORE INTO job_sources (kind, company_key, canonical_url, first_seen_at)
             VALUES (?, ?, ?, ?)`,
          )
            .bind(
              source.kind,
              source.company_key,
              source.canonical_url || "",
              new Date(source.first_seen_at).toISOString(),
            )
            .run();
          savedCount++;
        } catch (err) {
          console.error(`Failed to save ${source.kind}/${source.company_key}:`, err);
        }
      }

      return new Response(
        JSON.stringify({
          ...result,
          savedCount,
          message: `${result.message}; saved ${savedCount} to D1`,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        message: "Job discovery cron worker. Endpoints: /health, /discover",
        hint: "Cron runs daily at midnight UTC. Use /discover for manual trigger.",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  },

  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    console.log("Cron: Starting job source discovery...");

    try {
      const result = await discoverJobSources(env, {
        freshness: "pm",
        maxPages: 3,
        perPage: 20,
        onlyEuFullyRemote: true,
      });

      console.log(`Discovered ${result.stats.sourcesExtracted} sources`);

      // Save discovered sources to D1
      let savedCount = 0;
      if (result.sources.length > 0) {
        console.log("Saving sources to D1...");

        // Batch saves using D1 batch API
        const stmts = result.sources.map((source) =>
          env.DB.prepare(
            `INSERT OR IGNORE INTO job_sources (kind, company_key, canonical_url, first_seen_at)
             VALUES (?, ?, ?, ?)`,
          ).bind(
            source.kind,
            source.company_key,
            source.canonical_url || "",
            new Date(source.first_seen_at).toISOString(),
          ),
        );

        // D1 batch supports up to 100 statements
        for (let i = 0; i < stmts.length; i += 100) {
          const batch = stmts.slice(i, i + 100);
          try {
            await env.DB.batch(batch);
            savedCount += batch.length;
          } catch (err) {
            console.error(`Batch save error (batch ${i / 100}):`, err);
            // Fall back to individual inserts
            for (const stmt of batch) {
              try {
                await stmt.run();
                savedCount++;
              } catch (innerErr) {
                console.error("Individual save error:", innerErr);
              }
            }
          }
        }

        console.log(`Saved ${savedCount}/${result.sources.length} sources to D1`);
      }

      // Trigger job ingestion from the newly discovered (and existing stale) sources
      if (savedCount > 0 || result.stats.sourcesExtracted > 0) {
        console.log("Triggering job ingestion...");
        ctx.waitUntil(triggerIngestion(env, result.stats.sourcesExtracted));
      }

      console.log("Cron job completed");
    } catch (error) {
      console.error("Cron job failed:", error);
      throw error;
    }
  },
};
