#!/usr/bin/env tsx

/**
 * Enhance Greenhouse Jobs Script
 *
 * Triggers a Trigger.dev task to enhance all Greenhouse jobs
 * from the database with additional data from the Greenhouse Job Board API.
 *
 * Usage:
 *   tsx scripts/enhance-greenhouse-jobs.ts
 */

import { config } from "dotenv";
import { tasks } from "@trigger.dev/sdk/v3";
import type { enhanceGreenhouseJobsTask } from "../src/trigger/enhance-greenhouse";

// Load .env.local for environment variables
config({ path: ".env.local" });

// ============================================================================
// Main Enhancement Logic
// ============================================================================

async function triggerEnhancement() {
  console.log("🚀 Triggering Greenhouse job enhancement task...\n");

  try {
    // Check if TRIGGER_SECRET_KEY is set
    if (!process.env.TRIGGER_SECRET_KEY) {
      throw new Error(
        "❌ TRIGGER_SECRET_KEY is not set. Please set it in your .env.local file.",
      );
    }

    console.log("📤 Triggering task via Trigger.dev...");

    // Trigger the task
    const handle = await tasks.trigger<typeof enhanceGreenhouseJobsTask>(
      "enhance-greenhouse-jobs",
    );

    console.log("✅ Task triggered successfully!");
    console.log(`📋 Task ID: ${handle.id}`);
    console.log(
      `🔗 View task: https://cloud.trigger.dev/projects/${process.env.TRIGGER_PROJECT_ID || "your-project"}/runs/${handle.id}`,
    );
    console.log(
      "\n💡 Tip: Run 'pnpm run trigger:dev' to view task logs in real-time",
    );
  } catch (error) {
    console.error(
      "❌ Fatal error:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

// ============================================================================
// Run Script
// ============================================================================

triggerEnhancement()
  .then(() => {
    console.log("\n👋 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Unhandled error:", error);
    process.exit(1);
  });
