import { deepseek } from "@ai-sdk/deepseek";
import { Agent } from "@mastra/core/agent";
import {
  createAnswerRelevancyScorer,
  createToxicityScorer,
  createBiasScorer,
  createHallucinationScorer,
} from "@mastra/evals/scorers/prebuilt";

/**
 * Job Classifier Agent with built-in quality scorers.
 *
 * Agent-level scorers run on the message I/O (better fit for built-in scorers).
 * Workflow-step scorers run on structured I/O (better for domain-specific scorers).
 *
 * Live evaluations run asynchronously and store results in `mastra_scorers` table.
 */
export const jobClassifierAgent = new Agent({
  id: "job-classifier-agent",
  name: "Job Classifier Agent",
  instructions:
    "You are an expert at classifying job postings. You can analyze job titles, locations, and descriptions to determine if they are remote EU jobs, UK remote jobs, or other types of positions. You understand geographical nuances like EMEA vs EU, timezone requirements, and work authorization implications.",
  model: deepseek("deepseek-chat"),

  scorers: {
    // Answer relevancy: is the agent's output relevant to the input prompt?
    answerRelevancy: {
      scorer: createAnswerRelevancyScorer({ model: "deepseek/deepseek-chat" }),
      sampling: { type: "ratio", rate: 0.25 },
    },

    // Toxicity: safety check (should always be near-zero for job classifications)
    toxicity: {
      scorer: createToxicityScorer({ model: "deepseek/deepseek-chat" }),
      sampling: { type: "ratio", rate: 1 },
    },

    // Bias: fairness check (important for job-related content)
    bias: {
      scorer: createBiasScorer({ model: "deepseek/deepseek-chat" }),
      sampling: { type: "ratio", rate: 0.25 },
    },

    // Hallucination: does the output invent facts not in the input?
    hallucination: {
      scorer: createHallucinationScorer({ model: "deepseek/deepseek-chat" }),
      sampling: { type: "ratio", rate: 0.25 },
    },
  },
});
