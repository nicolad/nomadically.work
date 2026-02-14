// src/brave/brave-search-tools.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Brave Search tools:
 * - Web Search: discovery, with freshness=pd to bias toward last-24h results
 * - LLM Context: richer grounded snippets per URL/query for extraction
 *
 * Notes:
 * - Enforces conservative global throttle (default ~1 req/sec).
 * - Retries 429 with X-RateLimit-Reset and 5xx with exponential backoff.
 * - Tiny TTL cache for LLM Context responses.
 */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseResetSeconds(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const first = headerValue.split(",")[0]?.trim();
  const n = Number(first);
  return Number.isFinite(n) ? n : null;
}

function requireApiKey(): string {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) throw new Error("Missing BRAVE_SEARCH_API_KEY env var");
  return apiKey;
}

// Conservative global throttle (per process)
let nextAllowedAt = 0;
async function braveThrottle(minIntervalMs = 1100) {
  const now = Date.now();
  const waitMs = Math.max(0, nextAllowedAt - now);
  if (waitMs > 0) await sleep(waitMs);
  nextAllowedAt = Date.now() + minIntervalMs;
}

async function fetchJsonWithRetries(
  url: string,
  init: RequestInit,
  opts?: { maxRetries?: number; timeoutMs?: number; minIntervalMs?: number },
) {
  const maxRetries = opts?.maxRetries ?? 3;
  const timeoutMs = opts?.timeoutMs ?? 30_000;
  const minIntervalMs = opts?.minIntervalMs ?? 1100;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await braveThrottle(minIntervalMs);

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: ac.signal });

      if (res.status === 429 && attempt < maxRetries) {
        const resetSeconds = parseResetSeconds(
          res.headers.get("X-RateLimit-Reset"),
        );
        const waitMs =
          resetSeconds != null
            ? Math.max(250, resetSeconds * 1000)
            : 2 ** attempt * 800;
        await sleep(waitMs);
        continue;
      }

      if (res.status >= 500 && attempt < maxRetries) {
        await sleep(2 ** attempt * 500);
        continue;
      }

      let json: any = {};
      try {
        json = await res.json();
      } catch {
        json = {};
      }

      if (!res.ok)
        throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
      return json;
    } finally {
      clearTimeout(t);
    }
  }

  throw new Error("Brave request exceeded retries");
}

type BraveDocKind = "generic" | "poi" | "map";

/** ---------------------------
 * Brave Web Search Tool
 * -------------------------- */
const braveWebSearchInput = z.object({
  q: z.string().min(1).max(1024),

  // freshness: pd=24h, pw=7d, pm=31d, py=365d (Brave semantics)
  freshness: z.string().default("pd"),

  count: z.number().int().min(1).max(20).default(20),
  offset: z.number().int().min(0).max(9).default(0),

  country: z.string().length(2).optional(),
  search_lang: z.string().min(2).optional(),
  ui_lang: z.string().min(2).optional(),
  safesearch: z.enum(["off", "moderate", "strict"]).default("moderate"),

  extra_snippets: z.boolean().default(true),
  goggles: z.union([z.string(), z.array(z.string())]).optional(),
});

const braveWebSearchOutput = z.object({
  results: z.array(
    z.object({
      url: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      extra_snippets: z.array(z.string()).optional(),
      age: z.unknown().optional(), // Brave often includes relative age-ish data
      profile: z.unknown().optional(),
    }),
  ),
  raw: z.unknown(),
});

export const braveWebSearchTool = createTool({
  id: "brave-web-search",
  description:
    "Brave Web Search wrapper (supports freshness=pd and extra_snippets).",
  inputSchema: braveWebSearchInput,
  outputSchema: braveWebSearchOutput,
  execute: async (input) => {
    const apiKey = requireApiKey();

    const u = new URL("https://api.search.brave.com/res/v1/web/search");
    u.searchParams.set("q", input.q);
    u.searchParams.set("freshness", input.freshness ?? "pd");
    u.searchParams.set("count", String(input.count ?? 20));
    u.searchParams.set("offset", String(input.offset ?? 0));
    u.searchParams.set("safesearch", input.safesearch ?? "moderate");

    if (input.country) u.searchParams.set("country", input.country);
    if (input.search_lang) u.searchParams.set("search_lang", input.search_lang);
    if (input.ui_lang) u.searchParams.set("ui_lang", input.ui_lang);
    if (input.extra_snippets) u.searchParams.set("extra_snippets", "true");

    if (input.goggles) {
      const g = Array.isArray(input.goggles) ? input.goggles : [input.goggles];
      for (const gg of g) u.searchParams.append("goggles", gg);
    }

    const json = await fetchJsonWithRetries(u.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });

    const results = (json?.web?.results ?? []).map((r: any) => ({
      url: String(r?.url ?? ""),
      title: r?.title ? String(r.title) : undefined,
      description: r?.description ? String(r.description) : undefined,
      extra_snippets: Array.isArray(r?.extra_snippets)
        ? r.extra_snippets.map((s: any) => String(s))
        : undefined,
      age: r?.age,
      profile: r?.profile,
    }));

    return { results: results.filter((r: any) => r.url), raw: json };
  },
});

/** ---------------------------
 * Brave LLM Context Tool
 * -------------------------- */
const braveLlmContextInput = z.object({
  q: z.string().min(1).max(1024),

  count: z.number().int().min(1).max(50).default(20),

  maximum_number_of_urls: z.number().int().min(1).max(50).default(20),
  maximum_number_of_tokens: z.number().int().min(1024).max(32768).default(8192),
  maximum_number_of_snippets_per_url: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(12),
  maximum_number_of_tokens_per_url: z
    .number()
    .int()
    .min(256)
    .max(8192)
    .default(2048),

  context_threshold_mode: z
    .enum(["strict", "balanced", "lenient", "disabled"])
    .default("balanced"),
  country: z.string().length(2).optional(),
  search_lang: z.string().min(2).optional(),
  goggles: z.union([z.string(), z.array(z.string())]).optional(),
});

const braveLlmContextOutput = z.object({
  context: z.string(),
  documents: z.array(
    z.object({
      url: z.string(),
      title: z.string().optional(),
      hostname: z.string().optional(),
      age: z.unknown().optional(),
      snippets: z.array(z.string()),
      text: z.string(),
      kind: z.enum(["generic", "poi", "map"]),
    }),
  ),
  raw: z.unknown(),
});

// tiny TTL cache (keeps iteration cheap)
const ctxCache = new Map<string, { expiresAt: number; value: any }>();
function cacheGet(key: string) {
  const hit = ctxCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    ctxCache.delete(key);
    return null;
  }
  return hit.value;
}
function cacheSet(key: string, value: any, ttlMs: number) {
  ctxCache.set(key, { expiresAt: Date.now() + ttlMs, value });
}

export const braveLlmContextTool = createTool({
  id: "brave-llm-context",
  description:
    "Brave LLM Context wrapper (grounded snippets/text for extraction).",
  inputSchema: braveLlmContextInput,
  outputSchema: braveLlmContextOutput,

  execute: async (input) => {
    const apiKey = requireApiKey();

    const cacheKey = JSON.stringify(input);
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const body: Record<string, unknown> = {
      q: input.q,
      count: input.count,
      maximum_number_of_urls: input.maximum_number_of_urls,
      maximum_number_of_tokens: input.maximum_number_of_tokens,
      maximum_number_of_snippets_per_url:
        input.maximum_number_of_snippets_per_url,
      maximum_number_of_tokens_per_url: input.maximum_number_of_tokens_per_url,
      context_threshold_mode: input.context_threshold_mode,
      country: input.country,
      search_lang: input.search_lang,
      goggles: input.goggles,
    };

    const json = await fetchJsonWithRetries(
      "https://api.search.brave.com/res/v1/llm/context",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "Content-Type": "application/json",
          "X-Subscription-Token": apiKey,
        },
        body: JSON.stringify(body),
      },
    );

    const grounding = json?.grounding ?? {};
    const sources = json?.sources ?? {};

    const docs: Array<{
      url: string;
      title?: string;
      hostname?: string;
      age?: unknown;
      snippets: string[];
      text: string;
      kind: BraveDocKind;
    }> = [];

    const pushDoc = (kind: BraveDocKind, item: any) => {
      if (!item?.url) return;
      const snippets = Array.isArray(item?.snippets)
        ? item.snippets.map((s: any) => String(s))
        : [];
      const meta = sources[item.url] ?? {};
      docs.push({
        url: String(item.url),
        title: item.title
          ? String(item.title)
          : meta?.title
            ? String(meta.title)
            : undefined,
        hostname: meta?.hostname ? String(meta.hostname) : undefined,
        age: meta?.age,
        snippets,
        text: snippets.join("\n\n"),
        kind,
      });
    };

    if (Array.isArray(grounding.generic))
      for (const g of grounding.generic) pushDoc("generic", g);
    if (grounding.poi && typeof grounding.poi === "object")
      pushDoc("poi", grounding.poi);
    if (Array.isArray(grounding.map))
      for (const m of grounding.map) pushDoc("map", m);

    const context = docs
      .map((d) => {
        const head = `[${d.kind}] ${d.title ?? ""} (${d.url})`.trim();
        const ageLine = d.age != null ? `AGE: ${String(d.age)}` : "";
        return `${head}\n${ageLine}\n${d.text}`.trim();
      })
      .join("\n\n---\n\n");

    const out = { context, documents: docs, raw: json };
    cacheSet(cacheKey, out, 60_000);
    return out;
  },
});
