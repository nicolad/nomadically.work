/**
 * Claude Agent SDK — Pre-configured Agent Templates
 *
 * Ready-to-use agents for common tasks, following the same pattern
 * as the OpenRouter agents module.
 */

import { createAgent } from '../client';
import { CLAUDE_MODELS, TOOL_PRESETS, EFFORT_LEVELS } from '../constants';

export { createArchitectAgent } from '../agents/architect';
export { createJobSearchAgent } from '../agents/job-search';

/**
 * Pre-configured agent for code analysis and review
 */
export function createCodeReviewAgent(opts?: {
  model?: string;
  cwd?: string;
}) {
  return createAgent({
    model: opts?.model ?? CLAUDE_MODELS.SONNET_4_5,
    tools: TOOL_PRESETS.READONLY,
    allowedTools: TOOL_PRESETS.READONLY,
    effort: EFFORT_LEVELS.HIGH,
    systemPrompt:
      'You are an expert code reviewer. Analyze code for bugs, security issues, performance problems, and best practice violations. Be specific and actionable.',
    cwd: opts?.cwd,
  });
}

/**
 * Pre-configured agent for bug fixing
 */
export function createBugFixAgent(opts?: {
  model?: string;
  cwd?: string;
}) {
  return createAgent({
    model: opts?.model ?? CLAUDE_MODELS.SONNET_4_5,
    tools: TOOL_PRESETS.CODING,
    allowedTools: TOOL_PRESETS.CODING,
    effort: EFFORT_LEVELS.HIGH,
    systemPrompt:
      'You are a skilled debugger. Find and fix bugs efficiently. Read the relevant code, understand the issue, and make precise edits to resolve it.',
    cwd: opts?.cwd,
  });
}

/**
 * Pre-configured agent for research tasks
 */
export function createResearchAgent(opts?: {
  model?: string;
  cwd?: string;
}) {
  return createAgent({
    model: opts?.model ?? CLAUDE_MODELS.SONNET_4_5,
    tools: [...TOOL_PRESETS.READONLY, ...TOOL_PRESETS.WEB],
    allowedTools: [...TOOL_PRESETS.READONLY, ...TOOL_PRESETS.WEB],
    effort: EFFORT_LEVELS.HIGH,
    systemPrompt:
      'You are a research assistant. Search the codebase and the web to answer questions thoroughly. Provide citations and source references.',
    cwd: opts?.cwd,
  });
}

/**
 * Pre-configured agent for deep reasoning tasks (Opus 4.6)
 */
export function createReasoningAgent(opts?: {
  cwd?: string;
}) {
  return createAgent({
    model: CLAUDE_MODELS.OPUS_4_6,
    tools: TOOL_PRESETS.READONLY,
    allowedTools: TOOL_PRESETS.READONLY,
    effort: EFFORT_LEVELS.MAX,
    systemPrompt:
      'You are a reasoning specialist. Think through complex problems step by step using extended thinking. Be thorough and precise.',
    cwd: opts?.cwd,
  });
}

/**
 * Pre-configured quick agent for simple tasks (Haiku)
 */
export function createQuickAgent(opts?: {
  cwd?: string;
  tools?: string[];
}) {
  return createAgent({
    model: CLAUDE_MODELS.HAIKU_3_5,
    tools: opts?.tools ?? TOOL_PRESETS.READONLY,
    allowedTools: opts?.tools ?? TOOL_PRESETS.READONLY,
    effort: EFFORT_LEVELS.LOW,
    cwd: opts?.cwd,
  });
}

/**
 * Agent template map for easy access
 */
// Re-import for template map
import { createArchitectAgent } from '../agents/architect';
import { createJobSearchAgent } from '../agents/job-search';

/**
 * Agent template map for easy access
 */
export const agentTemplates = {
  codeReview: createCodeReviewAgent,
  bugFix: createBugFixAgent,
  research: createResearchAgent,
  reasoning: createReasoningAgent,
  architect: createArchitectAgent,
  quick: createQuickAgent,
  jobSearch: createJobSearchAgent,
} as const;
