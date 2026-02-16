/**
 * Mastra Storage Configuration
 *
 * This file contains storage configuration examples and utilities.
 * The actual storage used by the application is configured in index.ts.
 *
 * For production: Using Turso (edge-replicated LibSQL)
 * For development: Can use local SQLite file
 */

import { MastraCompositeStore } from "@mastra/core/storage";
import {
  LibSQLStore,
  MemoryLibSQL,
  ScoresLibSQL,
  WorkflowsLibSQL,
  ObservabilityLibSQL,
} from "@mastra/libsql";
import { TURSO_DB_URL, TURSO_DB_AUTH_TOKEN } from "@/config/env";

/**
 * Simple LibSQL storage for quick setup
 *
 * Use this when all domains can share the same database.
 * Good for getting started or simple applications.
 */
export function createSimpleStorage() {
  return new LibSQLStore({
    id: "mastra-storage",
    // For local development
    url: "file:./mastra.db",

    // For Turso production
    // url: TURSO_DB_URL!,
    // authToken: TURSO_DB_AUTH_TOKEN,
  });
}

/**
 * Composite storage with separate databases per domain
 *
 * Use this when different domains have different requirements:
 * - Memory: Low latency for real-time conversations
 * - Workflows: Durable storage for long-running processes
 * - Observability: High throughput for traces and metrics
 * - Scores: Analytical queries for evaluation data
 */
export function createCompositeStorage() {
  return new MastraCompositeStore({
    id: "composite-storage",
    domains: {
      // Memory domain: Agent conversations and threads
      memory: new MemoryLibSQL({
        url: TURSO_DB_URL!,
        authToken: TURSO_DB_AUTH_TOKEN,
      }),

      // Scores domain: Evaluation results
      scores: new ScoresLibSQL({
        url: TURSO_DB_URL!,
        authToken: TURSO_DB_AUTH_TOKEN,
      }),

      // Workflows domain: Execution state
      workflows: new WorkflowsLibSQL({
        url: TURSO_DB_URL!,
        authToken: TURSO_DB_AUTH_TOKEN,
      }),

      // Observability domain: Langfuse traces
      observability: new ObservabilityLibSQL({
        url: TURSO_DB_URL!,
        authToken: TURSO_DB_AUTH_TOKEN,
      }),
    },
  });
}

/**
 * Local development storage with absolute path
 *
 * Use absolute path to ensure both Next.js and Mastra Studio
 * access the same database file when running concurrently:
 *
 * Terminal 1: pnpm dev (Next.js on port 3000)
 * Terminal 2: pnpm mastra:dev (Mastra Studio on port 4111)
 *
 * Without absolute path, each process resolves the relative path
 * from its own working directory, creating separate databases.
 */
export function createLocalStorage() {
  const absolutePath = `${process.cwd()}/mastra.db`;

  return new LibSQLStore({
    id: "mastra-local",
    url: `file:${absolutePath}`,
  });
}

/**
 * Multi-region composite storage example
 *
 * Use different Turso databases per region or per domain
 * for optimal performance and compliance.
 */
export function createMultiRegionStorage() {
  return new MastraCompositeStore({
    id: "multi-region",
    domains: {
      // EU region for user data (GDPR compliance)
      memory: new MemoryLibSQL({
        url: process.env.TURSO_EU_DB_URL!,
        authToken: process.env.TURSO_EU_DB_AUTH_TOKEN!,
      }),

      // US region for analytics (higher throughput)
      scores: new ScoresLibSQL({
        url: process.env.TURSO_US_DB_URL!,
        authToken: process.env.TURSO_US_DB_AUTH_TOKEN!,
      }),

      // Global edge for workflows (low latency)
      workflows: new WorkflowsLibSQL({
        url: TURSO_DB_URL!,
        authToken: TURSO_DB_AUTH_TOKEN,
      }),

      // Dedicated observability storage
      observability: new ObservabilityLibSQL({
        url: process.env.TURSO_OBSERVABILITY_DB_URL!,
        authToken: process.env.TURSO_OBSERVABILITY_DB_AUTH_TOKEN!,
      }),
    },
  });
}

/**
 * Storage utilities
 */

/**
 * Get the appropriate storage based on environment
 */
export function getStorage() {
  // Use local file for development
  if (process.env.NODE_ENV === "development" && !TURSO_DB_URL) {
    console.log("📁 Using local SQLite storage for development");
    return createLocalStorage();
  }

  // Use Turso for production
  console.log("☁️  Using Turso edge storage for production");
  return createCompositeStorage();
}

/**
 * Storage configuration examples for different use cases
 */
export const storageExamples = {
  // Simple setup for getting started
  simple: createSimpleStorage,

  // Production-ready composite storage
  composite: createCompositeStorage,

  // Local development with shared database
  local: createLocalStorage,

  // Multi-region for compliance and performance
  multiRegion: createMultiRegionStorage,

  // Auto-detect based on environment
  auto: getStorage,
};

/**
 * Important notes:
 *
 * 1. Thread and Resource IDs
 *    Both are required when calling agent methods:
 *
 *    await agent.generate("hello", {
 *      memory: {
 *        thread: "conversation-abc-123",  // Conversation session
 *        resource: "user_123",             // User who owns the thread
 *      },
 *    });
 *
 * 2. Automatic Schema Migration
 *    Mastra creates all necessary tables on first interaction.
 *    No manual migration needed for core schema.
 *
 * 3. Record Size Limits
 *    LibSQL/Turso: No practical limit for most use cases
 *    If you need to store large attachments (images, files):
 *    - Use input processors to upload to external storage (S3, R2, etc.)
 *    - Store URL references instead of base64 data
 *    - See src/memory/README.md for examples
 *
 * 4. Thread Title Generation
 *    Enable in Memory configuration to auto-generate titles:
 *
 *    new Memory({
 *      options: {
 *        generateTitle: {
 *          model: "deepseek/deepseek-chat",
 *          instructions: "Generate a 3-5 word title",
 *        },
 *      },
 *    });
 *
 * 5. Working Memory
 *    Structured context that persists across threads:
 *    - scope: "resource" = per-user (isolated by resourceid)
 *    - scope: "thread" = per-conversation
 *    - Define schema with Zod for type safety
 *
 * 6. Core Schema Tables
 *    Automatically created by Mastra:
 *    - mastra_messages: Chat messages
 *    - mastra_threads: Conversation sessions
 *    - mastra_resources: Entities that own threads (users, orgs, etc.)
 *    - mastra_workflow_runs: Workflow execution state
 *    - mastra_traces: Observability traces
 *    - mastra_scorers: Evaluation scores
 *    - mastra_datasets: Evaluation datasets
 */
