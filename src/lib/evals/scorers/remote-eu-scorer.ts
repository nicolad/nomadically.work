/**
 * @deprecated This file has been moved to src/lib/evals/remote-eu/
 * 
 * All Remote EU evaluation logic is now centralized in:
 * - src/lib/evals/remote-eu/schema.ts - Types and schemas
 * - src/lib/evals/remote-eu/scorers.ts - Scorer functions (Mastra/Langfuse)
 * - src/lib/evals/remote-eu/test-data.ts - Test cases
 * 
 * Please import from "@/lib/evals/remote-eu" instead.
 */

// Re-export from centralized module for backward compatibility
export * from "../remote-eu/schema";
export * from "../remote-eu/scorers";

