/**
 * Cloudflare Workers Cron for Job Discovery
 * Runs daily at midnight UTC
 */

import { createClient } from "@libsql/client";

interface Env {
  BRAVE_API_KEY: string;
  TURSO_DB_URL: string;
  TURSO_DB_AUTH_TOKEN: string;
  APP_URL: string;
  CRON_SECRET?: string;
}

interface ScheduledEvent {
  scheduledTime: number;
  cron: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

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
      "site:jobs.ashbyhq.com",
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
    console.error(`❌ Brave API ${res.status} ${res.statusText}: ${errorText}`);
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

    if (hostname === "jobs.ashbyhq.com") {
      const company = firstSeg(path);
      if (company) {
        return {
          kind: "ashby",
          company_key: company,
          canonical_url: `https://api.ashbyhq.com/posting-api/job-board/${company}`,
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
    `🔍 Discovering jobs via Brave Search (freshness: ${freshness}, pages: ${maxPages}, perPage: ${perPage})...`,
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
            console.log(`    ✓ Found ${source.kind}: ${source.company_key}`);
          }
        }

        // Early stop: if Brave says no more, or we're no longer finding new sources
        if (!result.more) break;
        if (page >= 1 && addedThisPage === 0) break;
        if (result.results.length < Math.min(20, perPage)) break;
      } catch (error: any) {
        stats.errors.push(
          `${discoveryQuery.kind} page ${page}: ${error?.message ?? String(error)}`,
        );
        console.error(`❌ Error: ${error?.message ?? String(error)}`);
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    }
  }

  const sources = [...discovered.values()];

  console.log(
    `✅ Brave discovery complete: ${stats.sourcesExtracted} sources found (filtered out: ${stats.filteredOut})`,
  );

  return {
    success: true,
    message: `Found ${stats.sourcesExtracted} job sources from ${stats.queriesRun} queries (filtered out: ${stats.filteredOut})`,
    stats,
    sources,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Manual trigger endpoint for testing
    return new Response(
      JSON.stringify({
        message:
          "This is a scheduled worker. Use wrangler to trigger the cron.",
        hint: "npx wrangler deploy && npx wrangler tail",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  },

  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    console.log("🔄 Cloudflare Cron: Starting job discovery...");

    try {
      const result = await discoverJobSources(env, {
        freshness: "pm", // past month for better results
        maxPages: 3, // 3 pages per query type
        perPage: 20, // Brave max
        onlyEuFullyRemote: true, // Filter for EU + fully remote jobs
      });

      console.log(`✅ Discovered ${result.stats.sourcesExtracted} sources`);
      console.log(`Stats: ${JSON.stringify(result.stats)}`);

      // Save discovered sources to Turso database
      if (result.sources.length > 0) {
        console.log("💾 Saving sources to Turso...");
        const turso = createClient({
          url: env.TURSO_DB_URL,
          authToken: env.TURSO_DB_AUTH_TOKEN,
        });

        let savedCount = 0;
        for (const source of result.sources) {
          try {
            await turso.execute({
              sql: `INSERT OR IGNORE INTO job_sources (kind, company_key, canonical_url, first_seen_at)
                    VALUES (?, ?, ?, ?)`,
              args: [
                source.kind,
                source.company_key,
                source.canonical_url || "",
                new Date(source.first_seen_at).toISOString(),
              ],
            });
            savedCount++;
          } catch (err) {
            console.error(
              `Failed to save ${source.kind}/${source.company_key}:`,
              err,
            );
          }
        }
        console.log(
          `✅ Saved ${savedCount}/${result.sources.length} sources to Turso`,
        );
      }

      // Trigger scoring after job insertion
      if (result.stats.sourcesExtracted > 0 && env.APP_URL) {
        console.log("🎯 Triggering job scoring...");
        ctx.waitUntil(
          fetch(`${env.APP_URL}/api/jobs/score`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${env.CRON_SECRET || ""}`,
            },
          })
            .then((res) => res.json())
            .then((data) => {
              console.log(
                `✅ Scoring triggered: ${data.scoredCount || 0} jobs scored`,
              );
            })
            .catch((err) => {
              console.error("⚠️ Failed to trigger scoring:", err);
            }),
        );
      }

      console.log("✅ Cron job completed successfully");
    } catch (error) {
      console.error("❌ Cron job failed:", error);
      throw error;
    }
  },
};
