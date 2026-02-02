/**
 * Brave Search API integration for discovering ATS job sources
 */

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

export type JobSource = {
  kind: "greenhouse" | "lever" | "ashby" | "workable" | "unknown";
  company_key: string;
  canonical_url?: string;
  first_seen_at: number;
};

/**
 * Discovery queries for finding ATS job pages
 */
export const DISCOVERY_QUERIES = [
  { kind: "greenhouse", q: 'site:boards.greenhouse.io "Apply for this job"' },
  { kind: "lever", q: 'site:jobs.lever.co "Apply for this job"' },
  { kind: "ashby", q: 'site:jobs.ashbyhq.com "Apply"' },
  { kind: "workable", q: "site:apply.workable.com" },
] as const;

/**
 * Brave Search API - Web Index API for discovering ATS career pages
 */
export async function braveSearch(
  apiKey: string,
  params: {
    q: string;
    freshness?: string;
    country?: string;
    search_lang?: string;
    ui_lang?: string;
    count?: number;
    offset?: number;
    safesearch?: "off" | "moderate" | "strict";
    extra_snippets?: boolean;
    timeoutMs?: number;
  },
): Promise<{
  results: BraveWebResult[];
  more: boolean;
  rate?: Record<string, string>;
}> {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", params.q);
  if (params.freshness) url.searchParams.set("freshness", params.freshness);
  if (params.country) url.searchParams.set("country", params.country);
  if (params.search_lang)
    url.searchParams.set("search_lang", params.search_lang);
  if (params.ui_lang) url.searchParams.set("ui_lang", params.ui_lang);
  if (params.count != null)
    url.searchParams.set("count", String(Math.min(20, params.count)));
  if (params.offset != null)
    url.searchParams.set("offset", String(params.offset));
  if (params.safesearch) url.searchParams.set("safesearch", params.safesearch);
  if (params.extra_snippets) url.searchParams.set("extra_snippets", "true");

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), params.timeoutMs ?? 8000);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
      "Cache-Control": "no-cache",
    },
    signal: ac.signal,
  }).finally(() => clearTimeout(t));

  const rate = {
    "x-ratelimit-limit": res.headers.get("X-RateLimit-Limit") ?? "",
    "x-ratelimit-remaining": res.headers.get("X-RateLimit-Remaining") ?? "",
    "x-ratelimit-reset": res.headers.get("X-RateLimit-Reset") ?? "",
  };

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`❌ Brave API ${res.status} ${res.statusText}: ${errorText}`);
    throw new Error(`Brave API ${res.status}: ${errorText}`);
  }

  const data = (await res.json()) as BraveResponse;

  // Debug: Log response structure
  if (!data.web?.results || data.web.results.length === 0) {
    console.log(`   ⚠️  Query returned 0 results. Response:`, {
      hasWeb: !!data.web,
      resultsCount: data.web?.results?.length ?? 0,
      moreAvailable: data.query?.more_results_available,
      query: params.q.substring(0, 50),
    });
  }

  const results = data.web?.results ?? [];
  const more = Boolean(data.query?.more_results_available);

  return { results, more, rate };
}

/**
 * Extract company key from ATS URLs
 */
export function extractJobSource(url: string): JobSource | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname;

    // Greenhouse
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

    // Lever
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

    // Ashby
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

    // Workable
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

/**
 * Discover job sources using Brave Search API
 */
export async function discoverJobSources(
  apiKey: string,
  options: {
    freshness?: string;
    maxOffsets?: number;
  } = {},
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
  const { freshness, maxOffsets = 2 } = options;

  console.log(
    `🔍 Discovering jobs via Brave Search (freshness: ${freshness || "all"})...`,
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

        const result = await braveSearch(apiKey, {
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
          } else if (offset === 0 && result.results.indexOf(item) < 3) {
            // Log first 3 URLs from first page to help debug
            console.log(`    ✗ No match: ${item.url}`);
          }
        }

        if (!result.more) break;
      } catch (error: any) {
        stats.errors.push(
          `${discoveryQuery.kind} offset ${offset}: ${error.message}`,
        );
        console.error(`❌ Error: ${error.message}`);
        // Avoid hammering API after errors
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
