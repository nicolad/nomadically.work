#!/usr/bin/env tsx

/**
 * Job Skills Extraction - Bulk Processing
 *
 * Extracts skills from job descriptions using vector-based taxonomy matching
 * and LLM-powered structured extraction.
 *
 * Features:
 * - Vector similarity search for relevant skill candidates
 * - LLM extraction with structured output validation
 * - Automatic persistence to job_skill_tags table
 * - Progress tracking and error handling
 *
 * Usage:
 *   pnpm skills:extract
 *
 * Environment variables (loaded from .env.local via config/env):
 * - TURSO_DB_URL
 * - TURSO_DB_AUTH_TOKEN
 * - DEEPSEEK_API_KEY
 * - CLOUDFLARE_ACCOUNT_ID
 * - CLOUDFLARE_WORKERS_AI_KEY
 */

import { db } from "../src/db";
import { jobs, jobSkillTags } from "../src/db/schema";
import { sql } from "drizzle-orm";
import { mastra } from "../src/mastra";
import { LibSQLVector } from "@mastra/libsql";
import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_WORKERS_AI_KEY,
  TURSO_DB_URL,
  TURSO_DB_AUTH_TOKEN,
} from "../src/config/env";
import * as fs from "fs";
import * as path from "path";
import * as util from "util";

// ============================================================================
// Logging Setup - Write to both console and file
// ============================================================================

const LOG_DIR = path.join(__dirname);
const LOG_FILE = path.join(
  LOG_DIR,
  `extract-job-skills-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)}.log`,
);

let logStream: fs.WriteStream | null = null;

// Capture original console methods once, then tee output to file.
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
};

function safeFormat(parts: any[]): string {
  try {
    return util.format(...parts);
  } catch {
    return parts.map((p) => String(p)).join(" ");
  }
}

const logger = {
  log: (...parts: any[]) => {
    originalConsole.log(...parts);
    if (logStream) logStream.write(safeFormat(parts) + "\n");
  },
  error: (...parts: any[]) => {
    originalConsole.error(...parts);
    if (logStream) logStream.write(`[ERROR] ${safeFormat(parts)}\n`);
  },
  warn: (...parts: any[]) => {
    originalConsole.warn(...parts);
    if (logStream) logStream.write(`[WARN] ${safeFormat(parts)}\n`);
  },
};

function initializeLogging() {
  logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });

  // Tee ALL console output into the log file without changing existing calls.
  console.log = logger.log;
  console.error = logger.error;
  console.warn = logger.warn;

  console.log(`📝 Log file: ${LOG_FILE}\n`);
}

function shutdownLogging() {
  // Restore console first (avoid any write attempts during shutdown going to a closed stream)
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;

  if (logStream) {
    logStream.end();
    logStream = null;
  }
}

// ============================================================================
// Vector Store Configuration & Utilities (inlined from src/lib/skills/vector.ts)
// ============================================================================

const SKILLS_VECTOR_STORE_NAME = "skills";
const SKILLS_VECTOR_INDEX = "skills_taxonomy";

type EmbeddingVector = number[];

// Lazy initialization to avoid build-time errors
let _skillsVector: LibSQLVector | null = null;

// Graceful shutdown flag
let shouldStop = false;
function installSignalHandlers() {
  const handler = (signal: NodeJS.Signals) => {
    if (shouldStop) return;
    shouldStop = true;
    console.warn(
      `\n⚠️  Received ${signal}. Finishing current job then stopping...`,
    );
  };

  process.once("SIGINT", handler);
  process.once("SIGTERM", handler);
}

const getSkillsVector = (): LibSQLVector => {
  if (!_skillsVector) {
    _skillsVector = new LibSQLVector({
      id: "skills-vector",
      url: TURSO_DB_URL,
      authToken: TURSO_DB_AUTH_TOKEN,
    });
  }
  return _skillsVector;
};

/**
 * Embeds text using Cloudflare Workers AI:
 *   cloudflare-workers-ai/@cf/baai/bge-small-en-v1.5
 *
 * Notes:
 * - The underlying model outputs 384-dim vectors and has a 512 token input limit. (Chunk long inputs.)
 */
async function embedWithCloudflareBgeSmall(
  values: string[],
): Promise<EmbeddingVector[]> {
  if (!Array.isArray(values) || values.some((v) => typeof v !== "string")) {
    throw new TypeError("values must be an array of strings");
  }

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_WORKERS_AI_KEY) {
    throw new Error(
      "Missing Cloudflare credentials. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_WORKERS_AI_KEY in your .env file",
    );
  }

  // Call Cloudflare Workers AI API directly to avoid AI SDK compatibility issues
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/baai/bge-small-en-v1.5`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_WORKERS_AI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: values }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  // Cloudflare returns { result: { shape: [n, 384], data: [[...], [...]] } }
  if (!result.success || !result.result?.data) {
    throw new Error(
      `Unexpected Cloudflare API response: ${JSON.stringify(result)}`,
    );
  }

  return result.result.data as number[][];
}

async function ensureSkillsVectorIndex(): Promise<void> {
  // dimension must match your embedding model output
  // @cf/baai/bge-small-en-v1.5 outputs 384 dimensions
  const vector = getSkillsVector();
  await vector.createIndex({
    indexName: SKILLS_VECTOR_INDEX,
    dimension: 384,
  });
}

/**
 * Verify the skills taxonomy index is populated with vectors
 * This catches the most common cause of "0 candidate skills" errors
 */
async function assertSkillsIndexPopulated(): Promise<void> {
  const vector = getSkillsVector();

  const indexes = await vector.listIndexes();
  console.log(`   Available indexes: ${indexes.join(", ")}`);

  if (!indexes.includes(SKILLS_VECTOR_INDEX)) {
    throw new Error(
      `❌ Vector index "${SKILLS_VECTOR_INDEX}" not found.\n` +
        `   Your query tool may be pointing at a different DB or indexName.\n` +
        `   Found indexes: ${indexes.join(", ")}`,
    );
  }

  const stats = await vector.describeIndex({ indexName: SKILLS_VECTOR_INDEX });
  console.log(
    `   Index: ${SKILLS_VECTOR_INDEX} (${stats.count} vectors, ${stats.dimension} dims)`,
  );

  if (stats.dimension !== 384) {
    throw new Error(
      `❌ Index "${SKILLS_VECTOR_INDEX}" has dimension=${stats.dimension}, expected 384.\n` +
        `   Your embedding model (@cf/baai/bge-small-en-v1.5) outputs 384-dim vectors.\n` +
        `   Recreate the index with the correct dimension.`,
    );
  }

  if (stats.count === 0) {
    throw new Error(
      `❌ Index "${SKILLS_VECTOR_INDEX}" exists but contains 0 vectors!\n\n` +
        `   This is why all queries return empty results.\n\n` +
        `   TO FIX:\n` +
        `   1. Run: pnpm skills:seed\n` +
        `   2. Ensure your Cloudflare API token has Workers AI permissions\n` +
        `   3. Verify the seed script completes successfully\n`,
    );
  }
}

// ============================================================================

interface ExtractionResult {
  jobId: number;
  title: string;
  skillsCount: number;
  processingTimeMs: number;
  success: boolean;
  error?: string;
}

interface Stats {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  totalSkills: number;
  totalProcessingMs: number;
}

/**
 * Check if a job already has skills extracted.
 * Prevents wasted extraction if tags were added after the initial query
 * (e.g., another process ran in parallel, or you restarted mid-run).
 */
async function jobAlreadyHasSkills(jobId: number): Promise<boolean> {
  const rows = await db
    .select({ one: sql<number>`1` })
    .from(jobSkillTags)
    .where(sql`${jobSkillTags.job_id} = ${jobId}`)
    .limit(1);

  return rows.length > 0;
}

/**
 * Extract skills for a single job
 */
async function extractSkillsForJob(job: {
  id: number;
  title: string;
  description: string | null;
}): Promise<ExtractionResult> {
  const startTime = Date.now();

  try {
    if (!job.description) {
      return {
        jobId: job.id,
        title: job.title,
        skillsCount: 0,
        processingTimeMs: Date.now() - startTime,
        success: false,
        error: "No description available",
      };
    }

    console.log(`  Processing: ${job.title} (ID: ${job.id})`);

    // Get the workflow from Mastra
    const workflow = mastra.getWorkflow("extractJobSkillsWorkflow");

    // Create and execute the workflow run
    const run = await workflow.createRun();
    const result = await run.start({
      inputData: {
        jobId: job.id,
        title: job.title,
        description: job.description,
      },
    });

    const processingTime = Date.now() - startTime;

    if (result.status !== "success" || !result.result?.ok) {
      // 🔍 Enhanced debugging: log full workflow result with step details
      console.error(
        "  ❌ Workflow failed. Full result:" +
          JSON.stringify(
            {
              status: result.status,
              input: (result as any).input,
              steps: (result as any).steps, // shows which step failed + its input/output
              error: (result as any).error,
            },
            null,
            2,
          ),
      );

      const details =
        (result as any)?.error ??
        (result as any)?.result ??
        `status=${result.status}`;
      throw new Error(
        `Workflow execution failed: ${typeof details === "string" ? details : JSON.stringify(details)}`,
      );
    }

    console.log(
      `  ✅ Extracted ${result.result.count} skills in ${processingTime}ms`,
    );

    return {
      jobId: job.id,
      title: job.title,
      skillsCount: result.result.count,
      processingTimeMs: processingTime,
      success: true,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`  ❌ Failed to extract skills: ${errorMessage}`);

    return {
      jobId: job.id,
      title: job.title,
      skillsCount: 0,
      processingTimeMs: processingTime,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get jobs that need skill extraction
 */
async function getJobsToProcess(): Promise<
  Array<{ id: number; title: string; description: string | null }>
> {
  // Get jobs without skills - only process jobs that have descriptions
  const query = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      description: jobs.description,
    })
    .from(jobs)
    .where(
      sql`${jobs.description} IS NOT NULL 
          AND ${jobs.description} != '' 
          AND ${jobs.id} NOT IN (SELECT DISTINCT job_id FROM job_skill_tags)`,
    )
    .orderBy(sql`${jobs.created_at} DESC`);

  return query;
}

/**
 * Main execution
 */
async function main() {
  installSignalHandlers();
  initializeLogging();

  try {
    console.log("🔧 Job Skills Extraction");
    console.log("========================\n");

    // Ensure vector index exists and is populated
    console.log("📊 Verifying skills vector index...");
    try {
      await ensureSkillsVectorIndex();
      await assertSkillsIndexPopulated();
      console.log("✅ Vector index ready\n");
    } catch (error) {
      console.error("\n❌ Vector index check failed:");
      console.error(error instanceof Error ? error.message : error);
      console.error("\nCannot proceed without a populated skills taxonomy.\n");
      process.exitCode = 1;
      return;
    }

    // Get jobs to process
    console.log("🔍 Finding jobs without skills...");
    const jobsToProcess = await getJobsToProcess();

    if (jobsToProcess.length === 0) {
      console.log(
        "✨ No jobs to process - all jobs already have skills extracted!\n",
      );
      return;
    }

    console.log(`Found ${jobsToProcess.length} jobs to process\n`);

    // Initialize stats
    const stats: Stats = {
      total: jobsToProcess.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      totalSkills: 0,
      totalProcessingMs: 0,
    };

    const results: ExtractionResult[] = [];

    // Process jobs sequentially (to avoid rate limits)
    for (let i = 0; i < jobsToProcess.length; i++) {
      if (shouldStop) break;

      const job = jobsToProcess[i];
      console.log(`\n[${i + 1}/${jobsToProcess.length}]`);

      // Guard against duplicate work (reruns or parallel runs)
      if (await jobAlreadyHasSkills(job.id)) {
        console.log("  ⏭️  Skipping (skills already exist in DB)");
        const skipped: ExtractionResult = {
          jobId: job.id,
          title: job.title,
          skillsCount: 0,
          processingTimeMs: 0,
          success: false,
          error: "Already processed",
        };
        results.push(skipped);
        stats.processed++;
        stats.skipped++;
        continue;
      }

      const result = await extractSkillsForJob(job);
      results.push(result);

      stats.processed++;
      if (result.success) {
        stats.succeeded++;
        stats.totalSkills += result.skillsCount;
      } else {
        if (
          result.error === "No description available" ||
          result.error === "Already processed"
        ) {
          stats.skipped++;
        } else {
          stats.failed++;
        }
      }
      stats.totalProcessingMs += result.processingTimeMs;

      // Add a small delay between jobs to avoid rate limits
      if (i < jobsToProcess.length - 1 && !shouldStop) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Print summary
    console.log("\n\n📊 Extraction Summary");
    console.log("====================");
    console.log(`Total jobs:          ${stats.total}`);
    console.log(`Processed:           ${stats.processed}`);
    console.log(`✅ Succeeded:        ${stats.succeeded}`);
    console.log(`❌ Failed:           ${stats.failed}`);
    console.log(`⏭️  Skipped:          ${stats.skipped}`);
    console.log(`📋 Total skills:     ${stats.totalSkills}`);
    console.log(
      `⏱️  Avg time/job:     ${stats.processed > 0 ? (stats.totalProcessingMs / stats.processed).toFixed(0) : "0"}ms`,
    );
    console.log(
      `⏱️  Total time:       ${(stats.totalProcessingMs / 1000).toFixed(1)}s`,
    );

    if (stats.succeeded > 0) {
      console.log(
        `📈 Avg skills/job:   ${(stats.totalSkills / stats.succeeded).toFixed(1)}`,
      );
    }

    // Show skill statistics from the database
    if (stats.succeeded > 0 && stats.totalSkills > 0) {
      console.log("\n\n📊 Skill Statistics");
      console.log("===================");

      try {
        const successfulJobIds = results
          .filter((r) => r.success)
          .map((r) => r.jobId);

        // Get skill level distribution
        const levelStats = await db
          .select({
            level: jobSkillTags.level,
            count: sql<number>`count(*)`,
          })
          .from(jobSkillTags)
          .where(
            sql`${jobSkillTags.job_id} IN (${sql.join(successfulJobIds, sql`, `)})`,
          )
          .groupBy(jobSkillTags.level)
          .orderBy(sql`count(*) DESC`);

        console.log("Skill Levels:");
        levelStats.forEach((row) => {
          const emoji =
            row.level === "required"
              ? "🔴"
              : row.level === "preferred"
                ? "🔵"
                : "⚪";
          console.log(`  ${emoji} ${row.level}: ${row.count}`);
        });

        // Get most common skills
        const topSkills = await db
          .select({
            tag: jobSkillTags.tag,
            count: sql<number>`count(*)`,
          })
          .from(jobSkillTags)
          .where(
            sql`${jobSkillTags.job_id} IN (${sql.join(successfulJobIds, sql`, `)})`,
          )
          .groupBy(jobSkillTags.tag)
          .orderBy(sql`count(*) DESC`)
          .limit(10);

        console.log("\nTop 10 Most Common Skills:");
        topSkills.forEach((row, idx) => {
          console.log(`  ${idx + 1}. ${row.tag} (${row.count} jobs)`);
        });
      } catch (error) {
        console.warn("  ⚠️  Could not fetch skill statistics");
      }
    }

    // Print failed jobs if any
    if (stats.failed > 0) {
      console.log("\n\n❌ Failed Jobs:");
      results
        .filter(
          (r) =>
            !r.success &&
            r.error !== "No description available" &&
            r.error !== "Already processed",
        )
        .forEach((r) => {
          console.log(`  - Job ${r.jobId}: ${r.title}`);
          console.log(`    Error: ${r.error}`);
        });
    }

    if (stats.skipped > 0) {
      console.log("\n\n⏭️  Skipped Jobs:");
      results
        .filter(
          (r) =>
            !r.success &&
            (r.error === "No description available" ||
              r.error === "Already processed"),
        )
        .forEach((r) => {
          console.log(`  - Job ${r.jobId}: ${r.title} (${r.error})`);
        });
    }

    if (shouldStop) {
      console.log("\n🛑 Stopped early by signal.\n");
    }

    console.log("\n✨ Done!\n");
  } finally {
    shutdownLogging();
  }
}

// Run the script
main().catch((error) => {
  console.error("\n💥 Fatal error:");
  console.error(error);
  process.exitCode = 1;
});
