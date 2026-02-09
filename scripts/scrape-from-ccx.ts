#!/usr/bin/env tsx
/**
 * Scrape company data from Common Crawl Index (CCX)
 *
 * This is a standalone script with all Common Crawl integration logic consolidated.
 * It discovers companies in two ways:
 * 1. ATS Discovery: Finds companies via job boards (Ashby, Greenhouse, Lever, Workable)
 *    and resolves them to their actual company domains
 * 2. Seed Domains: Directly scrapes configured domains
 *
 * For each discovered company, it extracts data from their website and
 * stores it as company snapshots and facts in the database.
 *
 * Usage:
 *   pnpm ccx:scrape
 */

// ============================================================================
// Imports
// ============================================================================

import { z } from "zod";
import { parseHTML } from "linkedom";
import { createHash } from "node:crypto";
import { gunzipSync, brotliDecompressSync, inflateSync } from "node:zlib";
import { db } from "../src/db/index.ts";
import { companies, companySnapshots, companyFacts } from "../src/db/schema.ts";
import { eq, sql } from "drizzle-orm";
import { writeFileSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ============================================================================
// Logging
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
const logFile = join(__dirname, `ccx-scrape-${timestamp}.log`);

function log(message: string): void {
  const timestamped = `[${new Date().toISOString()}] ${message}`;
  console.log(message);
  try {
    appendFileSync(logFile, timestamped + "\n", "utf-8");
  } catch (e) {
    // Ignore file write errors to not break the script
  }
}

function logError(message: string, error?: any): void {
  const errorMsg = error ? `${message} ${String(error)}` : message;
  const timestamped = `[${new Date().toISOString()}] ERROR: ${errorMsg}`;
  console.error(message, error || "");
  try {
    appendFileSync(logFile, timestamped + "\n", "utf-8");
  } catch (e) {
    // Ignore file write errors
  }
}

// Initialize log file
try {
  writeFileSync(
    logFile,
    `Common Crawl Scrape Log - ${new Date().toISOString()}\n${"-".repeat(80)}\n\n`,
    "utf-8",
  );
} catch (e) {
  console.warn("Could not initialize log file:", e);
}

// ============================================================================
// Types
// ============================================================================

type CollInfo = {
  id: string;
  name?: string;
  timegate?: string;
  cdx_api?: string;
};

type CdxRecord = {
  urlkey?: string;
  timestamp: string; // YYYYMMDDhhmmss
  url: string;
  mime?: string;
  "mime-detected"?: string;
  status?: string;
  digest?: string;
  length: string; // string in CDX
  offset: string; // string in CDX
  filename: string;
  languages?: string;
  encoding?: string;
};

type Evidence = {
  sourceType: "commoncrawl";
  sourceUrl: string;
  crawlId: string;
  captureTimestamp: string;
  observedAtISO: string;
  method: "jsonld" | "meta" | "dom" | "heuristic";
};

type Fact<T> = {
  field: string;
  value: T;
  confidence: number; // 0..1
  evidence: Evidence;
};

type GoldenRecord = {
  firmId: string;
  canonicalDomain: string;
  websiteUrl?: string;

  name?: string;
  description?: string;

  services?: string[];
  locations?: string[];
  phones?: string[];
  emails?: string[];
  sameAs?: string[];

  score: number;
  reasons: string[];

  lastSeenCaptureTimestamp: string;
  lastSeenCrawlId: string;
  sourceUrl: string;

  facts: Array<Fact<any>>;
};

type AtsProvider = "ashby" | "greenhouse" | "lever" | "workable";

type AtsBoard = {
  provider: AtsProvider;
  boardUrl: string; // e.g. https://jobs.ashbyhq.com/acme
  slug: string; // e.g. acme
  crawlId: string;
  captureTimestamp: string;
};

// ============================================================================
// Platform Layer: FetchClient - Global retry/backoff/concurrency
// ============================================================================

class FetchClient {
  private activeFetches = 0;
  private maxConcurrent = 10;
  private queue: Array<() => void> = [];
  private hostLimits = new Map<string, number>();
  private maxPerHost = 5;

  async fetch<T = any>(
    url: string,
    options: {
      timeout?: number;
      retries?: number;
      headers?: Record<string, string>;
      signal?: AbortSignal;
    } = {},
  ): Promise<Response> {
    const { timeout = 20000, retries = 3, headers = {}, signal } = options;
    const host = new URL(url).hostname;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      // Acquire/release per-attempt so retries never bypass concurrency limits
      await this.acquireSlot(host);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      let releasedEarly = false;

      const combinedSignal = signal
        ? this.combineSignals([signal, controller.signal])
        : controller.signal;

      try {
        const response = await fetch(url, {
          headers: { "user-agent": "nomadically-ccx/1.0", ...headers },
          signal: combinedSignal,
        });

        // Retry on 5xx or 429
        if (
          (response.status >= 500 || response.status === 429) &&
          attempt < retries
        ) {
          clearTimeout(timeoutId);
          this.releaseSlot(host);
          releasedEarly = true;
          await this.backoff(attempt);
          continue;
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries) {
          clearTimeout(timeoutId);
          this.releaseSlot(host);
          releasedEarly = true;
          await this.backoff(attempt);
          continue;
        }
      } finally {
        clearTimeout(timeoutId);
        if (!releasedEarly) this.releaseSlot(host);
      }
    }

    throw lastError || new Error(`Failed to fetch ${url}`);
  }

  async fetchJson<T>(url: string, options = {}): Promise<T> {
    const res = await this.fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return (await res.json()) as T;
  }

  private async acquireSlot(host: string): Promise<void> {
    while (
      this.activeFetches >= this.maxConcurrent ||
      (this.hostLimits.get(host) || 0) >= this.maxPerHost
    ) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.activeFetches++;
    this.hostLimits.set(host, (this.hostLimits.get(host) || 0) + 1);
  }

  private releaseSlot(host: string): void {
    this.activeFetches--;
    this.hostLimits.set(
      host,
      Math.max(0, (this.hostLimits.get(host) || 1) - 1),
    );
    const next = this.queue.shift();
    if (next) next();
  }

  private async backoff(attempt: number): Promise<void> {
    const base = 2000; // Increased base delay
    const jitter = Math.random() * 1000;
    const delay = Math.min(base * Math.pow(2, attempt) + jitter, 30000); // Increased max delay
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  private combineSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener("abort", () => controller.abort());
    }
    return controller.signal;
  }
}

const fetchClient = new FetchClient();

// ============================================================================
// Platform Layer: URL Variants - Handle www/http/https/slash differences
// ============================================================================

function generateUrlVariants(url: string): string[] {
  const variants: string[] = [];

  try {
    const parsed = new URL(url);
    const { protocol, hostname, pathname, search } = parsed;

    // Protocol variants
    const protocols = ["https:", "http:"];

    // Hostname variants (www vs non-www)
    const hostnames: string[] = [];
    if (hostname.startsWith("www.")) {
      hostnames.push(hostname, hostname.slice(4));
    } else {
      hostnames.push(hostname, `www.${hostname}`);
    }

    // Path variants (with/without trailing slash)
    const paths: string[] = [pathname];
    if (pathname === "/") {
      paths.push("");
    } else if (pathname.endsWith("/")) {
      paths.push(pathname.slice(0, -1));
    } else {
      paths.push(pathname + "/");
    }

    // Generate all combinations
    for (const proto of protocols) {
      for (const host of hostnames) {
        for (const path of paths) {
          variants.push(`${proto}//${host}${path}${search}`);
        }
      }
    }
  } catch {
    variants.push(url);
  }

  // Deduplicate
  return Array.from(new Set(variants));
}

// ============================================================================
// Platform Layer: WARC/HTTP Decoder - Robust parsing
// ============================================================================

function cdxApiBase(crawlId: string): string {
  return `https://index.commoncrawl.org/${crawlId}-index`;
}

function scoreCapture(rec: CdxRecord): number {
  let score = 0;

  // Prefer 200 status
  const status = parseInt(rec.status || "0");
  if (status === 200) score += 10;
  else if (status >= 200 && status < 300) score += 5;
  else if (status === 301 || status === 302) score += 2;

  // Prefer HTML mime types
  const mime = (rec.mime || "").toLowerCase();
  const mimeDetected = (rec["mime-detected"] || "").toLowerCase();
  if (mime.includes("text/html") || mimeDetected.includes("text/html"))
    score += 10;
  else if (mime.includes("html") || mimeDetected.includes("html")) score += 5;

  // Prefer reasonable sizes (50KB - 2MB compressed)
  const length = parseInt(rec.length || "0");
  if (length >= 50000 && length <= 2000000) score += 5;
  else if (length > 0 && length < 5000000) score += 2;

  // Prefer recent captures (within score context)
  const timestamp = rec.timestamp || "";
  if (timestamp >= "20240000000000") score += 3;
  else if (timestamp >= "20230000000000") score += 2;
  else if (timestamp >= "20220000000000") score += 1;

  return score;
}

function parseHeadersBlock(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of block.split("\r\n")) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    out[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
  }
  return out;
}

/**
 * Minimal chunked decoding for Buffer bodies.
 */
function decodeChunked(body: Buffer): Buffer {
  let i = 0;
  const chunks: Buffer[] = [];
  const CRLF = Buffer.from("\r\n");

  while (i < body.length) {
    const lineEnd = body.indexOf(CRLF, i);
    if (lineEnd === -1) break;

    const sizeLine = body.slice(i, lineEnd).toString("ascii").trim();
    const size = parseInt(sizeLine.split(";")[0], 16);
    if (!Number.isFinite(size) || size < 0) break;

    i = lineEnd + CRLF.length;
    if (size === 0) break;

    chunks.push(body.slice(i, i + size));
    i = i + size + CRLF.length; // skip trailing CRLF
  }

  return Buffer.concat(chunks);
}

/**
 * Extract HTML from a single *unzipped* WARC record by locating the embedded HTTP response.
 * Includes charset sniffing and better WARC/HTTP boundary detection.
 */
function extractHtmlFromUnzippedWarc(unzippedWarc: Buffer): string | null {
  const HDR_END = Buffer.from("\r\n\r\n");
  const LF_LF = Buffer.from("\n\n");
  const HTTP = Buffer.from("HTTP/");

  // WARC headers end first; the embedded HTTP response starts after that.
  let warcHeaderEnd = unzippedWarc.indexOf(HDR_END);
  let headerSepLen = HDR_END.length;

  if (warcHeaderEnd === -1) {
    warcHeaderEnd = unzippedWarc.indexOf(LF_LF);
    headerSepLen = LF_LF.length;
  }
  if (warcHeaderEnd === -1) return null;

  const httpStart = unzippedWarc.indexOf(HTTP, warcHeaderEnd + headerSepLen);
  if (httpStart === -1) return null;

  let httpHeaderEnd = unzippedWarc.indexOf(HDR_END, httpStart);
  let httpSepLen = HDR_END.length;

  if (httpHeaderEnd === -1) {
    // fallback for non-CRLF encodings
    httpHeaderEnd = unzippedWarc.indexOf(LF_LF, httpStart);
    httpSepLen = LF_LF.length;
  }
  if (httpHeaderEnd === -1) return null;

  const headerBytes = unzippedWarc.slice(httpStart, httpHeaderEnd);
  const headerText = headerBytes.toString("ascii");
  const headerLines = headerText.split(/\r?\n/);
  if (headerLines.length < 1) return null;

  // Very light status check (we already filtered status in CDX, but keep it defensive)
  const statusLine = headerLines[0] || "";
  if (!/^HTTP\/\d\.\d\s+200\b/.test(statusLine)) {
    // Some captures can embed non-200; ignore.
    return null;
  }

  const httpHeaders = parseHeadersBlock(headerLines.slice(1).join("\r\n"));
  let body = unzippedWarc.slice(httpHeaderEnd + httpSepLen);

  const te = (httpHeaders["transfer-encoding"] || "").toLowerCase();
  if (te.includes("chunked")) body = decodeChunked(body) as any;

  const ce = (httpHeaders["content-encoding"] || "").toLowerCase();
  try {
    if (ce.includes("gzip")) body = gunzipSync(body);
    else if (ce.includes("br")) body = brotliDecompressSync(body);
    else if (ce.includes("deflate")) body = inflateSync(body);
  } catch {
    // keep body as-is
  }

  // Content-Type gate (helps avoid decoding binaries as text)
  const ct = (httpHeaders["content-type"] || "").toLowerCase();
  const isHtmlByHeader =
    ct.includes("text/html") || ct.includes("application/xhtml+xml");

  // Charset sniff: header first, then meta charset in first ~4KB
  const charsetFromHeader = (() => {
    const m = ct.match(/charset\s*=\s*["']?([a-z0-9._-]+)["']?/i);
    return m?.[1]?.toLowerCase() || "";
  })();

  const asciiProbe = body.slice(0, 4096).toString("ascii");
  const charsetFromMeta = (() => {
    const m1 = asciiProbe.match(/<meta[^>]+charset=["']?([a-z0-9._-]+)["']?/i);
    if (m1?.[1]) return m1[1].toLowerCase();
    const m2 = asciiProbe.match(
      /<meta[^>]+http-equiv=["']content-type["'][^>]+content=["'][^"']*charset=([a-z0-9._-]+)[^"']*["']/i,
    );
    return m2?.[1]?.toLowerCase() || "";
  })();

  const charset = charsetFromHeader || charsetFromMeta || "utf-8";

  let html = "";
  try {
    // Node's WHATWG TextDecoder supports many encodings when ICU is present.
    const dec = new TextDecoder(charset as any, { fatal: false });
    html = dec.decode(body);
  } catch {
    html = body.toString("utf8");
  }

  // If headers didn't say HTML, only accept if we see strong HTML signals.
  if (!isHtmlByHeader) {
    const lower = html.toLowerCase();
    if (
      !lower.includes("<html") &&
      !lower.includes("<body") &&
      !lower.includes("<!doctype html")
    ) {
      return null;
    }
  }

  return html;
}

// ============================================================================
// ATS Discovery - Find companies via job boards
// ============================================================================

function extractAtsBoard(
  url: string,
): { provider: AtsProvider; boardUrl: string; slug: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.replace(/\/+$/, ""); // trim trailing slash
    const parts = path.split("/").filter(Boolean);

    // Ashby: jobs.ashbyhq.com/<company>[/...]
    if (host === "jobs.ashbyhq.com" && parts.length >= 1) {
      const slug = parts[0]!;
      return {
        provider: "ashby",
        slug,
        boardUrl: `https://jobs.ashbyhq.com/${slug}`,
      };
    }

    // Greenhouse: boards.greenhouse.io/<company>[/...]
    if (host === "boards.greenhouse.io" && parts.length >= 1) {
      const slug = parts[0]!;
      return {
        provider: "greenhouse",
        slug,
        boardUrl: `https://boards.greenhouse.io/${slug}`,
      };
    }

    // Lever: jobs.lever.co/<company>[/...]
    if (host === "jobs.lever.co" && parts.length >= 1) {
      const slug = parts[0]!;
      return {
        provider: "lever",
        slug,
        boardUrl: `https://jobs.lever.co/${slug}`,
      };
    }

    // Workable: apply.workable.com/<company>[/...]
    if (host === "apply.workable.com" && parts.length >= 1) {
      const slug = parts[0]!;
      return {
        provider: "workable",
        slug,
        boardUrl: `https://apply.workable.com/${slug}`,
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function discoverAtsBoardsFromCrawl({
  crawlIds,
  perProviderLimit = 2000,
}: {
  crawlIds: string[];
  perProviderLimit?: number;
}): Promise<AtsBoard[]> {
  const providerPrefixes: Array<{ provider: AtsProvider; prefix: string }> = [
    { provider: "ashby", prefix: "https://jobs.ashbyhq.com/" },
    { provider: "greenhouse", prefix: "https://boards.greenhouse.io/" },
    { provider: "lever", prefix: "https://jobs.lever.co/" },
    { provider: "workable", prefix: "https://apply.workable.com/" },
  ];

  const seen = new Set<string>(); // provider|slug
  const out: AtsBoard[] = [];

  // Newest crawls first
  for (const crawlId of crawlIds) {
    for (const p of providerPrefixes) {
      const base = cdxApiBase(crawlId);
      const sp = new URLSearchParams();

      sp.set("url", p.prefix);
      sp.set("matchType", "prefix");
      sp.set("output", "json");
      sp.set("sort", "reverse");
      sp.set("limit", String(perProviderLimit));

      // keep successful HTML captures
      sp.append("filter", "status:200");
      sp.append("filter", "mime:text/html");

      sp.set("fl", ["url", "timestamp", "status", "mime"].join(","));

      const endpoint = `${base}?${sp.toString()}`;

      try {
        const res = await fetchClient.fetch(endpoint, {
          timeout: 30000,
          retries: 2,
        });
        if (!res.ok) continue;

        const text = await res.text();
        const lines = text
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        for (const line of lines) {
          try {
            const rec = JSON.parse(line) as {
              url?: string;
              timestamp?: string;
            };
            if (!rec.url || !rec.timestamp) continue;

            const parsed = extractAtsBoard(rec.url);
            if (!parsed) continue;

            // enforce provider match
            if (parsed.provider !== p.provider) continue;

            const key = `${parsed.provider}|${parsed.slug}`;
            if (seen.has(key)) continue;
            seen.add(key);

            out.push({
              provider: parsed.provider,
              slug: parsed.slug,
              boardUrl: parsed.boardUrl,
              crawlId,
              captureTimestamp: rec.timestamp,
            });
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore provider/crawl failure
      }
    }
  }

  return out;
}

function domainFromUrlMaybe(s: string): string | null {
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    const host = u.hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return null;
  }
}

function isProviderHost(host: string): boolean {
  return [
    "jobs.ashbyhq.com",
    "boards.greenhouse.io",
    "jobs.lever.co",
    "apply.workable.com",
  ].includes(host);
}

function extractCompanyDomainCandidatesFromHtml(html: string): string[] {
  const { document } = parseHTML(html);
  const candidates: string[] = [];

  // canonical
  const canonical =
    (document.querySelector('link[rel="canonical"]') as any)?.getAttribute?.(
      "href",
    ) || "";
  if (canonical) {
    const d = domainFromUrlMaybe(canonical);
    if (d) candidates.push(d);
  }

  // json-ld: organization url / sameAs
  const scripts = Array.from(
    document.querySelectorAll('script[type="application/ld+json"]'),
  );
  for (const s of scripts) {
    const raw = (s.textContent || "").trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const nodes = flattenJsonLd(parsed);
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        if (!isOrgType((node as any)["@type"])) continue;

        const url = (node as any).url;
        if (typeof url === "string") {
          const d = domainFromUrlMaybe(url);
          if (d) candidates.push(d);
        }

        const sameAs = (node as any).sameAs;
        const links = Array.isArray(sameAs) ? sameAs : sameAs ? [sameAs] : [];
        for (const l of links) {
          const d = typeof l === "string" ? domainFromUrlMaybe(l) : null;
          if (d) candidates.push(d);
        }
      }
    } catch {
      // ignore
    }
  }

  // heuristic: nav/header/logo links that go off-provider
  const links = Array.from(document.querySelectorAll("a[href]"))
    .map((a) => (a as any).getAttribute?.("href") || "")
    .map(String)
    .filter(Boolean);

  for (const href of links) {
    if (!/^https?:\/\//i.test(href)) continue;
    const d = domainFromUrlMaybe(href);
    if (d) candidates.push(d);
  }

  // normalize + filter provider domains
  const norm = candidates
    .map((d) => d.toLowerCase())
    .map((d) => (d.startsWith("www.") ? d.slice(4) : d))
    .filter((d) => d && !isProviderHost(d));

  return Array.from(new Set(norm));
}

function pickBestCompanyDomain(candidates: string[]): string | null {
  if (!candidates.length) return null;

  // simple ranking rules:
  // - prefer non-social domains (linkedin/twitter/facebook)
  // - prefer shorter (root) domains vs deep subdomains
  const social = new Set([
    "linkedin.com",
    "twitter.com",
    "x.com",
    "facebook.com",
    "instagram.com",
    "youtube.com",
  ]);
  const score = (d: string) => {
    let s = 0;
    if (!social.has(d)) s += 5;
    if (d.split(".").length <= 3) s += 2; // e.g. example.com, example.co.uk (rough)
    if (!d.includes("careers")) s += 1;
    return s;
  };

  return candidates
    .slice()
    .sort((a, b) => score(b) - score(a) || a.length - b.length)[0]!;
}

async function resolveCompanyDomainFromAtsBoard({
  boardUrl,
  crawlIds,
}: {
  boardUrl: string;
  crawlIds: string[];
}): Promise<{
  companyDomain: string;
  evidenceUrl: string;
  crawlId: string;
  captureTimestamp: string;
} | null> {
  // find best capture for the board URL itself
  let bestCapture: {
    record: CdxRecord;
    score: number;
    crawlId: string;
  } | null = null;

  // Only check first crawl to speed up resolution
  const cap = await findBestCapture(boardUrl, crawlIds[0]);
  if (cap) {
    bestCapture = { ...cap, crawlId: crawlIds[0] };
  }
  if (!bestCapture) return null;

  const offset = Number(bestCapture.record.offset);
  const length = Number(bestCapture.record.length);
  if (!Number.isFinite(offset) || !Number.isFinite(length)) return null;

  const html = await fetchWarcMemberHtml({
    filename: bestCapture.record.filename,
    offset,
    length,
  });
  if (!html) return null;

  const candidates = extractCompanyDomainCandidatesFromHtml(html);
  const picked = pickBestCompanyDomain(candidates);
  if (!picked) return null;

  return {
    companyDomain: picked,
    evidenceUrl: bestCapture.record.url,
    crawlId: bestCapture.crawlId,
    captureTimestamp: bestCapture.record.timestamp,
  };
}

// ============================================================================
// Common Crawl API
// ============================================================================

/**
 * Get newest crawl IDs (CC-MAIN-YYYY-WW), newest-first.
 * Falls back to hardcoded recent crawls if API is unavailable.
 */
async function getRecentCrawlIds(limit: number = 6): Promise<string[]> {
  // Fallback crawl IDs (updated as of February 2026)
  const fallbackCrawlIds = [
    "CC-MAIN-2025-51",
    "CC-MAIN-2025-50",
    "CC-MAIN-2025-49",
    "CC-MAIN-2025-40",
    "CC-MAIN-2025-33",
    "CC-MAIN-2025-26",
    "CC-MAIN-2025-18",
    "CC-MAIN-2025-11",
  ];

  try {
    log("  Attempting to fetch live crawl index list from Common Crawl...");
    const list = await fetchClient.fetchJson<CollInfo[]>(
      "https://index.commoncrawl.org/collinfo.json",
      { timeout: 30000, retries: 3 }, // Longer timeout, fewer retries to fail faster
    );
    const ids = list
      .map((x) => x.id)
      .filter((id) => /^CC-MAIN-\d{4}-\d{2}$/.test(id))
      .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

    log(`  ✓ Fetched ${ids.length} crawl indexes from API`);
    return ids.slice(0, limit);
  } catch (error: any) {
    logError(
      "  ⚠️  Could not fetch live crawl index from Common Crawl API.",
      error,
    );
    log("  Using fallback crawl IDs (may be slightly outdated)");
    log(
      "  💡 To check latest crawls manually: https://commoncrawl.org/get-started",
    );

    // Provide helpful diagnostic info
    if (error?.cause?.code === "ECONNREFUSED") {
      log("  📍 Connection refused - possible causes:");
      log("     • Firewall or proxy blocking the connection");
      log("     • Common Crawl API temporarily down");
      log("     • Network connectivity issue");
      log("  💡 Tip: You can continue using fallback crawl IDs");
    } else if (error?.cause?.code === "ETIMEDOUT") {
      log(
        "  ⏱️  Connection timeout - Common Crawl may be slow or temporarily unavailable",
      );
    } else if (error?.cause?.code === "ENOTFOUND") {
      log("  🌐 DNS resolution failed - check your internet connection");
    } else if (error?.cause?.code) {
      log(`  ℹ️  Network error code: ${error.cause.code}`);
    }

    return fallbackCrawlIds.slice(0, limit);
  }
}

/**
 * Find best CDX capture across multiple URL variants.
 * Returns the highest-scored capture that looks like HTML.
 */
async function findBestCapture(
  url: string,
  crawlId: string,
): Promise<{ record: CdxRecord; score: number } | null> {
  const variants = generateUrlVariants(url);
  const candidates: Array<{ record: CdxRecord; score: number }> = [];

  // Only try first variant to speed up resolution
  const variant = variants[0];
  if (variant) {
    const base = cdxApiBase(crawlId);
    const sp = new URLSearchParams();

    sp.set("url", variant);
    sp.set("output", "json");
    sp.set("sort", "reverse");
    sp.set("limit", "5");

    // ✅ Single filter (2xx OR 3xx). Multiple filter=params are ANDed.
    sp.append("filter", "status:[23][0-9]{2}");

    sp.set(
      "fl",
      [
        "timestamp",
        "url",
        "length",
        "offset",
        "filename",
        "status",
        "mime",
        "mime-detected",
        "encoding",
        "languages",
        "digest",
      ].join(","),
    );

    const endpoint = `${base}?${sp.toString()}`;

    try {
      const res = await fetchClient.fetch(endpoint, { timeout: 10000 });
      if (!res.ok) return null;

      const text = await res.text();
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      for (const line of lines) {
        try {
          const rec = JSON.parse(line) as CdxRecord;

          const mime = String(rec.mime || "").toLowerCase();
          const mimeDetected = String(rec["mime-detected"] || "").toLowerCase();

          const looksHtml =
            mime.includes("text/html") ||
            mime.includes("application/xhtml") ||
            mime.includes("html") ||
            mimeDetected.includes("text/html") ||
            mimeDetected.includes("application/xhtml") ||
            mimeDetected.includes("html");

          if (!looksHtml) continue;
          if (!rec.timestamp || !rec.filename || !rec.offset || !rec.length)
            continue;

          const score = scoreCapture(rec);
          candidates.push({ record: rec, score });
        } catch {
          // ignore malformed line
        }
      }
    } catch {
      // Variant failed
      return null;
    }
  }

  if (candidates.length === 0) return null;

  // Sort by score desc, then timestamp desc
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.record.timestamp.localeCompare(a.record.timestamp);
  });

  return candidates[0];
}

/**
 * Fetch WARC member and extract HTML.
 * Uses fetchClient for retry/backoff.
 */
async function fetchWarcMemberHtml({
  filename,
  offset,
  length,
  maxCompressedBytes = 5_000_000,
  maxUncompressedBytes = 15_000_000,
}: {
  filename: string;
  offset: number;
  length: number;
  maxCompressedBytes?: number;
  maxUncompressedBytes?: number;
}): Promise<string | null> {
  if (length > maxCompressedBytes) return null;

  const warcUrl = `https://data.commoncrawl.org/${filename}`;
  const rangeHeader = `bytes=${offset}-${offset + length - 1}`;

  try {
    const res = await fetchClient.fetch(warcUrl, {
      headers: { range: rangeHeader },
      timeout: 30000,
      retries: 2,
    });

    // Require 206 to avoid accidentally downloading whole WARC files.
    if (res.status !== 206) {
      return null;
    }

    const contentRange = res.headers.get("content-range") || "";
    if (!contentRange.toLowerCase().startsWith("bytes")) {
      return null;
    }

    const gzSlice = Buffer.from(await res.arrayBuffer());
    if (gzSlice.length > maxCompressedBytes) return null;

    // NOTE: gunzipSync can balloon memory; cap via a quick sanity check after unzip.
    const unzipped = gunzipSync(gzSlice);
    if (unzipped.length > maxUncompressedBytes) return null;

    const html = extractHtmlFromUnzippedWarc(unzipped);
    return html;
  } catch (error) {
    // Fetch failed even after retries
    return null;
  }
}

// ============================================================================
// Consultancy Extraction - HTML parsing and fact extraction
// ============================================================================

function nowISO(): string {
  return new Date().toISOString();
}

function sha1Hex(s: string): string {
  return createHash("sha1").update(s).digest("hex");
}

function normalizeDomain(seed: string): string {
  let s = seed.trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  const u = new URL(s);
  const host = u.hostname.toLowerCase();
  return host.startsWith("www.") ? host.slice(4) : host;
}

function parseSeedsText(seedsText: string): string[] {
  const domains = seedsText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(normalizeDomain)
    .filter(Boolean);
  return Array.from(new Set(domains));
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function flattenJsonLd(x: any): any[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.flatMap(flattenJsonLd);
  if (typeof x === "object" && Array.isArray(x["@graph"])) return x["@graph"];
  return [x];
}

function isOrgType(t: unknown): boolean {
  const types = Array.isArray(t) ? t.map(String) : t ? [String(t)] : [];
  return types.some((x) =>
    [
      "Organization",
      "ProfessionalService",
      "LocalBusiness",
      "Corporation",
    ].includes(x),
  );
}

function extractFactsFromHtml(params: {
  html: string;
  crawlId: string;
  captureTimestamp: string;
  sourceUrl: string;
}): Array<Fact<any>> {
  const { html, crawlId, captureTimestamp, sourceUrl } = params;
  const { document } = parseHTML(html);

  const facts: Array<Fact<any>> = [];

  const baseEvidence = (method: Evidence["method"]): Evidence => ({
    sourceType: "commoncrawl",
    sourceUrl,
    crawlId,
    captureTimestamp,
    observedAtISO: nowISO(),
    method,
  });

  // title + meta
  const title = (document.querySelector("title")?.textContent || "").trim();
  if (title) {
    facts.push({
      field: "title",
      value: title,
      confidence: 0.35,
      evidence: baseEvidence("meta"),
    });
  }

  const metaDesc =
    (document.querySelector('meta[name="description"]') as any)
      ?.getAttribute?.("content")
      ?.trim?.() ||
    (document.querySelector('meta[property="og:description"]') as any)
      ?.getAttribute?.("content")
      ?.trim?.() ||
    "";

  if (metaDesc) {
    facts.push({
      field: "description",
      value: metaDesc,
      confidence: 0.6,
      evidence: baseEvidence("meta"),
    });
  }

  const ogSite =
    (document.querySelector('meta[property="og:site_name"]') as any)
      ?.getAttribute?.("content")
      ?.trim?.() || "";
  if (ogSite) {
    facts.push({
      field: "name",
      value: ogSite,
      confidence: 0.7,
      evidence: baseEvidence("meta"),
    });
  }

  // JSON-LD org facts
  const scripts = Array.from(
    document.querySelectorAll('script[type="application/ld+json"]'),
  );
  for (const s of scripts) {
    const raw = (s.textContent || "").trim();
    if (!raw) continue;

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    const nodes = flattenJsonLd(parsed);
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      if (!isOrgType((node as any)["@type"])) continue;

      const ev = baseEvidence("jsonld");

      const name = (node as any).name;
      if (typeof name === "string" && name.trim()) {
        facts.push({
          field: "name",
          value: name.trim(),
          confidence: 0.95,
          evidence: ev,
        });
      }

      const websiteUrl = (node as any).url;
      if (typeof websiteUrl === "string" && websiteUrl.trim()) {
        facts.push({
          field: "websiteUrl",
          value: websiteUrl.trim(),
          confidence: 0.9,
          evidence: ev,
        });
      }

      const sameAs = (node as any).sameAs;
      if (sameAs) {
        const links = Array.isArray(sameAs)
          ? sameAs.map(String)
          : [String(sameAs)];
        const cleaned = links.map((x) => x.trim()).filter(Boolean);
        if (cleaned.length) {
          facts.push({
            field: "sameAs",
            value: uniq(cleaned),
            confidence: 0.9,
            evidence: ev,
          });
        }
      }

      const telephone = (node as any).telephone;
      if (telephone) {
        const phones = Array.isArray(telephone)
          ? telephone.map(String)
          : [String(telephone)];
        const cleaned = phones.map((x) => x.trim()).filter(Boolean);
        if (cleaned.length) {
          facts.push({
            field: "phones",
            value: uniq(cleaned),
            confidence: 0.85,
            evidence: ev,
          });
        }
      }

      const email = (node as any).email;
      if (email) {
        const emails = Array.isArray(email)
          ? email.map(String)
          : [String(email)];
        const cleaned = emails.map((x) => x.trim()).filter(Boolean);
        if (cleaned.length) {
          facts.push({
            field: "emails",
            value: uniq(cleaned),
            confidence: 0.85,
            evidence: ev,
          });
        }
      }

      const address = (node as any).address;
      if (address) {
        const addrs = Array.isArray(address) ? address : [address];
        const locs: string[] = [];
        for (const a of addrs) {
          if (!a) continue;
          if (typeof a === "string") locs.push(a);
          else if (typeof a === "object") {
            const parts = [
              (a as any).streetAddress,
              (a as any).addressLocality,
              (a as any).addressRegion,
              (a as any).postalCode,
              (a as any).addressCountry,
            ]
              .filter(Boolean)
              .map(String);
            if (parts.length) locs.push(parts.join(", "));
          }
        }
        if (locs.length) {
          facts.push({
            field: "locations",
            value: uniq(locs),
            confidence: 0.85,
            evidence: ev,
          });
        }
      }
    }
  }

  // Heuristic emails from body text
  const bodyText = (document.body?.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50_000);
  const emailMatches =
    bodyText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  if (emailMatches.length) {
    facts.push({
      field: "emails",
      value: uniq(emailMatches).slice(0, 10),
      confidence: 0.5,
      evidence: baseEvidence("heuristic"),
    });
  }

  // DOM-ish "services" candidates
  const serviceSet = new Set<string>();
  const headingNodes = Array.from(
    document.querySelectorAll("h1,h2,h3,nav a,a"),
  );
  for (const el of headingNodes) {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (t.length < 3 || t.length > 70) continue;
    if (
      /(services|capabilities|what we do|work|case studies|clients|contact|about)/i.test(
        t,
      )
    )
      continue;
    if (
      /(cloud|data|ai|ml|security|devops|platform|product|design|strategy|commerce|transformation)/i.test(
        t,
      )
    ) {
      serviceSet.add(t);
    }
  }
  if (serviceSet.size) {
    facts.push({
      field: "services",
      value: Array.from(serviceSet).slice(0, 25),
      confidence: 0.55,
      evidence: baseEvidence("dom"),
    });
  }

  return facts;
}

function scoreFromFactsAndHtml(
  html: string,
  facts: Array<Fact<any>>,
): { score: number; reasons: string[] } {
  const { document } = parseHTML(html);
  const reasons: string[] = [];
  let score = 0;

  const hasHighConfOrg = facts.some(
    (f) => f.field === "name" && f.confidence >= 0.9,
  );
  if (hasHighConfOrg) {
    score += 0.18;
    reasons.push("JSON-LD/strong org identity");
  }

  const hrefs = Array.from(document.querySelectorAll("a[href]"))
    .map((a) => (a as any).getAttribute?.("href") || "")
    .map(String);

  const hasServices = hrefs.some((h) =>
    /(\/services\b|\/what-we-do\b|\/capabilit)/i.test(h),
  );
  const hasWork = hrefs.some((h) =>
    /(\/work\b|\/case-?stud|\/clients\b|\/portfolio\b)/i.test(h),
  );
  const hasAbout = hrefs.some((h) =>
    /(\/about\b|\/company\b|\/team\b|\/leadership\b)/i.test(h),
  );
  const hasContact =
    hrefs.some((h) => /(\/contact\b)/i.test(h)) ||
    hrefs.some((h) => /^mailto:|^tel:/i.test(h));

  if (hasServices) {
    score += 0.18;
    reasons.push("Services/capabilities IA");
  }
  if (hasWork) {
    score += 0.18;
    reasons.push("Work/case studies IA");
  }
  if (hasAbout) {
    score += 0.08;
    reasons.push("About/team IA");
  }
  if (hasContact) {
    score += 0.08;
    reasons.push("Contact signals");
  }

  const text = (document.body?.textContent || "")
    .replace(/\s+/g, " ")
    .toLowerCase();
  const intentTerms = [
    "consulting",
    "consultancy",
    "digital transformation",
    "product engineering",
    "modernization",
    "enterprise",
    "platform engineering",
    "data engineering",
    "devops",
    "security",
  ];
  const intentHits = intentTerms.filter((t) => text.includes(t)).length;
  if (intentHits >= 3) {
    score += 0.18;
    reasons.push("Multiple consultancy intent terms");
  } else if (intentHits >= 1) {
    score += 0.1;
    reasons.push("Some consultancy intent terms");
  }

  const maxServices = facts
    .filter((f) => f.field === "services" && Array.isArray(f.value))
    .reduce((acc, f) => Math.max(acc, (f.value as any[]).length), 0);

  if (maxServices >= 6) {
    score += 0.12;
    reasons.push("Service taxonomy breadth");
  } else if (maxServices >= 3) {
    score += 0.07;
    reasons.push("Some service taxonomy");
  }

  const hasLocations = facts.some(
    (f) =>
      f.field === "locations" && Array.isArray(f.value) && f.value.length > 0,
  );
  const hasPhones = facts.some(
    (f) => f.field === "phones" && Array.isArray(f.value) && f.value.length > 0,
  );
  if (hasLocations) {
    score += 0.05;
    reasons.push("Locations/address present");
  }
  if (hasPhones) {
    score += 0.03;
    reasons.push("Phone present");
  }

  if (/(casino|betting|porn|viagra|loan)/i.test(text)) {
    score -= 0.6;
    reasons.push("Spam/irrelevant content penalty");
  }

  score = Math.max(0, Math.min(1, score));
  if (score >= 0.75) reasons.push("High confidence overall");
  if (score < 0.5) reasons.push("Low confidence overall");

  return { score, reasons };
}

function pickBestFact<T>(
  facts: Array<Fact<any>>,
  field: string,
): Fact<T> | undefined {
  const candidates = facts.filter((f) => f.field === field);
  if (!candidates.length) return undefined;

  candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    if (b.evidence.captureTimestamp !== a.evidence.captureTimestamp) {
      return b.evidence.captureTimestamp.localeCompare(
        a.evidence.captureTimestamp,
      );
    }
    return b.evidence.observedAtISO.localeCompare(a.evidence.observedAtISO);
  });

  return candidates[0] as Fact<T>;
}

function buildGoldenRecord(params: {
  domain: string;
  crawlId: string;
  captureTimestamp: string;
  sourceUrl: string;
  html: string;
  facts: Array<Fact<any>>;
}): GoldenRecord {
  const { domain, crawlId, captureTimestamp, sourceUrl, html, facts } = params;

  const firmId = sha1Hex(domain);

  const name =
    pickBestFact<string>(facts, "name")?.value ??
    pickBestFact<string>(facts, "title")?.value;
  const description = pickBestFact<string>(facts, "description")?.value;
  const websiteUrl = pickBestFact<string>(facts, "websiteUrl")?.value;

  const services = pickBestFact<string[]>(facts, "services")?.value;
  const locations = pickBestFact<string[]>(facts, "locations")?.value;
  const phones = pickBestFact<string[]>(facts, "phones")?.value;
  const emails = pickBestFact<string[]>(facts, "emails")?.value;
  const sameAs = pickBestFact<string[]>(facts, "sameAs")?.value;

  const { score, reasons } = scoreFromFactsAndHtml(html, facts);

  return {
    firmId,
    canonicalDomain: domain,
    websiteUrl,
    name,
    description,
    services,
    locations,
    phones,
    emails,
    sameAs,
    score,
    reasons,
    lastSeenCaptureTimestamp: captureTimestamp,
    lastSeenCrawlId: crawlId,
    sourceUrl,
    facts,
  };
}

function keyUrlsForDomain(domain: string, maxPages: number): string[] {
  const base = `https://${domain}`;
  const paths = [
    "/",
    "/about",
    "/company",
    "/services",
    "/what-we-do",
    "/capabilities",
    "/work",
    "/case-studies",
    "/clients",
    "/contact",
    "/locations",
    "/team",
    "/leadership",
  ];
  return paths.slice(0, Math.max(1, maxPages)).map((p) => `${base}${p}`);
}

// ============================================================================
// Platform Layer: Fact Aggregator - Normalize and deduplicate
// ============================================================================

function normalizeEmail(email: string): string {
  return email
    .toLowerCase()
    .replace(/^mailto:/i, "")
    .trim();
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

function normalizeSameAs(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}${u.pathname}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Generate stable identity key for a fact (for deduplication).
 * Uses semantic key: companyId + field + normalized value
 * Evidence (crawlId/timestamp/method) is tracked but doesn't affect identity.
 */
function factIdentityKey(companyId: number, field: string, value: any): string {
  const normalized =
    typeof value === "string"
      ? value.toLowerCase().trim()
      : JSON.stringify(value);
  return sha1Hex(`${companyId}|${field}|${normalized}`);
}

/**
 * Deduplicate facts by (field + normalized value), keeping the best evidence.
 * This prevents duplicate rows in the database and improves data quality.
 */
function dedupeFacts(facts: Array<Fact<any>>): Array<Fact<any>> {
  const normalizeValueKey = (v: any): string => {
    if (v === null || v === undefined) return "null";
    if (typeof v === "string") return v.trim().toLowerCase();
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (Array.isArray(v)) {
      // Canonicalize arrays: normalize items, dedupe, sort
      const items = Array.from(
        new Set(
          v
            .map((x) => {
              if (typeof x === "string") return x.trim().toLowerCase();
              return JSON.stringify(x);
            })
            .filter(Boolean),
        ),
      ).sort();
      return `arr:${JSON.stringify(items)}`;
    }
    // For objects, use stable stringify
    try {
      const keys = Object.keys(v).sort();
      const obj: any = {};
      for (const k of keys) obj[k] = v[k];
      return `obj:${JSON.stringify(obj)}`;
    } catch {
      return String(v);
    }
  };

  const methodRank: Record<Evidence["method"], number> = {
    jsonld: 4,
    meta: 3,
    dom: 2,
    heuristic: 1,
  };

  const isBetter = (a: Fact<any>, b: Fact<any>): boolean => {
    // Prefer higher confidence
    if (a.confidence !== b.confidence) return a.confidence > b.confidence;

    // Tie-break by method quality
    const ar = methodRank[a.evidence.method] ?? 0;
    const br = methodRank[b.evidence.method] ?? 0;
    if (ar !== br) return ar > br;

    // Tie-break by newer capture timestamp
    if (a.evidence.captureTimestamp !== b.evidence.captureTimestamp) {
      return a.evidence.captureTimestamp > b.evidence.captureTimestamp;
    }

    // Final tie-break by observed time
    return a.evidence.observedAtISO > b.evidence.observedAtISO;
  };

  const bestByKey = new Map<string, Fact<any>>();

  for (const f of facts) {
    const key = `${f.field}::${normalizeValueKey(f.value)}`;
    const existing = bestByKey.get(key);

    if (!existing || isBetter(f, existing)) {
      bestByKey.set(key, f);
    }
  }

  return Array.from(bestByKey.values());
}

/**
 * Aggregate facts from multiple pages, normalize values, pick best per field.
 */
function aggregateFacts(allFacts: Array<Fact<any>>): {
  golden: {
    name?: string;
    description?: string;
    websiteUrl?: string;
    services?: string[];
    locations?: string[];
    phones?: string[];
    emails?: string[];
    sameAs?: string[];
  };
  facts: Array<Fact<any>>;
} {
  // Normalize array fields
  const normalizedFacts = allFacts.map((fact) => {
    if (fact.field === "emails" && Array.isArray(fact.value)) {
      return {
        ...fact,
        value: uniq(fact.value.map(normalizeEmail)),
      };
    }
    if (fact.field === "phones" && Array.isArray(fact.value)) {
      return {
        ...fact,
        value: uniq(fact.value.map(normalizePhone)),
      };
    }
    if (fact.field === "sameAs" && Array.isArray(fact.value)) {
      return {
        ...fact,
        value: uniq(fact.value.map(normalizeSameAs)),
      };
    }
    if (fact.field === "services" && Array.isArray(fact.value)) {
      return {
        ...fact,
        value: uniq(fact.value.map((s: string) => s.trim())),
      };
    }
    return fact;
  });

  // Pick best fact per field
  const golden = {
    name:
      pickBestFact<string>(normalizedFacts, "name")?.value ??
      pickBestFact<string>(normalizedFacts, "title")?.value,
    description: pickBestFact<string>(normalizedFacts, "description")?.value,
    websiteUrl: pickBestFact<string>(normalizedFacts, "websiteUrl")?.value,
    services: pickBestFact<string[]>(normalizedFacts, "services")?.value,
    locations: pickBestFact<string[]>(normalizedFacts, "locations")?.value,
    phones: pickBestFact<string[]>(normalizedFacts, "phones")?.value,
    emails: pickBestFact<string[]>(normalizedFacts, "emails")?.value,
    sameAs: pickBestFact<string[]>(normalizedFacts, "sameAs")?.value,
  };

  return { golden, facts: normalizedFacts };
}

// ============================================================================
// Platform Layer: Persistence - Idempotent upserts with stable keys
// ============================================================================

/**
 * Upsert company using canonical_domain as natural key.
 * Returns company_id.
 */
async function upsertCompany(golden: {
  canonicalDomain: string;
  name?: string;
  websiteUrl?: string;
  description?: string;
  services?: string[];
  score: number;
  scoreReasons: string[];
  lastSeenCrawlId: string;
  lastSeenCaptureTimestamp: string;
  lastSeenSourceUrl: string;
}): Promise<number> {
  const {
    canonicalDomain,
    name,
    websiteUrl,
    description,
    services,
    score,
    scoreReasons,
    lastSeenCrawlId,
    lastSeenCaptureTimestamp,
    lastSeenSourceUrl,
  } = golden;

  // Check if exists
  const existing = await db
    .select()
    .from(companies)
    .where(eq(companies.canonical_domain, canonicalDomain))
    .limit(1);

  if (existing.length > 0) {
    const company = existing[0]!;

    // Update only if score improved or fields are better
    await db
      .update(companies)
      .set({
        name: name || company.name,
        website: websiteUrl || company.website,
        description: description || company.description,
        services: services ? JSON.stringify(services) : company.services,
        score: Math.max(score, company.score),
        score_reasons: JSON.stringify(scoreReasons),
        last_seen_crawl_id: lastSeenCrawlId,
        last_seen_capture_timestamp: lastSeenCaptureTimestamp,
        last_seen_source_url: lastSeenSourceUrl,
        updated_at: sql`(datetime('now'))`,
      })
      .where(eq(companies.id, company.id));

    return company.id;
  } else {
    // Insert new
    const [inserted] = await db
      .insert(companies)
      .values({
        key: canonicalDomain.replace(/\./g, "-"),
        name: name || canonicalDomain,
        canonical_domain: canonicalDomain,
        website: websiteUrl,
        description,
        services: services ? JSON.stringify(services) : undefined,
        score,
        score_reasons: JSON.stringify(scoreReasons),
        last_seen_crawl_id: lastSeenCrawlId,
        last_seen_capture_timestamp: lastSeenCaptureTimestamp,
        last_seen_source_url: lastSeenSourceUrl,
      })
      .returning({ id: companies.id });

    return inserted.id;
  }
}

/**
 * Insert snapshot with content_hash deduplication.
 */
async function insertSnapshot({
  companyId,
  sourceUrl,
  crawlId,
  captureTimestamp,
  dominantMethod,
  extracted,
}: {
  companyId: number;
  sourceUrl: string;
  crawlId: string;
  captureTimestamp: string;
  dominantMethod: string;
  extracted: any;
}): Promise<number> {
  const contentHash = sha1Hex(JSON.stringify(extracted));

  // Check if this exact snapshot already exists (by content_hash)
  const existing = await db
    .select()
    .from(companySnapshots)
    .where(
      sql`${companySnapshots.company_id} = ${companyId} AND ${companySnapshots.content_hash} = ${contentHash}`,
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0]!.id;
  }

  const [inserted] = await db
    .insert(companySnapshots)
    .values({
      company_id: companyId,
      source_url: sourceUrl,
      source_type: "COMMONCRAWL",
      crawl_id: crawlId,
      capture_timestamp: captureTimestamp,
      fetched_at: sql`(datetime('now'))`,
      method: dominantMethod.toUpperCase() as any,
      content_hash: contentHash,
      extracted: JSON.stringify(extracted),
    })
    .returning({ id: companySnapshots.id });

  return inserted.id;
}

/**
 * Batch insert facts with identity-based deduplication.
 * Uses INSERT OR IGNORE to skip duplicates.
 */
async function insertFacts(
  companyId: number,
  facts: Array<Fact<any>>,
): Promise<number> {
  if (facts.length === 0) return 0;

  // Build fact rows with identity keys
  const rows = facts.map((fact) => ({
    company_id: companyId,
    field: fact.field,
    value_json:
      typeof fact.value === "object" ? JSON.stringify(fact.value) : null,
    value_text:
      typeof fact.value === "string" ? fact.value : JSON.stringify(fact.value),
    normalized_value: JSON.stringify(fact.value), // Store for future normalization
    confidence: fact.confidence,
    source_type: fact.evidence.sourceType.toUpperCase() as "COMMONCRAWL",
    source_url: fact.evidence.sourceUrl,
    crawl_id: fact.evidence.crawlId,
    capture_timestamp: fact.evidence.captureTimestamp,
    observed_at: fact.evidence.observedAtISO,
    method: fact.evidence.method.toUpperCase() as any,
    content_hash: factIdentityKey(companyId, fact.field, fact.value),
  }));

  // SQLite doesn't have native bulk upsert, so we'll do batch insert with error handling
  let inserted = 0;
  const batchSize = 50;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    try {
      await db.insert(companyFacts).values(batch);
      inserted += batch.length;
    } catch (error) {
      // If batch fails, try one by one (some may be duplicates)
      for (const row of batch) {
        try {
          await db.insert(companyFacts).values(row);
          inserted++;
        } catch {
          // Duplicate, skip
        }
      }
    }
  }

  return inserted;
}

// ============================================================================
// Workflow - Discovery orchestration
// ============================================================================

const InputSchema = z.object({
  domains: z.array(z.string()).min(1),
  recentCrawls: z.number().int().min(1).max(24).default(6),
  maxPagesPerDomain: z.number().int().min(1).max(20).default(6),
  concurrency: z.number().int().min(1).max(30).default(6),
  minScore: z.number().min(0).max(1).default(0.65),
});

const OutputSchema = z.object({
  crawlIds: z.array(z.string()),
  results: z.array(
    z.object({
      canonicalDomain: z.string(),
      firmId: z.string(),
      score: z.number(),
      reasons: z.array(z.string()),
      name: z.string().optional(),
      websiteUrl: z.string().optional(),
      lastSeenCrawlId: z.string(),
      lastSeenCaptureTimestamp: z.string(),
      sourceUrl: z.string(),
      services: z.array(z.string()).optional(),
      locations: z.array(z.string()).optional(),
      sameAs: z.array(z.string()).optional(),
      facts: z.array(
        z.object({
          field: z.string(),
          value: z.any(),
          confidence: z.number(),
          evidence: z.object({
            sourceType: z.literal("commoncrawl"),
            sourceUrl: z.string(),
            crawlId: z.string(),
            captureTimestamp: z.string(),
            observedAtISO: z.string(),
            method: z.enum(["jsonld", "meta", "dom", "heuristic"]),
          }),
        }),
      ),
    }),
  ),
});

type DiscoverInput = z.infer<typeof InputSchema>;
type DiscoverOutput = z.infer<typeof OutputSchema>;

// ============================================================================
// Database & Main Execution
// ============================================================================

const CONFIG = {
  domains: ["thoughtworks.com", "nearform.com", "eq8.eu"],
  recentCrawls: 6,
  maxPagesPerDomain: 6,
  concurrency: 6,
  minScore: 0.0,
  enableAtsDiscovery: true, // Set to false to only use seed domains
  atsDiscoveryLimit: 1500, // Max boards per ATS provider to discover
};

const SEED_LIST_TEXT = ``;

function getDomainsList(): string[] {
  if (SEED_LIST_TEXT.trim()) {
    return parseSeedsText(SEED_LIST_TEXT);
  }
  return CONFIG.domains.map(normalizeDomain).filter(Boolean);
}

function previewDomainUrls(domain: string, maxPages: number): void {
  log(`\nURLs for ${domain}:`);
  const urls = keyUrlsForDomain(domain, maxPages);
  urls.forEach((url, i) => log(`  ${i + 1}. ${url}`));
}

function analyzeFactsQuality(facts: Array<Fact<any>>): Record<string, number> {
  const methodCounts: Record<string, number> = {};
  for (const fact of facts) {
    const method = fact.evidence.method;
    methodCounts[method] = (methodCounts[method] || 0) + 1;
  }
  return methodCounts;
}

function displayFactAnalysis(domain: string, golden: GoldenRecord): void {
  log(`\n[${domain}]`);
  log(`  - Score: ${golden.score.toFixed(2)}`);
  log(`  - Name: ${golden.name || "(none)"}`);
  log(`  - Services: ${golden.services?.length ?? 0}`);
  log(`  - Locations: ${golden.locations?.length ?? 0}`);
  log(`  - Total facts: ${golden.facts.length}`);

  const methods = analyzeFactsQuality(golden.facts);
  log("  - Fact sources: " + JSON.stringify(methods, null, 2));
  log(`  - Reasons: ${golden.reasons.join("; ")}`);
}

function dominantMethod(facts: Array<Fact<any>>): string {
  if (!facts.length) return "META";

  const counts: Record<string, number> = {};
  for (const f of facts) {
    const m = f.evidence.method;
    counts[m] = (counts[m] || 0) + 1;
  }

  let bestMethod = "META";
  let bestCount = 0;
  for (const [method, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      bestMethod = method;
    }
  }

  return bestMethod;
}

/**
 * Harvest a domain: try multiple key URLs, pick best page, aggregate facts.
 * Uses new platform layer: findBestCapture, fetchWarcMemberHtml, aggregateFacts.
 */
async function harvestDomain({
  domain,
  crawlIds,
  maxPagesPerDomain,
}: {
  domain: string;
  crawlIds: string[];
  maxPagesPerDomain: number;
}): Promise<GoldenRecord | null> {
  const urls = keyUrlsForDomain(domain, maxPagesPerDomain);
  const allFacts: Array<Fact<any>> = [];

  let best: {
    crawlId: string;
    captureTimestamp: string;
    sourceUrl: string;
    html: string;
    pageScore: number;
  } | null = null;

  for (const url of urls) {
    // Try each crawl to find best capture for this URL
    let bestCapture: {
      record: CdxRecord;
      score: number;
      crawlId: string;
    } | null = null;

    for (const crawlId of crawlIds) {
      const cap = await findBestCapture(url, crawlId);
      if (cap && (!bestCapture || cap.score > bestCapture.score)) {
        bestCapture = { ...cap, crawlId };
      }
    }

    if (!bestCapture) continue;

    const offset = Number(bestCapture.record.offset);
    const length = Number(bestCapture.record.length);
    if (!Number.isFinite(offset) || !Number.isFinite(length)) continue;

    const html = await fetchWarcMemberHtml({
      filename: bestCapture.record.filename,
      offset,
      length,
    });

    if (!html) continue;

    const pageFacts = extractFactsFromHtml({
      html,
      crawlId: bestCapture.crawlId,
      captureTimestamp: bestCapture.record.timestamp,
      sourceUrl: bestCapture.record.url,
    });
    allFacts.push(...pageFacts);

    const { score: pageScore } = scoreFromFactsAndHtml(html, pageFacts);

    const isBetter =
      !best ||
      pageScore > best.pageScore ||
      (pageScore === best.pageScore &&
        bestCapture.record.timestamp > best.captureTimestamp);

    if (isBetter) {
      best = {
        crawlId: bestCapture.crawlId,
        captureTimestamp: bestCapture.record.timestamp,
        sourceUrl: bestCapture.record.url,
        html,
        pageScore,
      };
    }
  }

  if (!best) return null;

  // ✅ Deduplicate facts before aggregation (prevents duplicate DB rows)
  const dedupedFacts = dedupeFacts(allFacts);

  // Aggregate facts with normalization
  const { golden, facts } = aggregateFacts(dedupedFacts);
  const { score, reasons } = scoreFromFactsAndHtml(best.html, facts);

  return {
    firmId: sha1Hex(domain),
    canonicalDomain: domain,
    websiteUrl: golden.websiteUrl,
    name: golden.name,
    description: golden.description,
    services: golden.services,
    locations: golden.locations,
    phones: golden.phones,
    emails: golden.emails,
    sameAs: golden.sameAs,
    score,
    reasons,
    lastSeenCaptureTimestamp: best.captureTimestamp,
    lastSeenCrawlId: best.crawlId,
    sourceUrl: best.sourceUrl,
    facts,
  };
}

/**
 * Save company data using new idempotent persistence layer.
 */
async function saveCompanyData(results: GoldenRecord[]): Promise<void> {
  log("\n📦 Saving results to database...\n");

  for (const golden of results) {
    const domain = golden.canonicalDomain;

    try {
      // Upsert company
      const companyId = await upsertCompany({
        canonicalDomain: domain,
        name: golden.name,
        websiteUrl: golden.websiteUrl,
        description: golden.description,
        services: golden.services,
        score: golden.score,
        scoreReasons: golden.reasons,
        lastSeenCrawlId: golden.lastSeenCrawlId,
        lastSeenCaptureTimestamp: golden.lastSeenCaptureTimestamp,
        lastSeenSourceUrl: golden.sourceUrl,
      });

      // Insert snapshot (deduped by content_hash)
      await insertSnapshot({
        companyId,
        sourceUrl: golden.sourceUrl,
        crawlId: golden.lastSeenCrawlId,
        captureTimestamp: golden.lastSeenCaptureTimestamp,
        dominantMethod: dominantMethod(golden.facts),
        extracted: golden,
      });

      // Batch insert facts (deduped by identity key)
      const factCount = await insertFacts(companyId, golden.facts);

      log(
        `✅ Saved ${domain} (score=${golden.score.toFixed(2)}, ${factCount} new facts)`,
      );
    } catch (error) {
      logError(`❌ Error saving ${domain}:`, error);
    }
  }

  log("\n✨ Done!\n");
  log(`📝 Log file saved: ${logFile}`);
}

async function main() {
  log("🌐 Common Crawl Company Discovery\n");
  log(`📝 Logging to: ${logFile}\n`);

  log("\n🔍 Running discovery workflow...\n");

  // Fetch crawl IDs using new platform layer
  log("📡 Fetching recent Common Crawl indexes...");
  const crawlIds = await getRecentCrawlIds(CONFIG.recentCrawls);
  log(
    `✓ Using ${crawlIds.length} crawl indexes: ${crawlIds.slice(0, 3).join(", ")}${crawlIds.length > 3 ? "..." : ""}\n`,
  );

  // --- ATS discovery + resolution ---
  let discoveredDomains: string[] = [];

  if (CONFIG.enableAtsDiscovery) {
    log(
      "🧲 Discovering ATS boards (Ashby/Greenhouse/Lever/Workable) from CCX...",
    );
    const boards = await discoverAtsBoardsFromCrawl({
      crawlIds,
      perProviderLimit: CONFIG.atsDiscoveryLimit,
    });
    log(`  ✓ Found ${boards.length} unique ATS boards`);

    log("🔗 Resolving ATS boards to company domains...");
    const resolvedDomains: string[] = [];
    let resolved = 0;
    let attempted = 0;

    // resolve with limited concurrency to avoid CC overload
    const resolveConcurrency = 6; // Reduced from 12 to reduce queue backlog
    let idx = 0;

    log(`  Starting ${resolveConcurrency} concurrent workers...`);
    await Promise.all(
      Array.from({ length: resolveConcurrency }, async () => {
        while (true) {
          const i = idx++;
          const b = boards[i];
          if (!b) return;

          attempted++;
          if (attempted % 10 === 0)
            log(`  ...attempting ${attempted}/${boards.length}`);

          const r = await resolveCompanyDomainFromAtsBoard({
            boardUrl: b.boardUrl,
            crawlIds,
          });
          if (r) {
            resolvedDomains.push(r.companyDomain);
            resolved++;
            if (resolved % 10 === 0)
              log(`  ✓ resolved ${resolved}/${boards.length}`);
          }
        }
      }),
    );

    discoveredDomains = Array.from(
      new Set(resolvedDomains.map(normalizeDomain).filter(Boolean)),
    );
    log(`  ✓ Resolved to ${discoveredDomains.length} unique company domains`);
  } else {
    log(
      "ℹ️  ATS discovery disabled (set CONFIG.enableAtsDiscovery = true to enable)",
    );
  }

  // --- merge with configured seeds (optional) ---
  const seedDomains = getDomainsList();
  const domains = uniq([...seedDomains, ...discoveredDomains])
    .map(normalizeDomain)
    .filter(Boolean);

  if (!domains.length) {
    log(
      "\n⚠️  No domains to process. Add domains to CONFIG.domains or enable ATS discovery.",
    );
    process.exit(0);
  }

  log(`\n📋 Domains to process (seeds + discovered): ${domains.length} total`);
  log(`  - Seed domains: ${seedDomains.length}`);
  log(`  - Discovered from ATS: ${discoveredDomains.length}`);

  // Harvest domains with concurrency (using atomic index for safety)
  log(`\n🔧 Processing ${domains.length} domains...`);
  const results: GoldenRecord[] = [];

  // ✅ Concurrency-safe: use atomic index instead of shared mutable queue
  let nextIndex = 0;

  const workers = Array.from({ length: CONFIG.concurrency }, async () => {
    while (true) {
      const i = nextIndex++;
      const d = domains[i];
      if (!d) return;

      try {
        const rec = await harvestDomain({
          domain: d,
          crawlIds,
          maxPagesPerDomain: CONFIG.maxPagesPerDomain,
        });
        if (rec && rec.score >= CONFIG.minScore) {
          results.push(rec);
          log(
            `  ✓ ${d} - score: ${rec.score.toFixed(2)}, facts: ${rec.facts.length}`,
          );
        } else {
          log(`  ✗ ${d} - score too low or no data`);
        }
      } catch (error) {
        log(`  ✗ ${d} - error: ${error}`);
      }
    }
  });

  await Promise.all(workers);
  results.sort((a, b) => b.score - a.score);

  log(`\n📊 Found ${results.length} companies above minScore.\n`);

  if (!results.length) {
    log("No results to display or save.");
    process.exit(0);
  }

  for (const r of results) {
    displayFactAnalysis(r.canonicalDomain, r);
  }

  await saveCompanyData(results);
}

main().catch((err) => {
  logError("❌ Error:", err);
  process.exit(1);
});
