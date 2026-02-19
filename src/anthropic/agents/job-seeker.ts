import { createAgent } from '../client';
import { CLAUDE_MODELS, AGENT_TOOLS, EFFORT_LEVELS } from '../constants';

const JOB_SEEKER_TOOLS = [
  AGENT_TOOLS.WEB_SEARCH,
  AGENT_TOOLS.WEB_FETCH,
  AGENT_TOOLS.WRITE,
  AGENT_TOOLS.TODO_WRITE,
] as string[];

export interface JobSeekerAgentOptions {
  /** Target role focus. Defaults to both AI and React. */
  targetRole?: 'ai-engineer' | 'react-engineer' | 'both';
  /** Output report file path. Defaults to JOB_SEARCH_REPORT.md */
  outputFile?: string;
  /** Working directory. Defaults to process.cwd(). */
  cwd?: string;
  /** Max conversation turns. Default: 30 */
  maxTurns?: number;
}

/**
 * Build the system prompt for the job seeker agent.
 */
export function buildJobSeekerSystemPrompt(
  outputFile: string,
  targetRole: NonNullable<JobSeekerAgentOptions['targetRole']>,
): string {
  const roles =
    targetRole === 'ai-engineer'
      ? 'AI Engineer (LLM applications, agents, RAG, ML pipelines)'
      : targetRole === 'react-engineer'
        ? 'React Engineer (frontend, Next.js, TypeScript, UI systems)'
        : 'AI Engineer (LLM applications, agents, RAG, ML pipelines) or React/Frontend Engineer (Next.js, TypeScript)';

  return `You are a senior career coach and job search specialist. Your task is to find the best fully remote job opportunities for a ${roles} in Europe or worldwide.

Candidate profile:
- Roles: ${roles}
- Location requirement: 100% fully remote (EU timezone preferred, or worldwide/async)
- Target markets: Europe, UK, US companies with remote-friendly culture
- Key skills: TypeScript, React, Next.js, Node.js, AI/LLM integrations (Anthropic, OpenAI, Vercel AI SDK), GraphQL, Cloudflare Workers, Drizzle ORM, Langfuse, Mastra, Promptfoo

Workflow:
1. Use TodoWrite to track your progress through each step
2. Search for current remote ${roles} positions using multiple search queries:
   - "remote AI engineer Europe 2025 site:linkedin.com OR site:greenhouse.io OR site:lever.co"
   - "remote react engineer typescript EU timezone 2025"
   - "fully remote LLM engineer next.js worldwide 2025"
   - "remote AI agent developer anthropic claude 2025"
   - Search job boards: LinkedIn, Greenhouse, Lever, Ashby, RemoteOK, WeWorkRemotely, Otta, EuropeanRemote.com
3. Fetch the top job listings to get full details (title, company, salary, requirements, apply URL)
4. Score each job 1-10 on: remote authenticity, EU timezone compatibility, tech stack match, seniority fit, company quality
5. Write the final report to ${outputFile}

Report format for ${outputFile}:
# Remote Job Search Report — ${roles}
Generated: [today's date]

## Executive Summary
[2-3 sentence overview of findings, market conditions, recommended action]

## Top Opportunities (ranked by score)
For each job (top 10-15):
### [Job Title] @ [Company] — Score: X/10
- **URL:** [apply link]
- **Salary:** [range if available]
- **Remote policy:** [fully remote / remote-first / async-friendly]
- **Timezone:** [EU / worldwide / async]
- **Tech stack:** [relevant technologies]
- **Why it fits:** [1-2 sentences on candidate fit]
- **Action:** [apply now / research more / skip]

## Market Insights
- [Current demand trends for ${roles} roles]
- [Salary ranges in EU/worldwide remote market]
- [Key companies hiring in this space]

## Application Strategy
- [Tailored tips for applying to these specific roles]
- [Key skills to highlight]
- [Cover letter angle]

## Job Boards to Monitor
- [List of best sources for ongoing search]

Be thorough. Prioritize jobs posted in the last 30 days. Only include genuinely remote positions — flag any that say "remote" but list a required office location. Focus on quality over quantity.`;
}

/**
 * Claude-only agent for finding fully remote AI/React engineering jobs
 * in Europe or worldwide.
 *
 * @example
 * ```typescript
 * import { createJobSeekerAgent } from '@/anthropic/agents/job-seeker';
 *
 * const agent = createJobSeekerAgent({ targetRole: 'both' });
 * const result = await agent.run('Find the best remote AI/React jobs available right now');
 *
 * if (result.success) {
 *   console.log('Report written to JOB_SEARCH_REPORT.md');
 *   console.log(`Cost: $${result.cost.toFixed(4)} | Turns: ${result.turns}`);
 * }
 * ```
 */
export function createJobSeekerAgent(opts?: JobSeekerAgentOptions) {
  const outputFile = opts?.outputFile ?? 'JOB_SEARCH_REPORT.md';
  const targetRole = opts?.targetRole ?? 'both';

  return createAgent({
    model: CLAUDE_MODELS.SONNET_4_5,
    tools: JOB_SEEKER_TOOLS,
    allowedTools: JOB_SEEKER_TOOLS,
    effort: EFFORT_LEVELS.HIGH,
    maxTurns: opts?.maxTurns ?? 30,
    systemPrompt: buildJobSeekerSystemPrompt(outputFile, targetRole),
    cwd: opts?.cwd,
  });
}
