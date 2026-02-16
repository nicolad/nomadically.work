#!/usr/bin/env tsx

/**
 * Enhance All Jobs Script
 *
 * Fetches and enhances all jobs from the database with additional data
 * from their respective ATS APIs (Greenhouse, Lever, Ashby, etc.)
 *
 * Usage:
 *   tsx scripts/enhance-all-jobs.ts
 */

import { config } from "dotenv";
import { db } from "../src/db";
import { jobs } from "../src/db/schema";
import { eq } from "drizzle-orm";
import {
  fetchGreenhouseJobPost,
  saveGreenhouseJobData,
} from "../src/ingestion/greenhouse";
import {
  fetchAshbyJobPostFromUrl,
  saveAshbyJobData,
} from "../src/ingestion/ashby";

// Load environment variables
config({ path: ".env.local" });

// ============================================================================
// Types
// ============================================================================

interface Stats {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  alreadyEnhanced: number;
  bySource: Record<
    string,
    {
      success: number;
      failed: number;
      skipped: number;
      alreadyEnhanced: number;
    }
  >;
}

// ============================================================================
// Enhancement Functions
// ============================================================================

/**
 * Enhance a single Ashby job
 */
async function enhanceAshbyJob(job: any): Promise<{
  success: boolean;
  error?: string;
  skipped?: boolean;
}> {
  try {
    console.log(`  📥 Fetching from Ashby API...`);
    const ashbyData = await fetchAshbyJobPostFromUrl(job.url, {
      includeCompensation: true,
    });

    console.log(`  💾 Saving to database...`);
    await saveAshbyJobData(db, job.id, ashbyData, job.company_key);

    console.log(`  ✅ Success`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    const is404 =
      errorMessage.includes("404") || errorMessage.includes("not found");

    const isMalformed = errorMessage.includes("Unsupported Ashby job URL");

    if (is404) {
      console.log(`  ⏭️  Skipped (job no longer exists) - marking as closed`);

      try {
        await db
          .update(jobs)
          .set({ status: "closed" })
          .where(eq(jobs.id, job.id));
        console.log(`  💾 Marked as closed in database`);
      } catch (dbError) {
        console.error(`  ⚠️  Failed to update status:`, dbError);
      }

      return { success: false, skipped: true, error: errorMessage };
    }

    if (isMalformed) {
      console.log(`  ⏭️  Skipped (malformed URL)`);
      return { success: false, skipped: true, error: errorMessage };
    }

    console.error(`  ❌ Failed: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Enhance a single Greenhouse job
 */
async function enhanceGreenhouseJob(job: any): Promise<{
  success: boolean;
  error?: string;
  skipped?: boolean;
}> {
  try {
    console.log(`  📥 Fetching from Greenhouse API...`);
    const greenhouseData = await fetchGreenhouseJobPost(job.url, {
      questions: true,
    });

    console.log(`  💾 Saving to database...`);
    await saveGreenhouseJobData(db, job.id, greenhouseData);

    console.log(`  ✅ Success`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check if job no longer exists (404)
    const is404 =
      errorMessage.includes("404") || errorMessage.includes("Job not found");

    // Check if URL is malformed (career page, not individual job)
    const isMalformed = errorMessage.includes(
      "Unsupported Greenhouse job URL path",
    );

    if (is404) {
      console.log(`  ⏭️  Skipped (job no longer exists) - marking as closed`);

      // Mark job as closed in database
      try {
        await db
          .update(jobs)
          .set({ status: "closed" })
          .where(eq(jobs.id, job.id));
        console.log(`  💾 Marked as closed in database`);
      } catch (dbError) {
        console.error(`  ⚠️  Failed to update status:`, dbError);
      }

      return { success: false, skipped: true, error: errorMessage };
    }

    if (isMalformed) {
      console.log(`  ⏭️  Skipped (malformed URL - career page, not job)`);
      return { success: false, skipped: true, error: errorMessage };
    }

    console.error(`  ❌ Failed: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Enhance a single job based on its source
 */
async function enhanceJob(job: any): Promise<{
  success: boolean;
  error?: string;
  skipped?: boolean;
}> {
  const source = job.source_kind.toLowerCase();

  switch (source) {
    case "greenhouse":
      return enhanceGreenhouseJob(job);

    case "ashby":
      return enhanceAshbyJob(job);

    case "lever":
    case "workday":
      console.log(`  ⏭️  Skipped (${source} not yet implemented)`);
      return { success: false, skipped: true, error: "Not implemented" };

    default:
      console.log(`  ⏭️  Skipped (unknown source: ${source})`);
      return { success: false, skipped: true, error: "Unknown source" };
  }
}

// ============================================================================
// Main Enhancement Logic
// ============================================================================

async function enhanceAllJobs() {
  console.log("🚀 Starting job enhancement...\n");

  // Fetch jobs from database
  console.log("📊 Fetching jobs from database...");
  const allJobs = await db.select().from(jobs);

  console.log(`Found ${allJobs.length} jobs to process\n`);

  if (allJobs.length === 0) {
    console.log("✅ No jobs to process");
    return;
  }

  // Initialize stats
  const stats: Stats = {
    total: allJobs.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    alreadyEnhanced: 0,
    bySource: {},
  };

  // Process each job
  for (let i = 0; i < allJobs.length; i++) {
    const job = allJobs[i];
    const source = job.source_kind.toLowerCase();

    // Initialize source stats if needed
    if (!stats.bySource[source]) {
      stats.bySource[source] = {
        success: 0,
        failed: 0,
        skipped: 0,
        alreadyEnhanced: 0,
      };
    }

    console.log(`\n[${i + 1}/${allJobs.length}] Processing job ${job.id}`);
    console.log(`  Source: ${source}`);
    console.log(`  Title: ${job.title}`);
    console.log(`  Company: ${job.company_key}`);
    console.log(`  URL: ${job.url}`);

    // Check if already enhanced (has ATS data from API)
    if (job.ats_data) {
      console.log(`  ✓ Already enhanced (has ATS data)`);
      stats.processed++;
      stats.alreadyEnhanced++;
      stats.bySource[source].alreadyEnhanced++;
      continue;
    }

    const result = await enhanceJob(job);

    stats.processed++;

    if (result.success) {
      stats.succeeded++;
      stats.bySource[source].success++;
    } else if (result.skipped) {
      stats.skipped++;
      stats.bySource[source].skipped++;
    } else {
      stats.failed++;
      stats.bySource[source].failed++;
    }

    // Add delay between requests (except for last job)
    if (i < allJobs.length - 1) {
      console.log(`  ⏳ Waiting 1000ms...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 ENHANCEMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total jobs:        ${stats.total}`);
  console.log(`Processed:         ${stats.processed}`);
  console.log(`✅ Succeeded:      ${stats.succeeded}`);
  console.log(`✓  Already done:   ${stats.alreadyEnhanced}`);
  console.log(`⏭️  Skipped:        ${stats.skipped}`);
  console.log(`❌ Failed:         ${stats.failed}`);

  console.log("\nBy Source:");
  for (const [source, sourceStats] of Object.entries(stats.bySource)) {
    console.log(`\n  ${source}:`);
    console.log(`    ✅ Success:  ${sourceStats.success}`);
    console.log(`    ✓  Already:  ${sourceStats.alreadyEnhanced}`);
    console.log(`    ⏭️  Skipped:  ${sourceStats.skipped}`);
    console.log(`    ❌ Failed:   ${sourceStats.failed}`);
  }

  console.log("\n" + "=".repeat(60));
}

// ============================================================================
// Run Script
// ============================================================================

enhanceAllJobs()
  .then(() => {
    console.log("\n👋 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Unhandled error:", error);
    process.exit(1);
  });
