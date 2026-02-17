/**
 * Claude Agent SDK — MCP Server Configuration
 *
 * Helpers for connecting external systems via the Model Context Protocol:
 * databases, browsers, APIs, and hundreds more.
 *
 * Supports four transport types:
 * - **stdio** — Spawn a local process (command + args)
 * - **sse** — Connect to an SSE-based remote server
 * - **http** — Connect to an HTTP-based remote server
 * - **sdk** — In-process MCP server (via `createSdkMcpServer`)
 *
 * @example Process-transport MCP server (Playwright)
 * ```typescript
 * import { runAgent, mcpStdio } from '@/anthropic';
 *
 * const result = await runAgent('Open example.com and describe what you see', {
 *   mcpServers: {
 *     playwright: mcpStdio('npx', ['@playwright/mcp@latest']),
 *   },
 * });
 * ```
 */

import type {
  McpStdioServerConfig,
  McpSSEServerConfig,
  McpHttpServerConfig,
  McpServerConfig,
} from '@anthropic-ai/claude-agent-sdk';

/**
 * Create a stdio (process-transport) MCP server config.
 * Spawns a local process that communicates via stdin/stdout.
 *
 * @example
 * ```typescript
 * mcpStdio('npx', ['@playwright/mcp@latest'])
 * mcpStdio('npx', ['@anthropic-ai/mcp-server-postgres', 'postgresql://...'])
 * mcpStdio('node', ['./my-mcp-server.js'], { API_KEY: 'secret' })
 * ```
 */
export function mcpStdio(
  command: string,
  args?: string[],
  env?: Record<string, string>,
): McpStdioServerConfig {
  const config: McpStdioServerConfig = { command };
  if (args) config.args = args;
  if (env) config.env = env;
  return config;
}

/**
 * Create an SSE-transport MCP server config.
 * Connects to a remote server via Server-Sent Events.
 *
 * @example
 * ```typescript
 * mcpSSE('https://mcp.example.com/sse')
 * mcpSSE('https://mcp.example.com/sse', { Authorization: 'Bearer token' })
 * ```
 */
export function mcpSSE(
  url: string,
  headers?: Record<string, string>,
): McpSSEServerConfig {
  const config: McpSSEServerConfig = { type: 'sse', url };
  if (headers) config.headers = headers;
  return config;
}

/**
 * Create an HTTP-transport MCP server config.
 * Connects to a remote server via HTTP requests.
 *
 * @example
 * ```typescript
 * mcpHTTP('https://mcp.example.com/api')
 * mcpHTTP('https://mcp.example.com/api', { 'X-API-Key': 'key' })
 * ```
 */
export function mcpHTTP(
  url: string,
  headers?: Record<string, string>,
): McpHttpServerConfig {
  const config: McpHttpServerConfig = { type: 'http', url };
  if (headers) config.headers = headers;
  return config;
}

/**
 * Build a complete MCP servers record from named server definitions.
 * Convenience wrapper for constructing the `mcpServers` option.
 *
 * @example
 * ```typescript
 * import { runAgent, buildMcpServers, mcpStdio, mcpHTTP } from '@/anthropic';
 *
 * const mcpServers = buildMcpServers({
 *   playwright: mcpStdio('npx', ['@playwright/mcp@latest']),
 *   postgres: mcpStdio('npx', ['@anthropic-ai/mcp-server-postgres', connStr]),
 *   api: mcpHTTP('https://mcp.example.com/api', { Authorization: 'Bearer token' }),
 * });
 *
 * const result = await runAgent('Query the database', { mcpServers });
 * ```
 */
export function buildMcpServers(
  servers: Record<string, McpServerConfig>,
): Record<string, McpServerConfig> {
  return servers;
}

/**
 * Merge multiple MCP server records into one.
 *
 * @example
 * ```typescript
 * const servers = mergeMcpServers(
 *   { playwright: mcpStdio('npx', ['@playwright/mcp@latest']) },
 *   { myTools: myInProcessServer },
 * );
 * ```
 */
export function mergeMcpServers(
  ...serverMaps: Record<string, McpServerConfig>[]
): Record<string, McpServerConfig> {
  return Object.assign({}, ...serverMaps);
}

/**
 * Common MCP server configurations for popular integrations.
 * These return stdio configs — the server packages must be installed or npx-accessible.
 */
export const MCP_SERVERS = {
  /** Playwright browser automation */
  playwright: () => mcpStdio('npx', ['@playwright/mcp@latest']),

  /** PostgreSQL database */
  postgres: (connectionString: string) =>
    mcpStdio('npx', ['@anthropic-ai/mcp-server-postgres', connectionString]),

  /** Filesystem access */
  filesystem: (...directories: string[]) =>
    mcpStdio('npx', ['@anthropic-ai/mcp-server-filesystem', ...directories]),

  /** GitHub API */
  github: (token: string) =>
    mcpStdio('npx', ['@anthropic-ai/mcp-server-github'], { GITHUB_TOKEN: token }),

  /** Brave Search */
  braveSearch: (apiKey: string) =>
    mcpStdio('npx', ['@anthropic-ai/mcp-server-brave-search'], { BRAVE_API_KEY: apiKey }),
} as const;
