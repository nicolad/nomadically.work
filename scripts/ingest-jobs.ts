#!/usr/bin/env tsx

/**
 * Job Skill Extraction Script
 *
 * This script extracts skills from job descriptions using AI.
 *
 * Usage:
 *   tsx scripts/ingest-jobs.ts --extract-skills
 *   tsx scripts/ingest-jobs.ts --extract-skills --jobIds 1,2,3
 *   tsx scripts/ingest-jobs.ts --extract-skills --limit 50
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/d1";
import { createD1HttpClient } from "../src/db/d1-http";
import { jobs } from "../src/db/schema";
import { isNotNull, desc, sql } from "drizzle-orm";

// Load .env.local for environment variables
config({ path: ".env.local" });

// ============================================================================
// Configuration
// ============================================================================

interface Config {
  nextBaseUrl: string;
}

function getConfig(): Config {
  const nextBaseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  return {
    nextBaseUrl,
  };
}

// ============================================================================
// Database Operations
// ============================================================================

async function getJobsNeedingSkillExtraction(
  _config: Config,
  limit: number = 100,
): Promise<any[]> {
  const db = drizzle(createD1HttpClient() as any);
  const result = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      company_key: jobs.company_key,
      status: jobs.status,
      description: jobs.description,
      created_at: jobs.created_at,
      updated_at: jobs.updated_at,
    })
    .from(jobs)
    .where(isNotNull(jobs.description))
    .orderBy(desc(jobs.created_at))
    .limit(limit);

  return result.filter((r) => r.description && r.description !== "");
}

// ============================================================================
// API Operations
// ============================================================================

async function extractSkillsForJob(
  config: Config,
  jobId: number,
): Promise<{ success: boolean; skillsExtracted: number }> {
  try {
    const response = await fetch(
      `${config.nextBaseUrl}/api/jobs/extract-skills`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to extract skills: ${response.status} ${errorText}`,
      );
    }

    const result = (await response.json()) as {
      success?: boolean;
      skillsExtracted?: number;
    };
    return {
      success: result.success || false,
      skillsExtracted: result.skillsExtracted || 0,
    };
  } catch (error) {
    console.error(`Error extracting skills for job ${jobId}:`, error);
    return { success: false, skillsExtracted: 0 };
  }
}

// ============================================================================
// Skill Extraction Operations
// ============================================================================

async function extractSkills(jobIds: number[]) {
  console.log(`🔍 Extracting skills for ${jobIds.length} jobs\n`);

  const config = getConfig();
  let successCount = 0;
  let failCount = 0;
  let totalSkills = 0;

  for (const jobId of jobIds) {
    process.stdout.write(`  Processing job ${jobId}... `);

    const result = await extractSkillsForJob(config, jobId);

    if (result.success) {
      successCount++;
      totalSkills += result.skillsExtracted;
      console.log(`✅ (${result.skillsExtracted} skills)`);
    } else {
      failCount++;
      console.log("❌ Failed");
    }
  }

  console.log("\n📊 Extraction Summary:");
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  🏷️  Total Skills Extracted: ${totalSkills}`);
}

async function extractSkillsFromDatabase(limit: number = 100) {
  const config = getConfig();

  console.log("🔍 Fetching jobs from database...\n");

  const jobs = await getJobsNeedingSkillExtraction(config, limit);

  if (jobs.length === 0) {
    console.log("❌ No jobs with descriptions found in database");
    return;
  }

  console.log(
    `Found ${jobs.length} job${jobs.length === 1 ? "" : "s"} with descriptions\n`,
  );

  // Show preview of jobs to be processed
  console.log("Jobs to process:");
  for (const job of jobs.slice(0, 5)) {
    console.log(`  📄 [${job.id}] ${job.title} - ${job.company_key}`);
  }
  if (jobs.length > 5) {
    console.log(`  ... and ${jobs.length - 5} more`);
  }
  console.log("");

  const jobIds = jobs.map((job) => Number(job.id));
  await extractSkills(jobIds);
}

function printUsage() {
  console.log(`
Job Skill Extraction Script

Usage:
  tsx scripts/ingest-jobs.ts --extract-skills [options]

Options:
  --extract-skills                 Extract skills for jobs in database
  --jobIds <ids>                   Extract skills for specific job IDs (comma-separated)
  --limit <n>                      Limit number of jobs for extraction (default: 100)
  --help                           Show this help message

Examples:
  # Extract skills for jobs with descriptions (limit 100)
  tsx scripts/ingest-jobs.ts --extract-skills

  # Extract skills for specific jobs
  tsx scripts/ingest-jobs.ts --extract-skills --jobIds 1,2,3

  # Extract skills for limited number of jobs
  tsx scripts/ingest-jobs.ts --extract-skills --limit 50

Environment Variables (choose one D1 access mode):
  Gateway mode (recommended):
    D1_GATEWAY_URL            D1 gateway worker URL
    D1_GATEWAY_KEY            D1 gateway API key
  Direct API mode:
    CLOUDFLARE_ACCOUNT_ID     Cloudflare account ID
    CLOUDFLARE_D1_DATABASE_ID D1 database ID
    CLOUDFLARE_API_TOKEN      Cloudflare API token
  Other:
    NEXT_PUBLIC_URL           Next.js base URL (default: http://localhost:3000)
    OPENAI_API_KEY            OpenAI API key (required for embeddings)
`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  try {
    if (args.length === 0 || args.includes("--help")) {
      printUsage();
      return;
    }

    if (args.includes("--extract-skills")) {
      const jobIdsIndex = args.indexOf("--jobIds");
      const limitIndex = args.indexOf("--limit");

      const limit =
        limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : 100;

      if (jobIdsIndex !== -1) {
        // Extract for specific job IDs
        const jobIdsStr = args[jobIdsIndex + 1];
        const jobIds = jobIdsStr
          .split(",")
          .map((id) => parseInt(id.trim(), 10));
        await extractSkills(jobIds);
      } else {
        // Extract for jobs in database
        await extractSkillsFromDatabase(limit);
      }
      return;
    }

    console.error("❌ Unknown command. Use --extract-skills or --help");
    printUsage();
    process.exit(1);
  } catch (error) {
    console.error("\n❌ Fatal Error:", error);
    process.exit(1);
  }
}

main();
