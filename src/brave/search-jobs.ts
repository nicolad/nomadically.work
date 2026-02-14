/**
 * Job search utilities using Brave Search API
 */

import { createBraveSearchClient, type BraveWebResult } from "./search-client";
import { SEARCH_DEFAULTS } from './constants';

export interface JobSearchOptions {
  /** Search query (e.g., "ai engineer", "machine learning") */
  query: string;

  /** Site to search (e.g., "jobs.ashbyhq.com") */
  site?: string;

  /** Freshness filter: pd=24h, pw=week, pm=month, py=year */
  freshness?: "pd" | "pw" | "pm" | "py" | string;

  /** Country code (ISO 3166-1 alpha-2) */
  country?: string;

  /** Maximum results to retrieve (up to 200) */
  maxResults?: number;

  /** Include extra snippets for more context */
  extraSnippets?: boolean;

  /** Custom API key (uses BRAVE_API_KEY env var if not provided) */
  apiKey?: string;
}

export interface JobResult {
  title: string;
  company?: string;
  url: string;
  description: string;
  snippets?: string[];
  age?: string;
  location?: string;
}

/**
 * Search for jobs on Ashby boards using Brave Search
 */
export async function searchAshbyJobs(
  options: JobSearchOptions,
): Promise<JobResult[]> {
  const {
    query,
    site = SEARCH_DEFAULTS.ASHBY_SITE,
    freshness, // no default - search all time unless specified
    country,
    maxResults = SEARCH_DEFAULTS.MAX_RESULTS,
    extraSnippets = true,
    apiKey,
  } = options;

  const client = createBraveSearchClient(apiKey);
  const jobs: JobResult[] = [];

  // Build search query with site restriction and remote keyword
  const searchQuery = `${query} remote site:${site}`;

  // Paginate through results
  const resultsPerPage = SEARCH_DEFAULTS.RESULTS_PER_PAGE;
  const maxPages = Math.min(Math.ceil(maxResults / resultsPerPage), SEARCH_DEFAULTS.MAX_PAGES);

  for await (const results of client.paginateSearch({
    q: searchQuery,
    freshness,
    country,
    extra_snippets: extraSnippets,
    count: resultsPerPage,
  })) {
    for (const result of results) {
      // Extract company name from Ashby URL
      // Format: https://jobs.ashbyhq.com/{company}/{job-id}
      const company = extractCompanyFromAshbyUrl(result.url);

      jobs.push({
        title: result.title,
        company,
        url: result.url,
        description: result.description,
        snippets: result.extra_snippets,
        age: result.age,
        location: result.location?.name,
      });

      if (jobs.length >= maxResults) {
        return jobs;
      }
    }

    if (jobs.length >= maxResults) {
      break;
    }

    // Check if we've hit max pages
    if (jobs.length / resultsPerPage >= maxPages) {
      break;
    }
  }

  return jobs;
}

/**
 * Extract company name from Ashby job URL
 * Example: https://jobs.ashbyhq.com/openai/abc123 -> "openai"
 */
function extractCompanyFromAshbyUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === SEARCH_DEFAULTS.ASHBY_SITE) {
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      return pathParts[0];
    }
  } catch {
    // Invalid URL
  }
  return undefined;
}

/**
 * Search for AI/ML engineering jobs across all job boards
 */
export async function searchAIJobs(
  options: Omit<JobSearchOptions, "query">,
): Promise<JobResult[]> {
  return searchAshbyJobs({
    ...options,
    query: '"ai engineer" OR "machine learning engineer" OR "ml engineer"',
  });
}

/**
 * Search for remote jobs posted in the last 24 hours
 */
export async function searchRecentJobs(
  query: string,
  site?: string,
): Promise<JobResult[]> {
  return searchAshbyJobs({
    query,
    site,
    freshness: "pd", // past day
    maxResults: 50,
  });
}
