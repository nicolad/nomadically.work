/**
 * Braintrust Evaluations Entry Point
 * 
 * This file is the entry point for running Braintrust evaluations.
 * All evaluation definitions are now centralized in their respective modules.
 * 
 * Run with: pnpm braintrust:eval
 * 
 * @deprecated Individual eval files - Use centralized modules instead:
 * - Remote EU eval: src/lib/evals/remote-eu/
 */

// Import and export all evaluations
export { remoteEUEval } from "./remote-eu/eval";

