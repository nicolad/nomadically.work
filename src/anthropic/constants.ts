/**
 * Claude Agent SDK Constants
 *
 * Models, pricing, tools, and API configuration
 * https://docs.anthropic.com/en/docs/about-claude/models
 */

/**
 * Claude model identifiers
 */
export const CLAUDE_MODELS = {
  /** Claude Opus 4.6 — Most capable, adaptive thinking, max effort */
  OPUS_4_6: 'claude-opus-4-6',

  /** Claude Sonnet 4.5 — Balanced intelligence and speed */
  SONNET_4_5: 'claude-sonnet-4-5-20250929',

  /** Claude Sonnet 4 — Fast and capable */
  SONNET_4: 'claude-sonnet-4-20250514',

  /** Claude Haiku 3.5 — Fastest, lowest cost */
  HAIKU_3_5: 'claude-haiku-3-5-20241022',
} as const;

export type ClaudeModel = (typeof CLAUDE_MODELS)[keyof typeof CLAUDE_MODELS];

/**
 * Model shorthand aliases used in agent definitions
 */
export const MODEL_ALIASES = {
  opus: CLAUDE_MODELS.OPUS_4_6,
  sonnet: CLAUDE_MODELS.SONNET_4_5,
  haiku: CLAUDE_MODELS.HAIKU_3_5,
} as const;

/**
 * Built-in tool names available in the Agent SDK
 */
export const AGENT_TOOLS = {
  /** Read any file in the working directory */
  READ: 'Read',
  /** Create new files */
  WRITE: 'Write',
  /** Make precise edits to existing files */
  EDIT: 'Edit',
  /** Run terminal commands, scripts, git operations */
  BASH: 'Bash',
  /** Find files by pattern */
  GLOB: 'Glob',
  /** Search file contents with regex */
  GREP: 'Grep',
  /** Search the web for current information */
  WEB_SEARCH: 'WebSearch',
  /** Fetch and parse web page content */
  WEB_FETCH: 'WebFetch',
  /** Ask the user clarifying questions */
  ASK_USER: 'AskUserQuestion',
  /** Notebook editing */
  NOTEBOOK_EDIT: 'NotebookEdit',
  /** Todo list management */
  TODO_WRITE: 'TodoWrite',
  /** Spawn subagent tasks */
  TASK: 'Task',
} as const;

export type AgentTool = (typeof AGENT_TOOLS)[keyof typeof AGENT_TOOLS];

/**
 * Commonly used tool presets
 */
export const TOOL_PRESETS = {
  /** Read-only tools for analysis */
  READONLY: [AGENT_TOOLS.READ, AGENT_TOOLS.GLOB, AGENT_TOOLS.GREP] as string[],

  /** File editing tools */
  FILE_OPS: [
    AGENT_TOOLS.READ,
    AGENT_TOOLS.WRITE,
    AGENT_TOOLS.EDIT,
    AGENT_TOOLS.GLOB,
    AGENT_TOOLS.GREP,
  ] as string[],

  /** Full coding tools */
  CODING: [
    AGENT_TOOLS.READ,
    AGENT_TOOLS.WRITE,
    AGENT_TOOLS.EDIT,
    AGENT_TOOLS.BASH,
    AGENT_TOOLS.GLOB,
    AGENT_TOOLS.GREP,
  ] as string[],

  /** Web-enabled tools */
  WEB: [AGENT_TOOLS.WEB_SEARCH, AGENT_TOOLS.WEB_FETCH] as string[],

  /** All built-in tools */
  ALL: Object.values(AGENT_TOOLS) as string[],
} as const;

/**
 * Thinking/Effort configuration presets
 */
export const THINKING_PRESETS = {
  /** Adaptive — Claude decides when and how much to think (Opus 4.6+) */
  ADAPTIVE: { type: 'adaptive' as const },

  /** Disabled — No extended thinking */
  DISABLED: { type: 'disabled' as const },

  /** Fixed budget — Specific token budget for thinking */
  budget: (tokens: number) => ({
    type: 'enabled' as const,
    budgetTokens: tokens,
  }),
} as const;

/**
 * Effort levels for adaptive thinking
 */
export const EFFORT_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  /** Opus 4.6 only */
  MAX: 'max',
} as const;

export type EffortLevel = (typeof EFFORT_LEVELS)[keyof typeof EFFORT_LEVELS];

/**
 * Permission mode presets
 */
export const PERMISSION_MODES = {
  /** Standard behavior, prompts for dangerous operations */
  DEFAULT: 'default',
  /** Auto-accept file edit operations */
  ACCEPT_EDITS: 'acceptEdits',
  /** Bypass all permission checks (requires allowDangerouslySkipPermissions) */
  BYPASS: 'bypassPermissions',
  /** Planning mode, no execution of tools */
  PLAN: 'plan',
  /** Don't prompt for permissions, deny if not pre-approved */
  DONT_ASK: 'dontAsk',
} as const;

/**
 * Model pricing (USD per million tokens)
 */
export const PRICING = {
  [CLAUDE_MODELS.OPUS_4_6]: {
    input: 15.0,
    output: 75.0,
    cacheWrite: 18.75,
    cacheRead: 1.5,
    contextWindow: 200_000,
  },
  [CLAUDE_MODELS.SONNET_4_5]: {
    input: 3.0,
    output: 15.0,
    cacheWrite: 3.75,
    cacheRead: 0.3,
    contextWindow: 200_000,
  },
  [CLAUDE_MODELS.SONNET_4]: {
    input: 3.0,
    output: 15.0,
    cacheWrite: 3.75,
    cacheRead: 0.3,
    contextWindow: 200_000,
  },
  [CLAUDE_MODELS.HAIKU_3_5]: {
    input: 0.8,
    output: 4.0,
    cacheWrite: 1.0,
    cacheRead: 0.08,
    contextWindow: 200_000,
  },
} as const;

/**
 * Default configuration
 */
export const DEFAULT_CONFIG = {
  model: CLAUDE_MODELS.SONNET_4_5,
  effort: EFFORT_LEVELS.HIGH as EffortLevel,
  maxTurns: 50,
  persistSession: true,
} as const;

/**
 * Environment variable names
 */
export const ENV_VARS = {
  API_KEY: 'ANTHROPIC_API_KEY',
  USE_BEDROCK: 'CLAUDE_CODE_USE_BEDROCK',
  USE_VERTEX: 'CLAUDE_CODE_USE_VERTEX',
  USE_FOUNDRY: 'CLAUDE_CODE_USE_FOUNDRY',
  SDK_CLIENT_APP: 'CLAUDE_AGENT_SDK_CLIENT_APP',
} as const;

/**
 * Setting source presets for loading filesystem-based configuration
 */
export const SETTING_SOURCES = {
  /** Load project settings only (.claude/settings.json, CLAUDE.md) */
  PROJECT: ['project'] as const,
  /** Load user + project settings */
  USER_AND_PROJECT: ['user', 'project'] as const,
  /** Load all setting sources */
  ALL: ['user', 'project', 'local'] as const,
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  NO_API_KEY:
    'ANTHROPIC_API_KEY is not set. Get your key from https://console.anthropic.com/',
  INVALID_MODEL: 'Invalid Claude model specified',
  QUERY_ABORTED: 'Agent query was aborted',
} as const;
