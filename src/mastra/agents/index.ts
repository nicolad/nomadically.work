import { deepseek } from "@ai-sdk/deepseek";
import { Agent } from "@mastra/core/agent";

export const jobClassifierAgent = new Agent({
  id: "job-classifier-agent",
  name: "Job Classifier Agent",
  instructions:
    "You are an expert at classifying job postings. You can analyze job titles, locations, and descriptions to determine if they are remote EU jobs, UK remote jobs, or other types of positions. You understand geographical nuances like EMEA vs EU, timezone requirements, and work authorization implications.",
  model: deepseek("deepseek-chat"),
});
