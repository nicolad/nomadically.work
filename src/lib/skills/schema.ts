/**
 * Job skill Zod schemas — re-exports from the unified contracts.
 *
 * The canonical schemas are in src/schema/contracts/messages.ts.
 * This file re-exports them under the names used throughout the codebase.
 */

import { ExtractedSkill, JobSkillsOutput as _Output } from "@/schema/contracts/messages";
import { SkillLevel } from "@/schema/contracts/enums";
import { z } from "zod";

export const jobSkillSchema = z.object({
  tag: z.string(),
  level: SkillLevel,
  confidence: z.number().min(0).max(1).optional(),
  evidence: z.string().min(1),
});

export const jobSkillsOutputSchema = z.object({
  skills: z.array(jobSkillSchema).max(30),
});

export type JobSkill = z.infer<typeof jobSkillSchema>;
export type JobSkillsOutput = z.infer<typeof jobSkillsOutputSchema>;
