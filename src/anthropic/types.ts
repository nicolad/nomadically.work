/**
 * Claude Agent SDK Types
 *
 * Re-exports core types from the SDK and defines helper types
 * for the Nomadically.work integration.
 */

export type {
  // Core query types
  Query,
  Options,
  SDKMessage,
  SDKResultMessage,
  SDKResultSuccess,
  SDKResultError,

  // Assistant messages
  SDKAssistantMessage,
  SDKAssistantMessageError,
  SDKPartialAssistantMessage,

  // System messages
  SDKSystemMessage,
  SDKStatusMessage,
  SDKStatus,
  SDKCompactBoundaryMessage,

  // User messages
  SDKUserMessage,
  SDKUserMessageReplay,

  // Tool messages
  SDKToolProgressMessage,
  SDKToolUseSummaryMessage,

  // Hook types
  HookEvent,
  HookInput,
  HookJSONOutput,
  HookCallback,
  HookCallbackMatcher,
  SyncHookJSONOutput,
  AsyncHookJSONOutput,
  PreToolUseHookInput,
  PreToolUseHookSpecificOutput,
  PostToolUseHookInput,
  PostToolUseHookSpecificOutput,
  PostToolUseFailureHookInput,
  PostToolUseFailureHookSpecificOutput,
  NotificationHookInput,
  NotificationHookSpecificOutput,
  UserPromptSubmitHookInput,
  UserPromptSubmitHookSpecificOutput,
  SessionStartHookInput,
  SessionStartHookSpecificOutput,
  SessionEndHookInput,
  StopHookInput,
  SubagentStartHookInput,
  SubagentStartHookSpecificOutput,
  SubagentStopHookInput,
  PreCompactHookInput,
  PermissionRequestHookInput,
  PermissionRequestHookSpecificOutput,
  SetupHookInput,
  SetupHookSpecificOutput,
  TaskCompletedHookInput,
  TeammateIdleHookInput,

  // Permission types
  PermissionMode,
  PermissionBehavior,
  PermissionResult,
  PermissionUpdate,
  PermissionUpdateDestination,
  PermissionRuleValue,
  CanUseTool,

  // Agent types
  AgentDefinition,
  AgentMcpServerSpec,

  // MCP types
  McpServerConfig,
  McpServerConfigForProcessTransport,
  McpStdioServerConfig,
  McpSSEServerConfig,
  McpHttpServerConfig,
  McpSdkServerConfig,
  McpSdkServerConfigWithInstance,
  McpClaudeAIProxyServerConfig,
  McpServerStatus,
  McpServerStatusConfig,
  McpSetServersResult,

  // SDK MCP tool types
  SdkMcpToolDefinition,
  AnyZodRawShape,
  InferShape,

  // Model & usage types
  ModelInfo,
  ModelUsage,
  NonNullableUsage,
  AccountInfo,

  // Session types
  SDKSession,
  SDKSessionOptions,
  SDKTaskNotificationMessage,
  SDKHookStartedMessage,
  SDKHookProgressMessage,
  SDKHookResponseMessage,
  SDKAuthStatusMessage,
  SDKFilesPersistedEvent,
  SDKPermissionDenial,

  // Output format
  OutputFormat,
  OutputFormatType,
  JsonSchemaOutputFormat,

  // Sandbox
  SandboxSettings,
  SandboxNetworkConfig,
  SandboxIgnoreViolations,

  // Config
  ConfigScope,
  SettingSource,
  SdkBeta,
  SdkPluginConfig,
  SlashCommand,
  ExitReason,

  // Spawn
  SpawnedProcess,
  SpawnOptions,
  Transport,
} from '@anthropic-ai/claude-agent-sdk';

import type {
  Options,
  SDKResultSuccess,
  SDKResultError,
  AgentDefinition,
  HookEvent,
  HookCallbackMatcher,
  SettingSource,
  SdkPluginConfig,
  CanUseTool,
} from '@anthropic-ai/claude-agent-sdk';

import type { ClaudeModel, EffortLevel } from './constants';

/**
 * Simplified query options for common use cases
 */
export interface SimpleQueryOptions {
  /** Claude model to use */
  model?: ClaudeModel | string;
  /** Tool names to allow */
  tools?: string[];
  /** Whether tools auto-execute without permission prompts */
  allowedTools?: string[];
  /** Tool names to explicitly disallow (removed from model context) */
  disallowedTools?: string[];
  /** Custom permission handler called before each tool execution */
  canUseTool?: CanUseTool;
  /** Working directory */
  cwd?: string;
  /** Max conversation turns */
  maxTurns?: number;
  /** Max budget in USD */
  maxBudgetUsd?: number;
  /** Effort level for thinking */
  effort?: EffortLevel;
  /** System prompt override */
  systemPrompt?: string;
  /** Permission mode */
  permissionMode?: Options['permissionMode'];
  /** Skip all permission checks (dangerous) */
  bypassPermissions?: boolean;
  /** MCP server configurations */
  mcpServers?: Options['mcpServers'];
  /** Custom subagent definitions */
  agents?: Record<string, AgentDefinition>;
  /** Session ID to resume */
  resume?: string;
  /** Continue most recent session */
  continue?: boolean;
  /** Session ID — set automatically when using captureSession */
  sessionId?: string;
  /** Fork the session instead of resuming in-place */
  forkSession?: boolean;
  /** Resume at a specific message ID within the session */
  resumeSessionAt?: string;
  /** Hook callbacks for agent lifecycle events */
  hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;
  /**
   * Control which filesystem settings to load.
   * Set to `['project']` to load Skills, CLAUDE.md, and project settings.
   * When omitted, no filesystem settings are loaded (SDK isolation mode).
   */
  settingSources?: SettingSource[];
  /**
   * Load plugins for this session. Plugins provide custom commands,
   * agents, skills, and hooks.
   */
  plugins?: SdkPluginConfig[];
}

/**
 * Result from a completed agent query
 */
export type AgentResult = {
  success: true;
  result: string;
  cost: number;
  turns: number;
  duration: number;
  usage: SDKResultSuccess['usage'];
  structuredOutput?: unknown;
} | {
  success: false;
  error: string;
  cost: number;
  turns: number;
  duration: number;
  usage: SDKResultError['usage'];
  errors: string[];
};

/**
 * Agent template configuration
 */
export interface AgentTemplateConfig {
  name: string;
  instructions: string;
  model?: ClaudeModel | string;
  tools?: string[];
  effort?: EffortLevel;
  maxTurns?: number;
  mcpServers?: Options['mcpServers'];
}
