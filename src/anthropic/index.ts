/**
 * Claude Agent SDK Integration
 *
 * Build AI agents that read files, run commands, search the web,
 * edit code, and more — using the same tools that power Claude Code.
 *
 * @example Quick start
 * ```typescript
 * import { runAgent, TOOL_PRESETS } from '@/anthropic';
 *
 * const result = await runAgent('Find and fix the bug in auth.ts', {
 *   tools: TOOL_PRESETS.CODING,
 *   allowedTools: TOOL_PRESETS.CODING,
 * });
 *
 * if (result.success) {
 *   console.log(result.result);
 * }
 * ```
 *
 * @example Streaming
 * ```typescript
 * import { streamAgent } from '@/anthropic';
 *
 * for await (const msg of streamAgent('Analyze this codebase', {
 *   tools: ['Read', 'Glob', 'Grep'],
 * })) {
 *   if (msg.type === 'result') console.log(msg);
 * }
 * ```
 *
 * @example Reusable agent
 * ```typescript
 * import { createAgent, CLAUDE_MODELS } from '@/anthropic';
 *
 * const reviewer = createAgent({
 *   model: CLAUDE_MODELS.SONNET_4_5,
 *   tools: ['Read', 'Glob', 'Grep'],
 *   systemPrompt: 'You are a code reviewer.',
 * });
 *
 * const review = await reviewer.ask('Review src/auth.ts');
 * ```
 *
 * @example Pre-configured templates
 * ```typescript
 * import { agentTemplates } from '@/anthropic';
 *
 * const result = await agentTemplates.bugFix().run('Fix the failing test');
 * ```
 */

// Constants
export {
  CLAUDE_MODELS,
  AGENT_TOOLS,
  TOOL_PRESETS,
  THINKING_PRESETS,
  EFFORT_LEVELS,
  PERMISSION_MODES,
  MODEL_ALIASES,
  SETTING_SOURCES,
  PRICING,
  DEFAULT_CONFIG,
  ENV_VARS,
  ERROR_MESSAGES,
  type ClaudeModel,
  type AgentTool,
  type EffortLevel,
} from './constants';

// Client
export {
  query,
  runAgent,
  askAgent,
  streamAgent,
  createAgent,
  unstable_v2_createSession,
  unstable_v2_prompt,
  unstable_v2_resumeSession,
} from './client';

// Tools
export {
  createSdkMcpServer,
  tool,
  getToolPreset,
  combineTools,
  TOOL_DESCRIPTIONS,
} from './tools';

// Agents
export {
  createCodeReviewAgent,
  createBugFixAgent,
  createResearchAgent,
  createReasoningAgent,
  createQuickAgent,
  agentTemplates,
} from './agents';

// Subagents
export {
  defineSubagent,
  mergeSubagents,
  isSubagentMessage,
  getSubagentId,
  SUBAGENT_TOOLS,
  SUBAGENT_PRESETS,
  type SubagentConfig,
} from './subagents';

// Hooks
export {
  HOOK_EVENTS,
  hookMatcher,
  buildHooks,
  composeHooks,
  createConsoleLogHook,
  createAuditHook,
  createBlockCommandsHook,
  createDirectoryGuardHook,
  createContextInjectionHook,
  createTimingHook,
  createErrorLogHook,
  type HookMap,
} from './hooks';

// MCP
export {
  mcpStdio,
  mcpSSE,
  mcpHTTP,
  buildMcpServers,
  mergeMcpServers,
  MCP_SERVERS,
} from './mcp';

// Permissions
export {
  allowOnly,
  denyTools,
  restrictToDirectories,
  blockCommands,
  composePermissions,
  withPermissionLogging,
} from './permissions';

// Sessions
export {
  captureSession,
  resumeSession,
  forkSession,
  getSessionId,
  type CapturedSession,
} from './sessions';

// Types
export type {
  // Core
  Query,
  Options,
  SDKMessage,
  SDKResultMessage,
  SDKResultSuccess,
  SDKResultError,

  // Messages
  SDKAssistantMessage,
  SDKPartialAssistantMessage,
  SDKSystemMessage,
  SDKUserMessage,
  SDKStatusMessage,
  SDKToolProgressMessage,

  // Hooks
  HookEvent,
  HookInput,
  HookCallback,
  HookCallbackMatcher,
  PreToolUseHookInput,
  PostToolUseHookInput,

  // Permissions
  PermissionMode,
  PermissionResult,
  CanUseTool,

  // Agent
  AgentDefinition,

  // MCP
  McpServerConfig,
  McpStdioServerConfig,
  McpSSEServerConfig,
  McpHttpServerConfig,
  McpSdkServerConfigWithInstance,
  McpServerStatus,
  SdkMcpToolDefinition,

  // Model & usage
  ModelInfo,
  ModelUsage,
  AccountInfo,

  // Session
  SDKSession,
  SDKSessionOptions,

  // Output
  OutputFormat,
  JsonSchemaOutputFormat,

  // Sandbox
  SandboxSettings,

  // Config
  SettingSource,
  SdkPluginConfig,
  SlashCommand,

  // Custom helpers
  SimpleQueryOptions,
  AgentResult,
  AgentTemplateConfig,
} from './types';
