#!/usr/bin/env tsx

/**
 * Enhance Jobs Script
 *
 * Triggers the scheduled Trigger.dev task to find and enhance
 * all un-enhanced jobs across ATS sources (Greenhouse, Lever, Ashby).
 *
 * Usage:
 *   tsx scripts/enhance-greenhouse-jobs.ts
 *   tsx scripts/enhance-greenhouse-jobs.ts --job 123 --source greenhouse --url "https://..." --company grafanalabs
 */

import { config } from "dotenv";
import { tasks } from "@trigger.dev/sdk/v3";
import type { enhanceJobTask } from "../src/trigger/enhance-job";
import type { enhanceJobsScheduled } from "../src/trigger/enhance-greenhouse";

// Load .env.local for environment variables
config({ path: ".env.local" });

async function main() {
  if (!process.env.TRIGGER_SECRET_KEY) {
    throw new Error(
      "TRIGGER_SECRET_KEY is not set. Please set it in your .env.local file.",
    );
  }

  const args = process.argv.slice(2);
  const jobIdIdx = args.indexOf("--job");

  // Single job mode: --job <id> --source <source> --url <url> --company <company>
  if (jobIdIdx !== -1) {
    const jobId = Number(args[jobIdIdx + 1]);
    const sourceIdx = args.indexOf("--source");
    const urlIdx = args.indexOf("--url");
    const companyIdx = args.indexOf("--company");

    if (!jobId || sourceIdx === -1 || urlIdx === -1 || companyIdx === -1) {
      console.error("Usage: --job <id> --source <source> --url <url> --company <key>");
      process.exit(1);
    }

    console.log(`Triggering single job enhancement for job ${jobId}...`);

    const handle = await tasks.trigger<typeof enhanceJobTask>("enhance-job", {
      jobId,
      source: args[sourceIdx + 1],
      url: args[urlIdx + 1],
      companyKey: args[companyIdx + 1],
    });

    console.log(`Task triggered: ${handle.id}`);
    return;
  }

  // Batch mode: trigger the scheduled scan
  console.log("Triggering scheduled job enhancement scan...");

  const handle = await tasks.trigger<typeof enhanceJobsScheduled>(
    "enhance-jobs-scheduled",
  );

  console.log(`Task triggered: ${handle.id}`);
  console.log(
    `View: https://cloud.trigger.dev/projects/${process.env.TRIGGER_PROJECT_ID || "your-project"}/runs/${handle.id}`,
  );
}

main()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
