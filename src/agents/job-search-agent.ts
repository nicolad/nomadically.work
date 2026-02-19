/**
 * Job Search Agent
 *
 * Claude Agent SDK agent for finding fully remote AI/React engineering jobs
 * in Europe or worldwide, driven by GOAL.md.
 *
 * Uses createAgent from @/anthropic — same pattern as the architect agent.
 * Tools: WebSearch, WebFetch, Bash (D1 gateway curl), Read
 */

export {
  createJobSearchAgent,
  buildJobSearchSystemPrompt,
} from '@/anthropic/agents/job-search';
export type { JobSearchAgentOptions } from '@/anthropic/agents/job-search';
