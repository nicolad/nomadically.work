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
 * Discovery queries for finding ATS job pages (EU + fully-remote biased)
 *
 * Notes:
 * - Keep queries broad enough to find the company board, but include EU/EMEA/CET hints.
 * - Exclude hybrid/onsite and non-EU geos to reduce noise.
 */
export const DISCOVERY_QUERIES = [
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
      // Workable has both apply.workable.com and <company>.workable.com in the wild.
      "(site:apply.workable.com OR site:workable.com)",
      '("remote" OR "fully remote" OR "100% remote")',
      '("Europe" OR EU OR EMEA OR CET OR "GMT+1" OR "GMT+2")',
      "-hybrid -onsite -on-site -office -in-office",
      '-"United States" -"U.S." -Canada -India -Australia',
    ].join(" "),
  },
] as const;

/**
 * Heuristic filter: accept results that look like "fully remote in EU/Europe/EMEA"
 * using only Brave result text (fast, no extra HTTP).
 */
export function looksLikeEuFullyRemote(r: BraveWebResult): boolean {
  const blob = [r.title, r.description, ...(r.extra_snippets ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Must indicate remote (or very similar)
  const hasRemote =
    /\bremote\b/.test(blob) ||
    /work from home/.test(blob) ||
    /\bwfh\b/.test(blob);

  // Must indicate EU-ish scope
  const hasEuScope =
    /\beurope\b/.test(blob) ||
    /\beu\b/.test(blob) ||
    /\bemea\b/.test(blob) ||
    /\bcet\b/.test(blob) ||
    /gmt\+1|gmt\+2/.test(blob) ||
    /european union/.test(blob);

  // Reject common non-fully-remote indicators
  const rejects =
    /\bhybrid\b/.test(blob) ||
    /\bonsite\b/.test(blob) ||
    /\bon-site\b/.test(blob) ||
    /\bin[- ]office\b/.test(blob);

  // Optional: reject obvious "remote US only" phrases
  const usOnly =
    /remote\s*(?:-|\(|,)?\s*(?:us|usa|united states)\b/.test(blob) ||
    /\b(us only|usa only|united states only)\b/.test(blob);

  return hasRemote && hasEuScope && !rejects && !usOnly;
}

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
 * - Handles both /company and /company/... (no trailing slash bug fix)
 * - Adds Greenhouse alternate host job-boards.greenhouse.io
 */
export function extractJobSource(url: string): JobSource | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname;

    // helper: capture first segment with or without trailing slash
    const firstSeg = (p: string) => p.match(/^\/([^\/]+)(?:\/|$)/)?.[1];

    // Greenhouse (boards.greenhouse.io or job-boards.greenhouse.io)
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

    // Lever
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

    // Ashby
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

    // Workable (apply.workable.com)
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

    return null;
  } catch {
    return null;
  }
}

/**
 * Discover job sources using Brave Search API (EU + fully-remote oriented)
 *
 * Key changes:
 * - Correct Brave offset: offset = page * count
 * - Snippet-based filter to keep only EU + fully remote likely matches
 * - Slightly smarter early-stop when results are sparse
 */
export async function discoverJobSources(
  apiKey: string,
  options: {
    freshness?: string;
    maxPages?: number; // renamed: clearer semantics than maxOffsets
    perPage?: number; // Brave max is 20
    onlyEuFullyRemote?: boolean; // default true
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
    freshness,
    maxPages = 3,
    perPage = 20,
    onlyEuFullyRemote = true,
  } = options;

  console.log(
    `🔍 Discovering jobs via Brave Search (freshness: ${freshness || "all"}, pages: ${maxPages}, perPage: ${perPage})...`,
  );

  const discovered = new Map<string, JobSource>(); // key = `${kind}:${company_key}`
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

        const offset = page * Math.min(20, perPage); // ✅ correct meaning of offset

        const result = await braveSearch(apiKey, {
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
