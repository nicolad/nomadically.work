// src/promptfoo/setup-langfuse-prompt.ts
// Script to create/update Langfuse prompts for Promptfoo evaluations
import "dotenv/config";
import { Langfuse } from "langfuse";

const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com",
});

async function setupPrompts() {
  console.log("Setting up Langfuse prompts for Promptfoo evaluations...");

  try {
    // Create/update the remote jobs evaluation prompt
    const prompt = await langfuse.createPrompt({
      name: "remote-ai-jobs-eval",
      type: "text",
      prompt: "RUN_REMOTE_JOBS_PIPELINE",
      labels: ["production"],
      config: {
        description:
          "Remote AI jobs pipeline evaluation - discovers and filters fully-remote AI/LLM/GenAI engineering jobs",
        workflow: "direct-deepseek-client",
        assertions: [
          "is-json",
          "twoBucketsOnly",
          "strictInvariants",
          "excludesBadUrls",
        ],
      },
    });

    console.log("✅ Created/updated prompt: remote-ai-jobs-eval");
    console.log(`   Version: ${(prompt as any).version || "latest"}`);
    console.log(
      `   Labels: ${(prompt as any).labels?.join(", ") || "production"}`,
    );
    console.log("\nTo use in Promptfoo config:");
    console.log("  prompts:");
    console.log('    - "langfuse://remote-ai-jobs-eval@production"');
    console.log("    # or by version:");
    console.log(
      `    # - "langfuse://remote-ai-jobs-eval:${(prompt as any).version || "1"}"`,
    );

    // Flush to ensure data is sent
    await langfuse.flushAsync();
    console.log("\n✅ Langfuse prompts setup complete!");
  } catch (error) {
    console.error("❌ Error setting up Langfuse prompts:", error);
    process.exit(1);
  }
}

setupPrompts();
