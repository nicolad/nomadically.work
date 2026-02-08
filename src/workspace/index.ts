import {
  Workspace,
  LocalFilesystem,
  LocalSandbox,
  WORKSPACE_TOOLS,
} from "@mastra/core/workspace";
import { join } from "path";
import {
  inspectJobDecisionTool,
  rerunJobClassifierTool,
  diffSnapshotsTool,
} from "./ops-skills";

/**
 * Main workspace for agents with filesystem, sandbox, and skills support
 */
export const workspace = new Workspace({
  filesystem: new LocalFilesystem({
    basePath: "./src/workspace",
  }),
  sandbox: new LocalSandbox({
    workingDirectory: "./src/workspace",
  }),
  skills: ["/skills"],
  tools: {
    // Global defaults
    enabled: true,
    requireApproval: false,

    // Filesystem tools - require approval for destructive operations
    [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: {
      requireApproval: true,
      requireReadBeforeWrite: true,
    },
    [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: {
      enabled: false, // Disable file deletion for safety
    },

    // Sandbox tools - require approval for command execution
    [WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: {
      requireApproval: true,
    },
  },
});

/**
 * Initialize workspace (creates directories, indexes files)
 * Call this before first use in standalone scripts or tests
 */
export async function initWorkspace() {
  await workspace.init();
}

/**
 * Agent-specific workspace for personalization agent
 * Separate workspace to isolate user preference files
 */
export const personalizationWorkspace = new Workspace({
  filesystem: new LocalFilesystem({
    basePath: "./src/workspace/personalization",
  }),
  sandbox: new LocalSandbox({
    workingDirectory: "./src/workspace/personalization",
  }),
  tools: {
    enabled: true,
    requireApproval: false,
    [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: {
      enabled: false,
    },
  },
});

/**
 * Agent-specific workspace for SQL agent
 * Read-only workspace for query generation
 */
export const sqlWorkspace = new Workspace({
  filesystem: new LocalFilesystem({
    basePath: "./src/workspace/sql",
  }),
  tools: {
    enabled: true,
    requireApproval: false,
    [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: {
      enabled: false, // SQL agent only reads schema files
    },
    [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: {
      enabled: false,
    },
  },
});

/**
 * Ops workspace for admin assistant
 * Full-featured workspace with evidence bundles, search, and batch operations
 * Includes approval gates for destructive/expensive operations
 */
export const opsWorkspace = new Workspace({
  filesystem: new LocalFilesystem({
    basePath: "./src/workspace",
  }),
  sandbox: new LocalSandbox({
    workingDirectory: "./src/workspace",
  }),
  // TODO: Add search over evidence bundles and decision explanations
  // search configuration would go here when Mastra supports it
  skills: ["/skills"],
  tools: {
    // Read operations: no approval required
    enabled: true,
    requireApproval: false,

    // Write operations: require read-before-write
    [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: {
      requireApproval: false, // Evidence bundles are append-only
      requireReadBeforeWrite: true,
    },

    // Delete: completely disabled for safety
    [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: {
      enabled: false,
    },

    // Command execution: approval required
    [WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: {
      requireApproval: true, // Batch reprocessing runs
    },
  },
});

/**
 * Export ops skills as tools
 */
export const opsTools = {
  inspectJobDecision: inspectJobDecisionTool,
  rerunJobClassifier: rerunJobClassifierTool,
  diffSnapshots: diffSnapshotsTool,
};
