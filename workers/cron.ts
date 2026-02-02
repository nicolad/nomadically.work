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
  kind: "greenhouse" | "lever" | "ashby" | "workable" | "unknown";
  company_key: string;
  canonical_url?: string;
  first_seen_at: number;
};

const DISCOVERY_QUERIES = [
  { kind: "greenhouse", q: "site:boards.greenhouse.io remote" },
  { kind: "lever", q: "site:jobs.lever.co remote" },
  { kind: "ashby", q: "site:jobs.ashbyhq.com remote" },
  { kind: "workable", q: "site:apply.workable.com remote" },
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

function extractJobSource(url: string): JobSource | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname;

    if (hostname === "boards.greenhouse.io") {
      const match = path.match(/^\/([^\/]+)\//);
      if (match) {
        return {
          kind: "greenhouse",
          company_key: match[1],
          canonical_url: `https://boards-api.greenhouse.io/v1/boards/${match[1]}/jobs`,
          first_seen_at: Date.now(),
        };
      }
    }

    if (hostname === "jobs.lever.co") {
      const match = path.match(/^\/([^\/]+)\//);
      if (match) {
        return {
          kind: "lever",
          company_key: match[1],
          canonical_url: `https://api.lever.co/v0/postings/${match[1]}`,
          first_seen_at: Date.now(),
        };
      }
    }

    if (hostname === "jobs.ashbyhq.com") {
      const match = path.match(/^\/([^\/]+)\//);
      if (match) {
        return {
          kind: "ashby",
          company_key: match[1],
          canonical_url: `https://api.ashbyhq.com/posting-api/job-board/${match[1]}`,
          first_seen_at: Date.now(),
        };
      }
    }

    if (hostname === "apply.workable.com") {
      const match = path.match(/^\/([^\/]+)\//);
      if (match) {
        return {
          kind: "workable",
          company_key: match[1],
          canonical_url: `https://apply.workable.com/api/v3/accounts/${match[1]}/jobs`,
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
  options: { freshness?: string; maxOffsets?: number } = {},
): Promise<{
  success: boolean;
  message: string;
  stats: {
    queriesRun: number;
    resultsFound: number;
    sourcesExtracted: number;
    errors: string[];
  };
  sources: JobSource[];
}> {
  const { freshness = "pw", maxOffsets = 2 } = options;

  console.log(
    `🔍 Discovering jobs via Brave Search (freshness: ${freshness})...`,
  );

  const discoveredSources: JobSource[] = [];
  const stats = {
    queriesRun: 0,
    resultsFound: 0,
    sourcesExtracted: 0,
    errors: [] as string[],
  };

  for (const discoveryQuery of DISCOVERY_QUERIES) {
    for (let offset = 0; offset <= maxOffsets; offset++) {
      try {
        // Rate limit: 1 req/sec for free tier
        if (stats.queriesRun > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1100));
        }

        const result = await braveSearch(env.BRAVE_API_KEY, {
          q: discoveryQuery.q,
          freshness,
          count: 20,
          offset,
          extra_snippets: true,
        });

        stats.queriesRun++;
        stats.resultsFound += result.results.length;

        console.log(
          `  ${discoveryQuery.kind} offset=${offset}: ${result.results.length} results`,
        );

        for (const item of result.results) {
          if (!item.url) continue;

          const source = extractJobSource(item.url);
          if (source) {
            const isDuplicate = discoveredSources.some(
              (s) =>
                s.kind === source.kind && s.company_key === source.company_key,
            );

            if (!isDuplicate) {
              discoveredSources.push(source);
              stats.sourcesExtracted++;
              console.log(`    ✓ Found ${source.kind}: ${source.company_key}`);
            }
          }
        }

        if (!result.more) break;
      } catch (error: any) {
        stats.errors.push(
          `${discoveryQuery.kind} offset ${offset}: ${error.message}`,
        );
        console.error(`❌ Error: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    }
  }

  console.log(
    `✅ Brave discovery complete: ${stats.sourcesExtracted} sources found`,
  );

  return {
    success: true,
    message: `Found ${stats.sourcesExtracted} job sources from ${stats.queriesRun} queries`,
    stats,
    sources: discoveredSources,
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
        maxOffsets: 1, // 2 pages per query type
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
            console.error(`Failed to save ${source.kind}/${source.company_key}:`, err);
          }
        }
        console.log(`✅ Saved ${savedCount}/${result.sources.length} sources to Turso`);
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
