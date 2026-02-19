/**
 * Job Search Agent
 *
 * Goal (from GOAL.md):
 *   "Get a fully remote job in Europe or worldwide as AI engineer or React engineer."
 *
 * Mastra Agent backed by Claude (claude-sonnet-4-5) via @ai-sdk/anthropic.
 * Follows the same pattern as admin-assistant.ts.
 *
 * Tools:
 *   - braveWebSearch    → discover fresh remote AI/React job postings on the web
 *   - braveLlmContext   → extract grounded job details from top result URLs
 *   - searchD1Jobs      → query the internal D1 database for classified eu-remote jobs
 */

import { Agent } from "@mastra/core/agent";
import { anthropic } from "@ai-sdk/anthropic";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  braveWebSearchTool,
  braveLlmContextTool,
} from "@/brave/brave-search-tools";

// ---------------------------------------------------------------------------
// Tool: search the internal D1 gateway for classified remote jobs
// ---------------------------------------------------------------------------

export const searchD1JobsTool = createTool({
  id: "search-d1-jobs",
  description:
    "Search the nomadically.work internal job database for fully remote roles. " +
    "Jobs here are ATS-ingested and AI-classified. Use keywords to filter by job title " +
    "(e.g. 'react', 'ai engineer', 'frontend', 'machine learning').",
  inputSchema: z.object({
    keywords: z
      .array(z.string())
      .optional()
      .describe("Keywords to match against job titles"),
    limit: z.number().int().min(1).max(50).default(30),
    status: z
      .enum(["eu-remote", "active"])
      .default("eu-remote")
      .describe("'eu-remote' = AI-classified as remote-friendly in EU"),
  }),
  outputSchema: z.object({
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
  }),
  execute: async ({ context }) => {
    const { keywords, limit, status } = context;
    const gatewayUrl = process.env.D1_GATEWAY_URL;
    const gatewayKey = process.env.D1_GATEWAY_KEY;

    if (!gatewayUrl || !gatewayKey) {
      return { jobs: [], total: 0, filtered: 0, source: "internal-db" as const };
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
      return { jobs: [], total: 0, filtered: 0, source: "internal-db" as const };
    }

    if (!response.ok) {
      return { jobs: [], total: 0, filtered: 0, source: "internal-db" as const };
    }

    const data = (await response.json()) as { total: number; jobs: any[] };
    let jobs: any[] = data.jobs || [];
    const total = data.total || jobs.length;

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
// Agent
// ---------------------------------------------------------------------------

export const jobSearchAgent = new Agent({
  id: "job-search-agent",
  name: "Job Search Agent",

  instructions: `You are a job search agent with one clear mission:

**Find fully remote AI engineer or React engineer jobs in Europe or worldwide.**

## Target Roles

- **AI Engineer** — LLM/RAG/agents, ML pipelines, GenAI product engineering, AI platform roles
- **React Engineer** — Frontend/full-stack React, Next.js, TypeScript

Both EU-based remote roles and worldwide remote roles (EU timezone friendly) qualify.
Hybrid and on-site do NOT qualify.

---

## Search Strategy

### Step 1: Query the internal database
Call \`search-d1-jobs\` twice:
1. AI roles: keywords = ["ai", "machine learning", "llm", "genai", "ml"]
2. React roles: keywords = ["react", "frontend", "next.js"]

This database contains ATS-ingested jobs already classified as EU-remote.

### Step 2: Search the web for fresh listings
Use \`brave-web-search\` with freshness=pw (past week). Run at least 4 queries:
- \`"fully remote" "AI engineer" OR "LLM engineer" OR "GenAI engineer" Europe 2025 apply\`
- \`"fully remote" "React engineer" OR "React developer" Europe OR worldwide 2025\`
- \`site:jobs.lever.co OR site:boards.greenhouse.io "AI engineer" remote 2025\`
- \`site:jobs.ashbyhq.com "React" OR "frontend" remote 2025\`

### Step 3: Extract job details
For the top 5-8 URLs, use \`brave-llm-context\` to pull:
company name, role title, remote policy, required skills, salary (if listed), apply link.

---

## Output Format

Present two sections:

### AI Engineer Matches
**[#] Title — Company**
- Remote: [fully remote / EU-remote / worldwide]
- Confidence: high/medium/low — [reason]
- Skills: [list]
- Salary: [amount or "not listed"]
- Apply: [URL]
- Why it fits: [1-2 sentences]

### React Engineer Matches
[Same format]

### Summary
- AI roles found: N (internal: N, web: N)
- React roles found: N
- Top 3 picks and why

---

## Rules

1. **Evidence only** — never invent job details; quote the source
2. **Apply URL required** — every listing must have a direct link
3. **Remote only** — skip hybrid/on-site
4. **EU-accessible** — EU applicants must be accepted
5. **Recency** — prefer last 30 days`,

  model: anthropic("claude-sonnet-4-5-20250929"),
  tools: {
    searchD1Jobs: searchD1JobsTool,
    braveWebSearch: braveWebSearchTool,
    braveLlmContext: braveLlmContextTool,
  },
});
