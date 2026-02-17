/**
 * Claude Agent SDK Built-in Tools
 *
 * Tool definitions, presets, and custom MCP tool helpers.
 */

import {
  createSdkMcpServer,
  tool,
} from '@anthropic-ai/claude-agent-sdk';

import { AGENT_TOOLS, TOOL_PRESETS } from './constants';

export { createSdkMcpServer, tool };

/**
 * Get tool names for a given preset
 */
export function getToolPreset(
  preset: keyof typeof TOOL_PRESETS,
): string[] {
  return [...TOOL_PRESETS[preset]];
}

/**
 * Combine multiple tool presets, deduplicating
 */
export function combineTools(
  ...presets: (keyof typeof TOOL_PRESETS | string[])[]
): string[] {
  const tools = new Set<string>();
  for (const preset of presets) {
    const names =
      typeof preset === 'string'
        ? TOOL_PRESETS[preset as keyof typeof TOOL_PRESETS]
        : preset;
    for (const name of names) {
      tools.add(name);
    }
  }
  return Array.from(tools);
}

/**
 * Tool descriptions for reference
 */
export const TOOL_DESCRIPTIONS: Record<string, string> = {
  [AGENT_TOOLS.READ]: 'Read any file in the working directory',
  [AGENT_TOOLS.WRITE]: 'Create new files',
  [AGENT_TOOLS.EDIT]: 'Make precise edits to existing files',
  [AGENT_TOOLS.BASH]:
    'Run terminal commands, scripts, git operations',
  [AGENT_TOOLS.GLOB]: 'Find files by pattern (**/*.ts, src/**/*.py)',
  [AGENT_TOOLS.GREP]: 'Search file contents with regex',
  [AGENT_TOOLS.WEB_SEARCH]: 'Search the web for current information',
  [AGENT_TOOLS.WEB_FETCH]: 'Fetch and parse web page content',
  [AGENT_TOOLS.ASK_USER]:
    'Ask the user clarifying questions with multiple choice options',
  [AGENT_TOOLS.NOTEBOOK_EDIT]: 'Edit Jupyter notebook cells',
  [AGENT_TOOLS.TODO_WRITE]: 'Manage todo lists',
  [AGENT_TOOLS.TASK]: 'Spawn subagent tasks',
};
