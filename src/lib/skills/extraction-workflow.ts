import { z } from "zod";
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { Agent } from "@mastra/core/agent";
import { createClient } from "@libsql/client";

import { getSkillTaxonomyQueryTool } from "./taxonomy-tool";
import { jobSkillsOutputSchema } from "./schema";

const extractInputSchema = z.object({
  jobId: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
});

const candidatesOutputSchema = z.object({
  candidates: z.array(
    z.object({
      tag: z.string(),
      label: z.string().optional(),
      aliases: z.array(z.string()).optional(),
      score: z.number().optional(),
    }),
  ),
});
type CandidatesStepOutput = z.infer<typeof candidatesOutputSchema>;

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
  outputSchema: candidatesOutputSchema,
  execute: async ({
    inputData,
    requestContext,
  }): Promise<CandidatesStepOutput> => {
    const text = `${inputData.title}\n\n${inputData.description ?? ""}`.slice(
      0,
      20_000,
    );

    const tool = getSkillTaxonomyQueryTool();

    // 🔎 sanity log: if this prints queryText, but the tool error still shows "query",
    // you're running different code than you edited.
    console.log(
      "Calling skill-taxonomy-query with keys:",
      Object.keys({ queryText: text, topK: 50 }),
    );

    const res = await tool.execute(
      {
        queryText: text, // ✅ MUST be queryText (NOT query)
        topK: 50,
      },
      { requestContext },
    );

    console.log("Tool result:", JSON.stringify(res, null, 2));

    const sources = Array.isArray(res?.sources) ? res.sources : [];

    const candidates = sources.map((r: any) => ({
      tag: r.metadata?.tag ?? r.id,
      label: r.metadata?.label,
      aliases: r.metadata?.aliases,
      score: r.score,
    }));

    console.log(`Found ${candidates.length} candidate skills`);
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
    const stepResult = getStepResult(
      "skill-candidates",
    ) as CandidatesStepOutput | null;

    if (!stepResult) {
      throw new Error(`Candidates step returned null. Step likely failed.`);
    }

    const { candidates } = stepResult;

    const init = inputData as z.infer<typeof extractInputSchema>;
    const title = init.title;
    const description = init.description ?? "";

    const candidateTags = candidates.map((c) => c.tag).join(", ");

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
    const extracted = getStepResult("skill-extractor") as any;

    const candidatesResult = getStepResult(
      "skill-candidates",
    ) as CandidatesStepOutput | null;
    if (!candidatesResult) {
      throw new Error(
        `Candidates step result not available in validation mapping.`,
      );
    }

    const init = inputData as z.infer<typeof extractInputSchema>;

    return {
      jobId: init.jobId,
      extracted,
      candidates: candidatesResult.candidates,
    };
  })
  // 5) Validate against candidates
  .then(validateStep)
  // 6) Map to persist input
  .map(async ({ getStepResult, inputData }) => {
    const init = inputData as any;
    const validated = getStepResult("validate-skills");

    return {
      jobId: init.jobId as number,
      skills: validated,
      version: "skills-v1", // bump when you change prompts/taxonomy
    };
  })
  // 7) Persist to SQL
  .then(persistStep)
  .commit();
