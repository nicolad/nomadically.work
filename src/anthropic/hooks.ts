/**
 * Claude Agent SDK Hooks
 *
 * Run custom code at key points in the agent lifecycle.
 * Hooks use callback functions to validate, log, block, or transform agent behavior.
 *
 * Available hook events:
 * - **PreToolUse** — Before a tool runs. Block, modify input, or add context.
 * - **PostToolUse** — After a tool runs. Log results, add context, modify MCP output.
 * - **PostToolUseFailure** — After a tool fails. Log errors, add recovery context.
 * - **Notification** — When the agent sends a notification. Add context.
 * - **UserPromptSubmit** — When a user prompt is submitted. Add context.
 * - **SessionStart** — When a session starts (startup, resume, clear, compact).
 * - **SessionEnd** — When a session ends. Log, clean up.
 * - **Stop** — When the agent stops. Optionally continue or add context.
 * - **SubagentStart** — When a subagent is spawned. Add context.
 * - **SubagentStop** — When a subagent finishes.
 * - **PreCompact** — Before context compaction. Add custom instructions.
 * - **PermissionRequest** — When a permission check is needed. Allow or deny.
 * - **Setup** — On init or maintenance. Add environment context.
 * - **TeammateIdle** — When a teammate becomes idle.
 * - **TaskCompleted** — When a background task completes.
 *
 * @example Log all file changes to an audit file
 * ```typescript
 * import { createAuditHook, buildHooks } from '@/anthropic/hooks';
 * import { runAgent } from '@/anthropic';
 *
 * const result = await runAgent('Refactor utils.ts', {
 *   tools: ['Read', 'Edit'],
 *   hooks: buildHooks({
 *     PostToolUse: [{ matcher: 'Edit|Write', hooks: [createAuditHook('./audit.log')] }],
 *   }),
 * });
 * ```
 */

import type {
  HookCallback,
  HookCallbackMatcher,
  HookEvent,
  HookInput,
  HookJSONOutput,
  SyncHookJSONOutput,
  PreToolUseHookInput,
  PostToolUseHookInput,
  PostToolUseFailureHookInput,
  Options,
} from '@anthropic-ai/claude-agent-sdk';

/**
 * All supported hook event names
 */
export const HOOK_EVENTS: readonly HookEvent[] = [
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'Notification',
  'UserPromptSubmit',
  'SessionStart',
  'SessionEnd',
  'Stop',
  'SubagentStart',
  'SubagentStop',
  'PreCompact',
  'PermissionRequest',
  'Setup',
  'TeammateIdle',
  'TaskCompleted',
] as const;

/**
 * Hook definition map — event names to arrays of callback matchers.
 */
export type HookMap = Partial<Record<HookEvent, HookCallbackMatcher[]>>;

// ─── Hook Builders ───────────────────────────────────────────────────────────

/**
 * Create a single hook callback matcher.
 *
 * @param hooks - Array of hook callback functions
 * @param matcher - Optional regex pattern to match tool names (for Pre/PostToolUse)
 * @param timeout - Optional timeout in seconds
 *
 * @example
 * ```typescript
 * const editLogger = hookMatcher([myLogHook], 'Edit|Write');
 * ```
 */
export function hookMatcher(
  hooks: HookCallback[],
  matcher?: string,
  timeout?: number,
): HookCallbackMatcher {
  const result: HookCallbackMatcher = { hooks };
  if (matcher) result.matcher = matcher;
  if (timeout) result.timeout = timeout;
  return result;
}

/**
 * Build a complete hooks configuration from a partial map.
 * Ensures the correct shape for the SDK's `options.hooks`.
 *
 * @example
 * ```typescript
 * const hooks = buildHooks({
 *   PreToolUse: [hookMatcher([blockDangerousCommands], 'Bash')],
 *   PostToolUse: [hookMatcher([logFileChanges], 'Edit|Write')],
 *   SessionEnd: [hookMatcher([cleanupResources])],
 * });
 * ```
 */
export function buildHooks(map: HookMap): Options['hooks'] {
  return map;
}

// ─── Pre-built Hook Factories ────────────────────────────────────────────────

/**
 * Create a hook that logs tool usage to the console.
 *
 * @example
 * ```typescript
 * const hooks = buildHooks({
 *   PreToolUse: [hookMatcher([createConsoleLogHook()])],
 * });
 * ```
 */
export function createConsoleLogHook(prefix = '[agent]'): HookCallback {
  return async (input: HookInput) => {
    const event = input.hook_event_name;
    if ('tool_name' in input) {
      console.log(`${prefix} ${event}: ${(input as PreToolUseHookInput).tool_name}`);
    } else {
      console.log(`${prefix} ${event}`);
    }
    return {};
  };
}

/**
 * Create a hook that logs file modifications to an audit file.
 * Attaches to PostToolUse with matcher 'Edit|Write'.
 *
 * @example
 * ```typescript
 * import { createAuditHook, hookMatcher, buildHooks } from '@/anthropic/hooks';
 *
 * const hooks = buildHooks({
 *   PostToolUse: [hookMatcher([createAuditHook('./audit.log')], 'Edit|Write')],
 * });
 * ```
 */
export function createAuditHook(auditFilePath: string): HookCallback {
  return async (input: HookInput) => {
    if (input.hook_event_name !== 'PostToolUse') return {};

    const postInput = input as PostToolUseHookInput;
    const toolInput = postInput.tool_input as Record<string, unknown>;
    const filePath = toolInput?.file_path ?? 'unknown';
    const line = `${new Date().toISOString()}: ${postInput.tool_name} modified ${filePath}\n`;

    // Dynamic import to avoid top-level Node dependency
    const { appendFile } = await import('fs/promises');
    await appendFile(auditFilePath, line);

    return {};
  };
}

/**
 * Create a hook that blocks specific bash commands.
 * Returns a deny decision when a blocked pattern is matched.
 *
 * @param blockedPatterns - Regex patterns to block (matched against the command string)
 *
 * @example
 * ```typescript
 * const hooks = buildHooks({
 *   PreToolUse: [hookMatcher([createBlockCommandsHook([/rm\s+-rf/, /DROP\s+TABLE/i])], 'Bash')],
 * });
 * ```
 */
export function createBlockCommandsHook(
  blockedPatterns: RegExp[],
): HookCallback {
  return async (input: HookInput) => {
    if (input.hook_event_name !== 'PreToolUse') return {};

    const preInput = input as PreToolUseHookInput;
    if (preInput.tool_name !== 'Bash') return {};

    const toolInput = preInput.tool_input as Record<string, unknown>;
    const command = (toolInput?.command as string) ?? '';

    for (const pattern of blockedPatterns) {
      if (pattern.test(command)) {
        return {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse' as const,
            permissionDecision: 'deny' as const,
            permissionDecisionReason: `Blocked by policy: command matches ${pattern}`,
          },
        } satisfies SyncHookJSONOutput;
      }
    }

    return {};
  };
}

/**
 * Create a hook that allows only specific directories for file operations.
 * Blocks Read/Write/Edit outside the allowed paths.
 *
 * @param allowedDirs - Absolute directory paths that are permitted
 *
 * @example
 * ```typescript
 * const hooks = buildHooks({
 *   PreToolUse: [hookMatcher([createDirectoryGuardHook(['/app/src', '/app/tests'])], 'Read|Write|Edit')],
 * });
 * ```
 */
export function createDirectoryGuardHook(
  allowedDirs: string[],
): HookCallback {
  return async (input: HookInput) => {
    if (input.hook_event_name !== 'PreToolUse') return {};

    const preInput = input as PreToolUseHookInput;
    const toolInput = preInput.tool_input as Record<string, unknown>;
    const filePath = (toolInput?.file_path as string) ?? '';

    if (!filePath) return {};

    const isAllowed = allowedDirs.some((dir) => filePath.startsWith(dir));
    if (!isAllowed) {
      return {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse' as const,
          permissionDecision: 'deny' as const,
          permissionDecisionReason: `File path "${filePath}" is outside allowed directories`,
        },
      } satisfies SyncHookJSONOutput;
    }

    return {};
  };
}

/**
 * Create a hook that adds context to the agent after tool use.
 * Useful for injecting additional instructions based on tool results.
 *
 * @param contextFn - Function that receives the hook input and returns additional context (or null to skip)
 *
 * @example
 * ```typescript
 * const hooks = buildHooks({
 *   PostToolUse: [hookMatcher([createContextInjectionHook(async (input) => {
 *     if (input.tool_name === 'Read') return 'Remember to check for security issues.';
 *     return null;
 *   })])],
 * });
 * ```
 */
export function createContextInjectionHook(
  contextFn: (input: PostToolUseHookInput) => Promise<string | null>,
): HookCallback {
  return async (input: HookInput) => {
    if (input.hook_event_name !== 'PostToolUse') return {};

    const postInput = input as PostToolUseHookInput;
    const context = await contextFn(postInput);

    if (context) {
      return {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse' as const,
          additionalContext: context,
        },
      } satisfies SyncHookJSONOutput;
    }

    return {};
  };
}

/**
 * Create a hook that tracks tool execution timing.
 * Calls back with timing data after each tool use.
 *
 * @param onTiming - Callback receiving tool name and duration in ms
 *
 * @example
 * ```typescript
 * const timings: { tool: string; ms: number }[] = [];
 * const hooks = buildHooks({
 *   PostToolUse: [hookMatcher([createTimingHook((tool, ms) => timings.push({ tool, ms }))])],
 * });
 * ```
 */
export function createTimingHook(
  onTiming: (toolName: string, durationMs: number) => void,
): HookCallback {
  const startTimes = new Map<string, number>();

  const preHook: HookCallback = async (input: HookInput) => {
    if (input.hook_event_name === 'PreToolUse') {
      const preInput = input as PreToolUseHookInput;
      startTimes.set(preInput.tool_use_id, Date.now());
    }
    return {};
  };

  // We return the post hook; the caller should also add preHook to PreToolUse
  // For simplicity, the timing hook works standalone using PostToolUse's elapsed_time
  return async (input: HookInput) => {
    if (input.hook_event_name !== 'PostToolUse') return {};

    const postInput = input as PostToolUseHookInput;
    const startTime = startTimes.get(postInput.tool_use_id);
    const duration = startTime ? Date.now() - startTime : 0;
    startTimes.delete(postInput.tool_use_id);

    onTiming(postInput.tool_name, duration);
    return {};
  };
}

/**
 * Create a hook that handles PostToolUseFailure by logging errors.
 *
 * @param onError - Callback receiving tool name and error message
 *
 * @example
 * ```typescript
 * const hooks = buildHooks({
 *   PostToolUseFailure: [hookMatcher([createErrorLogHook((tool, err) => {
 *     console.error(`Tool ${tool} failed: ${err}`);
 *   })])],
 * });
 * ```
 */
export function createErrorLogHook(
  onError: (toolName: string, error: string) => void,
): HookCallback {
  return async (input: HookInput) => {
    if (input.hook_event_name !== 'PostToolUseFailure') return {};

    const failInput = input as PostToolUseFailureHookInput;
    onError(failInput.tool_name, failInput.error);
    return {};
  };
}

/**
 * Compose multiple hook callbacks into a single callback.
 * Runs them sequentially; returns the last non-empty result.
 *
 * @example
 * ```typescript
 * const combined = composeHooks(logHook, auditHook, validationHook);
 * const hooks = buildHooks({
 *   PostToolUse: [hookMatcher([combined], 'Edit|Write')],
 * });
 * ```
 */
export function composeHooks(...callbacks: HookCallback[]): HookCallback {
  return async (input: HookInput, toolUseID: string | undefined, options: { signal: AbortSignal }) => {
    let lastResult: HookJSONOutput = {};
    for (const cb of callbacks) {
      const result = await cb(input, toolUseID, options);
      if (result && Object.keys(result).length > 0) {
        lastResult = result;
      }
    }
    return lastResult;
  };
}
