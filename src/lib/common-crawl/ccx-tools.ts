import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { gunzipSync, brotliDecompressSync, inflateSync } from "node:zlib";

export type CollInfo = {
  id: string;
  name?: string;
  timegate?: string;
  cdx_api?: string;
};

export type CdxRecord = {
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

function uaHeaders() {
  return { "user-agent": "mastra-nextjs-ccx/1.0" };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: uaHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function cdxApiBase(crawlId: string): string {
  return `https://index.commoncrawl.org/${crawlId}-index`;
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

/**
 * Tool 1: Get newest crawl IDs (CC-MAIN-YYYY-WW), newest-first.
 */
export const ccxGetRecentCrawlIdsTool = createTool({
  id: "ccx_get_recent_crawl_ids",
  description: "Fetch recent Common Crawl collection IDs (newest-first).",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(24).default(6),
  }),
  outputSchema: z.object({
    crawlIds: z.array(z.string()),
  }),
  execute: async ({ limit }) => {
    const list = await fetchJson<CollInfo[]>(
      "https://index.commoncrawl.org/collinfo.json",
    );
    const ids = list
      .map((x) => x.id)
      .filter((id) => /^CC-MAIN-\d{4}-\d{2}$/.test(id))
      .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

    return { crawlIds: ids.slice(0, limit) };
  },
});

/**
 * Tool 2: CDX latest capture for a URL inside a given crawl.
 * Returns { record: CdxRecord | null }
 * Post-filters by mime to avoid missing captures due to inconsistent CC metadata.
 */
export const ccxCdxLatestTool = createTool({
  id: "ccx_cdx_latest",
  description:
    "Lookup the latest CDX capture for a given URL in a given Common Crawl index.",
  inputSchema: z.object({
    crawlId: z.string(),
    url: z.string().url(),
  }),
  outputSchema: z.object({
    record: z
      .object({
        timestamp: z.string(),
        url: z.string(),
        length: z.string(),
        offset: z.string(),
        filename: z.string(),
      })
      .passthrough()
      .nullable(),
  }),
  execute: async ({ crawlId, url }) => {
    const base = cdxApiBase(crawlId);
    const sp = new URLSearchParams();

    sp.set("url", url);
    sp.set("output", "json");
    sp.set("sort", "reverse");
    sp.set("limit", "3"); // small buffer for post-filtering

    // Keep the query broad; post-filter for HTML to avoid missing good captures.
    sp.append("filter", "status:200");

    // Ask for the fields we care about (reduces response size).
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
    const res = await fetch(endpoint, { headers: uaHeaders() });
    if (!res.ok) return { record: null };

    const text = await res.text();
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of lines) {
      try {
        const rec = JSON.parse(line) as CdxRecord;

        const mime = String(rec.mime || "").toLowerCase();
        const mimeDetected = String(
          (rec as any)["mime-detected"] || "",
        ).toLowerCase();

        const looksHtml =
          mime.includes("text/html") ||
          mime.includes("application/xhtml") ||
          mimeDetected.includes("text/html") ||
          mimeDetected.includes("application/xhtml");

        if (!looksHtml) continue;
        if (!rec.timestamp || !rec.filename || !rec.offset || !rec.length)
          continue;

        return { record: rec };
      } catch {
        // ignore malformed line
      }
    }

    return { record: null };
  },
});

/**
 * Tool 3: WARC range fetch (gzip member) -> unzip -> extract embedded HTTP HTML.
 * Requires 206 Partial Content to avoid downloading entire WARC files.
 * Includes size caps and timeout for safety.
 */
export const ccxFetchHtmlFromWarcTool = createTool({
  id: "ccx_fetch_html_from_warc",
  description:
    "Fetch a WARC record by (filename, offset, length) and return extracted HTML (if any).",
  inputSchema: z.object({
    filename: z.string(),
    offset: z.number().int().nonnegative(),
    length: z.number().int().positive(),
    // Optional safety caps
    maxCompressedBytes: z.number().int().positive().default(5_000_000), // 5MB
    maxUncompressedBytes: z.number().int().positive().default(15_000_000), // 15MB
    timeoutMs: z.number().int().positive().default(20_000),
  }),
  outputSchema: z.object({
    html: z.string().nullable(),
  }),
  execute: async ({
    filename,
    offset,
    length,
    maxCompressedBytes = 5_000_000,
    maxUncompressedBytes = 15_000_000,
    timeoutMs = 20_000,
  }) => {
    if (length > maxCompressedBytes) return { html: null };

    const warcUrl = `https://data.commoncrawl.org/${filename}`;
    const rangeHeader = `bytes=${offset}-${offset + length - 1}`;

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);

    try {
      const res = await fetch(warcUrl, {
        headers: { ...uaHeaders(), range: rangeHeader },
        signal: ac.signal,
      });

      // Require 206 to avoid accidentally downloading whole WARC files.
      if (res.status !== 206) {
        return { html: null };
      }

      const contentRange = res.headers.get("content-range") || "";
      if (!contentRange.toLowerCase().startsWith("bytes")) {
        return { html: null };
      }

      const gzSlice = Buffer.from(await res.arrayBuffer());
      if (gzSlice.length > maxCompressedBytes) return { html: null };

      // NOTE: gunzipSync can balloon memory; cap via a quick sanity check after unzip.
      const unzipped = gunzipSync(gzSlice);
      if (unzipped.length > maxUncompressedBytes) return { html: null };

      const html = extractHtmlFromUnzippedWarc(unzipped);
      return { html };
    } finally {
      clearTimeout(t);
    }
  },
});
