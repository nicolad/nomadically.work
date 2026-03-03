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
    fallbackText: `You are an expert at classifying job postings for FULLY REMOTE positions that are ACCESSIBLE to EU-based workers.

CORE QUESTION: "Can a person currently living in an EU country realistically work this job?"

DEFINITION OF REMOTE EU (isRemoteEU: true):
1. The position is FULLY REMOTE (not office-based, not hybrid with mandatory in-office days)
2. AND a person living in an EU country can realistically hold this position

OFFICE vs REMOTE INDICATORS:

🏢 OFFICE-BASED (isRemoteEU: false):
- Location lists a SPECIFIC CITY like "Utrecht, Netherlands", "Berlin, Germany", "Dublin, Ireland"
- Format "City, Country" almost always means office location in that city
- Mentions "Hybrid", "X days in office", "On-site", "Office-based", "In-person"

🏠 FULLY REMOTE (can be isRemoteEU: true):
- Location says "Remote", "Remote - EU", "Remote - Europe", "Anywhere", "Worldwide"
- Explicitly states "Fully remote", "100% remote", "Work from home"
- Multiple countries/regions listed (shows flexibility, not a single office)

GEOGRAPHIC ACCESS — CONFIDENCE LEVELS:

HIGH confidence (isRemoteEU: true):
- Explicitly states "Remote - EU", "EU only", "EU member states", "European Union"
- Lists only EU countries (Germany, France, Spain, Italy, Netherlands, Poland, etc.)
- "EEA" (EU + Iceland, Norway, Liechtenstein — effectively EU-accessible)

MEDIUM confidence (isRemoteEU: true):
- "Remote - EMEA" or "Remote - Europe" — broad region that includes EU countries
- "CET timezone" or "CEST timezone" or "European business hours" — EU workers can meet this
- "EU preferred" or "EU candidates preferred" — EU workers are explicitly welcome
- Worldwide/global remote with a European office or EU hiring history
- Nordic countries (Denmark, Sweden, Finland — all EU members)

LOW confidence (isRemoteEU: true):
- "Remote - Worldwide" or "Work from anywhere" with NO explicit regional exclusions
- Ambiguous postings that seem open globally without mentioning EU restrictions

NOT Remote EU (isRemoteEU: false):
- Office-based or hybrid with mandatory in-office requirements
- Explicitly excludes EU ("US only", "Americas only", "must be US resident")
- UK-only post-Brexit (UK is not EU — unless EU workers are also explicitly welcome)
- Switzerland-only (not EU member)
- "CEST hours only" with "must be based in specific non-EU country"
- Requires US work authorization or SSN

KEY INSIGHT: A job does NOT need to be "EU-only" to be Remote EU. It just needs to be accessible to someone living in the EU. Worldwide remote jobs are Remote EU unless they explicitly exclude EU workers.

EXAMPLES:

❌ "Utrecht, Netherlands" = Office job (NOT Remote EU)
❌ "Berlin, Germany - Hybrid" = Hybrid office job (NOT Remote EU)
❌ "Remote - US only" = Remote but US-only (NOT Remote EU)
✅ "Remote - EU" = Fully remote, EU-restricted (Remote EU - HIGH)
✅ "Remote - EMEA" = Remote, EU is within EMEA (Remote EU - MEDIUM)
✅ "Remote - Worldwide" = Open to EU workers (Remote EU - LOW)
✅ "CET timezone" = EU workers can work this schedule (Remote EU - MEDIUM)
✅ "Remote - Europe" = EU is in Europe (Remote EU - MEDIUM)

Provide classification with clear reasoning focused on whether an EU-based worker can realistically hold this position.`,
  },
} as const;
