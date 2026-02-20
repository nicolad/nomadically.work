// scripts/setup-langfuse-prompts.ts
// Optimized Langfuse prompt management for Promptfoo evaluations
// Creates production-grade prompts with comprehensive instructions and quality checks
// Docs: https://www.promptfoo.dev/docs/integrations/langfuse/
import "dotenv/config";
import { LangfuseClient } from "@langfuse/client";

/**
 * Helper to safely get required environment variables
 */
function mustGetEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Create Langfuse client with proper env var handling
 * Supports both LANGFUSE_BASE_URL (client) and LANGFUSE_HOST (Promptfoo)
 */
function createLangfuseClient(): LangfuseClient {
  const baseUrl =
    process.env.LANGFUSE_BASE_URL ||
    process.env.LANGFUSE_HOST ||
    "https://cloud.langfuse.com";

  return new LangfuseClient({
    publicKey: mustGetEnv("LANGFUSE_PUBLIC_KEY"),
    secretKey: mustGetEnv("LANGFUSE_SECRET_KEY"),
    baseUrl,
  });
}

/**
 * Create/update prompts in Langfuse
 * Same prompt name → creates new version automatically
 */
async function setupPrompts() {
  console.log("🚀 Setting up Langfuse prompts for Promptfoo evaluations...\n");

  const langfuse = createLangfuseClient();

  try {
    // ========================================================================
    // TEXT PROMPT: Optimized pipeline orchestrator
    // ========================================================================
    console.log("📝 Creating text prompt: remote-ai-jobs-eval");
    const textPrompt = await langfuse.prompt.create({
      name: "remote-ai-jobs-eval",
      type: "text",
      prompt: [
        "Execute the remote jobs discovery pipeline with the following objectives:",
        "",
        "MISSION:",
        "Discover and filter fully-remote AI/ML/LLM/GenAI engineering positions posted in the last 24 hours.",
        "",
        "WORKFLOW:",
        "1. Search: Ingest fresh remote AI job listings from ATS platforms (Greenhouse, Lever, Ashby)",
        "2. Extract: Parse job metadata (title, company, URL, region, posted date)",
        "3. Filter: Apply strict remote-only and recency criteria",
        "4. Classify: Categorize by region (worldwide vs europe)",
        "5. Validate: Ensure data quality and evidence-backed classifications",
        "",
        "OUTPUT REQUIREMENTS:",
        "- Structured JSON with two arrays: 'worldwide' and 'europe'",
        "- Each job must include: title, company, url, region, posted_date, confidence (0-1)",
        "- Exclude hybrid/onsite positions with confidence < 0.7",
        "- INCLUDE: ATS individual job postings (jobs.ashbyhq.com/company/job, boards.greenhouse.io/company/jobs/id)",
        "- EXCLUDE: Job board listing pages (turing.com/jobs/*, builtin.com/jobs/*, ziprecruiter.com, glassdoor.com/job, remoteok.com)",
        "- EXCLUDE: URLs with '/jobs/remote-*' or '/remote-jobs' that list multiple jobs (not single postings)",
        "- Only include: Direct company career pages OR individual ATS job postings",
        "- Include 2-8 supporting evidence quotes per job",
        "",
        "QUALITY STANDARDS:",
        "- Minimum confidence: 0.6 for inclusion",
        "- Freshness: posted within last 24 hours preferred",
        "- Accuracy: verify remote status from job description text",
        "- Completeness: all required fields populated",
      ].join("\n"),
      labels: ["production", "latest"],
      config: {
        description:
          "Optimized remote AI jobs pipeline - discovers and filters fully-remote AI/LLM/GenAI engineering jobs with comprehensive quality checks",
        workflow: "direct-deepseek-client",
        model: "deepseek-chat",
        temperature: 0.1,
        max_tokens: 8000,
        response_format: { type: "json_object" },
        assertions: [
          "is-json",
          "twoBucketsOnly",
          "strictInvariants",
          "excludesBadUrls",
        ],
        tags: ["evaluation", "remote-jobs", "deepseek", "optimized"],
      },
      tags: ["promptfoo", "evaluation", "remote-jobs", "v2"],
    });

    console.log("   ✅ Created/updated prompt: remote-ai-jobs-eval");
    console.log(`   📦 Version: ${(textPrompt as any).version || "latest"}`);
    console.log(
      `   🏷️  Labels: ${(textPrompt as any).labels?.join(", ") || "production"}`,
    );

    // ========================================================================
    // CHAT PROMPT: Optimized job extraction with multi-stage filtering
    // ========================================================================
    console.log("\n💬 Creating chat prompt: remote-ai-jobs-extractor");
    const chatPrompt = await langfuse.prompt.create({
      name: "remote-ai-jobs-extractor",
      type: "chat",
      prompt: [
        {
          role: "system",
          content: [
            "You are an expert job data extraction specialist focused on remote AI/ML/LLM engineering positions.",
            "",
            "CORE MISSION:",
            "Extract, validate, and classify fully-remote AI engineering jobs from web search results with evidence-backed confidence scores.",
            "",
            "FILTERING CRITERIA:",
            "✓ INCLUDE: Fully remote (100% remote, remote-first, distributed teams)",
            "✓ INCLUDE: Direct company career pages",
            "✓ INCLUDE: Individual ATS job postings (jobs.ashbyhq.com/company/job, boards.greenhouse.io/company/jobs/id, jobs.lever.co/company/job)",
            "✗ EXCLUDE: Hybrid, office-required, location-specific, on-site, in-person",
            "✗ EXCLUDE: Job board listing pages (turing.com/jobs/*, builtin.com/jobs/*, ziprecruiter.com, glassdoor.com/job, remotive.com/remote, remoteok.com)",
            "✗ EXCLUDE: URLs with '/jobs/remote-*', '/remote-jobs' that list MULTIPLE jobs (not single postings)",
            "✗ EXCLUDE: Pages with titles like 'Remote Jobs', 'Best Remote AI Jobs', 'Browse Jobs' (aggregators listing many jobs)",
            "✗ EXCLUDE: Generic listings without AI/ML/LLM focus",
            "",
            "REGION CLASSIFICATION:",
            "- 'worldwide': Open to all countries or multiple continents",
            "- 'europe': EU/UK-specific (Germany, France, UK, Netherlands, Spain, Italy, Belgium)",
            "- Prefer 'worldwide' if unclear or mentions multiple regions",
            "",
            "FRESHNESS VALIDATION:",
            "- Posted within {{max_hours_ago}} hours = high priority",
            "- Look for: 'Posted today', '24h ago', timestamps, dates",
            "- Downgrade confidence if posting date unclear or old",
            "",
            "QUALITY REQUIREMENTS:",
            "- Minimum confidence: {{min_confidence}} (0.0-1.0 scale)",
            "- Quality level: {{quality_level}} (strict = 0.7+, normal = 0.6+, lenient = 0.5+)",
            "- Evidence: Extract 2-8 direct quotes proving remote status and AI focus",
            "- Structured output: JSON with 'worldwide' and 'europe' arrays",
            "",
            "CONFIDENCE SCORING:",
            "0.9-1.0: Explicit 'fully remote' + AI role + fresh posting + company career page",
            "0.7-0.9: Clear remote indication + AI keywords + verifiable company",
            "0.6-0.7: Likely remote + AI-related + some uncertainty",
            "<0.6: Reject (insufficient evidence or hybrid/unclear)",
            "",
            "OUTPUT SCHEMA:",
            '{\n  "worldwide": [{ title, company, isFullyRemote, remoteRegion, sourceUrl, applyUrl?, postedHoursAgo?, postedAtIso?, locationText?, salaryText?, confidence, evidence }],\n  "europe": [{ same schema as worldwide }]\n}',
            "",
            "REQUIRED FIELDS:",
            "- isFullyRemote: true (boolean) - MUST be true for all extracted jobs",
            "- remoteRegion: 'worldwide' or 'europe' (string)",
            "- confidence: 0.0-1.0 (number)",
            "- evidence: array of 2-8 direct quotes",
            "- title, company: strings (required)",
            "- sourceUrl: COMPLETE, FULL URL (required) - NEVER truncate URLs, include entire URL string",
            "- applyUrl: COMPLETE, FULL URL (optional) - if provided, must be complete URL",
            "",
            "CRITICAL: URLs must be COMPLETE and UNTRUNCATED. Do NOT use '...' or abbreviate URLs.",
            "Example: https://jobs.ashbyhq.com/livekit/f152aa9f-981c-4661-99d3-6837654b9c8b (full URL)",
            "",
            "OPTIONAL FIELDS:",
            "- postedHoursAgo, postedAtIso, locationText, salaryText",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            "Extract remote AI/ML/LLM engineering jobs from these search results:",
            "",
            "{{search_results}}",
            "",
            "Apply strict filtering: fully-remote only, confidence ≥ {{min_confidence}}, posted within {{max_hours_ago}}h preferred.",
            "Quality level: {{quality_level}}",
          ].join("\n"),
        },
      ],
      labels: ["production", "latest"], // Promoted to production after optimization
      config: {
        description:
          "Optimized chat-based job extractor with multi-stage filtering, evidence validation, and confidence scoring",
        model: "deepseek-chat",
        temperature: 0.1,
        max_tokens: 8000,
        response_format: { type: "json_object" },
        variables: [
          "search_results",
          "max_hours_ago",
          "min_confidence",
          "quality_level",
        ],
        tags: ["extraction", "chat", "deepseek", "optimized", "v2"],
      },
      tags: ["promptfoo", "chat", "extraction", "production"],
    });

    console.log("   ✅ Created/updated prompt: remote-ai-jobs-extractor");
    console.log(`   📦 Version: ${(chatPrompt as any).version || "latest"}`);
    console.log(
      `   🏷️  Labels: ${(chatPrompt as any).labels?.join(", ") || "staging"}`,
    );

    // ========================================================================
    // Usage examples
    // ========================================================================
    console.log("\n📚 Usage in Promptfoo config:");
    console.log("\n  # Text prompt (by label - recommended)");
    console.log("  prompts:");
    console.log('    - "langfuse://remote-ai-jobs-eval@production"');
    console.log("\n  # Chat prompt (by label)");
    console.log("  prompts:");
    console.log('    - "langfuse://remote-ai-jobs-extractor@staging:chat"');
    console.log("\n  # By version (numeric)");
    console.log("  prompts:");
    console.log(
      `    - "langfuse://remote-ai-jobs-eval:${(textPrompt as any).version || "1"}"`,
    );
    console.log(
      `    - "langfuse://remote-ai-jobs-extractor:${(chatPrompt as any).version || "1"}:chat"`,
    );

    console.log("\n  # Variable substitution in tests");
    console.log("  tests:");
    console.log("    - vars:");
    console.log('        search_results: "..."');
    console.log("        max_hours_ago: 24");
    console.log("        min_confidence: 0.6");
    console.log('        quality_level: "strict"');

    // ========================================================================
    // Label management tips
    // ========================================================================
    console.log("\n🏷️  Label-based deployment workflow:");
    console.log("   1. Create prompts with 'staging' label");
    console.log("   2. Test in Promptfoo with @staging");
    console.log(
      "   3. Promote to 'production' in Langfuse UI (no code changes!)",
    );
    console.log("   4. A/B test with experiment-a, experiment-b labels");
    console.log("   5. Roll back by changing label assignment in Langfuse");

    console.log("\n✅ Langfuse prompts setup complete!");
    console.log(
      "   View/manage prompts: https://cloud.langfuse.com (or your self-hosted URL)",
    );
  } catch (error) {
    console.error("\n❌ Error setting up Langfuse prompts:");
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      if (error.stack) {
        console.error(
          `   Stack: ${error.stack.split("\n").slice(0, 3).join("\n")}`,
        );
      }
    } else {
      console.error(`   ${String(error)}`);
    }
    process.exit(1);
  }
}

setupPrompts();
