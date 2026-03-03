import { deepseek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { z } from "zod";
import { getPrompt, PROMPTS } from "@/observability";
import { aiTelemetry } from "@/lib/telemetry";

/**
 * Classify a job for Remote EU eligibility using DeepSeek via Vercel AI SDK.
 */
export async function classifyJobForRemoteEU(input: {
  title: string;
  location: string;
  description: string;
}) {
  const { text: promptText } = await getPrompt(PROMPTS.JOB_CLASSIFIER);

  const result = await generateObject({
    model: deepseek("deepseek-chat"),
    system: promptText,
    prompt: `Job Title: ${input.title}
Location: ${input.location || "Not specified"}
Description: ${input.description || "No description available"}

Classify this job posting.`,
    schema: z.object({
      isRemoteEU: z.boolean(),
      confidence: z.enum(["high", "medium", "low"]),
      reason: z.string(),
    }),
    experimental_telemetry: aiTelemetry("classify-remote-eu"),
  });

  return result.object;
}

// Export SQL agent for database queries
export { sqlAgent } from "./sql";

// Export SQL generation agent for database operations
export { sqlGenerationAgent } from "./sql-generation-agent";

// Export admin assistant for ops control plane
export { adminAssistantAgent } from "./admin-assistant";

// Export strategy enforcer for optimization strategy validation
export {
  strategyEnforcerTool,
  enforceStrategy,
} from "./strategy-enforcer";
