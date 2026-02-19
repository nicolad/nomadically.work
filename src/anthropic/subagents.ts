/**
 * Claude Agent SDK — Subagent Helpers
 *
 * Define and compose subagents that handle focused subtasks.
 * The main agent delegates work via the `Task` tool, and subagents
 * report back with results. Messages from within a subagent include
 * a `parent_tool_use_id` field for tracking.
 *
 * @example
 * ```typescript
 * import { runAgent, defineSubagent, TOOL_PRESETS } from '@/anthropic';
 *
 * const agents = {
 *   ...defineSubagent('code-reviewer', {
 *     description: 'Expert code reviewer for quality and security reviews.',
 *     prompt: 'Analyze code quality and suggest improvements.',
 *     tools: TOOL_PRESETS.READONLY,
 *   }),
 *   ...defineSubagent('test-runner', {
 *     description: 'Runs tests and reports results.',
 *     prompt: 'Execute tests and report failures.',
 *     tools: ['Bash', 'Read'],
 *     model: 'haiku',
 *   }),
 * };
 *
 * const result = await runAgent('Review and test the codebase', {
 *   tools: ['Read', 'Glob', 'Grep', 'Task'],
 *   agents,
 * });
 * ```
 */

import type {
  AgentDefinition,
  AgentMcpServerSpec,
  SDKMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { AGENT_TOOLS } from "./constants";
import { GOAL_CONTEXT_LINE } from "@/constants/goal";

/**
 * Options for defining a subagent (same as AgentDefinition but
 * with optional shorthand model aliases).
 */
export interface SubagentConfig {
  /** Natural language description of when to use this agent */
  description: string;
  /** The agent's system prompt / instructions */
  prompt: string;
  /** Tool names the subagent can use. Inherits parent tools if omitted */
  tools?: string[];
  /** Tool names to explicitly disallow */
  disallowedTools?: string[];
  /** Model shorthand: 'sonnet' | 'opus' | 'haiku' | 'inherit' */
  model?: AgentDefinition["model"];
  /** MCP server specs for this subagent */
  mcpServers?: AgentMcpServerSpec[];
  /** Skill names to preload */
  skills?: string[];
  /** Max agentic turns before stopping */
  maxTurns?: number;
}

/**
 * Create a named subagent definition ready to spread into the `agents` option.
 *
 * @returns `{ [name]: AgentDefinition }` — spread into `agents` on your query options
 *
 * @example
 * ```typescript
 * const agents = {
 *   ...defineSubagent('linter', {
 *     description: 'Checks code style and lint errors',
 *     prompt: 'You are a linter. Check code for style issues.',
 *     tools: ['Read', 'Glob', 'Grep'],
 *     model: 'haiku',
 *   }),
 * };
 * ```
 */
export function defineSubagent(
  name: string,
  config: SubagentConfig,
): Record<string, AgentDefinition> {
  const def: AgentDefinition = {
    description: config.description,
    prompt: config.prompt,
  };

  if (config.tools) def.tools = config.tools;
  if (config.disallowedTools) def.disallowedTools = config.disallowedTools;
  if (config.model) def.model = config.model;
  if (config.mcpServers) def.mcpServers = config.mcpServers;
  if (config.skills) def.skills = config.skills;
  if (config.maxTurns) def.maxTurns = config.maxTurns;

  return { [name]: def };
}

/**
 * Merge multiple subagent definitions into a single agents record.
 *
 * @example
 * ```typescript
 * const agents = mergeSubagents(
 *   defineSubagent('reviewer', { ... }),
 *   defineSubagent('tester', { ... }),
 *   defineSubagent('linter', { ... }),
 * );
 *
 * await runAgent('Review, test, and lint', {
 *   tools: ['Read', 'Glob', 'Grep', 'Task'],
 *   agents,
 * });
 * ```
 */
export function mergeSubagents(
  ...agentDefs: Record<string, AgentDefinition>[]
): Record<string, AgentDefinition> {
  return Object.assign({}, ...agentDefs);
}

/**
 * Filter streaming messages by subagent context.
 * Returns only messages that belong to a specific subagent execution
 * (identified by `parent_tool_use_id`).
 *
 * @example
 * ```typescript
 * for await (const msg of streamAgent('Review code', opts)) {
 *   if (isSubagentMessage(msg)) {
 *     console.log(`[subagent ${msg.parent_tool_use_id}]`, msg);
 *   }
 * }
 * ```
 */
export function isSubagentMessage(msg: SDKMessage): boolean {
  return "parent_tool_use_id" in msg && msg.parent_tool_use_id !== null;
}

/**
 * Get the parent tool use ID from a message, or null if it's from the main agent.
 */
export function getSubagentId(msg: SDKMessage): string | null {
  if ("parent_tool_use_id" in msg) {
    return msg.parent_tool_use_id as string | null;
  }
  return null;
}

/**
 * Tool list that includes Task for subagent delegation.
 * Use this when your main agent needs to spawn subagents.
 */
export const SUBAGENT_TOOLS = {
  /** Read-only + Task delegation */
  READONLY_WITH_TASK: [
    AGENT_TOOLS.READ,
    AGENT_TOOLS.GLOB,
    AGENT_TOOLS.GREP,
    AGENT_TOOLS.TASK,
  ] as string[],

  /** Full coding + Task delegation */
  CODING_WITH_TASK: [
    AGENT_TOOLS.READ,
    AGENT_TOOLS.WRITE,
    AGENT_TOOLS.EDIT,
    AGENT_TOOLS.BASH,
    AGENT_TOOLS.GLOB,
    AGENT_TOOLS.GREP,
    AGENT_TOOLS.TASK,
  ] as string[],

  /** All tools including Task */
  ALL_WITH_TASK: [...Object.values(AGENT_TOOLS)] as string[],
} as const;

/**
 * Pre-built subagent definitions for common tasks.
 */
export const SUBAGENT_PRESETS = {
  /** Code reviewer subagent */
  codeReviewer: defineSubagent("code-reviewer", {
    description: "Expert code reviewer for quality and security reviews.",
    prompt: `${GOAL_CONTEXT_LINE} Analyze code quality, security vulnerabilities, and suggest improvements. Be specific and actionable.`,
    tools: ["Read", "Glob", "Grep"],
  }),

  /** Test runner subagent */
  testRunner: defineSubagent("test-runner", {
    description: "Runs tests and reports results.",
    prompt: `${GOAL_CONTEXT_LINE} Execute tests and report failures with clear diagnostics.`,
    tools: ["Bash", "Read"],
    model: "haiku",
  }),

  /** Linter subagent */
  linter: defineSubagent("linter", {
    description: "Checks code style and lint errors.",
    prompt: `${GOAL_CONTEXT_LINE} Check code for style issues, lint errors, and formatting problems.`,
    tools: ["Read", "Glob", "Grep"],
    model: "haiku",
  }),

  /** Documentation writer subagent */
  docWriter: defineSubagent("doc-writer", {
    description: "Writes and updates documentation.",
    prompt: `${GOAL_CONTEXT_LINE} Write clear, concise documentation. Follow existing documentation patterns.`,
    tools: ["Read", "Write", "Edit", "Glob"],
  }),

  /** Research subagent with web access */
  researcher: defineSubagent("researcher", {
    description: "Researches topics using the web and codebase.",
    prompt: `${GOAL_CONTEXT_LINE} Research thoroughly using web search and codebase analysis. Provide citations.`,
    tools: ["Read", "Glob", "Grep", "WebSearch", "WebFetch"],
  }),
} as const;
