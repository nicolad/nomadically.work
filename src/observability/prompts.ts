import { fetchLangfusePrompt } from "@/langfuse";

// Prompt cache to avoid repeated API calls
const promptCache = new Map<string, string>();

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
  if (process.env.SKIP_LANGFUSE_PROMPTS === "true") {
    return { text: config.fallbackText };
  }

  const cacheKey = config.version
    ? `${config.name}:${config.version}`
    : config.name;

  if (promptCache.has(cacheKey)) {
    return { text: promptCache.get(cacheKey) };
  }

  try {
    const prompt = await fetchLangfusePrompt(config.name, {
      version: config.version,
      label: "production",
    });

    const text = typeof prompt.prompt === "string"
      ? prompt.prompt
      : config.fallbackText;

    promptCache.set(cacheKey, text);
    return { text };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes("404") || errorMsg.includes("not found")) {
      console.warn(
        `⚠️  Prompt "${config.name}" not found in Langfuse (using fallback)\n` +
        `   Create it at Langfuse UI → Prompts with label "production"`,
      );
    } else {
      console.warn(`⚠️  Failed to fetch prompt "${config.name}" (using fallback):`, errorMsg);
    }
    return { text: config.fallbackText };
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
