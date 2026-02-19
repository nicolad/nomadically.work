/**
 * Job Search Agent
 *
 * Goal: Find a fully remote job in Europe or worldwide as an AI engineer
 * or React engineer.
 *
 * Capabilities:
 * - Query the internal nomadically.work D1 database for classified remote jobs
 * - Search the web via Brave for external job listings (AI/React roles)
 * - Score and rank results by fit (role match, remote confidence, recency)
 * - Return grounded, evidence-backed job recommendations
 *
 * Design:
 * - Grounding-First: structured output with Zod schema, evidence required
 * - Multi-source: internal DB (classified remote EU) + external Brave search
 * - Read-only: no DB writes, no mutations
 */

import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { deepseek } from "@ai-sdk/deepseek";
import { z } from "zod";
import {
  braveWebSearchTool,
  braveLlmContextTool,
} from "@/brave/brave-search-tools";

// ---------------------------------------------------------------------------
// Tool: Search internal D1 database for remote AI/React jobs
// ---------------------------------------------------------------------------

const searchD1JobsInputSchema = z.object({
  keywords: z
    .array(z.string())
    .optional()
    .describe(
      "Keywords to filter jobs by (matched against title). E.g. ['react', 'ai', 'machine learning', 'frontend']",
    ),
  limit: z.number().int().min(1).max(50).default(30),
  status: z
    .enum(["eu-remote", "active"])
    .default("eu-remote")
    .describe(
      "Job status filter. 'eu-remote' = classified as remote-friendly in EU.",
    ),
});

const searchD1JobsOutputSchema = z.object({
  jobs: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      company_key: z.string(),
      location: z.string().nullable(),
      url: z.string().nullable(),
      status: z.string().nullable(),
      is_remote_eu: z.boolean().nullable(),
      remote_eu_confidence: z.string().nullable(),
      remote_eu_reason: z.string().nullable(),
      posted_at: z.string().nullable(),
      source_kind: z.string().nullable(),
    }),
  ),
  total: z.number(),
  filtered: z.number(),
  source: z.literal("internal-db"),
});

export const searchD1JobsTool = createTool({
  id: "search-d1-jobs",
  description:
    "Search the nomadically.work internal job database for fully remote AI/React engineering roles. " +
    "Jobs here have been ATS-ingested and AI-classified. Use status='eu-remote' to get high-signal remote-EU listings.",
  inputSchema: searchD1JobsInputSchema,
  outputSchema: searchD1JobsOutputSchema,
  execute: async ({ context }) => {
    const { keywords, limit, status } = context;
    const gatewayUrl = process.env.D1_GATEWAY_URL;
    const gatewayKey = process.env.D1_GATEWAY_KEY;

    if (!gatewayUrl || !gatewayKey) {
      return {
        jobs: [],
        total: 0,
        filtered: 0,
        source: "internal-db" as const,
      };
    }

    let response: Response;
    try {
      response = await fetch(`${gatewayUrl}/jobs/batch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gatewayKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, limit: 200 }),
      });
    } catch {
      return {
        jobs: [],
        total: 0,
        filtered: 0,
        source: "internal-db" as const,
      };
    }

    if (!response.ok) {
      return {
        jobs: [],
        total: 0,
        filtered: 0,
        source: "internal-db" as const,
      };
    }

    const data = (await response.json()) as { total: number; jobs: any[] };
    let jobs: any[] = data.jobs || [];
    const total = data.total || jobs.length;

    // Filter by keywords against job title (fast, no description load needed)
    if (keywords && keywords.length > 0) {
      const patterns = keywords.map((k) => k.toLowerCase());
      jobs = jobs.filter((job: any) => {
        const haystack = `${job.title ?? ""} ${job.company_key ?? ""}`.toLowerCase();
        return patterns.some((p) => haystack.includes(p));
      });
    }

    const filtered = jobs.length;

    return {
      jobs: jobs.slice(0, limit).map((job: any) => ({
        id: Number(job.id),
        title: String(job.title ?? ""),
        company_key: String(job.company_key ?? ""),
        location: job.location ? String(job.location) : null,
        url: job.url ? String(job.url) : null,
        status: job.status ? String(job.status) : null,
        is_remote_eu: job.is_remote_eu ?? null,
        remote_eu_confidence: job.remote_eu_confidence
          ? String(job.remote_eu_confidence)
          : null,
        remote_eu_reason: job.remote_eu_reason
          ? String(job.remote_eu_reason)
          : null,
        posted_at: job.posted_at ? String(job.posted_at) : null,
        source_kind: job.source_kind ? String(job.source_kind) : null,
      })),
      total,
      filtered,
      source: "internal-db" as const,
    };
  },
});

// ---------------------------------------------------------------------------
// Agent definition
// ---------------------------------------------------------------------------

export const jobSearchAgent = new Agent({
  id: "job-search-agent",
  name: "Job Search Agent",

  instructions: `You are a job search agent with one clear mission:

**Find fully remote AI engineer or React engineer jobs in Europe or worldwide.**

## Your Goal

Help the user land a fully remote role as:
- **AI Engineer** — LLM/RAG/agents, ML pipelines, AI product engineering, GenAI
- **React Engineer** — Frontend/full-stack with React, Next.js, TypeScript

Both EU-based remote roles and worldwide remote roles (that allow EU timezones) qualify.

---

## Search Strategy

### Step 1: Search the internal database
Use \`search-d1-jobs\` with these keyword sets:
- AI roles: keywords = ["ai", "machine learning", "llm", "genai", "ml engineer"]
- React roles: keywords = ["react", "frontend", "next.js", "typescript frontend"]

This database contains ATS-ingested jobs already classified as EU-remote.

### Step 2: Search the web for fresh listings
Use \`brave-web-search\` with targeted queries such as:
- \`"fully remote" "AI engineer" OR "LLM engineer" OR "GenAI engineer" Europe 2025 site:jobs.lever.co OR site:boards.greenhouse.io OR site:jobs.ashbyhq.com\`
- \`"fully remote" "React engineer" OR "React developer" Europe OR worldwide 2025 site:lever.co OR site:greenhouse.io\`
- \`"remote" "AI engineer" "Europe" -onsite -hybrid job opening apply\`

Use freshness=pw (past week) to surface recent postings.

### Step 3: Get rich context on top matches
For the most promising URLs, use \`brave-llm-context\` to extract job details:
company, role, salary if listed, actual remote policy, required skills.

---

## Output Format

Present results as a ranked list. For each job:

**[#] Job Title — Company**
- **Source**: internal DB / web
- **Remote policy**: (fully remote / EU-remote / worldwide remote)
- **Confidence**: (high/medium/low — from classifier or your assessment)
- **Key skills required**: [list]
- **Apply link**: URL
- **Why it fits**: 1-2 sentences on fit for AI or React engineer role
- **Evidence**: Quote from job description or classification reason

Then provide a **Summary** section:
- Total AI engineer matches found
- Total React engineer matches found
- Top 3 recommendations and why

---

## Evidence Rules (Grounding-First)

- Every job recommendation MUST include the apply URL
- Every confidence assessment MUST cite the reason (from DB classifier or your own analysis)
- Do not invent job details — only report what you found in the data
- If internal DB returns no results, say so clearly and rely on web search
- Mark speculative interpretations as "(inferred)"

---

## Scope Constraints

- Only suggest **fully remote** or **remote-friendly** roles — no hybrid, no on-site
- Roles must be open to EU-based applicants (EU-remote, worldwide, or EMEA at minimum)
- Role type must match: AI engineering, ML engineering, GenAI, or React/frontend/full-stack React
- Prioritize: recent postings (< 30 days), high remote confidence, direct ATS apply links`,

  model: deepseek("deepseek-chat"),
  tools: {
    searchD1Jobs: searchD1JobsTool,
    braveWebSearch: braveWebSearchTool,
    braveLlmContext: braveLlmContextTool,
  },
});
