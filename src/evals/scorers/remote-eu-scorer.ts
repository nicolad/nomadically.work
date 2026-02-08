/**
 * @deprecated This file has been moved to src/evals/remote-eu/
 *
 * All Remote EU evaluation logic is now centralized in:
 * - src/evals/remote-eu/schema.ts - Types and schemas
 * - src/evals/remote-eu/scorers.ts - Scorer functions (Mastra/Langfuse)
 * - src/evals/remote-eu/test-data.ts - Test cases
 *
 * Please import from "@/evals/remote-eu" instead.
 */

// Re-export from centralized module for backward compatibility
export * from "../remote-eu/schema";
export * from "../remote-eu/scorers";
