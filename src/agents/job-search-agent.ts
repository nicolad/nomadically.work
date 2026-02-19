/**
 * Job Search Agent
 *
 * Claude-backed Mastra agent that searches for fully remote AI engineer and
 * React engineer positions in Europe or worldwide — driven by GOAL.md.
 *
 * Tools:
 * - searchD1Jobs: queries the internal D1 gateway for classified remote-EU jobs
 * - braveWebSearch: discovers fresh listings on the open web
 * - braveLlmContext: extracts grounded snippets from job posting URLs
 */

import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { braveWebSearchTool, braveLlmContextTool } from "@/brave/brave-search-tools";

// ---------------------------------------------------------------------------
// Tool: Search D1 Jobs via Gateway
// ---------------------------------------------------------------------------

const searchD1JobsInput = z.object({
  keywords: z
    .array(z.string())
    .default(["ai", "react", "llm", "frontend", "machine learning"])
    .describe("Keywords to filter job titles (case-insensitive substring match)"),
  status: z
    .string()
    .default("active")
    .describe("Job status filter (active, eu-remote, etc.)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .describe("Max jobs to return"),
});

const searchD1JobsOutput = z.object({
  jobs: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      company_key: z.string().optional(),
      location: z.string().optional(),
      url: z.string().optional(),
      is_remote_eu: z.boolean().optional(),
      status: z.string().optional(),
    }),
  ),
  total: z.number(),
  matchedCount: z.number(),
});

export const searchD1JobsTool = createTool({
  id: "search-d1-jobs",
  description:
    "Search the internal D1 database for jobs classified as remote-EU. " +
    "Filters by keyword against job titles. Returns structured job records.",
  inputSchema: searchD1JobsInput,
  outputSchema: searchD1JobsOutput,
  execute: async (input) => {
    const gatewayUrl = process.env.D1_GATEWAY_URL;
    const gatewayKey = process.env.D1_GATEWAY_KEY;

    if (!gatewayUrl || !gatewayKey) {
      throw new Error(
        "Missing D1_GATEWAY_URL or D1_GATEWAY_KEY. Cannot query internal jobs database.",
      );
    }

    const response = await fetch(`${gatewayUrl}/jobs/batch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gatewayKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: input.status,
        limit: input.limit,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`D1 Gateway error: ${response.status} ${body}`);
    }

    const data = (await response.json()) as { total: number; jobs: any[] };
    const allJobs: any[] = data.jobs ?? [];

    // Filter by keywords (case-insensitive title match)
    const keywords = (input.keywords ?? []).map((k) => k.toLowerCase());
    const matched =
      keywords.length > 0
        ? allJobs.filter((job: any) => {
            const title = (job.title ?? "").toLowerCase();
            return keywords.some((kw) => title.includes(kw));
          })
        : allJobs;

    return {
      jobs: matched.map((j: any) => ({
        id: j.id,
        title: j.title ?? "",
        company_key: j.company_key ?? undefined,
        location: j.location ?? undefined,
        url: j.url ?? undefined,
        is_remote_eu: j.is_remote_eu ?? undefined,
        status: j.status ?? undefined,
      })),
      total: data.total,
      matchedCount: matched.length,
    };
  },
});

// ---------------------------------------------------------------------------
// Agent Definition
// ---------------------------------------------------------------------------

export const jobSearchAgent = new Agent({
  id: "job-search-agent",
  name: "Job Search Agent",
  instructions: `You are a job search agent for nomadically.work. Your goal comes directly from GOAL.md:

**Get a fully remote job in Europe or worldwide as an AI engineer or as a React engineer.**

## Search Strategy

1. **Internal DB first** — use the searchD1Jobs tool to find jobs already classified as remote-EU in our database. Search with relevant keywords: "ai", "react", "frontend", "llm", "machine learning", "engineer", "developer".

2. **Web discovery** — use braveWebSearch to find fresh listings from the last 7 days. Target these queries:
   - "remote AI engineer Europe"
   - "remote React engineer Europe OR worldwide"
   - "remote LLM engineer EU"
   - "remote frontend engineer Europe"
   - "fully remote AI engineer"
   - "remote machine learning engineer Europe"

3. **Enrich top matches** — use braveLlmContext on the most promising job posting URLs to extract detailed requirements, compensation, and application instructions.

## Output Requirements

For each job found, provide:
- **Title** and **Company**
- **Location/Remote policy** (fully remote, remote EU, remote worldwide, hybrid, etc.)
- **Key requirements** (skills, experience level)
- **Application URL** (mandatory — never invent URLs)
- **Fit analysis** — how well this matches the goal (AI engineer or React engineer, remote in EU/worldwide)

## Rules

- Every recommendation MUST have an application URL. No URL = do not include it.
- Never invent or guess URLs. Only use URLs from search results or database records.
- Label any speculative inferences as "(inferred)".
- Rank results by fit: prioritize fully remote, EU-accessible, AI/React roles.
- Separate results into two sections: "From Internal Database" and "From Web Search".
- Include a summary at the end with total jobs found and top 3 recommendations.

## Evidence & Grounding

Follow the project's Grounding-First principle:
- Cite the source for every claim (DB record ID, search result URL, snippet excerpt).
- If a job's remote policy is ambiguous, say so explicitly rather than guessing.
- Provide confidence level (high/medium/low) for remote-EU classification of web-discovered jobs.`,

  model: anthropic("claude-sonnet-4-5-20250929"),
  tools: {
    searchD1Jobs: searchD1JobsTool,
    braveWebSearch: braveWebSearchTool,
    braveLlmContext: braveLlmContextTool,
  },
});
