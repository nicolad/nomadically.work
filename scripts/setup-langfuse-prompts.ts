// src/promptfoo/setup-langfuse-prompt.ts
// Script to create/update Langfuse prompts for Promptfoo evaluations
// Based on Langfuse ↔ Promptfoo integration best practices
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
    // TEXT PROMPT: Simple pipeline trigger
    // ========================================================================
    console.log("📝 Creating text prompt: remote-ai-jobs-eval");
    const textPrompt = await langfuse.prompt.create({
      name: "remote-ai-jobs-eval",
      type: "text",
      prompt: "RUN_REMOTE_JOBS_PIPELINE",
      labels: ["production", "latest"], // Multiple labels supported
      config: {
        description:
          "Remote AI jobs pipeline evaluation - discovers and filters fully-remote AI/LLM/GenAI engineering jobs",
        workflow: "direct-deepseek-client",
        model: "deepseek-chat",
        temperature: 0.1,
        assertions: [
          "is-json",
          "twoBucketsOnly",
          "strictInvariants",
          "excludesBadUrls",
        ],
        tags: ["evaluation", "remote-jobs", "deepseek"],
      },
      tags: ["promptfoo", "evaluation", "remote-jobs"],
    });

    console.log("   ✅ Created/updated prompt: remote-ai-jobs-eval");
    console.log(`   📦 Version: ${(textPrompt as any).version || "latest"}`);
    console.log(
      `   🏷️  Labels: ${(textPrompt as any).labels?.join(", ") || "production"}`,
    );

    // ========================================================================
    // CHAT PROMPT: Job extraction with system instructions
    // ========================================================================
    console.log("\n💬 Creating chat prompt: remote-ai-jobs-extractor");
    const chatPrompt = await langfuse.prompt.create({
      name: "remote-ai-jobs-extractor",
      type: "chat",
      prompt: [
        {
          role: "system",
          content: [
            "You are a job extraction AI that analyzes web search results for remote AI/ML/LLM engineering positions.",
            "",
            "RULES:",
            "- Extract only fully-remote positions (not hybrid/onsite)",
            "- Classify region: worldwide, europe, or unknown",
            "- Verify freshness: prefer jobs posted within {{max_hours_ago}} hours",
            "- Output structured JSON with confidence scores",
            "",
            "QUALITY:",
            "- Confidence: {{min_confidence}} minimum (0-1 scale)",
            "- Critical level: {{quality_level}}",
            "- Evidence: Include 1-8 supporting quotes per job",
          ].join("\n"),
        },
        {
          role: "user",
          content:
            "Extract remote AI jobs from these search results:\n\n{{search_results}}",
        },
      ],
      labels: ["staging"], // Start in staging, promote to production after testing
      config: {
        description:
          "Chat-based job extractor with system instructions and variable substitution",
        model: "deepseek-chat",
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        variables: [
          "search_results",
          "max_hours_ago",
          "min_confidence",
          "quality_level",
        ],
        tags: ["extraction", "chat", "deepseek"],
      },
      tags: ["promptfoo", "chat", "extraction"],
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
