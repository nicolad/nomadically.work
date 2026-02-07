import { z } from "zod";

export const jobSkillSchema = z.object({
  tag: z.string(), // canonical tag ONLY (validated against taxonomy)
  level: z.enum(["required", "preferred", "nice"]),
  confidence: z.number().min(0).max(1).optional(),
  evidence: z.string().min(1), // snippet from job text justifying this skill
});

export const jobSkillsOutputSchema = z.object({
  skills: z.array(jobSkillSchema).max(30),
});

export type JobSkill = z.infer<typeof jobSkillSchema>;
export type JobSkillsOutput = z.infer<typeof jobSkillsOutputSchema>;
