/**
 * Claude Agent SDK Client
 *
 * Wrapper around the Agent SDK's `query` function with convenience methods
 * for common patterns: one-shot prompts, streaming, result extraction.
 *
 * @example
 * ```typescript
 * import { runAgent, streamAgent } from '@/anthropic';
 *
 * // One-shot prompt with result
 * const result = await runAgent('Find all TODO comments in src/');
 *
 * // Streaming with message handler
 * for await (const msg of streamAgent('Fix the bug in auth.ts', {
 *   tools: ['Read', 'Edit', 'Bash'],
 * })) {
 *   console.log(msg);
 * }
 * ```
 */

import {
  query,
  unstable_v2_createSession,
  unstable_v2_prompt,
  unstable_v2_resumeSession,
} from '@anthropic-ai/claude-agent-sdk';

import type { Options, SDKMessage, SDKResultMessage, SDKResultError } from '@anthropic-ai/claude-agent-sdk';

import {
  CLAUDE_MODELS,
  DEFAULT_CONFIG,
  ENV_VARS,
  ERROR_MESSAGES,
  THINKING_PRESETS,
} from './constants';

import type { SimpleQueryOptions, AgentResult } from './types';

import { createRequire } from 'node:module';

export { query, unstable_v2_createSession, unstable_v2_prompt, unstable_v2_resumeSession };

/** Resolve the bundled Claude Code CLI shipped with the SDK. */
const bundledCliPath = createRequire(import.meta.url).resolve(
  '@anthropic-ai/claude-agent-sdk/cli.js',
);

/**
 * Build full SDK options from simplified options
 */
function buildOptions(opts?: SimpleQueryOptions): Options {
  const options: Options = {};

  if (opts?.model) options.model = opts.model;
  if (opts?.tools) options.tools = opts.tools;
  if (opts?.allowedTools) options.allowedTools = opts.allowedTools;
  if (opts?.disallowedTools) options.disallowedTools = opts.disallowedTools;
  if (opts?.canUseTool) options.canUseTool = opts.canUseTool;
  if (opts?.cwd) options.cwd = opts.cwd;
  if (opts?.maxTurns) options.maxTurns = opts.maxTurns;
  if (opts?.maxBudgetUsd) options.maxBudgetUsd = opts.maxBudgetUsd;
  if (opts?.mcpServers) options.mcpServers = opts.mcpServers;
  if (opts?.agents) options.agents = opts.agents;
  if (opts?.resume) options.resume = opts.resume;
  if (opts?.continue) options.continue = opts.continue;
  if (opts?.sessionId) options.sessionId = opts.sessionId;
  if (opts?.forkSession) options.forkSession = opts.forkSession;
  if (opts?.resumeSessionAt) options.resumeSessionAt = opts.resumeSessionAt;
  if (opts?.hooks) options.hooks = opts.hooks;
  if (opts?.settingSources) options.settingSources = opts.settingSources;
  if (opts?.plugins) options.plugins = opts.plugins;

  if (opts?.effort) options.effort = opts.effort;

  if (opts?.systemPrompt) {
    options.systemPrompt = opts.systemPrompt;
  }

  if (opts?.permissionMode) {
    options.permissionMode = opts.permissionMode;
  }

  if (opts?.bypassPermissions) {
    options.permissionMode = 'bypassPermissions';
    options.allowDangerouslySkipPermissions = true;
  }

  // Default to adaptive thinking for Opus 4.6
  if (!options.model || options.model === CLAUDE_MODELS.OPUS_4_6) {
    options.thinking = THINKING_PRESETS.ADAPTIVE;
  }

  // Identify this app in the User-Agent
  options.env = {
    ...process.env,
    [ENV_VARS.SDK_CLIENT_APP]: 'nomadically-work/0.0.1',
  };

  // Use the bundled CLI so the SDK doesn't require a global `claude` install
  options.pathToClaudeCodeExecutable = bundledCliPath;

  return options;
}

/**
 * Parse an SDKResultMessage into a simplified AgentResult
 */
function parseResult(msg: SDKResultMessage): AgentResult {
  if (msg.subtype === 'success') {
    return {
      success: true,
      result: msg.result,
      cost: msg.total_cost_usd,
      turns: msg.num_turns,
      duration: msg.duration_ms,
      usage: msg.usage,
      structuredOutput: msg.structured_output,
    };
  }

  return {
    success: false,
    error: msg.subtype,
    cost: msg.total_cost_usd,
    turns: msg.num_turns,
    duration: msg.duration_ms,
    usage: msg.usage,
    errors: msg.errors,
  };
}

/**
 * Stream agent messages for a prompt.
 * Returns an async generator yielding SDK messages.
 *
 * @example
 * ```typescript
 * for await (const msg of streamAgent('What files are here?', {
 *   tools: ['Bash', 'Glob'],
 * })) {
 *   if (msg.type === 'assistant') {
 *     // Handle assistant message
 *   }
 * }
 * ```
 */
export function streamAgent(
  prompt: string,
  opts?: SimpleQueryOptions,
): AsyncGenerator<SDKMessage, void> {
  return query({ prompt, options: buildOptions(opts) });
}

/**
 * Run an agent prompt and return the final result.
 * Consumes all streaming messages and returns the result.
 *
 * @example
 * ```typescript
 * const result = await runAgent('Find all TODO comments', {
 *   tools: ['Read', 'Glob', 'Grep'],
 * });
 *
 * if (result.success) {
 *   console.log(result.result);
 *   console.log(`Cost: $${result.cost.toFixed(4)}`);
 * }
 * ```
 */
export async function runAgent(
  prompt: string,
  opts?: SimpleQueryOptions,
): Promise<AgentResult> {
  let lastResult: SDKResultMessage | null = null;

  for await (const message of streamAgent(prompt, opts)) {
    if (message.type === 'result') {
      lastResult = message;
    }
  }

  if (!lastResult) {
    return {
      success: false,
      error: 'no_result',
      cost: 0,
      turns: 0,
      duration: 0,
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_creation: { type: 'default' as const },
        service_tier: 'standard' as const,
        server_tool_use: undefined,
      } as unknown as SDKResultError['usage'],
      errors: ['Agent completed without producing a result'],
    };
  }

  return parseResult(lastResult);
}

/**
 * Run an agent prompt and return only the text result.
 * Throws if the agent fails.
 *
 * @example
 * ```typescript
 * const answer = await askAgent('What does the auth module do?', {
 *   tools: ['Read', 'Glob', 'Grep'],
 * });
 * console.log(answer);
 * ```
 */
export async function askAgent(
  prompt: string,
  opts?: SimpleQueryOptions,
): Promise<string> {
  const result = await runAgent(prompt, opts);

  if (!result.success) {
    const errResult = result as Extract<AgentResult, { success: false }>;
    throw new Error(`Agent failed: ${errResult.error} — ${errResult.errors.join(', ')}`);
  }

  return result.result;
}

/**
 * Create a reusable agent configuration that can be called multiple times.
 *
 * @example
 * ```typescript
 * const codeReviewer = createAgent({
 *   model: CLAUDE_MODELS.SONNET_4_5,
 *   tools: ['Read', 'Glob', 'Grep'],
 *   systemPrompt: 'You are a code reviewer. Analyze code for bugs and improvements.',
 * });
 *
 * const result = await codeReviewer('Review src/auth.ts');
 * ```
 */
export function createAgent(defaultOpts: SimpleQueryOptions) {
  return {
    run: (prompt: string, overrides?: Partial<SimpleQueryOptions>) =>
      runAgent(prompt, { ...defaultOpts, ...overrides }),

    ask: (prompt: string, overrides?: Partial<SimpleQueryOptions>) =>
      askAgent(prompt, { ...defaultOpts, ...overrides }),

    stream: (prompt: string, overrides?: Partial<SimpleQueryOptions>) =>
      streamAgent(prompt, { ...defaultOpts, ...overrides }),
  };
}
