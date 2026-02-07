import { z } from "zod";
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { Agent } from "@mastra/core/agent";
import { createClient } from "@libsql/client";

import { skillTaxonomyQueryTool } from "../tools/skill-taxonomy-query-tool";
import { jobSkillsOutputSchema } from "../schemas/job-skills";

const extractInputSchema = z.object({
  jobId: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
});

// Agent that extracts skills with structured output
const skillExtractorAgent = new Agent({
  id: "skill-extractor",
  name: "Skill Extractor",
  instructions: [
    "Extract ONLY skills that are explicitly mentioned or strongly implied in the job text.",
    "Return ONLY canonical tags from the provided candidate list - DO NOT invent new tags.",
    "For each skill:",
    "  - Classify level as 'required' (must-have), 'preferred' (nice-to-have), or 'nice' (mentioned but not emphasized)",
    "  - Provide a SHORT evidence snippet (max 100 chars) from the job text that justifies this skill",
    "  - Optionally set confidence 0-1 based on how clearly the skill is mentioned",
    "Ignore vague terms like 'team player' or 'good communication' unless they map to a specific technical skill.",
  ].join("\n"),
  model: {
    id: "deepseek/deepseek-reasoner",
  },
});

/**
 * Step 1: Retrieve candidate canonical tags via vector similarity
 */
const candidatesStep = createStep({
  id: "skill-candidates",
  inputSchema: extractInputSchema,
  outputSchema: z.object({
    candidates: z.array(
      z.object({
        tag: z.string(),
        label: z.string().optional(),
        aliases: z.array(z.string()).optional(),
        score: z.number().optional(),
      }),
    ),
  }),
  execute: async ({ inputData, requestContext }) => {
    const text = `${inputData.title}\n\n${inputData.description ?? ""}`.slice(
      0,
      20_000,
    );

    const res = await skillTaxonomyQueryTool.execute(
      {
        query: text,
        topK: 50,
      } as any,
      { requestContext },
    );

    // Tool returns retrieval results; normalize to what we need
    const candidates = (res?.results ?? []).map((r: any) => ({
      tag: r.metadata?.tag ?? r.id,
      label: r.metadata?.label,
      aliases: r.metadata?.aliases,
      score: r.score,
    }));

    return { candidates };
  },
});

/**
 * Step 2: Extract skills using LLM with structured output
 * (using agent step with structuredOutput)
 */
const extractStructuredStep = createStep(skillExtractorAgent, {
  structuredOutput: { schema: jobSkillsOutputSchema },
});

/**
 * Step 3: Validate extracted skills against candidates
 * - Remove hallucinated tags
 * - Enforce evidence requirements
 * - Deduplicate
 */
const validateStep = createStep({
  id: "validate-skills",
  inputSchema: z.object({
    jobId: z.number().int(),
    extracted: jobSkillsOutputSchema,
    candidates: z.array(z.object({ tag: z.string() })),
  }),
  outputSchema: jobSkillsOutputSchema,
  execute: async ({ inputData }) => {
    const allowed = new Set(inputData.candidates.map((c) => c.tag));
    const seen = new Set<string>();

    const cleaned = inputData.extracted.skills
      .filter((s) => allowed.has(s.tag)) // kill hallucinated tags
      .filter((s) => s.evidence.trim().length >= 8) // evidence must be real
      .filter((s) => {
        if (seen.has(s.tag)) return false;
        seen.add(s.tag);
        return true;
      })
      .slice(0, 30);

    return { skills: cleaned };
  },
});

/**
 * Step 4: Persist validated skills to SQL
 */
const persistStep = createStep({
  id: "persist-skills",
  inputSchema: z.object({
    jobId: z.number().int(),
    skills: jobSkillsOutputSchema,
    version: z.string(),
  }),
  outputSchema: z.object({ ok: z.boolean(), count: z.number() }),
  execute: async ({ inputData }) => {
    const db = createClient({
      url: process.env.TURSO_DB_URL!,
      authToken: process.env.TURSO_DB_AUTH_TOKEN!,
    });

    const extractedAt = new Date().toISOString();

    // Replace existing skills for this job
    await db.execute({
      sql: `DELETE FROM job_skill_tags WHERE job_id = ?`,
      args: [inputData.jobId],
    });

    for (const s of inputData.skills.skills) {
      await db.execute({
        sql: `
          INSERT INTO job_skill_tags(job_id, tag, level, confidence, evidence, extracted_at, version)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          inputData.jobId,
          s.tag,
          s.level,
          s.confidence ?? null,
          s.evidence,
          extractedAt,
          inputData.version,
        ],
      });
    }

    return { ok: true, count: inputData.skills.skills.length };
  },
});

/**
 * Main workflow: orchestrates all steps
 */
export const extractJobSkillsWorkflow = createWorkflow({
  id: "extract-job-skills",
  inputSchema: extractInputSchema,
  outputSchema: z.object({ ok: z.boolean(), count: z.number() }),
})
  // 1) Get candidate tags from vector store
  .then(candidatesStep)
  // 2) Map to agent input: build prompt with candidates
  .map(async ({ inputData, getStepResult }) => {
    const { candidates } = getStepResult<any>({ step: candidatesStep });
    const init = inputData as any;
    const title = init.title as string;
    const description = (init.description ?? "") as string;

    const candidateTags = candidates.map((c: any) => c.tag).join(", ");

    return {
      prompt: [
        `JOB TITLE: ${title}`,
        ``,
        `JOB DESCRIPTION:`,
        description,
        ``,
        `CANDIDATE CANONICAL TAGS (you MUST choose from these ONLY):`,
        candidateTags,
        ``,
        `Return JSON with shape: { skills: [{ tag, level, confidence?, evidence }] }`,
      ].join("\n"),
    };
  })
  // 3) Extract structured skills
  .then(extractStructuredStep)
  // 4) Map to validation input
  .map(async ({ getStepResult, inputData }) => {
    const extracted = getStepResult<any>({ step: extractStructuredStep });
    const { candidates } = getStepResult<any>({ step: candidatesStep });
    const init = inputData as any;

    return {
      jobId: init.jobId as number,
      extracted,
      candidates,
    };
  })
  // 5) Validate against candidates
  .then(validateStep)
  // 6) Map to persist input
  .map(async ({ getStepResult, inputData }) => {
    const init = inputData as any;
    const validated = getStepResult<any>({ step: validateStep });

    return {
      jobId: init.jobId as number,
      skills: validated,
      version: "skills-v1", // bump when you change prompts/taxonomy
    };
  })
  // 7) Persist to SQL
  .then(persistStep)
  .commit();
