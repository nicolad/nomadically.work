/**
 * Operational Skills for Workspace
 *
 * Runbooks that agents can execute to inspect evidence, debug decisions,
 * and coordinate reprocessing runs. These skills bridge the gap between
 * "LLM said so" and "here's the exact evidence + rule trace".
 */

import { z } from "zod";
import { createTool } from "@mastra/core/tools";
import {
  getLatestBundle,
  getEvidenceBundle,
  createEvidenceBundle,
  JobClassificationBundle,
} from "./evidence-bundles";
// import { db, turso } from "@/db"; // Removed - migrated to D1
// import { jobs } from "@/db/schema"; // Removed - migrated to D1
// import { eq, sql } from "drizzle-orm"; // Removed - migrated to D1
import { randomUUID } from "crypto";
// TODO: Update to use D1 database

// ============================================================================
// Skill 1: Inspect Job Decision
// ============================================================================

export const inspectJobDecisionTool = createTool({
  id: "inspect-job-decision",
  description:
    "Explains why a job was classified as remote-EU or non-EU, with exact evidence excerpts, rule path, and counterfactual suggestions. Returns grounded, auditable explanation.",
  inputSchema: z.object({
    jobId: z.number().describe("The job ID to inspect"),
  }),
  outputSchema: z.object({
    jobId: z.number(),
    title: z.string(),
    decision: z.object({
      isRemoteEU: z.boolean(),
      confidence: z.enum(["high", "medium", "low"]),
      reason: z.string(),
    }),
    evidence: z.object({
      excerpts: z.array(
        z.object({
          text: z.string(),
          source: z.string(),
          relevance: z.string(),
        }),
      ),
      rulePath: z.array(z.string()),
      matchedPatterns: z.array(z.string()).optional(),
    }),
    evalScores: z
      .object({
        faithfulness: z.number().optional(),
        answerRelevancy: z.number().optional(),
        hallucination: z.number().optional(),
        completeness: z.number().optional(),
      })
      .optional(),
    counterfactual: z.string().optional(),
    proposedFix: z.string().optional(),
    bundleId: z.number().optional(),
    traceUrl: z.string().optional(),
  }),
  execute: async ({ jobId }) => {
    throw new Error("Inspect job decision temporarily disabled - D1 migration in progress");
    /* D1 Implementation needed:
    // 1. Fetch job from database
    const jobRows = await db.select().from(jobs).where(eq(jobs.id, jobId));

    if (jobRows.length === 0) {
      throw new Error(`Job ${jobId} not found`);
    }

    const job = jobRows[0];

    // 2. Get latest evidence bundle
    const bundleResult = await getLatestBundle(
      "job",
      jobId,
      "job_classification",
    );

    if (!bundleResult) {
      // No bundle exists - job hasn't been classified via the new system yet
      // Return what we have from the database
      return {
        jobId,
        title: job.title,
        decision: {
          isRemoteEU: job.is_remote_eu || false,
          confidence: (job.remote_eu_confidence as any) || "low",
          reason:
            job.remote_eu_reason ||
            "No detailed classification record available",
        },
        evidence: {
          excerpts: [],
          rulePath: [],
        },
      };
    }

    const { bundleId, bundle, metadata } = bundleResult;
    const classificationBundle = bundle as JobClassificationBundle;

    // 3. Extract evidence and build explanation
    const excerpts = classificationBundle.evidence?.excerpts || [];
    const rulePath = classificationBundle.evidence?.rulePath || [];

    // 4. Generate counterfactual (what would flip the decision)
    const counterfactual = generateCounterfactual(classificationBundle);

    // 5. Propose fix if misclassified
    const proposedFix = generateProposedFix(classificationBundle);

    return {
      jobId,
      title: classificationBundle.input.title,
      decision: {
        isRemoteEU: classificationBundle.output.isRemoteEU,
        confidence: classificationBundle.output.confidence,
        reason: classificationBundle.output.reason,
      },
      evidence: {
        excerpts: excerpts.map((e) => ({
          text: e.text,
          source: e.source,
          relevance: e.relevance,
        })),
        rulePath,
        matchedPatterns: classificationBundle.evidence?.matchedPatterns,
      },
      evalScores: classificationBundle.evalScores,
      counterfactual,
      proposedFix,
      bundleId,
      traceUrl: metadata.trace_url || classificationBundle.metadata?.traceUrl,
    };
    */
  },
});

// ============================================================================
// Skill 2: Batch Rerun Job Classifier
// ============================================================================

export const rerunJobClassifierTool = createTool({
  id: "rerun-job-classifier",
  description:
    "Queue a batch reprocessing run to reclassify jobs with a new prompt version or model. Creates a reprocessing run that requires approval before execution.",
  inputSchema: z.object({
    jobIds: z
      .array(z.number())
      .describe("Array of job IDs to reprocess")
      .min(1)
      .max(1000),
    promptVersion: z
      .string()
      .describe("New prompt version identifier (e.g., 'v2.1-strict-eu')"),
    model: z
      .string()
      .optional()
      .describe("Model to use (defaults to current production model)"),
    dryRun: z
      .boolean()
      .optional()
      .default(false)
      .describe("If true, only estimates cost/time without queuing"),
  }),
  outputSchema: z.object({
    runId: z.string().optional(),
    status: z.enum(["queued", "dry_run"]),
    jobCount: z.number(),
    estimatedCost: z.object({
      tokens: z.number(),
      usd: z.number().optional(),
    }),
    estimatedDuration: z.string(),
    message: z.string(),
  }),
  execute: async ({ jobIds, promptVersion, model, dryRun }) => {
    throw new Error("Rerun job classifier temporarily disabled - D1 migration in progress");
    /* D1 Implementation needed:
    // 1. Estimate cost
    const avgTokensPerJob = 1500; // title + location + description
    const estimatedTokens = jobIds.length * avgTokensPerJob;
    const estimatedCostUSD = (estimatedTokens / 1000000) * 0.15; // ~$0.15/1M tokens for deepseek

    // 2. Estimate duration
    const avgDurationMs = 2000; // 2s per job
    const totalDurationSec = (jobIds.length * avgDurationMs) / 1000;
    const estimatedDuration =
      totalDurationSec > 3600
        ? `${Math.ceil(totalDurationSec / 3600)}h`
        : `${Math.ceil(totalDurationSec / 60)}m`;

    if (dryRun) {
      return {
        status: "dry_run" as const,
        jobCount: jobIds.length,
        estimatedCost: {
          tokens: estimatedTokens,
          usd: estimatedCostUSD,
        },
        estimatedDuration,
        message: `Dry run: Would process ${jobIds.length} jobs with estimated cost $${estimatedCostUSD.toFixed(2)} and duration ${estimatedDuration}`,
      };
    }

    // 3. Create reprocessing run (queued, awaiting approval)
    const runId = randomUUID();

    await db.run(sql`
      INSERT INTO reprocessing_runs (
        id, run_type, entity_ids, total_count,
        version, model, status, requested_by
      ) VALUES (
        ${runId}, 'job_reclassify', ${JSON.stringify(jobIds)}, ${jobIds.length},
        ${promptVersion}, ${model || "deepseek/deepseek-reasoner"}, 'queued', 'workspace-agent'
      )
    `);

    return {
      runId,
      status: "queued" as const,
      jobCount: jobIds.length,
      estimatedCost: {
        tokens: estimatedTokens,
        usd: estimatedCostUSD,
      },
      estimatedDuration,
      message: `Created reprocessing run ${runId} for ${jobIds.length} jobs. Status: queued (requires approval)`,
    };
    */
  },
});

// ============================================================================
// Skill 3: Diff Company Snapshots
// ============================================================================

export const diffSnapshotsTool = createTool({
  id: "diff-company-snapshots",
  description:
    "Compare two company snapshots to see what changed between extractions. Shows which signals improved/regressed and identifies content changes.",
  inputSchema: z.object({
    companyId: z.number(),
    snapshotIdA: z.number().optional(),
    snapshotIdB: z.number().optional(),
  }),
  outputSchema: z.object({
    companyId: z.number(),
    comparison: z.object({
      snapshotA: z.object({
        id: z.number(),
        timestamp: z.string(),
        score: z.number(),
      }),
      snapshotB: z.object({
        id: z.number(),
        timestamp: z.string(),
        score: z.number(),
      }),
    }),
    scoreDelta: z.number(),
    changes: z.object({
      added: z.array(
        z.object({
          field: z.string(),
          value: z.string(),
          confidence: z.number(),
        }),
      ),
      removed: z.array(
        z.object({
          field: z.string(),
          value: z.string(),
          confidence: z.number(),
        }),
      ),
      modified: z.array(
        z.object({
          field: z.string(),
          oldValue: z.string(),
          newValue: z.string(),
        }),
      ),
    }),
    summary: z.string(),
  }),
  execute: async ({ companyId, snapshotIdA, snapshotIdB }) => {
    throw new Error("Diff snapshots temporarily disabled - D1 migration in progress");
    /* D1 Implementation needed:
    // If no snapshot IDs provided, get latest and previous
    let bundleA, bundleB;

    if (snapshotIdA && snapshotIdB) {
      const resultA = await getEvidenceBundle(snapshotIdA);
      const resultB = await getEvidenceBundle(snapshotIdB);
      if (!resultA || !resultB) {
        throw new Error("One or both snapshots not found");
      }
      bundleA = resultA;
      bundleB = resultB;
    } else {
      // Get two most recent bundles
      const bundles = await db.all(sql`
        SELECT * FROM evidence_bundles
        WHERE entity_type = 'company' 
          AND entity_id = ${companyId}
          AND bundle_type = 'company_extraction'
          AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 2
      `);

      if (bundles.length < 2) {
        throw new Error(
          `Not enough snapshots for company ${companyId} (found ${bundles.length})`,
        );
      }

      bundleB = await getEvidenceBundle((bundles[0] as any).id);
      bundleA = await getEvidenceBundle((bundles[1] as any).id);
    }

    if (!bundleA || !bundleB) {
      throw new Error("Failed to load bundles");
    }

    // Compare extracted facts
    const factsA = (bundleA.bundle as any).facts || [];
    const factsB = (bundleB.bundle as any).facts || [];

    const added = factsB.filter(
      (fb: any) => !factsA.some((fa: any) => fa.field === fb.field),
    );
    const removed = factsA.filter(
      (fa: any) => !factsB.some((fb: any) => fb.field === fa.field),
    );
    const modified = factsB
      .filter((fb: any) => {
        const fa = factsA.find((f: any) => f.field === fb.field);
        return fa && JSON.stringify(fa.value) !== JSON.stringify(fb.value);
      })
      .map((fb: any) => {
        const fa = factsA.find((f: any) => f.field === fb.field);
        return {
          field: fb.field,
          oldValue: JSON.stringify(fa?.value),
          newValue: JSON.stringify(fb.value),
        };
      });

    const scoreA = (bundleA.bundle as any).score || 0;
    const scoreB = (bundleB.bundle as any).score || 0;
    const scoreDelta = scoreB - scoreA;

    const summary = generateDiffSummary(added, removed, modified, scoreDelta);

    return {
      companyId,
      comparison: {
        snapshotA: {
          id: bundleA.metadata.id as number,
          timestamp: bundleA.metadata.created_at as string,
          score: scoreA,
        },
        snapshotB: {
          id: bundleB.metadata.id as number,
          timestamp: bundleB.metadata.created_at as string,
          score: scoreB,
        },
      },
      scoreDelta,
      changes: {
        added: added.map((f: any) => ({
          field: f.field,
          value: JSON.stringify(f.value),
          confidence: f.confidence || 0,
        })),
        removed: removed.map((f: any) => ({
          field: f.field,
          value: JSON.stringify(f.value),
          confidence: f.confidence || 0,
        })),
        modified,
      },
      summary,
    };
    */
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

function generateCounterfactual(bundle: JobClassificationBundle): string {
  const { isRemoteEU, reason } = bundle.output;

  if (isRemoteEU) {
    return "Would be marked non-EU if: location explicitly listed as UK-only, hybrid required, or EMEA without EU clarification";
  } else {
    if (reason.toLowerCase().includes("emea")) {
      return "Would be marked remote-EU if: description explicitly states 'EU', 'European Union', or lists EU countries";
    }
    if (reason.toLowerCase().includes("hybrid")) {
      return "Would be marked remote-EU if: explicitly states 'fully remote' or '100% remote'";
    }
    if (reason.toLowerCase().includes("uk")) {
      return "Would be marked remote-EU if: includes EU countries in addition to UK, or states 'EU/EEA eligible'";
    }
    return "Would be marked remote-EU if: location explicitly states 'Remote - EU' or lists EU countries";
  }
}

function generateProposedFix(
  bundle: JobClassificationBundle,
): string | undefined {
  const { confidence, reason } = bundle.output;
  const excerpts = bundle.evidence?.excerpts || [];

  // Only propose fixes for medium/low confidence
  if (confidence === "high") return undefined;

  // Check for common ambiguous patterns
  if (reason.toLowerCase().includes("emea")) {
    return "Add test case: EMEA jobs should be non-EU unless explicitly stating 'EU' or 'European Union'";
  }

  if (excerpts.some((e) => e.text.toLowerCase().includes("timezone"))) {
    return "Consider: timezone mentions (CET/CEST) are weak signals without explicit location confirmation";
  }

  if (confidence === "low") {
    return "Low confidence classification - consider human review or additional context gathering";
  }

  return undefined;
}

function generateDiffSummary(
  added: any[],
  removed: any[],
  modified: any[],
  scoreDelta: number,
): string {
  const parts: string[] = [];

  if (scoreDelta > 0.1) {
    parts.push(`Score improved by ${(scoreDelta * 100).toFixed(1)}%`);
  } else if (scoreDelta < -0.1) {
    parts.push(
      `Score decreased by ${(Math.abs(scoreDelta) * 100).toFixed(1)}%`,
    );
  }

  if (added.length > 0) {
    parts.push(`${added.length} new facts added`);
  }
  if (removed.length > 0) {
    parts.push(`${removed.length} facts removed`);
  }
  if (modified.length > 0) {
    parts.push(`${modified.length} facts modified`);
  }

  return parts.length > 0 ? parts.join("; ") : "No significant changes";
}
