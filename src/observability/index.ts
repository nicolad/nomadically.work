import { Observability } from "@mastra/observability";
import { LangfuseExporter } from "@mastra/langfuse";

/**
 * Observability configuration for Mastra.
 * 
 * Configures Langfuse exporter for:
 * - Agent tracing
 * - Workflow tracing
 * - LLM generation tracking
 * - Prompt version linking
 * - Quality scoring metrics
 * 
 * Environment variables required:
 * - LANGFUSE_SECRET_KEY
 * - LANGFUSE_PUBLIC_KEY
 * - LANGFUSE_BASE_URL
 * 
 * @see https://langfuse.com/docs/tracing - Tracing Overview
 * @see https://langfuse.com/docs/prompt-management/overview - Prompt Management
 * @see https://langfuse.com/docs/scores/overview - Evaluation Scores
 */
export const observability = new Observability({
  configs: {
    langfuse: {
      serviceName: "nomadically-work",
      exporters: [
        new LangfuseExporter({
          publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
          secretKey: process.env.LANGFUSE_SECRET_KEY!,
          baseUrl: process.env.LANGFUSE_BASE_URL,
          realtime: process.env.NODE_ENV === "development",
          logLevel: "info",
          options: {
            environment: process.env.NODE_ENV || "development",
          },
        }),
      ],
    },
  },
});

/**
 * Export prompt management utilities.
 * 
 * Use these to fetch and manage prompts from Langfuse with caching and fallbacks.
 * 
 * @see https://langfuse.com/docs/prompt-management/overview - Prompt Management Overview
 * @see https://langfuse.com/docs/prompt-management/get-started - Getting Started Guide
 * @see https://langfuse.com/docs/prompt-management/features - Advanced Features
 */
export { getPrompt, clearPromptCache, PROMPTS } from "./prompts";
export type { PromptConfig, PromptResult } from "./prompts";
