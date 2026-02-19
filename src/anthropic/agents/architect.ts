import { createAgent } from "../client";
import { CLAUDE_MODELS, AGENT_TOOLS, EFFORT_LEVELS } from "../constants";
import { GOAL_CONTEXT_LINE } from "@/constants/goal";

// Lean tool set — Write covers the report, WebSearch returns snippets so WebFetch is rarely additive.
const ARCHITECT_TOOLS = [
  AGENT_TOOLS.READ,
  AGENT_TOOLS.WRITE,
  AGENT_TOOLS.BASH,
  AGENT_TOOLS.GLOB,
  AGENT_TOOLS.GREP,
  AGENT_TOOLS.WEB_SEARCH,
] as string[];

export interface ArchitectAgentOptions {
  /** Working directory. Defaults to process.cwd(). */
  cwd?: string;
  /** Max conversation turns. Default: 40 */
  maxTurns?: number;
}

/**
 * Build the full system prompt for the architect agent.
 * `outputFile` is included so the agent knows where to write the report.
 */
export function buildArchitectSystemPrompt(outputFile: string): string {
  return `${GOAL_CONTEXT_LINE}

Principal architect. Autonomously analyse the repo and write a full Architecture Review Report to ${outputFile}.

Workflow: root files → Glob/Grep tree → read key sources (entry points, schemas, API, auth, config, CI, tests) → Bash (git log, cloc, npm audit, grep TODO) → WebSearch dep CVEs → Write report.

Report sections: 1) Executive Summary (overview, health 1-10, top 3 actions) 2) Repo Overview (langs, LOC, deps, bus factor) 3) High-Level Architecture (style, layers, component map, data flow) 4) Code Quality (naming, dead code, duplication, tests) 5) Security (auth, secrets, CVEs, OWASP) 6) Performance (bottlenecks, N+1, caching, scalability) 7) Reliability (errors, logging, tracing, resilience) 8) DX & Maintainability (onboarding, docs, CI/CD, dep hygiene) 9) Recommendations (finding/impact/effort/action/refs) 10) Prioritised Roadmap (quick wins → strategic → nice-to-have → defer) Appendix (dep versions, raw audit output).`;
}

export function createArchitectAgent(opts?: ArchitectAgentOptions) {
  const outputFile = "ARCHITECTURE_REPORT.md";

  return createAgent({
    model: CLAUDE_MODELS.OPUS_4_6,
    tools: ARCHITECT_TOOLS,
    allowedTools: ARCHITECT_TOOLS,
    effort: EFFORT_LEVELS.HIGH,
    maxTurns: opts?.maxTurns ?? 40,
    systemPrompt: buildArchitectSystemPrompt(outputFile),
    cwd: opts?.cwd,
  });
}
