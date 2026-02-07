import { Langfuse } from "langfuse";
import { buildTracingOptions } from "@mastra/observability";
import { withLangfusePrompt } from "@mastra/langfuse";
import {
  LANGFUSE_SECRET_KEY,
  LANGFUSE_PUBLIC_KEY,
  LANGFUSE_BASE_URL,
} from "../config/env";

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
const langfuse = new Langfuse({
  secretKey: LANGFUSE_SECRET_KEY,
  publicKey: LANGFUSE_PUBLIC_KEY,
  baseUrl: LANGFUSE_BASE_URL,
  // Reduce SDK logging noise during normal operation
  release: process.env.NODE_ENV || "development",
});

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
 * Set SKIP_LANGFUSE_PROMPTS=true to always use fallback and skip remote fetching.
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
  // Skip remote fetching if explicitly disabled
  if (process.env.SKIP_LANGFUSE_PROMPTS === "true") {
    console.log(`📝 Using local fallback prompt for "${config.name}"`);
    return {
      text: config.fallbackText,
      tracingOptions: undefined,
    };
  }

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

    console.log(`✅ Loaded prompt "${config.name}" from Langfuse`);

    return {
      text: prompt.prompt,
      tracingOptions: buildTracingOptions(withLangfusePrompt(prompt)),
    };
  } catch (error) {
    // Provide helpful guidance on first setup
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isNotFound = errorMsg.includes("not found");

    if (isNotFound) {
      console.warn(
        `⚠️  Prompt "${config.name}" not found in Langfuse (using fallback)\n` +
          `   To create it: Visit Langfuse UI → Prompts → Create "${config.name}" with label "production"\n` +
          `   Or set SKIP_LANGFUSE_PROMPTS=true in .env.local to skip remote prompts`,
      );
    } else {
      console.warn(
        `⚠️  Failed to fetch prompt "${config.name}" from Langfuse (using fallback):`,
        errorMsg,
      );
    }

    return {
      text: config.fallbackText,
      tracingOptions: undefined, // No tracing options if prompt fetch failed
    };
  }
}

/**
 * Each prompt must be created in Langfuse UI with the same name.
 * Fallback text is used if Langfuse is unavailable.
 *
 * @see https://langfuse.com/docs/prompt-management/get-started#create-prompt-in-langfuse
 * @see https://langfuse.com/docs/prompt-management/concepts#labels - Using labels
 *
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
    fallbackText: `You are an expert at classifying job postings for Remote EU positions.

CRITICAL RULES:
1. Only classify as "Remote EU" (isRemoteEU: true) if the job EXPLICITLY mentions EU, European Union, or lists only EU member countries.
2. Use HIGH confidence only when explicitly clear; MEDIUM for likely scenarios; LOW for ambiguous cases.

IMPORTANT DISTINCTIONS:
- "EMEA" (Europe, Middle East, Africa) is NOT EU - it includes non-EU countries like UK (post-Brexit), Switzerland, Middle East, and Africa. Mark as isRemoteEU: false unless explicitly restricted to EU member states.
- "Europe" alone is TOO BROAD - includes non-EU countries (UK, Switzerland, Norway, etc.). Mark as isRemoteEU: false with LOW confidence unless context clarifies.
- "CET timezone" is NOT exclusive to EU - includes Switzerland and some African countries. Mark as isRemoteEU: false with MEDIUM confidence.
- "UK only" is NOT EU since Brexit. Mark as isRemoteEU: false with HIGH confidence.
- "Switzerland only" is NOT EU (not a member state). Mark as isRemoteEU: false with HIGH confidence.
- "EEA" (European Economic Area) includes all EU + Norway, Iceland, Liechtenstein. Mark as isRemoteEU: true with MEDIUM confidence (mostly EU).
- "Schengen Area" mostly overlaps with EU but includes some non-EU (Switzerland, Norway). Mark as isRemoteEU: true with MEDIUM confidence.

POSITIVE INDICATORS (isRemoteEU: true):
- Explicitly states "Remote - EU", "European Union", "EU countries"
- Lists only EU member countries (Germany, France, Spain, Italy, etc.)
- Requires "EU work authorization", "EU passport", "right to work in EU"
- States "EU member states only"
- EMEA or Europe BUT explicitly restricted to "EU countries only" or "EU member states"

NEGATIVE INDICATORS (isRemoteEU: false):
- EMEA without EU restriction
- Europe without EU restriction  
- UK only (post-Brexit)
- Switzerland only
- CET timezone without EU mention
- Includes non-EU countries (UK, Switzerland, Norway, etc.) in list

Provide your classification with a clear reasoning based on the job title, location, and description.`,
  },
} as const;
