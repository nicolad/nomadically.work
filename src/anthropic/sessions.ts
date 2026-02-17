/**
 * Claude Agent SDK — Session Helpers
 *
 * Maintain context across multiple exchanges. Claude remembers files read,
 * analysis done, and conversation history. Resume sessions later, or fork
 * them to explore different approaches.
 *
 * @example Capture session ID and resume
 * ```typescript
 * import { captureSession, streamAgent } from '@/anthropic';
 *
 * // First query — capture session ID
 * const { sessionId, messages } = await captureSession('Read auth.ts', {
 *   allowedTools: ['Read', 'Glob'],
 * });
 *
 * // Resume with full context
 * for await (const msg of streamAgent('Now find all callers', {
 *   resume: sessionId,
 * })) {
 *   if ('result' in msg) console.log(msg.result);
 * }
 * ```
 */

import type { SDKMessage, SDKResultMessage, SDKSystemMessage } from '@anthropic-ai/claude-agent-sdk';
import { streamAgent, runAgent } from './client';
import type { SimpleQueryOptions, AgentResult } from './types';

/**
 * Result from captureSession — includes the session ID for resuming.
 */
export interface CapturedSession {
  /** Session ID to pass as `resume` in subsequent queries */
  sessionId: string;
  /** All messages received during the query */
  messages: SDKMessage[];
  /** The final result, if the query completed */
  result: AgentResult | null;
}

/**
 * Extract the session ID from a stream of SDK messages.
 * The session ID appears in the first `system/init` message.
 */
export function getSessionId(msg: SDKMessage): string | null {
  if (msg.type === 'system' && 'subtype' in msg && msg.subtype === 'init') {
    return (msg as SDKSystemMessage).session_id;
  }
  return null;
}

/**
 * Run an agent query and capture the session ID for later resumption.
 * This implements the pattern from the SDK docs: capture session_id from
 * the system/init message, then use it with `resume` to continue.
 *
 * @example
 * ```typescript
 * const { sessionId } = await captureSession('Read the auth module', {
 *   allowedTools: ['Read', 'Glob'],
 * });
 *
 * // Later — resume with full context
 * const result = await runAgent('Now find all places that call it', {
 *   resume: sessionId,
 * });
 * ```
 */
export async function captureSession(
  prompt: string,
  opts?: SimpleQueryOptions,
): Promise<CapturedSession> {
  let sessionId = '';
  const messages: SDKMessage[] = [];
  let lastResult: SDKResultMessage | null = null;

  for await (const msg of streamAgent(prompt, opts)) {
    messages.push(msg);

    if (!sessionId) {
      const id = getSessionId(msg);
      if (id) sessionId = id;
    }

    if (msg.type === 'result') {
      lastResult = msg;
    }
  }

  let result: AgentResult | null = null;
  if (lastResult) {
    if (lastResult.subtype === 'success') {
      result = {
        success: true,
        result: lastResult.result,
        cost: lastResult.total_cost_usd,
        turns: lastResult.num_turns,
        duration: lastResult.duration_ms,
        usage: lastResult.usage,
        structuredOutput: lastResult.structured_output,
      };
    } else {
      result = {
        success: false,
        error: lastResult.subtype,
        cost: lastResult.total_cost_usd,
        turns: lastResult.num_turns,
        duration: lastResult.duration_ms,
        usage: lastResult.usage,
        errors: lastResult.errors,
      };
    }
  }

  return { sessionId, messages, result };
}

/**
 * Resume a previous session and run to completion.
 * Shorthand for `runAgent(prompt, { resume: sessionId, ...opts })`.
 *
 * @example
 * ```typescript
 * const { sessionId } = await captureSession('Read the auth module', opts);
 * const result = await resumeSession(sessionId, 'Now fix the bug');
 * ```
 */
export async function resumeSession(
  sessionId: string,
  prompt: string,
  opts?: SimpleQueryOptions,
): Promise<AgentResult> {
  return runAgent(prompt, { ...opts, resume: sessionId });
}

/**
 * Fork a session to explore a different approach without losing the original.
 * Creates a new session ID from the resumed point.
 *
 * @example
 * ```typescript
 * const { sessionId } = await captureSession('Analyze arch', opts);
 *
 * // Fork: try two different approaches
 * const approachA = await forkSession(sessionId, 'Refactor using Strategy pattern');
 * const approachB = await forkSession(sessionId, 'Refactor using Observer pattern');
 * ```
 */
export async function forkSession(
  sessionId: string,
  prompt: string,
  opts?: SimpleQueryOptions,
): Promise<CapturedSession> {
  return captureSession(prompt, {
    ...opts,
    resume: sessionId,
    forkSession: true,
  });
}
