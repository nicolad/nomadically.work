/**
 * Remote EU Job Classifier
 *
 * Shared classification function for Remote EU job analysis.
 * Uses Vercel AI SDK with DeepSeek model for structured output.
 */

import { deepseek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
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
 */
export async function classifyJobForRemoteEU(
  options: ClassifyJobOptions,
): Promise<RemoteEUClassification> {
  const { jobPosting, promptText } = options;

  const result = await generateObject({
    model: deepseek("deepseek-chat"),
    system: promptText,
    prompt: `Job Title: ${jobPosting.title}
Location: ${jobPosting.location || "Not specified"}
Description: ${jobPosting.description || "No description available"}

Classify this job posting.`,
    schema: remoteEUClassificationSchema,
  });

  return result.object;
}
