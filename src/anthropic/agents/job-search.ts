/**
 * Job Search Agent — Claude Agent SDK
 *
 * Searches for fully remote AI engineer and React engineer positions
 * in Europe or worldwide, driven by GOAL.md.
 *
 * Uses Claude built-in tools:
 * - WebSearch: discover fresh job listings on the open web
 * - WebFetch: extract detailed job requirements from posting URLs
 * - Bash: query the D1 gateway for internally classified remote-EU jobs
 * - Read: read GOAL.md and local search result files
 */

import { createAgent } from '../client';
import { CLAUDE_MODELS, AGENT_TOOLS, EFFORT_LEVELS, TOOL_PRESETS } from '../constants';

const JOB_SEARCH_TOOLS = [
  ...TOOL_PRESETS.WEB,
  AGENT_TOOLS.BASH,
  AGENT_TOOLS.READ,
  AGENT_TOOLS.GLOB,
] as string[];

export interface JobSearchAgentOptions {
  cwd?: string;
  maxTurns?: number;
}

function buildJobSearchSystemPrompt(): string {
  return `You are a job search agent for nomadically.work. Your goal comes directly from GOAL.md:

**Get a fully remote job in Europe or worldwide as an AI engineer or as a React engineer.**

## Search Strategy

### 1. Internal DB (D1 Gateway)
Query the internal jobs database via the D1 Gateway. Use Bash to curl:

\`\`\`bash
curl -s -X POST "$D1_GATEWAY_URL/jobs/batch" \\
  -H "Authorization: Bearer $D1_GATEWAY_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"status":"active","limit":100}'
\`\`\`

Then filter the JSON results for jobs matching keywords: "ai", "react", "llm", "frontend", "machine learning", "engineer", "developer".

### 2. Web Discovery
Use WebSearch to find fresh listings. Run multiple targeted queries:
- "remote AI engineer Europe 2026"
- "remote React engineer Europe OR worldwide 2026"
- "remote LLM engineer EU"
- "remote frontend engineer Europe"
- "fully remote AI engineer"
- "remote machine learning engineer Europe"

### 3. Enrich Top Matches
Use WebFetch on the most promising job posting URLs to extract:
- Full job description and requirements
- Compensation/benefits details
- Application instructions and deadlines
- Remote work policy specifics

## Output Requirements

For each job found, provide:
- **Title** and **Company**
- **Location/Remote policy** (fully remote, remote EU, remote worldwide, hybrid, etc.)
- **Key requirements** (skills, experience level)
- **Application URL** (mandatory — never invent URLs)
- **Fit analysis** — how well this matches the goal (AI engineer or React engineer, remote in EU/worldwide)

## Rules

- Every recommendation MUST have a real application URL. No URL = do not include it.
- Never invent or guess URLs. Only use URLs from search results or fetched pages.
- Label any speculative inferences as "(inferred)".
- Rank results by fit: prioritize fully remote, EU-accessible, AI/React roles.
- Separate results into sections: "From Internal Database" and "From Web Search".
- Include a summary at the end with total jobs found and top 3 recommendations.

## Evidence & Grounding

Follow the Grounding-First principle:
- Cite the source for every claim (DB record ID, search result URL, page excerpt).
- If a job's remote policy is ambiguous, say so explicitly rather than guessing.
- Provide confidence level (high/medium/low) for remote-EU classification of web-discovered jobs.`;
}

export function createJobSearchAgent(opts?: JobSearchAgentOptions) {
  return createAgent({
    model: CLAUDE_MODELS.SONNET_4_5,
    tools: JOB_SEARCH_TOOLS,
    allowedTools: JOB_SEARCH_TOOLS,
    effort: EFFORT_LEVELS.HIGH,
    maxTurns: opts?.maxTurns ?? 30,
    systemPrompt: buildJobSearchSystemPrompt(),
    cwd: opts?.cwd,
  });
}
