// Note: Langfuse SDK not compatible with Edge Runtime (has zlib dependency)
// Use @/langfuse fetch-based API instead
// import { Langfuse } from "langfuse";
// import { buildTracingOptions } from "@mastra/observability";
// import { withLangfusePrompt } from "@mastra/langfuse";
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
// Note: Commented out due to Edge Runtime incompatibility
// Use @/langfuse fetch-based API instead
// const langfuse = new Langfuse({
//   secretKey: LANGFUSE_SECRET_KEY,
//   publicKey: LANGFUSE_PUBLIC_KEY,
//   baseUrl: LANGFUSE_BASE_URL,
//   // Reduce SDK logging noise during normal operation
//   release: process.env.NODE_ENV || "development",
// });

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
  // tracingOptions disabled - not compatible with Edge Runtime
  // tracingOptions: ReturnType<typeof buildTracingOptions> | undefined;
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
  // Note: Langfuse SDK integration disabled due to Edge Runtime incompatibility
  // Always use fallback for now. Use @/langfuse fetch-based API for Edge-compatible prompts.
  console.log(`📝 Using local fallback prompt for "${config.name}" (Langfuse SDK disabled)`);
  return {
    text: config.fallbackText,
    // tracingOptions: undefined,
  };

  // Skip remote fetching if explicitly disabled
  // if (process.env.SKIP_LANGFUSE_PROMPTS === "true") {
  //   console.log(`📝 Using local fallback prompt for "${config.name}"`);
  //   return {
  //     text: config.fallbackText,
  //     tracingOptions: undefined,
  //   };
  // }

  // Note: All Langfuse SDK code below is commented out due to Edge Runtime incompatibility
  // Use @/langfuse fetch-based API instead for production Edge Runtime support
  
  // const cacheKey = config.version
  //   ? `${config.name}:${config.version}`
  //   : config.name;

  // // Check cache first
  // if (promptCache.has(cacheKey)) {
  //   const cached = promptCache.get(cacheKey);
  //   return {
  //     text: cached.prompt,
  //     tracingOptions: buildTracingOptions(withLangfusePrompt(cached)),
  //   };
  // }

  // try {
  //   // Fetch from Langfuse
  //   const prompt = config.version
  //     ? await langfuse.getPrompt(config.name, config.version)
  //     : await langfuse.getPrompt(config.name);

  //   // Cache the result
  //   promptCache.set(cacheKey, prompt);

  //   console.log(`✅ Loaded prompt "${config.name}" from Langfuse`);

  //   return {
  //     text: prompt.prompt,
  //     tracingOptions: buildTracingOptions(withLangfusePrompt(prompt)),
  //   };
  // } catch (error) {
  //   // Provide helpful guidance on first setup
  //   const errorMsg = error instanceof Error ? error.message : String(error);
  //   const isNotFound = errorMsg.includes("not found");

  //   if (isNotFound) {
  //     console.warn(
  //       `⚠️  Prompt "${config.name}" not found in Langfuse (using fallback)\n` +
  //         `   To create it: Visit Langfuse UI → Prompts → Create "${config.name}" with label "production"\n` +
  //         `   Or set SKIP_LANGFUSE_PROMPTS=true in .env.local to skip remote prompts`,
  //     );
  //   } else {
  //     console.warn(
  //       `⚠️  Failed to fetch prompt "${config.name}" from Langfuse (using fallback):`,
  //       errorMsg,
  //     );
  //   }

  //   return {
  //     text: config.fallbackText,
  //     tracingOptions: undefined, // No tracing options if prompt fetch failed
  //   };
  // }
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
    fallbackText: `You are an expert at classifying job postings for FULLY REMOTE positions that allow working from the EU.

CRITICAL: A job must be BOTH fully remote AND allow EU locations to be "Remote EU".

DEFINITION OF REMOTE EU:
1. The position is FULLY REMOTE (not office-based, not hybrid with office requirements)
2. AND the remote work is allowed from EU member countries

OFFICE vs REMOTE INDICATORS:

🏢 OFFICE-BASED (isRemoteEU: false):
- Location lists a SPECIFIC CITY like "Utrecht, Netherlands", "Berlin, Germany", "Dublin, Ireland"
- Format "City, Country" almost always means office location in that city
- Says "Position located in [City]"
- Mentions "Hybrid", "X days in office"
- Says "On-site", "Office-based", "In-person"

🏠 FULLY REMOTE (can be isRemoteEU: true IF EU-allowed):
- Location says "Remote", "Remote - EU", "Remote - Europe", "Anywhere"
- Explicitly states "Fully remote", "100% remote", "Work from home"
- Multiple countries/regions (shows flexibility, not single office)
- Description says "work from anywhere in EU/Europe"

GEOGRAPHIC RESTRICTIONS:

✅ EU-ALLOWED (if also remote):
- Explicitly states "EU", "European Union", "EU member states"
- Lists only EU countries (Germany, France, Spain, Italy, Netherlands, Poland, etc.)
- Says "EU work authorization required"
- "EEA" (mostly EU + Iceland, Norway, Liechtenstein)

❌ NOT EU-RESTRICTED:
- "EMEA" (includes UK, Middle East, Africa - too broad)
- "Europe" alone (includes UK, Switzerland, Norway)
- "CET timezone" (not EU-specific)
- UK only (not EU post-Brexit)
- Switzerland only (not EU member)
- Includes non-EU countries in list

CONFIDENCE LEVELS:
- HIGH: Clearly states "Remote - EU" or equivalent, unambiguous
- MEDIUM: Remote + likely EU but not 100% explicit
- LOW: Ambiguous, unclear if truly remote or EU-restricted

EXAMPLES:

❌ "Utrecht, Netherlands" = Office job in Utrecht (NOT Remote EU)
❌ "Berlin, Germany - Hybrid" = Office job in Berlin (NOT Remote EU)
❌ "Remote - EMEA" = Remote but not EU-restricted (NOT Remote EU)
❌ "Dublin, Ireland" = Office job in Dublin (NOT Remote EU)
✅ "Remote - EU" = Fully remote, EU countries (Remote EU - HIGH confidence)
✅ "Remote - Europe (EU only)" = Fully remote, EU-restricted (Remote EU - HIGH confidence)
✅ "Anywhere in EU" = Fully remote, EU locations (Remote EU - HIGH confidence)

Provide classification with clear reasoning based on whether the job is BOTH remote AND EU-allowed.`,
  },
} as const;
