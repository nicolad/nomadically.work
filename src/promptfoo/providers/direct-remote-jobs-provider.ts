// src/promptfoo/providers/direct-remote-jobs-provider.ts
// Direct implementation bypassing Mastra workflow engine to avoid stream bugs
// Uses Langfuse-managed prompts for dynamic updates without code changes
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  braveWebSearchTool,
  braveLlmContextTool,
} from "../../brave/brave-search-tools";
import { BraveSearchAgent } from "../../brave/search-agent";
import { createDeepSeekClient } from "../../deepseek/index";
import { getAnswers } from "../../brave/answers";
import { z } from "zod";
import { ASHBY_JOBS_DOMAIN } from "../../constants/ats";
// Note: @langfuse/client removed due to zlib dependency
// Use fetch-based API from @/langfuse instead
import { fetchLangfusePrompt } from "@/langfuse";

// Note: LangfuseClient SDK removed - use fetch-based API instead
// const langfuse = new LangfuseClient({
//   publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
//   secretKey: process.env.LANGFUSE_SECRET_KEY!,
//   baseUrl:
//     process.env.LANGFUSE_BASE_URL ||
//     process.env.LANGFUSE_HOST ||
//     "https://cloud.langfuse.com",
// });

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

function saveResults(
  result: any,
  llmProvider: string,
  metadata: Record<string, any>,
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `brave-llm-results-${llmProvider}-${timestamp}.json`;
  const resultPath = path.resolve(process.cwd(), "results", filename);

  // Ensure results directory exists
  const resultsDir = path.dirname(resultPath);
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const output = {
    timestamp: new Date().toISOString(),
    llmProvider,
    metadata,
    result,
  };

  fs.writeFileSync(resultPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`💾 Saved results to: ${filename}`);
  return filename;
}

function saveBraveSearchDebug(
  worldwideCandidates: any[],
  europeCandidates: any[],
  worldwideEnriched: any[],
  europeEnriched: any[],
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `brave-search-debug-${timestamp}.json`;
  const resultPath = path.resolve(process.cwd(), "results", filename);

  const resultsDir = path.dirname(resultPath);
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const output = {
    timestamp: new Date().toISOString(),
    worldwideCandidates: {
      count: worldwideCandidates.length,
      samples: worldwideCandidates.slice(0, 5),
    },
    europeCandidates: {
      count: europeCandidates.length,
      samples: europeCandidates.slice(0, 5),
    },
    worldwideEnriched: {
      count: worldwideEnriched.length,
      samples: worldwideEnriched.slice(0, 3),
    },
    europeEnriched: {
      count: europeEnriched.length,
      samples: europeEnriched.slice(0, 3),
    },
  };

  fs.writeFileSync(resultPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`🔍 Saved Brave Search debug data to: ${filename}`);
  return filename;
}

function loadLatestResults(llmProvider?: string): any {
  const resultsDir = path.resolve(process.cwd(), "results");
  if (!fs.existsSync(resultsDir)) {
    throw new Error("No results directory found. Run live mode first.");
  }

  const files = fs
    .readdirSync(resultsDir)
    .filter((f) => f.startsWith("brave-llm-results-") && f.endsWith(".json"))
    .filter((f) => !llmProvider || f.includes(`-${llmProvider}-`));

  if (files.length === 0) {
    throw new Error(
      `No saved results found${llmProvider ? ` for provider: ${llmProvider}` : ""}`,
    );
  }

  // Sort by filename (contains timestamp)
  files.sort();
  const latestFile = files[files.length - 1];
  const filePath = path.resolve(resultsDir, latestFile);

  console.log(`📂 Loading results from: ${latestFile}`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return data.result;
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
    `site:${ASHBY_JOBS_DOMAIN}`,
  ].join(" OR ");

  // Removed job boards query - those are aggregator listing pages we filter out anyway

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
          safesearch: "off",
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

          // Filter out job aggregator listing pages at source (before LLM extraction)
          if (isJobAggregatorListingPage(url)) {
            console.log(
              `🚫 Brave Search: Skipping aggregator listing page: ${url}`,
            );
            continue;
          }

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

  const candidatesArray = Array.from(candidates.values()).slice(0, 100);
  console.log(
    `📊 Brave Search (${mode}): Found ${candidatesArray.length} candidates after filtering`,
  );
  return candidatesArray;
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
          q: `${c.title} ${c.description || ""}`,
          count: 5,
          maximum_number_of_urls: 5,
          maximum_number_of_tokens: 2048,
          maximum_number_of_snippets_per_url: 3,
          maximum_number_of_tokens_per_url: 1024,
          context_threshold_mode: "balanced" as const,
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

/**
 * Directly extract jobs using Brave LLM API with grounded search.
 * Bypasses Brave Search API completely - uses LLM's built-in web search.
 */
async function extractJobsDirectly(
  mode: "worldwide" | "europe",
  queryHint: string,
  promptMessages: any[],
  vars: Record<string, any>,
): Promise<Job[]> {
  const llmProvider = vars.llm_provider || "brave";
  const maxHoursAgo = vars.max_hours_ago || 24;
  const minConfidence = vars.min_confidence || 0.6;
  const qualityLevel = vars.quality_level || "strict";

  // Build search query focused on job titles and companies
  // Brave Search's site: operators are inconsistent, so search by job title + company keywords
  const jobTitles = [
    '"AI Engineer"',
    '"ML Engineer"',
    '"Machine Learning Engineer"',
    '"LLM Engineer"',
    '"AI/ML Engineer"',
  ];
  const remoteKeywords = '"remote" OR "fully remote" OR "Remote (Worldwide)"';
  const atsSites = `${ASHBY_JOBS_DOMAIN} OR boards.greenhouse.io OR jobs.lever.co`;

  const searchQuery = `(${jobTitles.join(" OR ")}) ${remoteKeywords} (${atsSites}) -turing.com -builtin.com -ziprecruiter.com -remoteok.com -reddit.com -hnhiring.com`;

  console.log(`🔍 Brave LLM Context search for ${mode}: ${searchQuery}`);

  try {
    // Use Brave LLM Context API (same as brave-search.ts script)
    const agent = new BraveSearchAgent();
    const response = await agent.search({
      q: searchQuery,
      count: 50,
      maximum_number_of_tokens: 16384,
      maximum_number_of_urls: 50,
      maximum_number_of_snippets: 100,
      context_threshold_mode: "lenient",
      search_lang: "en",
    });

    // Extract sources from grounding data
    const sources = response.grounding.generic.map((item) => ({
      url: item.url,
      title: item.title,
      snippets: item.snippets.join("\n"),
      metadata: response.sources[item.url],
    }));

    console.log(
      `📥 Found ${sources.length} sources from Brave LLM Context API`,
    );

    // Filter out aggregator listing pages
    const filteredSources = sources.filter((source) => {
      if (isJobAggregatorListingPage(source.url)) {
        console.log(`🚫 Brave LLM Context: Skipping aggregator: ${source.url}`);
        return false;
      }
      return true;
    });

    console.log(
      `📊 After aggregator filter: ${filteredSources.length} candidates`,
    );

    // Filter by age (last 24 hours)
    const freshSources = filteredSources.filter((source) => {
      const age = source.metadata?.age;
      if (!age) {
        // No age metadata - include it (some ATS platforms don't provide age)
        return true;
      }

      const [, , relativeTime] = age;
      if (!relativeTime) return true;

      // Parse "X hours ago" or "X days ago"
      const hoursMatch = relativeTime.match(/(\d+)\s+hours?\s+ago/i);
      if (hoursMatch) {
        const hours = parseInt(hoursMatch[1]);
        if (hours <= maxHoursAgo) return true;
        console.log(`⏰ Too old (${hours}h ago): ${source.url}`);
        return false;
      }

      const daysMatch = relativeTime.match(/(\d+)\s+days?\s+ago/i);
      if (daysMatch) {
        const days = parseInt(daysMatch[1]);
        if (days === 0) return true; // Today = 0 days
        console.log(`⏰ Too old (${days}d ago): ${source.url}`);
        return false;
      }

      // "today" or "yesterday"
      if (/today/i.test(relativeTime)) return true;
      if (/yesterday/i.test(relativeTime)) {
        console.log(`⏰ Too old (yesterday): ${source.url}`);
        return false;
      }

      // Unknown format - include it
      return true;
    });

    console.log(
      `📊 Brave LLM Context (${mode}): Found ${freshSources.length} candidates after filtering (≤${maxHoursAgo}h)`,
    );

    if (freshSources.length > 0) {
      console.log(`📋 Fresh candidates for ${mode}:`);
      freshSources.forEach((s, i) => {
        const age = s.metadata?.age?.[2] || "unknown";
        console.log(`   ${i + 1}. ${s.title} (${age})`);
        console.log(`      ${s.url}`);
      });
    }

    if (freshSources.length === 0) {
      console.log(`⚠️  No valid sources found for ${mode}`);
      return [];
    }

    // Create search results blob for LLM extraction
    const docBlobs = freshSources
      .map(
        (s, i) =>
          `[Doc ${i + 1}]\nURL: ${s.url}\nTitle: ${s.title}\nSnippets: ${s.snippets}`,
      )
      .join("\n\n");

    // Substitute variables in Langfuse prompt
    const substitutedMessages = promptMessages.map((msg: any) => {
      let content = msg.content;
      content = content.replace(/\{\{search_results\}\}/g, docBlobs);
      content = content.replace(/\{\{max_hours_ago\}\}/g, String(maxHoursAgo));
      content = content.replace(
        /\{\{min_confidence\}\}/g,
        String(minConfidence),
      );
      content = content.replace(/\{\{quality_level\}\}/g, String(qualityLevel));
      return { role: msg.role, content };
    });

    // Extract jobs using LLM (DeepSeek or Brave Answers as fallback)
    let content: string;

    if (llmProvider === "brave") {
      // Try Brave Answers API first, fall back to DeepSeek if it fails
      try {
        console.log(`🔍 Using Brave Answers API for ${mode} extraction`);
        const braveResponse = await getAnswers({
          messages: substitutedMessages as any,
          model: "brave-search",
          temperature: 0.1,
          max_tokens: 8000,
        });
        content = braveResponse.choices[0]?.message?.content || "{}";
      } catch (braveError) {
        console.warn(`⚠️  Brave Answers API failed, falling back to DeepSeek`);
        const client = createDeepSeekClient({
          apiKey: process.env.DEEPSEEK_API_KEY,
        });
        const response = await client.chat({
          model: "deepseek-chat",
          messages: substitutedMessages,
          temperature: 0.1,
          response_format: { type: "json_object" },
        });
        content = response.choices[0]?.message?.content || "{}";
      }
    } else {
      // Use DeepSeek
      console.log(`🤖 Using DeepSeek for ${mode} extraction`);
      const client = createDeepSeekClient({
        apiKey: process.env.DEEPSEEK_API_KEY,
      });
      const response = await client.chat({
        model: "deepseek-chat",
        messages: substitutedMessages,
        temperature: 0.1,
        response_format: { type: "json_object" },
      });
      content = response.choices[0]?.message?.content || "{}";
    }

    const parsed = JSON.parse(content);
    console.log(
      `📦 DeepSeek extraction for ${mode}: ${parsed?.jobs?.length || parsed?.[mode]?.length || 0} jobs found`,
    );

    // Handle both response formats: {jobs: []} and {worldwide: [], europe: []}
    const jobs = parsed?.jobs || parsed?.[mode] || [];

    if (jobs.length > 0) {
      console.log(
        `   Sample job URLs: ${jobs
          .slice(0, 3)
          .map((j: Job) => j.sourceUrl || j.url)
          .join(", ")}`,
      );
    } else {
      console.log(`   Response excerpt: ${content.substring(0, 800)}...`);
    }
    return Array.isArray(jobs) ? jobs : [];
  } catch (error) {
    console.error(`Direct extraction error (${llmProvider}):`, error);
    return [];
  }
}

async function extractJobs(
  docs: any[],
  mode: "worldwide" | "europe",
  promptMessages: any[],
  vars: Record<string, any>,
) {
  const llmProvider = vars.llm_provider || "deepseek"; // "deepseek" or "brave"

  const docBlobs = docs
    .map(
      (d, i) =>
        `[Doc ${i + 1}]\nURL: ${d.url}\nTitle: ${d.title ?? ""}\nSnippet: ${d.description ?? ""}\nContext: ${d.context ?? ""}`,
    )
    .join("\n\n");

  // Substitute variables in prompt messages from Langfuse
  const substitutedMessages = promptMessages.map((msg: any) => {
    let content = msg.content;
    // Replace variables like {{search_results}}, {{max_hours_ago}}, etc.
    content = content.replace(/\{\{search_results\}\}/g, docBlobs);
    content = content.replace(
      /\{\{max_hours_ago\}\}/g,
      String(vars.max_hours_ago || 24),
    );
    content = content.replace(
      /\{\{min_confidence\}\}/g,
      String(vars.min_confidence || 0.6),
    );
    content = content.replace(
      /\{\{quality_level\}\}/g,
      String(vars.quality_level || "strict"),
    );
    return { role: msg.role, content };
  });

  try {
    let content: string;

    if (llmProvider === "brave") {
      // Use Brave AI (grounded search-powered AI)
      console.log(`🔍 Using Brave AI for ${mode} extraction`);
      const braveResponse = await getAnswers({
        messages: substitutedMessages as any,
        model: "brave-search", // Uses grounded search context
        temperature: 0.1,
        max_tokens: 8000,
      });
      content = braveResponse.choices[0]?.message?.content || "{}";
    } else {
      // Use DeepSeek (default)
      console.log(`🤖 Using DeepSeek for ${mode} extraction`);
      const client = createDeepSeekClient({
        apiKey: process.env.DEEPSEEK_API_KEY,
      });
      const response = await client.chat({
        model: "deepseek-chat",
        messages: substitutedMessages,
        temperature: 0.1,
        response_format: { type: "json_object" },
      });
      content = response.choices[0]?.message?.content || "{}";
    }

    const parsed = JSON.parse(content);
    return Array.isArray(parsed?.jobs) ? parsed.jobs : [];
  } catch (error) {
    console.error(`Extract jobs error (${llmProvider}):`, error);
    return [];
  }
}

/**
 * Detects if a URL is a job aggregator listing page (not a single job posting).
 * These pages list MULTIPLE jobs instead of being a direct link to one specific job.
 *
 * IMPORTANT: ATS platforms (Ashby, Greenhouse, Lever) host INDIVIDUAL job postings
 * for companies - those are GOOD and should NOT be filtered.
 * Job boards (Turing, Built In, ZipRecruiter) list MULTIPLE jobs - those are BAD.
 */
function isJobAggregatorListingPage(url: string): boolean {
  const urlLower = url.toLowerCase();

  // Job board/aggregator domains that list MULTIPLE jobs (not single postings)
  // These are search/browse pages showing many jobs from different companies
  const aggregatorDomains = [
    "turing.com/jobs", // Turing job board listing page
    "builtin.com/jobs", // Built In search results
    "builtinchicago.org/jobs", // Built In Chicago search results
    "ziprecruiter.com", // ZipRecruiter job listings
    "glassdoor.com/job", // Glassdoor search results
    "remotive.com/remote", // Remotive job listings
    "remoteok.com", // RemoteOK job listings
    "weworkremotely.com/remote-jobs", // WeWorkRemotely listings
    "wellfound.com/jobs", // Wellfound job search
    "indeed.com/jobs", // Indeed search results
    "linkedin.com/jobs/search", // LinkedIn job search
  ];

  // Check for known aggregator domains
  if (aggregatorDomains.some((domain) => urlLower.includes(domain))) {
    return true;
  }

  // URL patterns that indicate multi-job listing pages (not single postings)
  const listingPatterns = [
    "/jobs/remote-", // e.g., /jobs/remote-ai-engineer-jobs (Turing pattern)
    "/remote-jobs/", // e.g., /remote-jobs/category
    "/jobs/search", // e.g., /jobs/search?q=remote
    "/remote-job-search",
    "/browse",
  ];

  // Check for multi-job listing URL patterns
  if (listingPatterns.some((pattern) => urlLower.includes(pattern))) {
    return true;
  }

  return false;
}

function filterJobs(
  jobs: Job[],
  minConfidence: number,
): { worldwide: Job[]; europe: Job[] } {
  const seen = new Set<string>();
  const worldwide: Job[] = [];
  const europe: Job[] = [];

  console.log(
    `🔍 Filtering ${jobs.length} jobs (minConfidence: ${minConfidence})`,
  );

  for (const job of jobs) {
    if (job.confidence < minConfidence) {
      console.log(`   ❌ Low confidence (${job.confidence}): ${job.title}`);
      continue;
    }
    if (!job.isFullyRemote) {
      console.log(`   ❌ Not fully remote: ${job.title}`);
      continue;
    }
    if (seen.has(job.sourceUrl)) {
      console.log(`   ❌ Duplicate: ${job.sourceUrl}`);
      continue;
    }

    // Exclude job aggregator listing pages (not single job postings)
    if (isJobAggregatorListingPage(job.sourceUrl)) {
      console.log(`⚠️  Excluded aggregator listing page: ${job.sourceUrl}`);
      continue;
    }

    console.log(
      `   ✅ Accepted (${job.remoteRegion}): ${job.title} (confidence: ${job.confidence})`,
    );
    seen.add(job.sourceUrl);

    if (job.remoteRegion === "worldwide") worldwide.push(job);
    else if (job.remoteRegion === "europe") europe.push(job);
  }

  console.log(
    `📊 Filtering complete: ${worldwide.length} worldwide, ${europe.length} europe`,
  );
  return { worldwide, europe };
}

class DirectRemoteJobsProvider {
  id() {
    return "direct-remote-jobs";
  }

  async callApi(_prompt: string, context: any): Promise<{ output: string }> {
    const vars = context?.vars ?? {};
    const mode = String(vars.mode ?? "live");

    if (mode === "saved") {
      try {
        const llmProvider = vars.llm_provider;
        const result = loadLatestResults(llmProvider);
        console.log(
          `✅ Loaded saved results (${result.worldwide?.length || 0} worldwide, ${result.europe?.length || 0} europe)`,
        );
        return { output: stableJsonStringify(result) };
      } catch (error) {
        console.error("Error loading saved results:", error);
        return {
          output: stableJsonStringify({
            worldwide: [],
            europe: [],
            _error: `Failed to load saved results: ${error instanceof Error ? error.message : String(error)}`,
          }),
        };
      }
    }

    if (mode === "live") {
      try {
        const queryHint = vars.queryHint;
        const maxCandidates = vars.maxCandidatesPerMode ?? 25;
        const verifyTopN = vars.verifyTopNWithContext ?? 8;
        const minConfidence = vars.minConfidence ?? 0.6;
        const maxHoursAgo = vars.max_hours_ago ?? 24;
        const qualityLevel = vars.quality_level ?? "strict";
        const llmProvider = vars.llm_provider ?? "deepseek"; // "deepseek" or "brave"

        // Fetch extraction prompt from Langfuse using fetch-based API
        console.log(
          "📥 Fetching prompt from Langfuse: remote-ai-jobs-extractor@production",
        );
        const langfusePrompt = await fetchLangfusePrompt(
          "remote-ai-jobs-extractor",
          {
            type: "chat",
            label: "production",
          },
        );
        const promptMessages = langfusePrompt.prompt as any[];
        console.log(
          `✅ Using Langfuse prompt version ${langfusePrompt.version}`,
        );

        // Use Brave LLM API directly for job discovery (no Brave Search)
        console.log(`🎯 LLM Provider: ${llmProvider.toUpperCase()}`);
        console.log(
          `🚀 Using Brave LLM API directly to discover and extract jobs`,
        );

        const [worldwideJobs, europeJobs] = await Promise.all([
          extractJobsDirectly("worldwide", queryHint, promptMessages, {
            max_hours_ago: maxHoursAgo,
            min_confidence: minConfidence,
            quality_level: qualityLevel,
            llm_provider: llmProvider,
          }),
          extractJobsDirectly("europe", queryHint, promptMessages, {
            max_hours_ago: maxHoursAgo,
            min_confidence: minConfidence,
            quality_level: qualityLevel,
            llm_provider: llmProvider,
          }),
        ]);

        // Filter and split
        const allJobs = [...worldwideJobs, ...europeJobs];
        const result = filterJobs(allJobs, minConfidence);

        // Save results to JSON file
        const metadata = {
          queryHint,
          maxCandidates,
          verifyTopN,
          minConfidence,
          maxHoursAgo,
          qualityLevel,
          promptVersion: (langfusePrompt as any).version,
          totalJobsExtracted: allJobs.length,
          worldwideCount: result.worldwide.length,
          europeCount: result.europe.length,
        };
        saveResults(result, llmProvider, metadata);

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
        _error: `Unknown mode '${mode}'. Use 'fixture', 'saved', or 'live'.`,
      }),
    };
  }
}

export default DirectRemoteJobsProvider;
