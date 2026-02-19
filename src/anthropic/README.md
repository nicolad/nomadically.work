# Claude Agent SDK

Integration with the [Claude Agent SDK](https://docs.anthropic.com/en/docs/agent-sdk) (`@anthropic-ai/claude-agent-sdk`) for building AI agents that autonomously read files, run commands, search the web, edit code, and more.

## Features

- ✅ **Built-in tools** — Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch
- ✅ **Streaming** — Async generator for real-time agent messages
- ✅ **One-shot prompts** — Simple `runAgent()` / `askAgent()` convenience functions
- ✅ **Reusable agents** — `createAgent()` with persistent configuration
- ✅ **Pre-configured templates** — Code review, bug fix, research, reasoning agents
- ✅ **Adaptive thinking** — Extended thinking with effort control (Opus 4.6)
- ✅ **MCP support** — Connect custom MCP servers and SDK MCP tools
- ✅ **Hooks** — Pre/post tool use, session lifecycle, permission request hooks
- ✅ **Subagents** — Define custom subagents for specialized tasks
- ✅ **Permissions** — Fine-grained permission control for tool execution
- ✅ **Sessions** — Resume, fork, and manage conversation sessions
- ✅ **Sandbox** — Isolated command execution with filesystem/network restrictions

## Quick Start

```typescript
import { runAgent, TOOL_PRESETS } from "@/anthropic";

const result = await runAgent("Find and fix the bug in auth.ts", {
  tools: TOOL_PRESETS.CODING,
  allowedTools: TOOL_PRESETS.CODING,
});

if (result.success) {
  console.log(result.result);
  console.log(`Cost: $${result.cost.toFixed(4)}`);
}
```

## Streaming

```typescript
import { streamAgent } from "@/anthropic";

for await (const msg of streamAgent("Analyze this codebase", {
  tools: ["Read", "Glob", "Grep"],
  allowedTools: ["Read", "Glob", "Grep"],
})) {
  if (msg.type === "assistant") {
    // Handle streaming assistant messages
  }
  if (msg.type === "result" && msg.subtype === "success") {
    console.log(msg.result);
  }
}
```

## Models

| Model             | Constant                   | Strength                        |
| ----------------- | -------------------------- | ------------------------------- |
| Claude Opus 4.6   | `CLAUDE_MODELS.OPUS_4_6`   | Most capable, adaptive thinking |
| Claude Sonnet 4.5 | `CLAUDE_MODELS.SONNET_4_5` | Balanced intelligence and speed |
| Claude Sonnet 4   | `CLAUDE_MODELS.SONNET_4`   | Fast and capable                |
| Claude Haiku 3.5  | `CLAUDE_MODELS.HAIKU_3_5`  | Fastest, lowest cost            |

## Built-in Tools

| Tool              | What it does                           |
| ----------------- | -------------------------------------- |
| `Read`            | Read any file in the working directory |
| `Write`           | Create new files                       |
| `Edit`            | Make precise edits to existing files   |
| `Bash`            | Run terminal commands, scripts, git    |
| `Glob`            | Find files by pattern                  |
| `Grep`            | Search file contents with regex        |
| `WebSearch`       | Search the web for current information |
| `WebFetch`        | Fetch and parse web page content       |
| `AskUserQuestion` | Ask the user clarifying questions      |

### Tool Presets

```typescript
import { TOOL_PRESETS } from "@/anthropic";

TOOL_PRESETS.READONLY; // Read, Glob, Grep
TOOL_PRESETS.FILE_OPS; // Read, Write, Edit, Glob, Grep
TOOL_PRESETS.CODING; // Read, Write, Edit, Bash, Glob, Grep
TOOL_PRESETS.WEB; // WebSearch, WebFetch
TOOL_PRESETS.ALL; // All built-in tools
```

## Reusable Agents

```typescript
import {
  createAgent,
  CLAUDE_MODELS,
  TOOL_PRESETS,
  EFFORT_LEVELS,
} from "@/anthropic";

const reviewer = createAgent({
  model: CLAUDE_MODELS.SONNET_4_5,
  tools: TOOL_PRESETS.READONLY,
  allowedTools: TOOL_PRESETS.READONLY,
  effort: EFFORT_LEVELS.HIGH,
  systemPrompt: "You are a code reviewer. Find bugs and improvements.",
});

// Use multiple times
const review1 = await reviewer.ask("Review src/auth.ts");
const review2 = await reviewer.ask("Review src/api.ts");
```

## Agent Templates

```typescript
import { agentTemplates } from "@/anthropic";

// Code review agent (Sonnet 4.5, read-only tools)
const review = await agentTemplates.codeReview().ask("Review package.json");

// Bug fix agent (Sonnet 4.5, coding tools)
const fix = await agentTemplates
  .bugFix()
  .run("Fix the test failure in auth.test.ts");

// Research agent (Sonnet 4.5, read-only + web tools)
const research = await agentTemplates
  .research()
  .ask("What is the latest Next.js version?");

// Reasoning agent (Opus 4.6, max effort)
const analysis = await agentTemplates
  .reasoning()
  .ask("Analyze the architecture");

// Quick agent (Haiku 3.5, low effort, fast)
const quick = await agentTemplates.quick().ask("How many files in src/?");
```

## Extended Thinking & Effort

```typescript
import { runAgent, CLAUDE_MODELS, EFFORT_LEVELS } from "@/anthropic";

// Adaptive thinking (default for Opus 4.6)
const result = await runAgent("Solve this complex problem", {
  model: CLAUDE_MODELS.OPUS_4_6,
  effort: EFFORT_LEVELS.MAX,
});

// Low effort for quick tasks
const quick = await runAgent("What files are here?", {
  model: CLAUDE_MODELS.HAIKU_3_5,
  effort: EFFORT_LEVELS.LOW,
});
```

## MCP Servers

Connect to external systems via the Model Context Protocol: databases, browsers, APIs, and hundreds more.

### Process-transport MCP servers

Spawn a local MCP server process (command + args). This is the most common pattern:

```typescript
import { runAgent, mcpStdio } from "@/anthropic";

// Connect the Playwright MCP server for browser automation
const result = await runAgent("Open example.com and describe what you see", {
  mcpServers: {
    playwright: mcpStdio("npx", ["@playwright/mcp@latest"]),
  },
});
```

Or use the raw config directly:

```typescript
import { runAgent } from "@/anthropic";

const result = await runAgent("Query the users table", {
  mcpServers: {
    postgres: {
      command: "npx",
      args: ["@anthropic-ai/mcp-server-postgres", "postgresql://..."],
    },
  },
});
```

### Common MCP server presets

```typescript
import { MCP_SERVERS } from "@/anthropic";

MCP_SERVERS.playwright(); // Browser automation
MCP_SERVERS.postgres("postgresql://..."); // PostgreSQL
MCP_SERVERS.filesystem("/app/src"); // Filesystem access
MCP_SERVERS.github(process.env.GITHUB_TOKEN!); // GitHub API
```

### Remote MCP servers (SSE / HTTP)

```typescript
import { runAgent, mcpSSE, mcpHTTP } from "@/anthropic";

const result = await runAgent("Search the knowledge base", {
  mcpServers: {
    kb: mcpSSE("https://mcp.example.com/sse", {
      Authorization: "Bearer token",
    }),
    api: mcpHTTP("https://mcp.example.com/api", {
      "X-API-Key": "key",
    }),
  },
});
```

### In-process SDK MCP tools

```typescript
import { runAgent, createSdkMcpServer, tool } from "@/anthropic";
import { z } from "zod/v4";

const myServer = createSdkMcpServer({
  name: "my-tools",
  tools: [
    tool(
      "get_weather",
      "Get current weather",
      { city: z.string() },
      async (args) => ({
        content: [
          { type: "text", text: `Weather in ${args.city}: Sunny, 72°F` },
        ],
      }),
    ),
  ],
});

const result = await runAgent("What's the weather in Tokyo?", {
  mcpServers: { "my-tools": myServer },
});
```

### Combining multiple MCP servers

```typescript
import {
  runAgent,
  buildMcpServers,
  mergeMcpServers,
  mcpStdio,
  mcpHTTP,
  MCP_SERVERS,
  createSdkMcpServer,
  tool,
} from "@/anthropic";

const mcpServers = buildMcpServers({
  playwright: MCP_SERVERS.playwright(),
  postgres: MCP_SERVERS.postgres("postgresql://localhost/mydb"),
  api: mcpHTTP("https://mcp.example.com/api"),
});

const result = await runAgent("Browse the site and save data to the DB", {
  mcpServers,
});
```

## Subagents

Spawn specialized agents to handle focused subtasks. Your main agent delegates work via the `Task` tool, and subagents report back with results.

```typescript
import {
  runAgent,
  defineSubagent,
  mergeSubagents,
  TOOL_PRESETS,
} from "@/anthropic";

// Define individual subagents
const agents = mergeSubagents(
  defineSubagent("code-reviewer", {
    description: "Expert code reviewer for quality and security reviews.",
    prompt: "Analyze code quality and suggest improvements.",
    tools: TOOL_PRESETS.READONLY,
  }),
  defineSubagent("test-runner", {
    description: "Runs tests and reports results.",
    prompt: "Execute tests and report failures.",
    tools: ["Bash", "Read"],
    model: "haiku",
  }),
);

const result = await runAgent("Review and test the codebase", {
  tools: ["Read", "Edit", "Bash", "Glob", "Grep", "Task"],
  agents,
});
```

### Pre-built subagent presets

```typescript
import { runAgent, mergeSubagents, SUBAGENT_PRESETS } from "@/anthropic";

const agents = mergeSubagents(
  SUBAGENT_PRESETS.codeReviewer,
  SUBAGENT_PRESETS.testRunner,
  SUBAGENT_PRESETS.linter,
);

const result = await runAgent("Full code review pipeline", {
  tools: ["Read", "Glob", "Grep", "Bash", "Task"],
  agents,
});
```

### Tracking subagent messages

Messages from within a subagent's context include a `parent_tool_use_id` field:

```typescript
import { streamAgent, isSubagentMessage, getSubagentId } from "@/anthropic";

for await (const msg of streamAgent("Review code", opts)) {
  if (isSubagentMessage(msg)) {
    console.log(`[subagent ${getSubagentId(msg)}]`, msg);
  }
}
```

### Subagent tool presets

```typescript
import { SUBAGENT_TOOLS } from "@/anthropic";

SUBAGENT_TOOLS.READONLY_WITH_TASK; // Read, Glob, Grep, Task
SUBAGENT_TOOLS.CODING_WITH_TASK; // Read, Write, Edit, Bash, Glob, Grep, Task
SUBAGENT_TOOLS.ALL_WITH_TASK; // All built-in tools (includes Task)
```

## Hooks

Run custom code at key points in the agent lifecycle. Hooks use callback functions to validate, log, block, or transform agent behavior.

Available events: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `Notification`, `UserPromptSubmit`, `SessionStart`, `SessionEnd`, `Stop`, `SubagentStart`, `SubagentStop`, `PreCompact`, `PermissionRequest`, `Setup`, `TeammateIdle`, `TaskCompleted`.

### Audit logging

```typescript
import {
  runAgent,
  createAuditHook,
  hookMatcher,
  buildHooks,
} from "@/anthropic";

const hooks = buildHooks({
  PostToolUse: [hookMatcher([createAuditHook("./audit.log")], "Edit|Write")],
});

const result = await runAgent("Refactor utils.ts", {
  tools: ["Read", "Edit"],
  permissionMode: "acceptEdits",
  hooks,
});
```

### Block dangerous commands

```typescript
import {
  runAgent,
  createBlockCommandsHook,
  hookMatcher,
  buildHooks,
} from "@/anthropic";

const hooks = buildHooks({
  PreToolUse: [
    hookMatcher(
      [createBlockCommandsHook([/rm\s+-rf/, /DROP\s+TABLE/i])],
      "Bash",
    ),
  ],
});

const result = await runAgent("Clean up temp files", {
  tools: ["Bash"],
  hooks,
});
```

### Directory guard

```typescript
import {
  runAgent,
  createDirectoryGuardHook,
  hookMatcher,
  buildHooks,
} from "@/anthropic";

const hooks = buildHooks({
  PreToolUse: [
    hookMatcher(
      [createDirectoryGuardHook(["/app/src", "/app/tests"])],
      "Read|Write|Edit",
    ),
  ],
});
```

### Console logging

```typescript
import {
  runAgent,
  createConsoleLogHook,
  hookMatcher,
  buildHooks,
} from "@/anthropic";

const hooks = buildHooks({
  PreToolUse: [hookMatcher([createConsoleLogHook("[my-agent]")])],
});
```

### Error tracking

```typescript
import {
  runAgent,
  createErrorLogHook,
  hookMatcher,
  buildHooks,
} from "@/anthropic";

const errors: { tool: string; error: string }[] = [];
const hooks = buildHooks({
  PostToolUseFailure: [
    hookMatcher([
      createErrorLogHook((tool, err) => errors.push({ tool, error: err })),
    ]),
  ],
});
```

### Compose multiple hooks

```typescript
import {
  composeHooks,
  createConsoleLogHook,
  createAuditHook,
  hookMatcher,
  buildHooks,
} from "@/anthropic";

const combined = composeHooks(
  createConsoleLogHook(),
  createAuditHook("./audit.log"),
);

const hooks = buildHooks({
  PostToolUse: [hookMatcher([combined], "Edit|Write")],
});
```

### Custom inline hook

```typescript
import { runAgent, hookMatcher, buildHooks } from "@/anthropic";
import type { HookCallback } from "@/anthropic";

const myHook: HookCallback = async (input) => {
  console.log(`Event: ${input.hook_event_name}`);
  return {};
};

const result = await runAgent("Analyze the codebase", {
  tools: ["Read", "Glob", "Grep"],
  hooks: buildHooks({
    PreToolUse: [hookMatcher([myHook])],
  }),
});
```

## Claude Code Features

The SDK supports Claude Code's filesystem-based configuration. Enable with `settingSources`:

```typescript
import { runAgent, SETTING_SOURCES } from "@/anthropic";

const result = await runAgent("Analyze this project", {
  tools: ["Read", "Glob", "Grep"],
  settingSources: SETTING_SOURCES.PROJECT, // loads .claude/ settings, CLAUDE.md
});
```

| Feature        | Description                                      | Location                           |
| -------------- | ------------------------------------------------ | ---------------------------------- |
| Skills         | Specialized capabilities defined in Markdown     | `.claude/skills/SKILL.md`          |
| Slash commands | Custom commands for common tasks                 | `.claude/commands/*.md`            |
| Memory         | Project context and instructions                 | `CLAUDE.md` or `.claude/CLAUDE.md` |
| Plugins        | Extend with custom commands, agents, MCP servers | Programmatic via `plugins` option  |

### Setting source presets

```typescript
import { SETTING_SOURCES } from "@/anthropic";

SETTING_SOURCES.PROJECT; // ['project'] — project settings + CLAUDE.md
SETTING_SOURCES.USER_AND_PROJECT; // ['user', 'project'] — user + project
SETTING_SOURCES.ALL; // ['user', 'project', 'local'] — all sources
```

### Plugins

```typescript
import { runAgent } from "@/anthropic";

const result = await runAgent("Use my custom tools", {
  plugins: [
    { type: "local", path: "./my-plugin" },
    { type: "local", path: "/absolute/path/to/plugin" },
  ],
  settingSources: ["project"],
});
```

## Sessions

Maintain context across multiple exchanges. Claude remembers files read, analysis done, and conversation history. Resume sessions later, or fork them to explore different approaches.

### Capture and resume

```typescript
import { captureSession, resumeSession, runAgent } from "@/anthropic";

// First query — capture session ID automatically
const { sessionId, result } = await captureSession(
  "Read src/auth.ts and summarize it",
  {
    allowedTools: ["Read", "Glob"],
  },
);

console.log(result?.result); // Summary of auth.ts
console.log(sessionId); // e.g. "sess_abc123..."

// Resume with full context — Claude remembers everything
const followUp = await resumeSession(
  sessionId,
  "Now find all callers of the login function",
);

// Or use runAgent directly with the resume option
const another = await runAgent("Are there any security issues?", {
  resume: sessionId,
});
```

### Fork sessions

Fork a session to explore different approaches without losing the original conversation:

```typescript
import { captureSession, forkSession } from "@/anthropic";

const { sessionId } = await captureSession("Analyze the auth architecture", {
  allowedTools: ["Read", "Glob", "Grep"],
});

// Fork: try two different refactoring strategies
const approachA = await forkSession(
  sessionId,
  "Refactor using Strategy pattern",
);
const approachB = await forkSession(
  sessionId,
  "Refactor using middleware chain",
);

// Both forked sessions share the original analysis context
// but diverge from there — original session is untouched
```

### Extract session ID from stream

Use `getSessionId` to extract the session ID from any streaming message:

```typescript
import { streamAgent, getSessionId } from "@/anthropic";

let sessionId = "";
for await (const msg of streamAgent("Analyze codebase", {
  tools: ["Read", "Glob"],
})) {
  if (!sessionId) {
    const id = getSessionId(msg);
    if (id) sessionId = id;
  }
  if (msg.type === "result") console.log(msg);
}

// Use sessionId for follow-up queries
```

### Multi-turn conversation

```typescript
import { captureSession, resumeSession } from "@/anthropic";

// Turn 1: Understand the codebase
const turn1 = await captureSession("Read the src/ directory structure", {
  allowedTools: ["Read", "Glob", "Grep"],
});

// Turn 2: Deep dive (full context from turn 1)
const turn2 = await resumeSession(
  turn1.sessionId,
  "Now analyze the API routes",
);

// Turn 3: Act on findings
const turn3 = await resumeSession(
  turn1.sessionId,
  "Add input validation to the POST endpoints",
);
```

### Low-level session API

For full control, use the unstable v2 session API directly:

```typescript
import { unstable_v2_createSession } from "@/anthropic";

const session = unstable_v2_createSession({
  model: "claude-sonnet-4-5-20250929",
  allowedTools: ["Read", "Glob"],
});

await session.send({
  type: "user",
  message: { role: "user", content: "What files are here?" },
  parent_tool_use_id: null,
  session_id: session.sessionId,
});

for await (const msg of session.stream()) {
  if (msg.type === "result") console.log(msg);
}

session.close();
```

## Permissions

Control exactly which tools your agent can use. Allow safe operations, block dangerous ones, or require approval for sensitive actions.

### Read-only agent (no permission prompts)

```typescript
import { runAgent, PERMISSION_MODES } from "@/anthropic";

for await (const msg of streamAgent("Review this code for best practices", {
  allowedTools: ["Read", "Glob", "Grep"],
  permissionMode: PERMISSION_MODES.BYPASS,
  bypassPermissions: true,
})) {
  if ("result" in msg) console.log(msg.result);
}
```

### Permission modes

```typescript
import { PERMISSION_MODES } from "@/anthropic";

PERMISSION_MODES.DEFAULT; // Standard — prompts for dangerous operations
PERMISSION_MODES.ACCEPT_EDITS; // Auto-accept file edits
PERMISSION_MODES.BYPASS; // Skip all checks (requires bypassPermissions: true)
PERMISSION_MODES.PLAN; // Planning mode — no tool execution
PERMISSION_MODES.DONT_ASK; // Deny if not pre-approved, never prompt
```

### Custom permission handler (`canUseTool`)

For fine-grained control, provide a `canUseTool` callback that's called before each tool execution:

```typescript
import { runAgent, allowOnly } from "@/anthropic";

// Only allow specific tools — deny everything else
const result = await runAgent("Analyze the codebase", {
  canUseTool: allowOnly(["Read", "Glob", "Grep"]),
});
```

### Block dangerous commands

```typescript
import { runAgent, blockCommands } from "@/anthropic";

const result = await runAgent("Clean up temp files", {
  tools: ["Bash", "Read"],
  canUseTool: blockCommands([/rm\s+-rf/, /DROP\s+TABLE/i, /sudo/]),
});
```

### Restrict to directories

```typescript
import { runAgent, restrictToDirectories } from "@/anthropic";

const result = await runAgent("Fix the bug", {
  tools: ["Read", "Edit", "Bash"],
  canUseTool: restrictToDirectories(["/app/src", "/app/tests"]),
});
```

### Deny specific tools

```typescript
import { runAgent, denyTools } from "@/anthropic";

// Allow everything except Bash
const result = await runAgent("Refactor the module", {
  canUseTool: denyTools(["Bash"]),
});
```

### Disallowed tools (removed from model context)

```typescript
import { runAgent } from "@/anthropic";

// Bash is completely removed — the model won't even see it
const result = await runAgent("Refactor utils.ts", {
  tools: ["Read", "Edit", "Glob", "Grep"],
  disallowedTools: ["Bash", "Write"],
});
```

### Compose multiple permission rules

```typescript
import {
  runAgent,
  composePermissions,
  allowOnly,
  restrictToDirectories,
  blockCommands,
} from "@/anthropic";

const result = await runAgent("Fix the codebase", {
  canUseTool: composePermissions(
    allowOnly(["Read", "Edit", "Bash", "Glob", "Grep"]),
    restrictToDirectories(["/app/src"]),
    blockCommands([/rm\s+-rf/]),
  ),
});
```

### Permission logging

```typescript
import { runAgent, allowOnly, withPermissionLogging } from "@/anthropic";

const result = await runAgent("Analyze code", {
  canUseTool: withPermissionLogging(
    allowOnly(["Read", "Glob"]),
    (tool, decision) => console.log(`[perm] ${tool}: ${decision}`),
  ),
});
```

## Configuration

```bash
# Set your API key
export ANTHROPIC_API_KEY=your-api-key

# Or use third-party providers:
export CLAUDE_CODE_USE_BEDROCK=1    # Amazon Bedrock
export CLAUDE_CODE_USE_VERTEX=1     # Google Vertex AI
export CLAUDE_CODE_USE_FOUNDRY=1    # Microsoft Azure
```

## API Reference

### `runAgent(prompt, options?)`

Run an agent and return the final result. Returns `Promise<AgentResult>`.

### `askAgent(prompt, options?)`

Run an agent and return only the text result. Throws on failure. Returns `Promise<string>`.

### `streamAgent(prompt, options?)`

Stream agent messages. Returns `AsyncGenerator<SDKMessage>`.

### `createAgent(options)`

Create a reusable agent with persistent configuration. Returns `{ run, ask, stream }`.

### `query(params)`

Direct access to the SDK's `query()` function. Returns `Query` (async generator with control methods).

### `createSdkMcpServer(options)`

Create an in-process MCP server with custom tools.

### `tool(name, description, schema, handler)`

Define a custom MCP tool.

## Pricing

| Model      | Input (per 1M) | Output (per 1M) | Cache Write | Cache Read |
| ---------- | -------------- | --------------- | ----------- | ---------- |
| Opus 4.6   | $15.00         | $75.00          | $18.75      | $1.50      |
| Sonnet 4.5 | $3.00          | $15.00          | $3.75       | $0.30      |
| Sonnet 4   | $3.00          | $15.00          | $3.75       | $0.30      |
| Haiku 3.5  | $0.80          | $4.00           | $1.00       | $0.08      |

## Documentation

- [Agent SDK Overview](https://docs.anthropic.com/en/docs/agent-sdk)
- [TypeScript SDK](https://docs.anthropic.com/en/docs/agent-sdk/typescript)
- [Built-in Tools](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [Models & Pricing](https://docs.anthropic.com/en/docs/about-claude/models)
- [Extended Thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- [MCP](https://docs.anthropic.com/en/docs/agent-sdk/mcp)
