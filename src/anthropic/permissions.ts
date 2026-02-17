/**
 * Claude Agent SDK — Permission Helpers
 *
 * Control exactly which tools your agent can use. Allow safe operations,
 * block dangerous ones, or require approval for sensitive actions.
 *
 * Permission modes:
 * - `default` — Standard behavior, prompts for dangerous operations
 * - `acceptEdits` — Auto-accept file edit operations
 * - `bypassPermissions` — Skip all checks (requires `allowDangerouslySkipPermissions`)
 * - `plan` — Planning mode, no actual tool execution
 * - `dontAsk` — Don't prompt, deny if not pre-approved
 *
 * @example Read-only agent (no prompts)
 * ```typescript
 * import { runAgent, PERMISSION_MODES } from '@/anthropic';
 *
 * const result = await runAgent('Review this code for best practices', {
 *   allowedTools: ['Read', 'Glob', 'Grep'],
 *   permissionMode: PERMISSION_MODES.BYPASS,
 *   bypassPermissions: true,
 * });
 * ```
 */

import type {
  CanUseTool,
  PermissionResult,
  PermissionUpdate,
} from '@anthropic-ai/claude-agent-sdk';

/**
 * Create a `canUseTool` callback that always allows listed tools
 * and denies everything else.
 *
 * @example
 * ```typescript
 * const result = await runAgent('Analyze the codebase', {
 *   canUseTool: allowOnly(['Read', 'Glob', 'Grep']),
 * });
 * ```
 */
export function allowOnly(toolNames: string[]): CanUseTool {
  const allowed = new Set(toolNames);
  return async (toolName) => {
    if (allowed.has(toolName)) {
      return { behavior: 'allow' };
    }
    return { behavior: 'deny', message: `Tool "${toolName}" is not in the allow list` };
  };
}

/**
 * Create a `canUseTool` callback that denies listed tools
 * and allows everything else.
 *
 * @example
 * ```typescript
 * const result = await runAgent('Fix the codebase', {
 *   canUseTool: denyTools(['Bash']),
 * });
 * ```
 */
export function denyTools(toolNames: string[]): CanUseTool {
  const denied = new Set(toolNames);
  return async (toolName) => {
    if (denied.has(toolName)) {
      return { behavior: 'deny', message: `Tool "${toolName}" is blocked` };
    }
    return { behavior: 'allow' };
  };
}

/**
 * Create a `canUseTool` callback that restricts file operations
 * to specific directory prefixes.
 *
 * @example
 * ```typescript
 * const result = await runAgent('Fix the bug', {
 *   tools: ['Read', 'Edit', 'Bash'],
 *   canUseTool: restrictToDirectories(['/app/src', '/app/tests']),
 * });
 * ```
 */
export function restrictToDirectories(allowedDirs: string[]): CanUseTool {
  const fileTools = new Set(['Read', 'Write', 'Edit']);
  return async (toolName, input) => {
    if (!fileTools.has(toolName)) {
      return { behavior: 'allow' };
    }
    const filePath = (input as Record<string, unknown>).file_path as string | undefined
      ?? (input as Record<string, unknown>).path as string | undefined;
    if (!filePath) {
      return { behavior: 'allow' };
    }
    const inAllowed = allowedDirs.some((dir) => filePath.startsWith(dir));
    if (inAllowed) {
      return { behavior: 'allow' };
    }
    return {
      behavior: 'deny',
      message: `File "${filePath}" is outside allowed directories: ${allowedDirs.join(', ')}`,
    };
  };
}

/**
 * Create a `canUseTool` callback that blocks Bash commands
 * matching any of the given patterns.
 *
 * @example
 * ```typescript
 * const result = await runAgent('Clean up temp files', {
 *   tools: ['Bash'],
 *   canUseTool: blockCommands([/rm\s+-rf/, /DROP\s+TABLE/i, /sudo/]),
 * });
 * ```
 */
export function blockCommands(patterns: RegExp[]): CanUseTool {
  return async (toolName, input) => {
    if (toolName !== 'Bash') {
      return { behavior: 'allow' };
    }
    const command = (input as Record<string, unknown>).command as string | undefined;
    if (!command) {
      return { behavior: 'allow' };
    }
    for (const pattern of patterns) {
      if (pattern.test(command)) {
        return {
          behavior: 'deny',
          message: `Command blocked: matches forbidden pattern ${pattern}`,
        };
      }
    }
    return { behavior: 'allow' };
  };
}

/**
 * Compose multiple `canUseTool` callbacks. A tool is allowed only
 * if ALL callbacks allow it (first deny wins).
 *
 * @example
 * ```typescript
 * const result = await runAgent('Fix the codebase', {
 *   canUseTool: composePermissions(
 *     allowOnly(['Read', 'Edit', 'Bash', 'Glob', 'Grep']),
 *     restrictToDirectories(['/app/src']),
 *     blockCommands([/rm\s+-rf/]),
 *   ),
 * });
 * ```
 */
export function composePermissions(...callbacks: CanUseTool[]): CanUseTool {
  return async (toolName, input, options) => {
    for (const cb of callbacks) {
      const result = await cb(toolName, input, options);
      if (result.behavior === 'deny') {
        return result;
      }
    }
    return { behavior: 'allow' };
  };
}

/**
 * Create a `canUseTool` callback that logs every permission decision
 * and delegates to an inner callback.
 *
 * @example
 * ```typescript
 * const result = await runAgent('Analyze code', {
 *   canUseTool: withPermissionLogging(
 *     allowOnly(['Read', 'Glob']),
 *     (tool, decision) => console.log(`[perm] ${tool}: ${decision}`),
 *   ),
 * });
 * ```
 */
export function withPermissionLogging(
  inner: CanUseTool,
  logger: (toolName: string, decision: string, input: Record<string, unknown>) => void,
): CanUseTool {
  return async (toolName, input, options) => {
    const result = await inner(toolName, input, options);
    logger(toolName, result.behavior, input);
    return result;
  };
}
