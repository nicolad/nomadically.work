import { Langfuse } from "langfuse";
import { buildTracingOptions } from "@mastra/observability";
import { withLangfusePrompt } from "@mastra/langfuse";

/**
 * Centralized prompt management for Langfuse.
 * 
 * Handles fetching, caching, and error handling for prompts.
 * All prompts are managed in Langfuse Prompt Management.
 * 
 * @see https://langfuse.com/docs/prompt-management/overview - Overview
 * @see https://langfuse.com/docs/prompt-management/get-started - Getting Started
 * @see https://langfuse.com/docs/prompt-management/concepts - Core Concepts
 */

// Initialize Langfuse client for prompt management
const langfuse = new Langfuse();

// Prompt cache to avoid repeated API calls
// Prompts are cached client-side for zero-latency retrieval
// @see https://langfuse.com/docs/prompt-management/get-started#caching
const promptCache = new Map<string, any>();

export interface PromptConfig {
  name: string;
  version?: number;
  fallbackText: string;
}

export interface PromptResult {
  text: string;
  tracingOptions: ReturnType<typeof buildTracingOptions> | undefined;
}

/**
 * Fetch a prompt from Langfuse with caching and fallback.
 * 
 * Prompts are cached client-side for zero-latency retrieval. If Langfuse is
 * unavailable, the fallback text is used to ensure application reliability.
 * 
 * @param config - Prompt configuration
 * @returns Prompt text and tracing options
 * 
 * @example
 * ```typescript
 * const { text, tracingOptions } = await getPrompt({
 *   name: 'job-classifier',
 *   fallbackText: 'You are a job classifier...'
 * });
 * ```
 * 
 * @see https://langfuse.com/docs/prompt-management/get-started - Getting Started
 * @see https://langfuse.com/docs/prompt-management/concepts#versioning - Versioning
 * @see https://langfuse.com/docs/tracing-features/url - Link prompts to traces
 */
export async function getPrompt(config: PromptConfig): Promise<PromptResult> {
  const cacheKey = config.version 
    ? `${config.name}:${config.version}` 
    : config.name;

  // Check cache first
  if (promptCache.has(cacheKey)) {
    const cached = promptCache.get(cacheKey);
    return {
      text: cached.prompt,
      tracingOptions: buildTracingOptions(withLangfusePrompt(cached)),
    };
  }

  try {
    // Fetch from Langfuse
    const prompt = config.version
      ? await langfuse.getPrompt(config.name, config.version)
      : await langfuse.getPrompt(config.name);

    // Cache the result
    promptCache.set(cacheKey, prompt);

    return {
      text: prompt.prompt,
      tracingOptions: buildTracingOptions(withLangfusePrompt(prompt)),
    };
  } catch (error) {
    console.warn(
      `Failed to fetch prompt "${config.name}" from Langfuse, using fallback:`,
      error instanceof Error ? error.message : error
    );

    return {
      text: config.fallbackText,
   
 * Useful for forcing a refresh of prompts from Langfuse during development
 * or when you want to immediately pick up prompt updates.
 * 
 * @see https://langfuse.com/docs/prompt-management/get-started#caching
    };
  }
}
 
 * Each prompt must be created in Langfuse UI with the same name.
 * Fallback text is used if Langfuse is unavailable.
 * 
 * @see https://langfuse.com/docs/prompt-management/get-started#create-prompt-in-langfuse
 * @see https://langfuse.com/docs/prompt-management/concepts#labels - Using labels
 *
/**
 * Clear the prompt cache.
 * Useful for forcing a refresh of prompts from Langfuse.
 */
export function clearPromptCache(): void {
  promptCache.clear();
}

/**
 * Predefined prompts for the application.
 */
export const PROMPTS = {
  JOB_CLASSIFIER: {
    name: "job-classifier",
    fallbackText: `You are an expert at classifying job postings. You can analyze job titles, locations, and descriptions to determine if they are remote EU jobs, UK remote jobs, or other types of positions. You understand geographical nuances like EMEA vs EU, timezone requirements, and work authorization implications.`,
  },
} as const;
