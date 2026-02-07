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
import { createClient } from "@libsql/client";

// Load .env.local for environment variables
config({ path: ".env.local" });

// ============================================================================
// Configuration
// ============================================================================

interface Config {
  insertJobsUrl: string;
  nextBaseUrl: string;
  apiSecret?: string;
  tursoDbUrl: string;
  tursoAuthToken: string;
}

function getConfig(): Config {
  const insertJobsUrl = process.env.INSERT_JOBS_URL || "http://localhost:8787";
  const nextBaseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const apiSecret = process.env.API_SECRET;
  const tursoDbUrl = process.env.TURSO_DB_URL;
  const tursoAuthToken = process.env.TURSO_DB_AUTH_TOKEN;

  if (!tursoDbUrl || !tursoAuthToken) {
    throw new Error(
      "Missing required environment variables: TURSO_DB_URL and TURSO_DB_AUTH_TOKEN",
    );
  }

  return {
    insertJobsUrl,
    nextBaseUrl,
    apiSecret,
    tursoDbUrl,
    tursoAuthToken,
  };
}

// ============================================================================
// Types
// ============================================================================

// ============================================================================
// Database Operations
// ============================================================================

async function getJobStats(config: Config): Promise<JobStats> {
  const db = createClient({
    url: config.tursoDbUrl,
    authToken: config.tursoAuthToken,
  });

  try {
    // Total count
    const totalResult = await db.execute("SELECT COUNT(*) as count FROM jobs");
    const total = Number(totalResult.rows[0]?.count || 0);

    // By status
    const statusResult = await db.execute(`
      SELECT status, COUNT(*) as count 
      FROM jobs 
      GROUP BY status
    `);
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      const status = (row.status as string) || "null";
      byStatus[status] = Number(row.count || 0);
    }

    // By source kind
    const sourceResult = await db.execute(`
      SELECT source_kind, COUNT(*) as count 
      FROM jobs 
      GROUP BY source_kind
    `);
    const bySourceKin==========================================================
// API Operations
// ============================================================================

async function insertJobs(
  config: Config,
  jobs: JobInput[],
): Promise<IngestionResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.apiSecret) {
    headers["Authorization"] = `Bearer ${config.apiSecret}`;
  }

  try {
    const response = await fetch(config.insertJobsUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ jobs }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to insert jobs: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    return {
      success: result.success || false,
      inserted: result.inserted || 0,
      failed: result.failed || 0,
      errors: result.errors || [],
    };
  } catch (error) {
    console.error("Error inserting jobs:", error);
    throw error;
  }
}

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

    const result = await response.json();
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
// File Operations
// ============================================================================

async function loadJobsFromFile(filePath: string): Promise<JobInput[]> {
  const absolutePath = path.resolve(filePath);
  const content = await fs.readFile(absolutePath, "utf-8");

  const data = JSON.parse(content);

  // Support both array of jobs and object with jobs property
  const jobs = Array.isArray(data) ? data : data.jobs || [];

  return jobs;
}

// ============================================================================
// CLI Operations
// ============================================================================

function printStats(stats: JobStats) {
  console.log("\n📊 Job Database Statistics");
  console.log("═".repeat(50));
  console.log(`Total Jobs: ${stats.total}`);
  console.log(`Added in last 24h: ${stats.recent}`);

  console.log("\nBy Status:");
  for (const [status, count] of Object.entries(stats.byStatus)) {
    const emoji🔍 Validating jobs...");
  const validJobs = jobs.filter((job) => {
    if (!job.title || !job.companyKey || !job.url || !job.externalId) {
      console.warn(
        `⚠️  Skipping invalid job: ${job.title || "unknown"} - missing required fields`,
      );
      return false;
    }
    return true;
  });
  console.log(`✅ ${validJobs.length} valid jobs\n`);

  if (validJobs.length === 0) {
    console.log("❌ No valid jobs to insert");
    return;
  }

  // Insert jobs
  console.log("📥 Inserting jobs into database...");
  const result = await insertJobs(config, validJobs);

  console.log("\n📊 Ingestion Results:");
  console.log(`  ✅ Inserted: ${result.inserted}`);
  console.log(`  ❌ Failed: ${result.failed}`);

  if (result.errors.length > 0) {
    console.log("\n⚠️  Errors:");
    for (const error of result.errors.slice(0, 5)) {
      console.log(`  - ${error.job.title || "unknown"}: ${error.error}`);
    }
    if (result.errors.length > 5) {
      console.log(`  ... and ${result.errors.length - 5} more errors`);
    }
  }

  // Show updated stats
  console.log("\n");
  const stats = await getJobStats(config);
  printStats(stats);

  console.log("\n✅ Ingestion complete!");
  console.log(
    "\n💡 Next steps:\n" +
      "   • Jobs are now queued for processing\n" +
      "   • Classification will run automatically\n" +
      "   • Use --extract-skills to manually trigger skill extraction\n",
  );
}

async function checkStatus() {
  console.log("📊 Checking Job Pipeline Status\n");

  const config = getConfig();
  const stats = await getJobStats(config);

  printStats(stats);

  // Show some recent jobs
  console.log("\n📋 Recent Jobs (last 10):");
  const db = createClient({
    url: config.tursoDbUrl,
    authToken: config.tursoAuthToken,
  });

  try {
    const result = await db.execute(`
      SELECT id, title, company_key, status, created_at
      FROM jobs
      ORDER BY created_at DESC
      LIMIT 10
    `);

    for (const row of result.rows) {
   Skill Extraction Operations
// ============================================================================   if (args.includes("--check-status")) {
      await checkStatus();
      return;
    }

    if (args.includes("--extract-skills")) {
      const jobIdsIndex = args.indexOf("--jobIds");
      const statusIndex = args.indexOf("--status");
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
      } else if (statusIndex !== -1) {
        // Extract for jobs with specific status
        const status = args[statusIndex + 1];
        await extractSkillsForStatus(status, limit);
      } else {
        // Extract for jobs in database
        await extractSkillsFromDatabase(limit);
      }
      return;
    }

    if (args.includes("--file")) {
      const fileIndex = args.indexOf("--file");
      const filePath = args[fileIndex + 1];

      if (!filePath) {
        console.error("❌ --file requires a path argument");
        process.exit(1);
      }

      await runIngestion(filePath);
      return;
    }

    console.error("❌ Unknown command");
    printUsage();
    process.exit(1);
  } catch (error) {
    console.error("\n❌ Fatal Error:", error);
    process.exit(1);
  }
}

main();
ole.log(`  📄 [${job.id}] ${job.title} - ${job.company_key}`);
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

Environment Variables:
  TURSO_DB_URL              Turso database URL (required)
  TURSO_DB_AUTH_TOKEN       Turso auth token (required)
  NEXT_PUBLIC_URL           Next.js base URL (default: http://localhost:3000)
  OPENAI_API_KEY            OpenAI API key (required for embeddingsextract-skills")) {
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

    console.error("❌ Unknown command. Use --extract-skills or --help