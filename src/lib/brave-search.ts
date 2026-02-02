/**
 * Brave Search API integration for discovering ATS job sources
 */

import _ from "lodash";

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
  const blob = _.chain([r.title, r.description, ...(r.extra_snippets ?? [])])
    .compact()
    .join(" ")
    .toLower()
    .value();

  // Must indicate remote (or very similar)
  const hasRemote = _.some(
    [/\bremote\b/, /work from home/, /\bwfh\b/],
    (pattern: RegExp) => pattern.test(blob),
  );

  // Must indicate EU-ish scope
  const hasEuScope = _.some(
    [
      /\beurope\b/,
      /\beu\b/,
      /\bemea\b/,
      /\bcet\b/,
      /gmt\+1|gmt\+2/,
      /european union/,
    ],
    (pattern: RegExp) => pattern.test(blob),
  );

  // Reject common non-fully-remote indicators
  const rejects = _.some(
    [/\bhybrid\b/, /\bonsite\b/, /\bon-site\b/, /\bin[- ]office\b/],
    (pattern: RegExp) => pattern.test(blob),
  );

  // Optional: reject obvious "remote US only" phrases
  const usOnly = _.some(
    [
      /remote\s*(?:-|\(|,)?\s*(?:us|usa|united states)\b/,
      /\b(us only|usa only|united states only)\b/,
    ],
    (pattern: RegExp) => pattern.test(blob),
  );

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

  const paramMappings: Record<string, string | undefined> = {
    freshness: params.freshness,
    country: params.country,
    search_lang: params.search_lang,
    ui_lang: params.ui_lang,
    count: !_.isNil(params.count)
      ? String(_.min([20, params.count]))
      : undefined,
    offset: !_.isNil(params.offset) ? String(params.offset) : undefined,
    safesearch: params.safesearch,
    extra_snippets: params.extra_snippets ? "true" : undefined,
  };

  _.forEach(paramMappings, (value: string | undefined, key: string) => {
    if (!_.isNil(value)) {
      url.searchParams.set(key, value);
    }
  });

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), _.get(params, "timeoutMs", 8000));

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

  const rate = _.mapValues(
    {
      "x-ratelimit-limit": "X-RateLimit-Limit",
      "x-ratelimit-remaining": "X-RateLimit-Remaining",
      "x-ratelimit-reset": "X-RateLimit-Reset",
    },
    (headerName: string) => res.headers.get(headerName) ?? "",
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`❌ Brave API ${res.status} ${res.statusText}: ${errorText}`);
    throw new Error(`Brave API ${res.status}: ${errorText}`);
  }

  const data = (await res.json()) as BraveResponse;

  // Debug: Log response structure
  const results = _.get(data, "web.results", []) as BraveWebResult[];
  if (_.isEmpty(results)) {
    console.log(`   ⚠️  Query returned 0 results. Response:`, {
      hasWeb: !_.isNil(data.web),
      resultsCount: _.size(results),
      moreAvailable: _.get(data, "query.more_results_available"),
      query: _.truncate(params.q, { length: 50 }),
    });
  }

  const more = _.get(data, "query.more_results_available", false) as boolean;

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
    const hostname = _.toLower(parsed.hostname);
    const path = parsed.pathname;

    // helper: capture first segment with or without trailing slash
    const firstSeg = (p: string) =>
      _.get(p.match(/^\/([^\/]+)(?:\/|$)/), "[1]");

    const atsConfigs = {
      greenhouse: {
        hosts: ["boards.greenhouse.io", "job-boards.greenhouse.io"],
        apiTemplate: (company: string) =>
          `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`,
      },
      lever: {
        hosts: ["jobs.lever.co"],
        apiTemplate: (company: string) =>
          `https://api.lever.co/v0/postings/${company}`,
      },
      ashby: {
        hosts: ["jobs.ashbyhq.com"],
        apiTemplate: (company: string) =>
          `https://api.ashbyhq.com/posting-api/job-board/${company}`,
      },
      workable: {
        hosts: ["apply.workable.com"],
        apiTemplate: (company: string) =>
          `https://apply.workable.com/api/v3/accounts/${company}/jobs`,
      },
    };

    const matchedEntry = _.find(_.entries(atsConfigs), ([, config]) =>
      _.includes(config.hosts, hostname),
    );

    if (matchedEntry) {
      const [kind, config] = matchedEntry;
      const company = firstSeg(path);
      if (company) {
        return {
          kind: kind as JobSource["kind"],
          company_key: company,
          canonical_url: config.apiTemplate(company),
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
  const { freshness, maxPages, perPage, onlyEuFullyRemote } = _.defaults(
    options,
    {
      maxPages: 3,
      perPage: 20,
      onlyEuFullyRemote: true,
    },
  );

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

        const offset = page * _.min([20, perPage])!; // ✅ correct meaning of offset

        const result = await braveSearch(apiKey, {
          q: discoveryQuery.q,
          freshness,
          count: _.min([20, perPage]),
          offset,
          extra_snippets: true,
        });

        stats.queriesRun++;
        stats.resultsFound += _.size(result.results);

        console.log(
          `  ${discoveryQuery.kind} page=${page} offset=${offset}: ${_.size(result.results)} results`,
        );

        let addedThisPage = 0;

        _.forEach(result.results, (item: BraveWebResult) => {
          if (!item.url) return;

          if (onlyEuFullyRemote && !looksLikeEuFullyRemote(item)) {
            stats.filteredOut++;
            return;
          }

          const source = extractJobSource(item.url);
          if (!source) return;

          const key = `${source.kind}:${source.company_key}`;
          if (!discovered.has(key)) {
            discovered.set(key, source);
            stats.sourcesExtracted++;
            addedThisPage++;
            console.log(`    ✓ Found ${source.kind}: ${source.company_key}`);
          }
        });

        // Early stop: if Brave says no more, or we're no longer finding new sources
        if (!result.more) break;
        if (page >= 1 && addedThisPage === 0) break;
        if (_.size(result.results) < _.min([20, perPage])!) break;
      } catch (error: unknown) {
        stats.errors.push(
          `${discoveryQuery.kind} page ${page}: ${_.get(error, "message", String(error))}`,
        );
        console.error(`❌ Error: ${_.get(error, "message", String(error))}`);
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    }
  }

  const sources = Array.from(discovered.values());

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
