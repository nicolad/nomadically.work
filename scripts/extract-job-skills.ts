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
 * - CLOUDFLARE_API_TOKEN
 */

import { db } from "../src/db";
import { jobs, jobSkillTags } from "../src/db/schema";
import { sql } from "drizzle-orm";
import { mastra } from "../src/mastra";
import { LibSQLVector } from "@mastra/libsql";
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { embedMany } from "ai";
import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_API_TOKEN,
  TURSO_DB_URL,
  TURSO_DB_AUTH_TOKEN,
} from "../src/config/env";

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
    console.warn(`\n⚠️  Received ${signal}. Finishing current job then stopping...`);
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

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    throw new Error(
      "Missing Cloudflare credentials. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your .env file",
    );
  }

  const model = new ModelRouterEmbeddingModel({
    providerId: "cloudflare-workers-ai",
    modelId: "@cf/baai/bge-small-en-v1.5",
    url: `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
    apiKey: CLOUDFLARE_API_TOKEN,
  });

  const { embeddings } = await embedMany({
    model,
    values,
  });

  return embeddings;
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
      // Include richer context if available
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
installSignalHandlers();

  
/**
 * Main execution
 */
async function main() {
  console.log("🔧 Job Skills Extraction");
  console.log("========================\n");

  // Ensure vector index exists
  console.log("📊 Ensuring skills vector index...");
  try {
    await ensureSkillsVectorIndex();
    console.log("✅ Vector index ready\n");
  } catch (error) {
    console.warn("⚠️  Could not verify vector index:", error);
    console.log("Continuing anyway...\n");
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

  //if (shouldStop) break;

     Process jobs sequentially (to avoid rate limits)
  for (let i = 0; i < jobsToProcess.length; i++) {
    const job = jobsToProcess[i];
    console.log(`\n[${i + 1}/${jobsToProcess.length}]`);

    const result = await extractSkillsForJob(job);
    results.push(result);

    stats.processed++;
    if (result.success) {
      stats.succeeded++;
      stats.totalSkills += result.skillsCount;
    } else {
      if (result.error === "No description available") {
        stats.skipped++;
      } else {
        stats.failed++;
      }
    } && !shouldStop
    stats.totalProcessingMs += result.processingTimeMs;

    // Add a small delay between jobs to avoid rate limits
    if (i < jobsToProcess.length - 1) {
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
  console.log(`📋 Total skills:     ${stats.totalSkills}Math.max(stats.processed, 1)
  console.log(
    `⏱️  Avg time/job:     ${(stats.totalProcessingMs / stats.processed).toFixed(0)}ms`,
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
      .filter((r) => !r.success && r.error !== "No description available")
      .forEach((r) => {
        console.log(`  - Job ${r.jobId}: ${r.title}`);
        console.log(`    Error: ${r.error}`);
      });
  }

  if (stats.skipped > 0) {
    console.log("\n\n⏭️  Skipped Jobs (no description):");
    results
      .filter((r) => r.error === "No description available")
      .forEach((r) => {
        console.log(`  - Job ${r.jobId}: ${r.title}`);
      });
  if (shouldStop) {
    console.log("\n🛑 Stopped early by signal.\n");
  }

  }

  console.log("\n✨ Done!\n");
}

// Run the script
main().catch((error) => {
  console.error("\n💥 Fatal error:");
  console.error(error);
  process.exit(1);
});
