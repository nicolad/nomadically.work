#!/usr/bin/env tsx

/**
 * Remote EU Job Classification - Bulk Processing
 *
 * Classifies jobs for Remote EU eligibility.
 * 
 * Remote EU Definition:
 * - Position must be FULLY REMOTE (not office-based, not hybrid)
 * - AND remote work must be allowed from EU member countries
 * 
 * Tracks results in Langfuse for observability and analysis.
 *
 * Usage:
 *   pnpm tsx scripts/classify-remote-eu-jobs.ts
 *
 * Environment variables (loaded from .env.local via config/env):
 * - LANGFUSE_SECRET_KEY
 * - LANGFUSE_PUBLIC_KEY
 * - LANGFUSE_BASE_URL
 * - DEEPSEEK_API_KEY
 * - TURSO_DB_URL
 * - TURSO_DB_AUTH_TOKEN
 */

import { Langfuse } from "langfuse";
import { getPrompt, PROMPTS } from "../src/observability";
import { deepseek } from "@ai-sdk/deepseek";
import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import {
  LANGFUSE_SECRET_KEY,
  LANGFUSE_PUBLIC_KEY,
  LANGFUSE_BASE_URL,
} from "../src/config/env";
import { db } from "../src/db";
import { jobs } from "../src/db/schema";
import { eq } from "drizzle-orm";

// Initialize Langfuse client
const langfuse = new Langfuse({
  secretKey: LANGFUSE_SECRET_KEY,
  publicKey: LANGFUSE_PUBLIC_KEY,
  baseUrl: LANGFUSE_BASE_URL,
});

// Remote EU classification schema
const remoteEUSchema = z.object({
  isRemoteEU: z.boolean().describe("Whether the job is fully remote AND allows working from EU countries"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confidence level of the classification"),
  reason: z.string().describe("Explanation for the classification decision"),
});

type RemoteEUClassification = z.infer<typeof remoteEUSchema>;

interface ClassificationResult {
  jobId: number;
  externalId: string;
  title: string;
  location: string | null;
  classification: RemoteEUClassification;
  processingTimeMs: number;
}

/**
 * Classify a single job
 */
async function classifyJob(
  job: {
    id: number;
    external_id: string;
    title: string;
    location: string | null;
    description: string | null;
  },
  promptText: string,
  sessionId: string,
  agent: Agent,
): Promise<ClassificationResult> {
  const startTime = Date.now();

  // Create Langfuse trace
  const trace = langfuse.trace({
    name: "remote-eu-classification-bulk",
    sessionId,
    metadata: {
      jobId: job.id,
      externalId: job.external_id,
      title: job.title,
      location: job.location,
    },
  });

  try {
    // Create generation span
    const generation = trace.generation({
      name: "classify-job",
      model: "deepseek-chat",
      input: {
        jobId: job.id,
        title: job.title,
        location: job.location,
        description: job.description?.substring(0, 500) + "...", // Truncate for logging
      },
    });

    // Classify the job
    const result = await agent.generate(
      [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Job Title: ${job.title}
Location: ${job.location || "Not specified"}
Description: ${job.description || "No description available"}

Classify this job posting.`,
            },
          ],
        },
      ],
      { structuredOutput: { schema: remoteEUSchema } },
    );

    const classification: RemoteEUClassification = result.object;

    // Update generation with output
    generation.update({
      output: classification,
      usage: result.usage as any,
    });

    generation.end();

    const processingTimeMs = Date.now() - startTime;

    return {
      jobId: job.id,
      externalId: job.external_id,
      title: job.title,
      location: job.location,
      classification,
      processingTimeMs,
    };
  } catch (error) {
    trace.update({
      output: { error: error instanceof Error ? error.message : String(error) },
    });

    throw error;
  }
}

/**
 * Main classification process
 */
async function runClassification() {
  console.log("🚀 Remote EU Job Classification - Bulk Processing");
  console.log("=================================================");
  console.log("📋 Finding fully remote jobs that allow working from anywhere in the EU");
  console.log("=================================================\n");

  // Fetch prompt from Langfuse
  console.log("📝 Fetching prompt from Langfuse...");
  const { text: promptText } = await getPrompt(PROMPTS.JOB_CLASSIFIER);
  console.log("✅ Prompt loaded\n");

  // Create agent once (reuse for all jobs)
  const agent = new Agent({
    id: "remote-eu-classifier",
    name: "Remote EU Classifier",
    instructions: promptText,
    model: deepseek("deepseek-chat"),
  });

  // Fetch jobs from database
  console.log("📊 Fetching jobs from database...");
  const jobsList = await db
    .select({
      id: jobs.id,
      external_id: jobs.external_id,
      title: jobs.title,
      location: jobs.location,
      description: jobs.description,
    })
    .from(jobs)
    .orderBy(jobs.created_at);

  console.log(`✅ Found ${jobsList.length} jobs\n`);

  if (jobsList.length === 0) {
    console.log("⚠️  No jobs found in database");
    return;
  }

  // Create session for this batch
  const sessionId = `classify-bulk-${Date.now()}`;
  const results: ClassificationResult[] = [];
  const errors: Array<{ jobId: number; error: string }> = [];

  // Process jobs with rate limiting
  console.log("🔄 Processing jobs...\n");
  const startTime = Date.now();

  for (let i = 0; i < jobsList.length; i++) {
    const job = jobsList[i];
    const progress = `[${i + 1}/${jobsList.length}]`;

    try {
      console.log(
        `${progress} Classifying: ${job.title.substring(0, 50)}... (${job.location || "No location"})`,
      );

      const result = await classifyJob(job, promptText, sessionId, agent);
      results.push(result);

      // Save classification to database
      await db
        .update(jobs)
        .set({
          is_remote_eu: result.classification.isRemoteEU,
          remote_eu_confidence: result.classification.confidence,
          remote_eu_reason: result.classification.reason,
          updated_at: new Date().toISOString(),
        })
        .where(eq(jobs.id, job.id));

      const icon = result.classification.isRemoteEU ? "✅" : "❌";
      console.log(
        `         ${icon} ${result.classification.isRemoteEU ? "Fully Remote (EU)" : "Not Remote EU"} (${result.classification.confidence}) - ${result.processingTimeMs}ms`,
      );

      // Rate limiting: small delay between requests
      if (i < jobsList.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`         ❌ Error: ${errorMsg}`);
      errors.push({ jobId: job.id, error: errorMsg });
    }
  }

  const totalTime = Date.now() - startTime;

  // Flush Langfuse events
  console.log("\n📤 Sending traces to Langfuse...");
  await langfuse.flushAsync();

  // Generate summary report
  console.log("\n\n📈 CLASSIFICATION SUMMARY");
  console.log("========================\n");

  const euJobs = results.filter((r) => r.classification.isRemoteEU);
  const nonEuJobs = results.filter((r) => !r.classification.isRemoteEU);

  const highConfidenceEu = euJobs.filter(
    (r) => r.classification.confidence === "high",
  ).length;
  const mediumConfidenceEu = euJobs.filter(
    (r) => r.classification.confidence === "medium",
  ).length;
  const lowConfidenceEu = euJobs.filter(
    (r) => r.classification.confidence === "low",
  ).length;

  console.log(`Total Jobs Processed: ${results.length}`);
  console.log(`Processing Time: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(
    `Average Time per Job: ${(totalTime / results.length).toFixed(0)}ms`,
  );
  console.log(
    `\nFully Remote (EU): ${euJobs.length} (${((euJobs.length / results.length) * 100).toFixed(1)}%)`,
  );
  console.log(`  High Confidence: ${highConfidenceEu}`);
  console.log(`  Medium Confidence: ${mediumConfidenceEu}`);
  console.log(`  Low Confidence: ${lowConfidenceEu}`);
  console.log(
    `\nNot Remote EU: ${nonEuJobs.length} (${((nonEuJobs.length / results.length) * 100).toFixed(1)}%)`,
  );

  if (errors.length > 0) {
    console.log(`\n❌ Errors: ${errors.length}`);
    errors.forEach((e) => {
      console.log(`   Job ID ${e.jobId}: ${e.error}`);
    });
  }

  // Show sample EU jobs
  if (euJobs.length > 0) {
    console.log("\n\n📋 Sample Fully Remote (EU) Jobs:");
    euJobs.slice(0, 5).forEach((job) => {
      console.log(
        `\n  ${job.title} (${job.classification.confidence} confidence)`,
      );
      console.log(`    Location: ${job.location || "Not specified"}`);
      console.log(
        `    Reason: ${job.classification.reason.substring(0, 100)}...`,
      );
    });
  }

  // Show Langfuse session link
  console.log(
    `\n🔗 View traces in Langfuse: https://cloud.langfuse.com/project/${LANGFUSE_PUBLIC_KEY?.split("-")[2] || "default"}/sessions/${sessionId}`,
  );

  console.log("\n✅ Classification complete!");
}

// Run the classification
runClassification().catch((error) => {
  console.error("❌ Classification failed:", error);
  process.exit(1);
});
