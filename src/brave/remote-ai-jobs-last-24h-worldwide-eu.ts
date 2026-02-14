// src/brave/remote-ai-jobs-last-24h-worldwide-eu.ts
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { braveWebSearchTool, braveLlmContextTool } from "./brave-search-tools";

type RegionMode = "worldwide" | "europe";

export const jobSchema = z.object({
  title: z.string(),
  company: z.string(),

  // Model classification (we verify with deterministic guards)
  isFullyRemote: z.boolean(),
  remoteRegion: z.enum(["worldwide", "europe", "unknown"]),

  // Freshness proof (strict)
  postedHoursAgo: z.number().int().min(0).max(168).optional(),
  postedAtIso: z.string().datetime().optional(),

  // Provenance
  sourceUrl: z.string().url(),
  applyUrl: z.string().url().optional(),

  // Optional helpful fields
  locationText: z.string().optional(),
  salaryText: z.string().optional(),

  // Debug/traceability
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).min(1).max(8),
});

const extractedSchema = z.object({
  jobs: z.array(jobSchema),
});

export const outputSchema = z.object({
  worldwide: z.array(jobSchema),
  europe: z.array(jobSchema),
});

export type Job = z.infer<typeof jobSchema>;
export type WorkflowOutput = z.infer<typeof outputSchema>;

/** DeepSeek extractor (no OpenAI). */
const extractorAgent = new Agent({
  id: "remote-ai-job-extractor",
  name: "Remote AI Job Extractor",
  model: "deepseek/deepseek-chat",
  instructions: [
    "Extract AI/ML/LLM/GenAI engineering job postings from web snippets.",
    "",
    "INCLUDE only roles in scope:",
    "- AI Engineer, Applied AI Engineer, GenAI Engineer, LLM Engineer, Agentic AI Engineer,",
    "  AI Platform Engineer (only if clearly LLM/GenAI).",
    "",
    "REMOTE RULES (precision-first):",
    "- isFullyRemote=true ONLY if explicitly Remote / Fully remote / 100% remote / Remote-first / Distributed / WFH (not hybrid).",
    "- If HYBRID / on-site / in-office appears, set isFullyRemote=false.",
    "",
    "REGION RULES (strict):",
    "- remoteRegion=worldwide ONLY if it explicitly indicates worldwide/global/anywhere/work-from-anywhere/location-agnostic.",
    "- remoteRegion=europe ONLY if it explicitly indicates Europe/EU/EEA/UK/EMEA OR timezone constraints (CET/CEST/EET/EEST/UTC±0..3).",
    "- If remote but region-locked to US/CA/AU/etc, set remoteRegion=unknown and mention restriction in evidence.",
    "- Otherwise remoteRegion=unknown.",
    "",
    "FRESHNESS RULES (strict):",
    "- Prefer 'X hours ago' -> postedHoursAgo=X.",
    "- If date is provided -> postedAtIso as ISO-8601 if possible.",
    "- If you cannot infer freshness, OMIT postedHoursAgo/postedAtIso and lower confidence.",
    "",
    "OUTPUT RULES:",
    "- Return JSON strictly matching schema.",
    "- evidence: 1–8 short lines quoting/paraphrasing key signals (no long quotes).",
    "- Never invent details. If missing, omit.",
  ].join("\n"),
});

function canonicalUrl(u: string) {
  try {
    const url = new URL(u);
    url.hash = "";
    const drop = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "ref",
      "source",
      "trk",
    ]);
    [...url.searchParams.keys()].forEach((k) => {
      if (drop.has(k.toLowerCase())) url.searchParams.delete(k);
    });
    return url.toString().replace(/\/$/, "");
  } catch {
    return u.replace(/[?#].*$/, "").trim();
  }
}

function clamp(s: string, max = 1024) {
  return s.length <= max ? s : s.slice(0, max);
}

function safeExtractJson(text: string): any | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function blobForGuards(job: Job) {
  return [
    job.title,
    job.company,
    job.locationText ?? "",
    job.salaryText ?? "",
    job.sourceUrl,
    job.applyUrl ?? "",
    ...(job.evidence ?? []),
  ]
    .join("\n")
    .toLowerCase();
}

function looksHybridOrOnsite(t: string) {
  return /\b(hybrid|on[-\s]?site|in[-\s]?office|office[-\s]?based)\b/i.test(t);
}

function hasRemotePositive(t: string) {
  return /\b(fully remote|100% remote|remote[-\s]?first|remote|distributed|work from home|wfh)\b/i.test(
    t,
  );
}

function hasWorldwideSignal(t: string) {
  return /\b(worldwide|global remote|work from anywhere|remote anywhere|location-agnostic|anywhere in the world)\b/i.test(
    t,
  );
}

function hasEuropeSignal(t: string) {
  return /\b(europe|emea|european union|\beu\b|eea|\buk\b|united kingdom|ireland|germany|france|spain|portugal|netherlands|poland|romania|bulgaria|cet|cest|eet|eest|gmt|utc\+0|utc\+1|utc\+2|utc\+3)\b/i.test(
    t,
  );
}

function hasRegionLock(t: string) {
  // Region-locked remote signals (hard reject for both buckets)
  const hard =
    /\b(us[-\s]?only|united states only|only in the us|must be in the us|remote\s*\(?us\)?|remote\s*-\s*us|canada[-\s]?only|remote\s*\(?canada\)?|australia[-\s]?only|remote\s*\(?australia\)?|india[-\s]?only|philippines[-\s]?only|singapore[-\s]?only|brazil[-\s]?only)\b/i.test(
      t,
    );

  // Work authorization lockouts (common on US-only pages)
  const workAuth =
    /\b(work authorization|authorized to work|must be authorized)\b/i.test(t) &&
    /\b(united states|\bu\.s\.\b|\bus\b)\b/i.test(t);

  // "many US states" pattern
  const states =
    /\b(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\b/i.test(
      t,
    ) && t.includes("remote");

  return hard || workAuth || states;
}

/**
 * Freshness inference (strict proof):
 * - postedHoursAgo wins
 * - postedAtIso wins
 * - else: try to infer from evidence text (hours ago / today / ISO date)
 */
function inferPostedHoursAgo(job: Job): number | null {
  if (job.postedHoursAgo != null) return job.postedHoursAgo;

  const t = blobForGuards(job);

  // "5 hours ago"
  let m = t.match(/\b(\d{1,3})\s*hours?\s*ago\b/);
  if (m?.[1]) return Math.max(0, Math.min(168, Number(m[1])));

  // "5h ago"
  m = t.match(/\b(\d{1,3})\s*(h|hr|hrs)\b(?:\s*ago)?\b/);
  if (m?.[1]) return Math.max(0, Math.min(168, Number(m[1])));

  // minutes -> treat as 0
  m = t.match(/\b(\d{1,3})\s*minutes?\s*ago\b/);
  if (m?.[1]) return 0;

  return null;
}

function within24hStrict(job: Job, nowMs: number) {
  const maxAgeMs = 24 * 60 * 60 * 1000;

  const inferredHours = inferPostedHoursAgo(job);
  if (inferredHours != null) return inferredHours <= 24;

  if (job.postedAtIso) {
    const t = Date.parse(job.postedAtIso);
    return Number.isFinite(t) && nowMs - t <= maxAgeMs;
  }

  // STRICT: must prove freshness
  return false;
}

function isFullyRemoteGuard(job: Job) {
  const t = blobForGuards(job);
  if (looksHybridOrOnsite(t)) return false;
  if (!hasRemotePositive(t)) return false;
  return job.isFullyRemote === true;
}

function regionGuard(job: Job, mode: RegionMode) {
  const t = blobForGuards(job);

  // reject region-locked remote for both buckets
  if (hasRegionLock(t)) return false;

  if (mode === "worldwide") {
    return job.remoteRegion === "worldwide" && hasWorldwideSignal(t);
  }
  return job.remoteRegion === "europe" && hasEuropeSignal(t);
}

function buildQueries(mode: RegionMode, hint?: string) {
  // Shortened to fit Brave's 400 char limit
  const roles = '("AI Engineer" OR "GenAI Engineer" OR "LLM Engineer")';
  const remote = '("remote" OR "100% remote" OR WFH)';
  const noHybrid = "-hybrid -onsite";

  const scope =
    mode === "worldwide"
      ? '(worldwide OR "work from anywhere")'
      : "(Europe OR EU OR UK OR EMEA)";

  const ats = [
    "site:boards.greenhouse.io",
    "site:jobs.lever.co",
    "site:jobs.ashbyhq.com",
  ].join(" OR ");

  const boards = [
    "site:remotive.com",
    "site:weworkremotely.com",
    "site:wellfound.com",
  ].join(" OR ");

  const freshnessTerms = '("hours ago" OR today OR "just posted")';
  const maybeHint = hint?.trim() ? `(${hint.trim()})` : "";

  const q1 = [
    roles,
    remote,
    scope,
    freshnessTerms,
    `(${ats})`,
    noHybrid,
    maybeHint,
  ]
    .filter(Boolean)
    .join(" ");
  const q2 = [
    roles,
    remote,
    scope,
    freshnessTerms,
    `(${boards})`,
    noHybrid,
    maybeHint,
  ]
    .filter(Boolean)
    .join(" ");
  const q3 = [
    roles,
    remote,
    scope,
    freshnessTerms,
    "careers",
    noHybrid,
    maybeHint,
  ]
    .filter(Boolean)
    .join(" ");

  return [q1, q2, q3];
}

export function filterAndSplitJobs(params: {
  worldwideJobs: Job[];
  europeJobs: Job[];
  minConfidence: number;
  nowMs?: number;
}): WorkflowOutput {
  const nowMs = params.nowMs ?? Date.now();

  const dedupe = (jobs: Job[]) => {
    const seen = new Set<string>();
    const out: Job[] = [];
    for (const j of jobs) {
      const key = canonicalUrl(j.applyUrl || j.sourceUrl);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(j);
    }
    out.sort(
      (a, b) =>
        (inferPostedHoursAgo(a) ?? 999) - (inferPostedHoursAgo(b) ?? 999) ||
        b.confidence - a.confidence,
    );
    return out;
  };

  const keep = (jobs: Job[], mode: RegionMode) =>
    dedupe(
      jobs
        .filter((j) => j.confidence >= params.minConfidence)
        .filter((j) => isFullyRemoteGuard(j))
        .filter((j) => within24hStrict(j, nowMs))
        .filter((j) => regionGuard(j, mode)),
    );

  return {
    worldwide: keep(params.worldwideJobs, "worldwide"),
    europe: keep(params.europeJobs, "europe"),
  };
}

/** Step 1: discover candidates and enrich top URLs with LLM Context */
const discoverAndEnrichStep = createStep({
  id: "discover-and-enrich",
  inputSchema: z.object({
    queryHint: z.string().optional(),
    maxCandidatesPerMode: z.number().int().min(10).max(80).optional(),
    verifyTopNWithContext: z.number().int().min(0).max(20).optional(),
    minConfidence: z.number().min(0).max(1).optional(),
  }),
  outputSchema: z.object({
    queryHint: z.string().optional(),
    maxCandidatesPerMode: z.number().optional(),
    verifyTopNWithContext: z.number().optional(),
    minConfidence: z.number().optional(),
    worldwideDocs: z.array(
      z.object({
        url: z.string(),
        title: z.string().optional(),
        text: z.string(),
      }),
    ),
    europeDocs: z.array(
      z.object({
        url: z.string(),
        title: z.string().optional(),
        text: z.string(),
      }),
    ),
  }),
  execute: async ({ inputData }) => {
    async function discover(mode: RegionMode) {
      const europeCountries = ["GB", "FR", "DE", "NL", "BE", "ES", "IT"];
      const countries = mode === "europe" ? europeCountries : [undefined];

      const queries = buildQueries(mode, inputData.queryHint).map((q) =>
        clamp(q, 1024),
      );

      const candidates = new Map<
        string,
        {
          url: string;
          title?: string;
          description?: string;
          extra?: string[];
          age?: unknown;
        }
      >();

      for (const country of countries) {
        for (const q of queries) {
          const web = await braveWebSearchTool.execute!(
            {
              q,
              freshness: "pd",
              count: 20,
              offset: 0,
              extra_snippets: true,
              search_lang: "en",
              ...(country ? { country } : {}),
            },
            {},
          );

          if ("results" in web) {
            for (const r of web.results) {
              const url = canonicalUrl(r.url);
              if (!url) continue;
              if (!candidates.has(url)) {
                candidates.set(url, {
                  url,
                  title: r.title,
                  description: r.description,
                  extra: r.extra_snippets,
                  age: r.age,
                });
              }
            }
          }
        }
      }

      const picked = Array.from(candidates.values()).slice(
        0,
        inputData.maxCandidatesPerMode ?? 40,
      );

      // Cheap docs from web snippets
      const webDocs = picked.map((c) => {
        const lines = [
          c.title ? `TITLE: ${c.title}` : "",
          c.description ? `DESC: ${c.description}` : "",
          ...(c.extra ?? []).map((s) => `SNIP: ${s}`),
          c.age != null ? `AGE: ${String(c.age)}` : "",
        ].filter(Boolean);
        return { url: c.url, title: c.title, text: lines.join("\n") };
      });

      // Enrich top N with LLM Context (better extraction evidence)
      const verifyN = Math.min(
        inputData.verifyTopNWithContext ?? 12,
        webDocs.length,
      );
      const enriched: Array<{ url: string; title?: string; text: string }> = [];

      for (let i = 0; i < verifyN; i++) {
        const u = webDocs[i]!.url;
        try {
          const ctx = await braveLlmContextTool.execute!(
            {
              q: u, // pragmatic: "context about this URL"
              count: 10,
              maximum_number_of_urls: 10,
              maximum_number_of_tokens: 4096,
              maximum_number_of_snippets_per_url: 12,
              maximum_number_of_tokens_per_url: 2048,
              context_threshold_mode: "balanced",
              search_lang: "en",
            },
            {},
          );

          const uHost = (() => {
            try {
              return new URL(u).hostname;
            } catch {
              return "";
            }
          })();

          const docs = ctx.documents
            .filter((d: any) => d.kind === "generic")
            .filter((d: any) =>
              uHost ? (d.hostname ?? "").includes(uHost) : true,
            )
            .slice(0, 2)
            .map((d: any) => ({
              url: d.url,
              title: d.title,
              text: [d.age != null ? `AGE: ${String(d.age)}` : "", d.text]
                .filter(Boolean)
                .join("\n"),
            }));

          enriched.push(...docs);
        } catch {
          // best-effort enrichment
        }
      }

      // Merge: enriched first, then web docs
      const merged = new Map<
        string,
        { url: string; title?: string; text: string }
      >();
      for (const d of enriched) merged.set(canonicalUrl(d.url), d);
      for (const d of webDocs) {
        const key = canonicalUrl(d.url);
        if (!merged.has(key)) merged.set(key, d);
      }

      return Array.from(merged.values());
    }

    const [worldwideDocs, europeDocs] = await Promise.all([
      discover("worldwide"),
      discover("europe"),
    ]);

    return {
      queryHint: inputData.queryHint,
      maxCandidatesPerMode: inputData.maxCandidatesPerMode ?? 40,
      verifyTopNWithContext: inputData.verifyTopNWithContext ?? 12,
      minConfidence: inputData.minConfidence ?? 0.55,
      worldwideDocs,
      europeDocs,
    };
  },
});

/** Step 2: extract structured jobs with DeepSeek */
const extractStep = createStep({
  id: "extract",
  inputSchema: z.object({
    mode: z.enum(["worldwide", "europe"]),
    docs: z.array(
      z.object({
        url: z.string(),
        title: z.string().optional(),
        text: z.string(),
      }),
    ),
  }),
  outputSchema: z.object({
    mode: z.enum(["worldwide", "europe"]),
    jobs: z.array(jobSchema),
  }),
  execute: async ({ inputData }) => {
    const docBlobs = inputData.docs
      .slice(0, 24)
      .map((d) => {
        const text = String(d.text ?? "").slice(0, 6500);
        return `SOURCE: ${d.url}\nTITLE: ${d.title ?? ""}\nSNIPPETS:\n${text}`;
      })
      .join("\n\n---\n\n");

    const prompt = [
      `MODE: ${inputData.mode}`,
      "Extract job postings from the sources below.",
      "Return JSON only.",
      "",
      docBlobs,
    ].join("\n");

    const res = await extractorAgent.generate(prompt, {
      toolChoice: "none",
      structuredOutput: { schema: extractedSchema },
      modelSettings: { temperature: 0.1 },
      // If your DeepSeek gateway supports it, this reduces non-JSON chatter.
      providerOptions: {
        deepseek: { thinking: { type: "disabled" } },
      } as any,
    });

    const jobsFromObject = (res as any).object?.jobs;
    if (Array.isArray(jobsFromObject))
      return { mode: inputData.mode, jobs: jobsFromObject };

    const parsed = safeExtractJson((res as any).text ?? "");
    const jobs = Array.isArray(parsed?.jobs) ? parsed.jobs : [];
    return { mode: inputData.mode, jobs };
  },
});

/** Step 3: strict filter + split into exactly 2 buckets */
const filterAndSplitStep = createStep({
  id: "filter-and-split",
  inputSchema: z.object({
    worldwideJobs: z.array(jobSchema),
    europeJobs: z.array(jobSchema),
    minConfidence: z.number().min(0).max(1).default(0.55),
  }),
  outputSchema,
  execute: async ({ inputData }) => {
    return filterAndSplitJobs({
      worldwideJobs: inputData.worldwideJobs,
      europeJobs: inputData.europeJobs,
      minConfidence: inputData.minConfidence,
      nowMs: Date.now(),
    });
  },
});

export const remoteAiJobsLast24hWorldwideEuWorkflow = createWorkflow({
  id: "remote-ai-jobs-last-24h-worldwide-eu",
  inputSchema: z.object({
    queryHint: z.string().optional(),
    maxCandidatesPerMode: z.number().int().min(10).max(80).default(40),
    verifyTopNWithContext: z.number().int().min(0).max(20).default(12),
    minConfidence: z.number().min(0).max(1).default(0.55),
  }),
  outputSchema,
})
  .map(async ({ inputData }) => ({
    queryHint: inputData.queryHint,
    maxCandidatesPerMode: inputData.maxCandidatesPerMode ?? 40,
    verifyTopNWithContext: inputData.verifyTopNWithContext ?? 12,
    minConfidence: inputData.minConfidence ?? 0.55,
  }))
  .then(discoverAndEnrichStep)
  .then(
    createStep({
      id: "run-extracts",
      inputSchema: z.object({
        queryHint: z.string().optional(),
        maxCandidatesPerMode: z.number().optional(),
        verifyTopNWithContext: z.number().optional(),
        minConfidence: z.number().optional(),
        worldwideDocs: z.array(
          z.object({
            url: z.string(),
            title: z.string().optional(),
            text: z.string(),
          }),
        ),
        europeDocs: z.array(
          z.object({
            url: z.string(),
            title: z.string().optional(),
            text: z.string(),
          }),
        ),
      }),
      outputSchema: z.object({
        minConfidence: z.number(),
        worldwideJobs: z.array(jobSchema),
        europeJobs: z.array(jobSchema),
      }),
      execute: async ({ inputData }) => {
        const [w, e] = await Promise.all([
          extractStep.execute({
            inputData: { mode: "worldwide", docs: inputData.worldwideDocs },
          } as any),
          extractStep.execute({
            inputData: { mode: "europe", docs: inputData.europeDocs },
          } as any),
        ]);

        return {
          minConfidence: inputData.minConfidence ?? 0.55,
          worldwideJobs: (w as any).jobs ?? [],
          europeJobs: (e as any).jobs ?? [],
        };
      },
    }),
  )
  .then(filterAndSplitStep)
  .commit();

/**
 * Filter-only workflow for unit tests / CI determinism (no network, no LLM).
 * You feed extracted jobs in and it returns the same 2 buckets using strict guards.
 */
export const remoteAiJobsFilterOnlyWorkflow = createWorkflow({
  id: "remote-ai-jobs-filter-only",
  inputSchema: z.object({
    worldwideJobs: z.array(jobSchema),
    europeJobs: z.array(jobSchema),
    minConfidence: z.number().min(0).max(1).default(0.55),
    nowMs: z.number().optional(),
  }),
  outputSchema,
})
  .map(async ({ inputData }) => ({
    worldwideJobs: inputData.worldwideJobs,
    europeJobs: inputData.europeJobs,
    minConfidence: inputData.minConfidence ?? 0.55,
    nowMs: inputData.nowMs,
  }))
  .then(
    createStep({
      id: "filter-only",
      inputSchema: z.object({
        worldwideJobs: z.array(jobSchema),
        europeJobs: z.array(jobSchema),
        minConfidence: z.number(),
        nowMs: z.number().optional(),
      }),
      outputSchema,
      execute: async ({ inputData }) => {
        return filterAndSplitJobs({
          worldwideJobs: inputData.worldwideJobs,
          europeJobs: inputData.europeJobs,
          minConfidence: inputData.minConfidence,
          nowMs: inputData.nowMs,
        });
      },
    }),
  )
  .commit();
