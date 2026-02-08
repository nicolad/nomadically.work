import { deepseek } from "@ai-sdk/deepseek";
import { Agent } from "@mastra/core/agent";
import {
  createAnswerRelevancyScorer,
  createToxicityScorer,
  createBiasScorer,
  createHallucinationScorer,
} from "@mastra/evals/scorers/prebuilt";
import { getPrompt, PROMPTS } from "@/observability";

/**
 * Job Classifier Agent with built-in quality scorers and Langfuse prompt management.
 *
 * Agent-level scorers run on the message I/O (better fit for built-in scorers).
 * Workflow-step scorers run on structured I/O (better for domain-specific scorers).
 *
 * Live evaluations run asynchronously and store results in `mastra_scorers` table.
 * Prompts are managed in Langfuse and linked for version tracking.
 */
async function createJobClassifierAgent() {
  // Fetch the prompt from Langfuse (with caching and fallback)
  const { text, tracingOptions } = await getPrompt(PROMPTS.JOB_CLASSIFIER);

  const scorers = {
    // Answer relevancy: is the agent's output relevant to the input prompt?
    answerRelevancy: {
      scorer: createAnswerRelevancyScorer({ model: "deepseek/deepseek-chat" }),
      sampling: { type: "ratio" as const, rate: 0.25 },
    },

    // Toxicity: safety check (should always be near-zero for job classifications)
    toxicity: {
      scorer: createToxicityScorer({ model: "deepseek/deepseek-chat" }),
      sampling: { type: "ratio" as const, rate: 1 },
    },

    // Bias: fairness check (important for job-related content)
    bias: {
      scorer: createBiasScorer({ model: "deepseek/deepseek-chat" }),
      sampling: { type: "ratio" as const, rate: 0.25 },
    },

    // Hallucination: does the output invent facts not in the input?
    hallucination: {
      scorer: createHallucinationScorer({ model: "deepseek/deepseek-chat" }),
      sampling: { type: "ratio" as const, rate: 0.25 },
    },
  };

  return new Agent({
    id: "job-classifier-agent",
    name: "Job Classifier Agent",
    instructions: text,
    model: deepseek("deepseek-chat"),
    defaultGenerateOptionsLegacy: tracingOptions ? { tracingOptions } : undefined,
    scorers,
  });
}

// Export the agent as a promise that resolves to the configured agent
export const jobClassifierAgent = await createJobClassifierAgent();
