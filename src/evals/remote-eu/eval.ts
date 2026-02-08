/**
 * Remote EU Evaluation Utilities
 *
 * Evaluations for Remote EU job classification are handled through:
 *
 * 1. **Live Evaluation (Mastra/Langfuse)**:
 *    - Use `remoteEUScorer` with agents
 *    - Automatically tracked in Langfuse
 *    - See: src/mastra/agents/index.ts
 *
 * 2. **Regression Testing (Vitest)**:
 *    - See: src/lib/evals/remote-eu-eval.test.ts
 *    - Run with: pnpm test:eval
 *
 * Example live evaluation:
 * ```typescript
 * import { remoteEUScorer } from "@/evals/remote-eu";
 *
 * const agent = new Agent({
 *   scorers: {
 *     remoteEU: {
 *       scorer: remoteEUScorer,
 *       sampling: { type: "ratio", rate: 0.25 },
 *     },
 *   },
 * });
 * ```
 *
 * All scores are automatically sent to Langfuse for analysis.
 * View results at: https://cloud.langfuse.com
 */
