/**
 * Queue message contracts — shared between insert-jobs and process-jobs workers.
 *
 * These Zod schemas define the wire format for inter-worker communication.
 * Generated JSON Schemas can be used by Python/Rust workers for validation.
 */

import { z } from "zod";
import { JobStatus, ClassificationConfidence, SkillLevel } from "./enums";

// ---------------------------------------------------------------------------
// Queue: insert-jobs → process-jobs
// ---------------------------------------------------------------------------

export const QueueMessage = z.object({
  jobId: z.number().int().positive(),
  traceId: z.string().optional(),
  action: z.enum(["process", "enhance", "tag", "classify"]).optional(),
});
export type QueueMessage = z.infer<typeof QueueMessage>;

export const ProcessJobsMessage = z.object({
  action: z.enum(["process", "enhance", "tag", "classify"]),
  limit: z.number().int().positive(),
  traceId: z.string().optional(),
});
export type ProcessJobsMessage = z.infer<typeof ProcessJobsMessage>;

// ---------------------------------------------------------------------------
// Job classification result (process-jobs output)
// ---------------------------------------------------------------------------

export const JobClassificationResult = z.object({
  isRemoteEU: z.boolean(),
  confidence: ClassificationConfidence,
  reason: z.string(),
});
export type JobClassificationResult = z.infer<typeof JobClassificationResult>;

// ---------------------------------------------------------------------------
// Role tagging result (process-jobs Phase 2 output)
// ---------------------------------------------------------------------------

export const JobRoleTagsResult = z.object({
  isFrontendReact: z.boolean(),
  isAIEngineer: z.boolean(),
  confidence: ClassificationConfidence,
  reason: z.string(),
});
export type JobRoleTagsResult = z.infer<typeof JobRoleTagsResult>;

// ---------------------------------------------------------------------------
// Skill extraction result (process-jobs Phase 4 output)
// ---------------------------------------------------------------------------

export const ExtractedSkill = z.object({
  tag: z.string(),
  level: SkillLevel,
  confidence: z.number().min(0).max(1),
  evidence: z.string(),
});
export type ExtractedSkill = z.infer<typeof ExtractedSkill>;

export const JobSkillsOutput = z.object({
  skills: z.array(ExtractedSkill).max(30),
});
export type JobSkillsOutput = z.infer<typeof JobSkillsOutput>;

// ---------------------------------------------------------------------------
// Job insert payload (HTTP → insert-jobs worker)
// ---------------------------------------------------------------------------

export const JobInsertPayload = z.object({
  externalId: z.string().min(1),
  sourceId: z.number().int().optional(),
  sourceKind: z.string().min(1),
  companyKey: z.string().min(1),
  title: z.string().min(1),
  location: z.string().optional(),
  url: z.string().url(),
  description: z.string().optional(),
  postedAt: z.string().optional(),
  score: z.number().optional(),
  scoreReason: z.string().optional(),
  status: JobStatus.optional(),
});
export type JobInsertPayload = z.infer<typeof JobInsertPayload>;
