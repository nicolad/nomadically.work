/**
 * Evidence Bundle Management
 *
 * Handles creation, storage, and retrieval of evidence bundles for
 * classification and extraction decisions. Each bundle is an immutable
 * snapshot that enables debugging, reprocessing, and audit trails.
 */

import { z } from "zod";
import { createHash } from "crypto";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join, dirname } from "path";
// import { db, turso } from "@/db"; // Removed - migrated to D1
// import { sql } from "drizzle-orm"; // Removed - migrated to D1
// TODO: Update to use D1 database

// ============================================================================
// Schemas
// ============================================================================

export const EvidenceBundleTypeSchema = z.enum([
  "job_classification",
  "company_extraction",
  "skill_extraction",
]);

export const EntityTypeSchema = z.enum(["job", "company", "company_snapshot"]);

export const BundleStatusSchema = z.enum(["active", "superseded", "invalid"]);

export const JobClassificationBundleSchema = z.object({
  // Input
  input: z.object({
    jobId: z.number(),
    title: z.string(),
    location: z.string(),
    description: z.string(),
    url: z.string().optional(),
    postedAt: z.string().optional(),
  }),

  // Configuration
  config: z.object({
    promptVersion: z.string(),
    model: z.string(),
    temperature: z.number().optional(),
  }),

  // Output
  output: z.object({
    isRemoteEU: z.boolean(),
    confidence: z.enum(["high", "medium", "low"]),
    reason: z.string(),
  }),

  // Evidence
  evidence: z.object({
    excerpts: z.array(
      z.object({
        text: z.string(),
        offset: z.number().optional(),
        source: z.enum(["title", "location", "description"]),
        relevance: z.string(), // why this excerpt matters
      }),
    ),
    rulePath: z.array(z.string()), // which rules fired
    matchedPatterns: z.array(z.string()).optional(),
  }),

  // Eval scores (from @mastra/evals)
  evalScores: z
    .object({
      faithfulness: z.number().optional(),
      answerRelevancy: z.number().optional(),
      hallucination: z.number().optional(),
      completeness: z.number().optional(),
      tone: z.number().optional(),
      toxicity: z.number().optional(),
      bias: z.number().optional(),
      keywordCoverage: z.number().optional(),
    })
    .optional(),

  // Metadata
  metadata: z.object({
    timestamp: z.string(),
    durationMs: z.number(),
    tokensUsed: z.number().optional(),
    traceId: z.string().optional(),
    traceUrl: z.string().optional(),
  }),
});

export type JobClassificationBundle = z.infer<
  typeof JobClassificationBundleSchema
>;

// ============================================================================
// Bundle Storage
// ============================================================================

const WORKSPACE_BASE = "./src/workspace";
const EVIDENCE_BASE = join(WORKSPACE_BASE, "evidence");

/**
 * Generate bundle path based on entity type and ID
 */
function getBundlePath(
  bundleType: string,
  entityType: string,
  entityId: number,
  timestamp: string,
): string {
  const isoDate = timestamp.split("T")[0]; // YYYY-MM-DD
  return join(
    EVIDENCE_BASE,
    bundleType,
    entityType,
    String(entityId),
    `${isoDate}_${Date.now()}.json`,
  );
}

/**
 * Compute content hash for deduplication
 */
function computeContentHash(content: unknown): string {
  const json = JSON.stringify(content, null, 2);
  return createHash("sha256").update(json).digest("hex");
}

/**
 * Write bundle to filesystem and database
 */
export async function createEvidenceBundle(params: {
  bundleType: z.infer<typeof EvidenceBundleTypeSchema>;
  entityType: z.infer<typeof EntityTypeSchema>;
  entityId: number;
  version: string;
  model?: string;
  content: unknown;
  traceId?: string;
  traceUrl?: string;
  runId?: string;
}): Promise<{ bundleId: number; bundlePath: string }> {
  throw new Error("Evidence bundle creation temporarily disabled - D1 migration in progress");
  /* D1 Implementation needed:
  const timestamp = new Date().toISOString();
  const bundlePath = getBundlePath(
    params.bundleType,
    params.entityType,
    params.entityId,
    timestamp,
  );
  const contentHash = computeContentHash(params.content);

  // Write to filesystem
  const fullPath = join(process.cwd(), bundlePath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, JSON.stringify(params.content, null, 2), "utf-8");

  // Extract summaries for search
  const inputSummary = extractInputSummary(params.content);
  const outputSummary = extractOutputSummary(params.content);
  const decisionReason = extractDecisionReason(params.content);

  // Insert into database
  const result = await db.run(sql`
    INSERT INTO evidence_bundles (
      bundle_type, entity_type, entity_id,
      version, model, bundle_path, content_hash,
      input_summary, output_summary, decision_reason,
      trace_id, trace_url, run_id, status
    ) VALUES (
      ${params.bundleType}, ${params.entityType}, ${params.entityId},
      ${params.version}, ${params.model || null}, ${bundlePath}, ${contentHash},
      ${inputSummary}, ${outputSummary}, ${decisionReason},
      ${params.traceId || null}, ${params.traceUrl || null}, ${params.runId || null}, 'active'
    )
  `);

  const bundleId = Number(result.lastInsertRowid);

  return { bundleId, bundlePath };
  */
}

/**
 * Retrieve bundle from filesystem
 */
export async function getEvidenceBundle(
  bundleId: number,
): Promise<{ bundle: unknown; metadata: any } | null> {
  throw new Error("Evidence bundle retrieval temporarily disabled - D1 migration in progress");
  /* D1 Implementation needed:
  const rows = await db.all(sql`
    SELECT * FROM evidence_bundles WHERE id = ${bundleId}
  `);

  if (rows.length === 0) return null;

  const metadata = rows[0] as any;
  const fullPath = join(process.cwd(), metadata.bundle_path as string);

  try {
    const content = await readFile(fullPath, "utf-8");
    const bundle = JSON.parse(content);
    return { bundle, metadata };
  } catch (error) {
    console.error(`Failed to read bundle ${bundleId}:`, error);
    return null;
  }
  */
}

/**
 * Get latest bundle for an entity
 */
export async function getLatestBundle(
  entityType: string,
  entityId: number,
  bundleType?: string,
): Promise<{ bundleId: number; bundle: unknown; metadata: any } | null> {
  throw new Error("Evidence bundle retrieval temporarily disabled - D1 migration in progress");
  /* D1 Implementation needed:
  const typeFilter = bundleType ? sql`AND bundle_type = ${bundleType}` : sql``;

  const rows = await db.all(sql`
    SELECT * FROM evidence_bundles 
    WHERE entity_type = ${entityType} 
      AND entity_id = ${entityId}
      AND status = 'active'
      ${typeFilter}
    ORDER BY created_at DESC
    LIMIT 1
  `);

  if (rows.length === 0) return null;

  const metadata = rows[0] as any;
  const bundleId = metadata.id as number;
  const result = await getEvidenceBundle(bundleId);

  if (!result) return null;

  return { bundleId, ...result };
  */
}

/**
 * Mark bundle as superseded
 */
export async function supersedeBun(
  oldBundleId: number,
  newBundleId: number,
): Promise<void> {
  throw new Error("Evidence bundle superseding temporarily disabled - D1 migration in progress");
  /* D1 Implementation needed:
  await db.run(sql`
    UPDATE evidence_bundles 
    SET status = 'superseded', superseded_by = ${newBundleId}
    WHERE id = ${oldBundleId}
  `);
  */
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractInputSummary(content: any): string {
  if (content.input?.description) {
    return content.input.description.slice(0, 500);
  }
  if (content.input?.title) {
    return content.input.title;
  }
  return JSON.stringify(content.input || {}).slice(0, 500);
}

function extractOutputSummary(content: any): string {
  if (content.output) {
    return JSON.stringify(content.output).slice(0, 500);
  }
  return "";
}

function extractDecisionReason(content: any): string {
  return content.output?.reason || content.output?.reasons?.join("; ") || "";
}
