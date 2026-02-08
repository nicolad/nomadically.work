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
 * This is robust enough for typical HTML captures (and avoids converting the entire record to string).
 */
function extractHtmlFromUnzippedWarc(unzippedWarc: Buffer): string | null {
  const HTTP = Buffer.from("HTTP/");
  const HDR_END = Buffer.from("\r\n\r\n");

  const httpStart = unzippedWarc.indexOf(HTTP);
  if (httpStart === -1) return null;

  const httpHeaderEnd = unzippedWarc.indexOf(HDR_END, httpStart);
  if (httpHeaderEnd === -1) return null;

  const headerBytes = unzippedWarc.slice(httpStart, httpHeaderEnd);
  const headerText = headerBytes.toString("ascii");
  const headerLines = headerText.split("\r\n");
  const httpHeaders = parseHeadersBlock(headerLines.slice(1).join("\r\n"));

  let body = unzippedWarc.slice(httpHeaderEnd + HDR_END.length);

  const te = (httpHeaders["transfer-encoding"] || "").toLowerCase();
  if (te.includes("chunked")) body = decodeChunked(body);

  const ce = (httpHeaders["content-encoding"] || "").toLowerCase();
  try {
    if (ce.includes("gzip")) body = gunzipSync(body);
    else if (ce.includes("br")) body = brotliDecompressSync(body);
    else if (ce.includes("deflate")) body = inflateSync(body);
  } catch {
    // If decode fails, keep body as-is.
  }

  const html = body.toString("utf8");
  if (!html.includes("<html") && !html.includes("<body")) return null;
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
    sp.set("limit", "1");
    sp.append("filter", "status:200");
    sp.append("filter", "mime:text/html");

    const endpoint = `${base}?${sp.toString()}`;
    const res = await fetch(endpoint, { headers: uaHeaders() });
    if (!res.ok) return { record: null };

    const text = await res.text();
    const line = text
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean);

    if (!line) return { record: null };

    try {
      return { record: JSON.parse(line) as CdxRecord };
    } catch {
      return { record: null };
    }
  },
});

/**
 * Tool 3: WARC range fetch (gzip member) -> unzip -> extract embedded HTTP HTML.
 */
export const ccxFetchHtmlFromWarcTool = createTool({
  id: "ccx_fetch_html_from_warc",
  description:
    "Fetch a WARC record by (filename, offset, length) and return extracted HTML (if any).",
  inputSchema: z.object({
    filename: z.string(),
    offset: z.number().int().nonnegative(),
    length: z.number().int().positive(),
  }),
  outputSchema: z.object({
    html: z.string().nullable(),
  }),
  execute: async ({ filename, offset, length }) => {
    const warcUrl = `https://data.commoncrawl.org/${filename}`;
    const rangeHeader = `bytes=${offset}-${offset + length - 1}`;

    const res = await fetch(warcUrl, {
      headers: { ...uaHeaders(), range: rangeHeader },
    });

    if (!(res.status === 206 || res.status === 200)) {
      throw new Error(`WARC range fetch failed: ${res.status}`);
    }

    const gzSlice = Buffer.from(await res.arrayBuffer());
    const unzipped = gunzipSync(gzSlice);

    const html = extractHtmlFromUnzippedWarc(unzipped);
    return { html };
  },
});
