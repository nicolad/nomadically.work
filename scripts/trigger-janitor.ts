#!/usr/bin/env tsx

/**
 * Manually trigger Cloudflare Workers Janitor for ATS job ingestion
 * Triggers ingestion from known ATS sources (Greenhouse, Lever, Ashby) stored in D1
 */

import { execSync } from "child_process";

async function triggerJanitor() {
  console.log("🚀 Triggering Cloudflare Workers Janitor...\n");

  try {
    // Step 1: Deploy the latest version
    console.log("📦 Deploying latest janitor worker...");
    execSync("npx wrangler deploy workers/janitor.ts", {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    console.log("\n⏰ Triggering scheduled event...");

    // Step 2: Trigger the scheduled event directly
    // Use wrangler's --test-scheduled to trigger the cron manually
    execSync(`npx wrangler dev workers/janitor.ts --test-scheduled --remote`, {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    console.log("\n✅ Cron trigger completed successfully!");
    console.log("   Check your D1 database for new job sources");
  } catch (error: any) {
    console.error("\n❌ Failed to trigger cron:", error.message);
    process.exit(1);
  }
}

// Run the script
triggerJanitor();
