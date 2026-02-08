/**
 * Common Crawl integration for discovering consultancies
 *
 * This module provides tools, workflows, and utilities for:
 * - Querying Common Crawl CDX index
 * - Fetching HTML from WARC archives
 * - Extracting company facts from web pages
 * - Scoring and filtering consultancy companies
 * - Building golden records from crawl data
 */

// ============================================================================
// CCX Tools - Common Crawl data access
// ============================================================================
export {
  ccxGetRecentCrawlIdsTool,
  ccxCdxLatestTool,
  ccxFetchHtmlFromWarcTool,
} from "./ccx-tools.ts";
export type { CollInfo, CdxRecord } from "./ccx-tools.ts";

// ============================================================================
// Consultancy Extraction - Fact extraction and scoring
// ============================================================================
export {
  nowISO,
  sha1Hex,
  normalizeDomain,
  parseSeedsText,
  extractFactsFromHtml,
  scoreFromFactsAndHtml,
  buildGoldenRecord,
  keyUrlsForDomain,
} from "./consultancy-extract.ts";
export type { Evidence, Fact, GoldenRecord } from "./consultancy-extract.ts";

// ============================================================================
// Consultancy Workflow - Discovery orchestration
// ============================================================================
export { discoverConsultanciesCommonCrawlWorkflow } from "./consultancy-workflow.ts";
export type { DiscoverInput, DiscoverOutput } from "./consultancy-workflow.ts";

// ============================================================================
// Legacy Ashby Board Discovery (deprecated, use consultancy workflow instead)
// ============================================================================

/**
 * Common Crawl CDX API response item
 */
export interface CCDXRecord {
  urlkey: string;
  timestamp: string;
  url: string;
  mime: string;
  status: string;
  digest: string;
  length: string;
  offset: string;
  filename: string;
}

/**
 * Get the latest Common Crawl index name
 * @see https://index.commoncrawl.org/collinfo.json
 */
export async function getLatestCrawlIndex(): Promise<string> {
  const response = await fetch("https://index.commoncrawl.org/collinfo.json");
  const indexes = await response.json();

  if (!Array.isArray(indexes) || indexes.length === 0) {
    throw new Error("No Common Crawl indexes found");
  }

  // First item is typically the latest
  return indexes[0].id;
}

/**
 * Query Common Crawl CDX index for Ashby job board URLs
 *
 * @param crawlId - CC crawl index (e.g., "CC-MAIN-2024-10")
 * @returns Array of CDX records
 */
export async function queryAshbyJobBoardURLs(
  crawlId?: string,
): Promise<CCDXRecord[]> {
  const indexToUse = crawlId || (await getLatestCrawlIndex());

  // Query for jobs.ashbyhq.com/* with filters:
  // - Only HTML content (mime:text/html)
  // - Only successful responses (status:200)
  const url = new URL(`https://index.commoncrawl.org/${indexToUse}-index`);
  url.searchParams.set("url", "jobs.ashbyhq.com/*");
  url.searchParams.set("output", "json");
  url.searchParams.set("filter", "mime:text/html");
  url.searchParams.set("filter", "status:200");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(
      `CC CDX query failed: ${response.status} ${response.statusText}`,
    );
  }

  const text = await response.text();

  // CDX returns newline-delimited JSON - fetch all records
  const records: CCDXRecord[] = text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));

  return records;
}

/**
 * Extract board name from Ashby job URL
 *
 * @example
 * extractBoardName("https://jobs.ashbyhq.com/smallpdf/24d10c67-...") → "smallpdf"
 * extractBoardName("https://jobs.ashbyhq.com/assured") → "assured"
 */
export function extractBoardName(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Format: jobs.ashbyhq.com/{BOARD_NAME}/...
    const pathParts = parsed.pathname.split("/").filter(Boolean);

    if (pathParts.length === 0) {
      return null;
    }

    const boardName = pathParts[0].toLowerCase().trim();

    // Filter out non-board paths (from robots.txt and common patterns)
    const excludedPaths = ["meeting", "api", "robots.txt", "sitemap.xml"];

    if (excludedPaths.includes(boardName)) {
      return null;
    }

    return boardName;
  } catch {
    return null;
  }
}

/**
 * Discover unique Ashby job board names from Common Crawl
 *
 * @param crawlId - Optional specific crawl index
 * @returns Set of unique board names
 */
export async function discoverAshbyBoards(
  crawlId?: string,
): Promise<Set<string>> {
  const records = await queryAshbyJobBoardURLs(crawlId);

  const boards = new Set<string>();

  for (const record of records) {
    const boardName = extractBoardName(record.url);

    if (boardName) {
      boards.add(boardName);
    }
  }

  return boards;
}

/**
 * Fetch jobs from a specific Ashby board using their public API
 *
 * @param boardName - The job board identifier
 * @param includeCompensation - Whether to include compensation data
 * @see https://developers.ashbyhq.com/docs/public-job-posting-api
 */
export { fetchAshbyBoardJobs } from "./ashby-client.ts";

