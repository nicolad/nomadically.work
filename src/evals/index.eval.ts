/**
 * Evaluations Overview
 * 
 * Evaluations are handled through two approaches:
 * 
 * 1. **Live Evaluation (Mastra/Langfuse)**:
 *    - Scorers attached to agents
 *    - Automatically tracked in Langfuse
 *    - See agent definitions in src/agents/
 * 
 * 2. **Regression Testing (Vitest)**:
 *    - Test files with .test.ts extension
 *    - Run with: pnpm test:eval
 * 
 * All evaluation modules are organized by domain:
 * - Remote EU eval: src/evals/remote-eu/
 * 
 * @see https://langfuse.com/docs/scores - Langfuse Scores Documentation
 * @see src/observability/ - Observability configuration
 */

// Re-export evaluation modules
export * from "./remote-eu";

