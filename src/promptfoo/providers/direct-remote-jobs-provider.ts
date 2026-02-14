// src/promptfoo/providers/direct-remote-jobs-provider.ts
// Direct implementation bypassing Mastra workflow engine to avoid stream bugs
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  braveWebSearchTool,
  braveLlmContextTool,
} from "../../brave/brave-search-tools";
import { createDeepSeekClient } from "../../deepseek/index";
import { z } from "zod";

const jobSchema = z.object({
  title: z.string(),
  company: z.string(),
  isFullyRemote: z.boolean(),
  remoteRegion: z.enum(["worldwide", "europe", "unknown"]),
  postedHoursAgo: z.number().int().min(0).max(168).optional(),
  postedAtIso: z.string().datetime().optional(),
  sourceUrl: z.string().url(),
  applyUrl: z.string().url().optional(),
  locationText: z.string().optional(),
  salaryText: z.string().optional(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).min(1).max(8),
});

const extractedSchema = z.object({
  jobs: z.array(jobSchema),
});

const outputSchema = z.object({
  worldwide: z.array(jobSchema),
  europe: z.array(jobSchema),
});

type Job = z.infer<typeof jobSchema>;

function readJson(filePath: string): any {
  const p = path.resolve(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function stableJsonStringify(obj: any): string {
  const seen = new WeakSet<object>();
  const normalize = (v: any): any => {
    if (v === null || v === undefined) return v;
    if (typeof v !== "object") return v;
    if (seen.has(v)) return "[Circular]";
    seen.add(v);
    if (Array.isArray(v)) return v.map(normalize);
    const keys = Object.keys(v).sort();
    const out: Record<string, any> = {};
    for (const k of keys) out[k] = normalize(v[k]);
    return out;
  };
  return JSON.stringify(normalize(obj), null, 2);
}

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
    ]);
    for (const k of Array.from(url.searchParams.keys())) {
      if (drop.has(k)) url.searchParams.delete(k);
    }
    return url.toString();
  } catch {
    return null;
  }
}

function clamp(str: string, max: number) {
  return str.length <= max ? str : str.slice(0, max);
}

function buildQueries(mode: "worldwide" | "europe", hint?: string) {
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

async function discoverJobs(mode: "worldwide" | "europe", queryHint?: string) {
  const europeCountries = ["GB", "FR", "DE", "NL", "BE", "ES", "IT"];
  const countries = mode === "europe" ? europeCountries : [undefined];
  const queries = buildQueries(mode, queryHint).map((q) => clamp(q, 1024));

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

  return Array.from(candidates.values()).slice(0, 100);
}

async function enrichWithContext(
  candidates: any[],
  mode: "worldwide" | "europe",
  verifyTopN: number,
) {
  const enriched = [];
  for (let i = 0; i < Math.min(candidates.length, verifyTopN); i++) {
    const c = candidates[i];
    try {
      const ctx = await braveLlmContextTool.execute!(
        {
          url: c.url,
          snippets: [c.title, c.description, ...(c.extra ?? [])]
            .filter(Boolean)
            .join("\n"),
        },
        {},
      );
      enriched.push({
        ...c,
        context: "llmContext" in ctx ? ctx.llmContext : "",
      });
    } catch {
      enriched.push({ ...c, context: "" });
    }
  }
  for (let i = verifyTopN; i < candidates.length; i++) {
    enriched.push({ ...candidates[i], context: "" });
  }
  return enriched;
}

async function extractJobs(docs: any[], mode: "worldwide" | "europe") {
  const client = createDeepSeekClient({
    apiKey: process.env.DEEPSEEK_API_KEY,
  });

  const docBlobs = docs
    .map(
      (d, i) =>
        `[Doc ${i + 1}]\nURL: ${d.url}\nTitle: ${d.title ?? ""}\nSnippet: ${d.description ?? ""}\nContext: ${d.context ?? ""}`,
    )
    .join("\n\n");

  const systemPrompt = [
    "Extract AI/ML/LLM/GenAI engineering job postings from web snippets.",
    "",
    "INCLUDE only roles in scope: AI Engineer, GenAI Engineer, LLM Engineer, Agentic AI Engineer.",
    "",
    "REMOTE RULES: isFullyRemote=true ONLY if explicitly Remote/Fully remote/100% remote/WFH (not hybrid).",
    "",
    "REGION RULES:",
    "- remoteRegion=worldwide ONLY if worldwide/global/anywhere/work-from-anywhere.",
    "- remoteRegion=europe ONLY if Europe/EU/UK/EMEA or timezone constraints (CET/CEST/UTC±0..3).",
    "- Otherwise remoteRegion=unknown.",
    "",
    "FRESHNESS RULES: Prefer 'X hours ago' -> postedHoursAgo=X.",
    "",
    "Return valid JSON matching this schema: { jobs: [{ title, company, isFullyRemote, remoteRegion, sourceUrl, applyUrl?, locationText?, salaryText?, postedHoursAgo?, postedAtIso?, confidence, evidence }] }",
  ].join("\n");

  try {
    const response = await client.chat({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: docBlobs },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    return Array.isArray(parsed?.jobs) ? parsed.jobs : [];
  } catch (error) {
    console.error("Extract jobs error:", error);
    return [];
  }
}

function filterJobs(
  jobs: Job[],
  minConfidence: number,
): { worldwide: Job[]; europe: Job[] } {
  const seen = new Set<string>();
  const worldwide: Job[] = [];
  const europe: Job[] = [];

  for (const job of jobs) {
    if (job.confidence < minConfidence) continue;
    if (!job.isFullyRemote) continue;
    if (seen.has(job.sourceUrl)) continue;
    seen.add(job.sourceUrl);

    if (job.remoteRegion === "worldwide") worldwide.push(job);
    else if (job.remoteRegion === "europe") europe.push(job);
  }

  return { worldwide, europe };
}

class DirectRemoteJobsProvider {
  id() {
    return "direct-remote-jobs";
  }

  async callApi(_prompt: string, context: any): Promise<{ output: string }> {
    const vars = context?.vars ?? {};
    const mode = String(vars.mode ?? "fixture");

    if (mode === "fixture") {
      const fixtureInput = readJson("src/promptfoo/fixtures/filterInput.json");
      const jobs: Job[] = fixtureInput.jobs ?? [];
      const result = filterJobs(jobs, 0.5);
      return { output: stableJsonStringify(result) };
    }

    if (mode === "live") {
      try {
        const queryHint = vars.queryHint;
        const maxCandidates = vars.maxCandidatesPerMode ?? 25;
        const verifyTopN = vars.verifyTopNWithContext ?? 8;
        const minConfidence = vars.minConfidence ?? 0.6;

        // Discover jobs for both modes
        const [worldwideCandidates, europeCandidates] = await Promise.all([
          discoverJobs("worldwide", queryHint),
          discoverJobs("europe", queryHint),
        ]);

        // Enrich top candidates
        const [worldwideEnriched, europeEnriched] = await Promise.all([
          enrichWithContext(
            worldwideCandidates.slice(0, maxCandidates),
            "worldwide",
            verifyTopN,
          ),
          enrichWithContext(
            europeCandidates.slice(0, maxCandidates),
            "europe",
            verifyTopN,
          ),
        ]);

        // Extract jobs
        const [worldwideJobs, europeJobs] = await Promise.all([
          extractJobs(worldwideEnriched, "worldwide"),
          extractJobs(europeEnriched, "europe"),
        ]);

        // Filter and split
        const allJobs = [...worldwideJobs, ...europeJobs];
        const result = filterJobs(allJobs, minConfidence);

        return { output: stableJsonStringify(result) };
      } catch (error) {
        console.error("Live workflow error:", error);
        return {
          output: stableJsonStringify({
            worldwide: [],
            europe: [],
            _error: `Workflow failed: ${error instanceof Error ? error.message : String(error)}`,
          }),
        };
      }
    }

    return {
      output: stableJsonStringify({
        worldwide: [],
        europe: [],
        _error: `Unknown mode '${mode}'. Use 'fixture' or 'live'.`,
      }),
    };
  }
}

export default DirectRemoteJobsProvider;
