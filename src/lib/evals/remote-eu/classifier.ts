/**
 * Remote EU Job Classifier
 *
 * Shared classification function for Remote EU job analysis.
 * Uses Mastra Agent with DeepSeek model for structured output.
 */

import { Agent } from "@mastra/core/agent";
import { deepseek } from "@ai-sdk/deepseek";
import {
  remoteEUClassificationSchema,
  type RemoteEUClassification,
} from "./schema";

export interface JobPosting {
  title: string;
  location: string | null;
  description: string | null;
}

export interface ClassifyJobOptions {
  jobPosting: JobPosting;
  promptText: string;
  agentId?: string;
  agentName?: string;
}

/**
 * Classify a job posting for Remote EU eligibility
 *
 * @param options - Classification options
 * @returns Promise resolving to RemoteEUClassification
 *
 * @example
 * ```typescript
 * const classification = await classifyJobForRemoteEU({
 *   jobPosting: {
 *     title: "Senior Engineer",
 *     location: "Remote - EU",
 *     description: "..."
 *   },
 *   promptText: "You are an expert at classifying jobs..."
 * });
 *
 * console.log(classification.isRemoteEU); // true/false
 * console.log(classification.confidence); // "high" | "medium" | "low"
 * console.log(classification.reason); // explanation
 * ```
 */
export async function classifyJobForRemoteEU(
  options: ClassifyJobOptions,
): Promise<RemoteEUClassification> {
  const {
    jobPosting,
    promptText,
    agentId = "remote-eu-classifier",
    agentName = "Remote EU Classifier",
  } = options;

  // Create agent with the prompt
  const agent = new Agent({
    id: agentId,
    name: agentName,
    instructions: promptText,
    model: deepseek("deepseek-chat"),
  });

  // Classify the job using the agent
  const result = await agent.generate(
    [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Job Title: ${jobPosting.title}
Location: ${jobPosting.location || "Not specified"}
Description: ${jobPosting.description || "No description available"}

Classify this job posting.`,
          },
        ],
      },
    ],
    { structuredOutput: { schema: remoteEUClassificationSchema } },
  );

  return result.object;
}

/**
 * Create a reusable agent for batch classification
 *
 * More efficient than creating a new agent for each job.
 * Use this when classifying multiple jobs in sequence.
 *
 * @param promptText - Prompt instructions for classification
 * @param agentId - Optional agent identifier
 * @param agentName - Optional agent display name
 * @returns Configured Agent instance
 *
 * @example
 * ```typescript
 * const agent = createRemoteEUClassifier(promptText);
 *
 * for (const job of jobs) {
 *   const result = await agent.generate([...], {
 *     structuredOutput: { schema: remoteEUClassificationSchema }
 *   });
 *   console.log(result.object);
 * }
 * ```
 */
export function createRemoteEUClassifier(
  promptText: string,
  agentId = "remote-eu-classifier",
  agentName = "Remote EU Classifier",
): Agent {
  return new Agent({
    id: agentId,
    name: agentName,
    instructions: promptText,
    model: deepseek("deepseek-chat"),
  });
}
