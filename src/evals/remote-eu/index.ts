/**
 * Remote EU Job Classification Evaluation
 *
 * Centralized module for evaluating Remote EU job classification accuracy.
 * Evaluation runs via Langfuse Datasets: pnpm eval:langfuse
 *
 * @module remote-eu-eval
 * @see https://langfuse.com/docs/datasets
 */

export * from "./schema";
export * from "./test-data";
export * from "./scorers";
export * from "./classifier";
