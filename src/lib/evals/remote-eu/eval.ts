import { Eval } from "braintrust";
import { remoteEUTestCases } from "./test-data";
import { jobClassificationScorer } from "./scorers";
import type { RemoteEUClassification } from "./schema";

/**
 * Classification function - should be imported from your agent/action
 * Replace this with your actual classification logic
 */
type ClassifyJobInput = {
  title: string;
  location: string;
  description: string;
};

type ClassifyJobResult = {
  ok: boolean;
  data?: RemoteEUClassification;
};

/**
 * Import your actual classifyJob function here
 * For now, this is a placeholder type
 */
declare function classifyJob(
  input: ClassifyJobInput,
): Promise<ClassifyJobResult>;

/**
 * Braintrust evaluation for Remote EU job classification.
 * 
 * Evaluates the model's ability to correctly classify jobs as Remote EU or not.
 * Tests against labeled data with tricky edge cases like:
 * - EMEA vs EU distinction
 * - UK post-Brexit
 * - Switzerland (not EU)
 * - Work authorization requirements
 * 
 * Run with: pnpm braintrust:eval
 */
export const remoteEUEval = Eval("Remote EU Job Classification", {
  data: () => {
    // Use first 5 test cases for quick evaluation
    // Remove .slice() to run full test suite
    return remoteEUTestCases.slice(0, 5).map((testCase) => ({
      input: testCase.jobPosting,
      expected: testCase.expectedClassification,
    }));
  },
  task: async (input) => {
    // Dynamically import to avoid circular dependencies
    const { classifyJob } = await import("@/lib/mastra/actions");

    const result = await classifyJob({
      title: input.title,
      location: input.location,
      description: input.description,
    });

    if (!result.ok || !result.data) {
      return {
        isRemoteEU: false,
        confidence: "low" as const,
        reason: "Classification failed",
      };
    }

    return result.data;
  },
  scores: [jobClassificationScorer],
});
