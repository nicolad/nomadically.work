"use server";

import { z } from "zod";
import { Agent } from "@mastra/core/agent";
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { createScorer } from "@mastra/core/evals";

import {
  // Accuracy & reliability
  createAnswerRelevancyScorer,
  createFaithfulnessScorer,
  createHallucinationScorer,
  createCompletenessScorer,
  // Output quality
  createToneScorer,
  createToxicityScorer,
  createBiasScorer,
  createKeywordCoverageScorer,
  // (Optional / future) Tool-call accuracy
  createToolCallAccuracyScorerCode,
  createToolCallAccuracyScorerLLM,
  createPromptAlignmentScorerLLM,
  createContextRelevanceScorerLLM,
} from "@mastra/evals/scorers/prebuilt";

import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * DeepSeek models via Mastra model router.
 * Ensure you have DEEPSEEK_API_KEY set in your environment.
 */
const AGENT_MODEL = "deepseek/deepseek-reasoner";
const JUDGE_MODEL = "deepseek/deepseek-chat";

/* ------------------------------------------------------------------------------------------------
 * Types + Schemas
 * ---------------------------------------------------------------------------------------------- */

export type JobClassificationInput = {
  title: string;
  location: string;
  description: string;
};

export type JobClassificationResponse = {
  isRemoteEU: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
};

const JobClassificationInputSchema = z.object({
  title: z.string(),
  location: z.string(),
  description: z.string(),
});

const JobClassificationOutputSchema = z.object({
  isRemoteEU: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  reason: z.string(),
});

/* ------------------------------------------------------------------------------------------------
 * Prompt / Rubric
 * ---------------------------------------------------------------------------------------------- */

const EU_RULES = `
EU Countries include: Germany, France, Ireland, Poland, Romania, Netherlands, Belgium, Spain, Italy, Portugal, Austria, Sweden, Denmark, Finland, Czech Republic, Greece, Hungary, and others in the European Union.

NOT EU: UK (post-Brexit), Switzerland, Norway, Turkey, Middle East countries.

CRITICAL: A job must be BOTH remote AND allow EU locations to be classified as "Remote EU".

✅ Remote EU - ALL of these conditions must be met:
1. The job is FULLY REMOTE (not office-based, not hybrid requiring office presence)
2. AND remote work is allowed from EU countries

Positive indicators:
- Explicitly states "Remote", "Work from home", "Fully remote", "100% remote"
- Location says "Remote - EU", "Remote - Europe", "Remote", "Anywhere" combined with EU restriction
- Description mentions "work from anywhere in the EU", "remote across Europe"
- Multiple countries/regions listed (indicating flexibility, not a single office)
- States "EU remote" or "European Union remote"

❌ NOT Remote EU if:
- Lists a SPECIFIC CITY as the primary location (e.g., "Utrecht, Netherlands", "Berlin, Germany", "Dublin, Ireland")
  → This indicates an OFFICE-BASED or HYBRID position in that city, NOT remote
- Says "Hybrid" or mentions office days/requirements
- Says "Office-based", "On-site", "In-person"
- Only mentions EMEA without EU restriction (includes non-EU)
- Only mentions CET timezone without remote/EU clarification
- Only UK locations (UK is not EU)
- Only non-EU European countries (Switzerland, Norway, UK)
- Location format like "City, Country" typically means office location, not remote

Confidence levels:
- HIGH: Explicitly states "Remote - EU" or equivalent, very clear
- MEDIUM: Says "Remote" with EU countries mentioned but not 100% explicit
- LOW: Ambiguous wording, unclear if truly remote or if EU-restricted
`.trim();

function buildJobClassificationPrompt(input: JobClassificationInput): string {
  const { title, location, description } = input;

  return `Analyze this job posting and determine if it is a Remote EU position.

Title: ${title}
Location: ${location}
Description: ${description}

${EU_RULES}

Return a JSON object matching this schema:
{
  "isRemoteEU": boolean,
  "confidence": "high" | "medium" | "low",
  "reason": string
}`;
}

function formatClassificationAsText(output: JobClassificationResponse): string {
  return [
    `isRemoteEU: ${output.isRemoteEU}`,
    `confidence: ${output.confidence}`,
    `reason: ${output.reason}`,
  ].join("\n");
}

function buildContextPieces(input: JobClassificationInput): string[] {
  return [
    `Title: ${input.title}`,
    `Location: ${input.location}`,
    `Description: ${input.description}`,
    `Rubric: ${EU_RULES}`,
  ];
}

/* ------------------------------------------------------------------------------------------------
 * Agent (single-file)
 * ---------------------------------------------------------------------------------------------- */

const jobClassifierAgent = new Agent({
  id: "jobClassifierAgent",
  name: "Job Classifier Agent",
  model: AGENT_MODEL,
  instructions:
    "Classify job postings as Remote EU or not, using the rubric. Output must match the provided JSON schema.",
});

/* ------------------------------------------------------------------------------------------------
 * Helpers: wrap built-in scorers for structured step I/O
 * ---------------------------------------------------------------------------------------------- */

function wrapBuiltInScorerForStep(options: {
  id: string;
  description: string;
  baseScorer: {
    run: (args: { input: any; output: any; groundTruth?: any }) => Promise<any>;
    id?: string;
    name?: string;
  };
  buildInput: (input: JobClassificationInput) => string;
  buildOutput: (output: JobClassificationResponse) => string;
  /**
   * Optional score normalization (e.g. invert "lower is better" scorers so higher is better).
   */
  transformScore?: (rawScore: number) => number;
  /**
   * Optional reason decoration.
   */
  transformReason?: (raw: { score?: number; reason?: string }) => string;
}) {
  const {
    id,
    description,
    baseScorer,
    buildInput,
    buildOutput,
    transformScore,
    transformReason,
  } = options;

  return createScorer<JobClassificationInput, JobClassificationResponse>({
    id,
    description,
  })
    .analyze(async ({ run }) => {
      const input = run.input as JobClassificationInput;
      const output = run.output as JobClassificationResponse;

      const inputText = buildInput(input);
      const outputText = buildOutput(output);

      // Built-ins accept "scorer-style" inputs; strings are the lowest-friction.
      // The return contains { score, reason, ... }.
      return baseScorer.run({ input: inputText, output: outputText });
    })
    .generateScore(({ results }) => {
      const raw = Number(results.analyzeStepResult?.score ?? 0);
      const normalized = transformScore ? transformScore(raw) : raw;
      // Clamp defensively.
      return Math.max(0, Math.min(1, normalized));
    })
    .generateReason(({ results }) => {
      const rawScore = results.analyzeStepResult?.score;
      const rawReason = results.analyzeStepResult?.reason;
      if (transformReason)
        return transformReason({ score: rawScore, reason: rawReason });
      return rawReason ?? "";
    });
}

/* ------------------------------------------------------------------------------------------------
 * Custom domain scorer (LLM-judge): "Remote EU correctness"
 * ---------------------------------------------------------------------------------------------- */

const remoteEUCorrectnessScorer = createScorer<
  JobClassificationInput,
  JobClassificationResponse
>({
  id: "job-remote-eu-correctness",
  description:
    "LLM-judge for whether isRemoteEU/confidence/reason match the job text + rubric.",
  judge: {
    model: JUDGE_MODEL,
    instructions:
      "You are a strict evaluator. Use ONLY the job text and rubric. Penalize unsupported assumptions. Be concise and specific.",
  },
})
  .analyze({
    description: "Assess correctness + grounding of the classification output",
    outputSchema: z.object({
      score: z.number().min(0).max(1),
      isCorrect: z.boolean(),
      mainIssues: z.array(z.string()),
      reasoning: z.string(),
    }),
    createPrompt: ({ run }) => {
      const input = run.input as JobClassificationInput;
      const output = run.output as JobClassificationResponse;

      return `Job text:
Title: ${input.title}
Location: ${input.location}
Description: ${input.description}

Rubric:
${EU_RULES}

Model output:
${JSON.stringify(output, null, 2)}

Task:
1) Decide whether "isRemoteEU" is correct given the rubric.
2) Check whether the "reason" is grounded in the job text (no invented facts).
3) Consider edge-cases: EMEA-only, CET-only, UK-only, hybrid-only, non-EU Europe.

Return JSON:
{
  "score": number (0..1),
  "isCorrect": boolean,
  "mainIssues": string[],
  "reasoning": string
}`;
    },
  })
  .generateScore(({ results }) => results.analyzeStepResult.score)
  .generateReason(({ results }) => results.analyzeStepResult.reasoning);

/* ------------------------------------------------------------------------------------------------
 * Deterministic sanity scorer: hasReason
 * ---------------------------------------------------------------------------------------------- */

const hasReasonScorer = createScorer<
  JobClassificationInput,
  JobClassificationResponse
>({
  id: "job-has-reason",
  description: "Score=1 iff reason is non-empty.",
}).generateScore(({ run }) => {
  const output = run.output as JobClassificationResponse;
  return (output.reason ?? "").trim().length > 0 ? 1 : 0;
});

/* ------------------------------------------------------------------------------------------------
 * Built-in scorers (configured for this step)
 * ---------------------------------------------------------------------------------------------- */

// Higher is better
const promptAlignmentScorer = wrapBuiltInScorerForStep({
  id: "job-prompt-alignment",
  description:
    "Built-in prompt-alignment: does output follow the rubric + required format?",
  baseScorer: createPromptAlignmentScorerLLM({ model: JUDGE_MODEL }),
  buildInput: buildJobClassificationPrompt,
  buildOutput: formatClassificationAsText,
});

// Higher is better
const answerRelevancyScorer = wrapBuiltInScorerForStep({
  id: "job-answer-relevancy",
  description:
    "Built-in answer-relevancy: is the output relevant to the prompt/job posting?",
  baseScorer: createAnswerRelevancyScorer({ model: JUDGE_MODEL }),
  buildInput: buildJobClassificationPrompt,
  buildOutput: formatClassificationAsText,
});

// Higher is better (no options)
const completenessScorer = wrapBuiltInScorerForStep({
  id: "job-completeness",
  description:
    "Built-in completeness over job text vs reason (coverage of key elements).",
  baseScorer: createCompletenessScorer(),
  buildInput: ({ title, location, description }) =>
    `Title: ${title}\nLocation: ${location}\nDescription: ${description}`,
  buildOutput: (o) => o.reason,
});

// Higher is better (no options)
const keywordCoverageScorer = wrapBuiltInScorerForStep({
  id: "job-keyword-coverage",
  description: "Built-in keyword-coverage over job text vs reason.",
  baseScorer: createKeywordCoverageScorer(),
  buildInput: ({ title, location, description }) =>
    `Title: ${title}\nLocation: ${location}\nDescription: ${description}`,
  buildOutput: (o) => o.reason,
});

// Higher is better (no options) – the docs call this "Tone Consistency Scorer", but the function is createToneScorer()
const toneConsistencyScorer = wrapBuiltInScorerForStep({
  id: "job-tone-consistency",
  description: "Built-in tone-consistency between prompt and explanation.",
  baseScorer: createToneScorer(),
  buildInput: buildJobClassificationPrompt,
  buildOutput: (o) => o.reason,
});

/**
 * Faithfulness needs context; we build it per-run from the job fields.
 * Higher is better.
 */
const faithfulnessScorer = wrapBuiltInScorerForStep({
  id: "job-faithfulness",
  description:
    "Built-in faithfulness: is the reason supported by the job text?",
  baseScorer: createFaithfulnessScorer({
    model: JUDGE_MODEL,
    options: {
      context: [], // We'll pass context via input string
    },
  }),
  buildInput: ({ title, location, description }) =>
    `Context:\nTitle: ${title}\nLocation: ${location}\nDescription: ${description}\n\nTask: Evaluate faithfulness.`,
  buildOutput: (o) => o.reason,
});

/**
 * Hallucination: built-in says "lower is better".
 * We invert it to expose a "non-hallucination" score where higher is better.
 *
 * NOTE: This scorer compares output against provided context. In many Mastra setups, context is populated
 * via tool calls / RAG. Here we embed the job text into the "input" string so the scorer has something to compare against.
 */
const nonHallucinationScorer = wrapBuiltInScorerForStep({
  id: "job-non-hallucination",
  description:
    "Built-in hallucination (inverted): higher means fewer contradictions/unsupported claims.",
  baseScorer: createHallucinationScorer({ model: JUDGE_MODEL }),
  buildInput: ({ title, location, description }) =>
    `Context:\nTitle: ${title}\nLocation: ${location}\nDescription: ${description}`,
  buildOutput: (o) => o.reason,
  transformScore: (raw) => 1 - raw,
  transformReason: ({ score, reason }) =>
    `raw_hallucination_score=${score ?? "n/a"} (lower is better). ${reason ?? ""}`.trim(),
});

/**
 * Context relevance: higher is better; we treat (job text + rubric) as "context" and see if the explanation uses it.
 */
const contextRelevanceScorer = wrapBuiltInScorerForStep({
  id: "job-context-relevance",
  description:
    "Built-in context-relevance over (job text + rubric) vs explanation.",
  baseScorer: createContextRelevanceScorerLLM({
    model: JUDGE_MODEL,
    options: {
      // We'll extract context from the input string we provide
      contextExtractor: (input) => {
        // input is a string here - extract the context pieces from it
        const inputStr = String(input);
        const contextMatch = inputStr.match(/Context:\n([\s\S]*?)\n\nTask:/);
        if (contextMatch) {
          return contextMatch[1].split("\n").filter((line) => line.trim());
        }
        return [inputStr];
      },
    },
  }),
  buildInput: (input) =>
    `Context:\n${buildContextPieces(input).join("\n")}\n\nTask: Determine whether the explanation appropriately uses the provided context for the classification task.`,
  buildOutput: (o) => o.reason,
});

/**
 * Toxicity: built-in says "lower is better". We invert to a "non-toxicity" score.
 */
const nonToxicityScorer = wrapBuiltInScorerForStep({
  id: "job-non-toxicity",
  description: "Built-in toxicity (inverted): higher means less toxic.",
  baseScorer: createToxicityScorer({ model: JUDGE_MODEL }),
  buildInput: () => "Evaluate toxicity of the following text.",
  buildOutput: (o) => o.reason,
  transformScore: (raw) => 1 - raw,
  transformReason: ({ score, reason }) =>
    `raw_toxicity_score=${score ?? "n/a"} (lower is better). ${reason ?? ""}`.trim(),
});

/**
 * Bias: built-in says "lower is better". We invert to a "non-bias" score.
 */
const nonBiasScorer = wrapBuiltInScorerForStep({
  id: "job-non-bias",
  description: "Built-in bias (inverted): higher means less bias.",
  baseScorer: createBiasScorer({ model: JUDGE_MODEL }),
  buildInput: () => "Evaluate bias of the following text.",
  buildOutput: (o) => o.reason,
  transformScore: (raw) => 1 - raw,
  transformReason: ({ score, reason }) =>
    `raw_bias_score=${score ?? "n/a"} (lower is better). ${reason ?? ""}`.trim(),
});

/**
 * Tool-call accuracy scorers (optional / future)
 * - These are useful only when your agent is calling tools.
 * - Keep them instantiated here so you can turn them on by raising sampling rates later.
 */
// Commented out until tools are implemented with proper expectedTool/expectedToolOrder parameters
// const toolCallAccuracyCode = createToolCallAccuracyScorerCode({});
// const toolCallAccuracyLLM = createToolCallAccuracyScorerLLM({
//   model: JUDGE_MODEL,
//   availableTools: [],
// });

/* ------------------------------------------------------------------------------------------------
 * Step + Workflow
 * ---------------------------------------------------------------------------------------------- */

const classifyJobStep = createStep({
  id: "classify-job",
  inputSchema: JobClassificationInputSchema,
  outputSchema: JobClassificationOutputSchema,

  scorers: {
    // Domain + sanity (always-on)
    remoteEUCorrectness: {
      scorer: remoteEUCorrectnessScorer,
      sampling: { type: "ratio", rate: 1 },
    },
    hasReason: {
      scorer: hasReasonScorer,
      sampling: { type: "ratio", rate: 1 },
    },

    // Built-in scorers (sampled)
    promptAlignment: {
      scorer: promptAlignmentScorer,
      sampling: { type: "ratio", rate: 0.25 },
    },
    answerRelevancy: {
      scorer: answerRelevancyScorer,
      sampling: { type: "ratio", rate: 0.25 },
    },
    completeness: {
      scorer: completenessScorer,
      sampling: { type: "ratio", rate: 0.25 },
    },
    keywordCoverage: {
      scorer: keywordCoverageScorer,
      sampling: { type: "ratio", rate: 0.25 },
    },
    toneConsistency: {
      scorer: toneConsistencyScorer,
      sampling: { type: "ratio", rate: 0.25 },
    },

    // Grounding / context
    faithfulness: {
      scorer: faithfulnessScorer,
      sampling: { type: "ratio", rate: 0.25 },
    },
    nonHallucination: {
      scorer: nonHallucinationScorer,
      sampling: { type: "ratio", rate: 0.25 },
    },
    contextRelevance: {
      scorer: contextRelevanceScorer,
      sampling: { type: "ratio", rate: 0.25 },
    },

    // Safety (lower rate, usually enough)
    nonToxicity: {
      scorer: nonToxicityScorer,
      sampling: { type: "ratio", rate: 0.1 },
    },
    nonBias: { scorer: nonBiasScorer, sampling: { type: "ratio", rate: 0.1 } },

    // Tool-call accuracy (disabled until you enable tools)
    // toolCallAccuracyCode: {
    //   scorer: toolCallAccuracyCode,
    //   sampling: { type: "ratio", rate: 0 },
    // },
    // toolCallAccuracyLLM: {
    //   scorer: toolCallAccuracyLLM,
    //   sampling: { type: "ratio", rate: 0 },
    // },
  },

  execute: async ({ inputData }) => {
    const response = await jobClassifierAgent.generate(
      [
        {
          role: "user",
          content: [
            { type: "text", text: buildJobClassificationPrompt(inputData) },
          ],
        },
      ],
      { structuredOutput: { schema: JobClassificationOutputSchema } },
    );

    const { object } = response || {};
    if (!object)
      throw new Error("Job classifier agent returned no structured output");
    return object;
  },
});

const classifyJobWorkflow = createWorkflow({
  id: "classify-job-workflow",
  inputSchema: JobClassificationInputSchema,
  outputSchema: JobClassificationOutputSchema,
})
  .then(classifyJobStep)
  .commit();

/* ------------------------------------------------------------------------------------------------
 * Public API
 * ---------------------------------------------------------------------------------------------- */

export const classifyJob = async (
  { title, location, description }: JobClassificationInput,
  jobId?: number,
): Promise<{
  ok: boolean;
  data?: JobClassificationResponse;
  error?: string;
}> => {
  try {
    const run = await classifyJobWorkflow.createRun();
    const result = await run.start({
      inputData: { title, location, description },
    });

    if (result.status !== "success") {
      return {
        ok: false,
        error: `Could not classify job (workflow status: ${result.status})`,
      };
    }

    const classification = result.result as JobClassificationResponse;

    // Fast deterministic business mapping (do NOT wait for async scorer results)
    if (jobId) {
      try {
        const status = classification.isRemoteEU ? "eu-remote" : "non-eu";
        const score =
          classification.confidence === "high"
            ? 0.9
            : classification.confidence === "medium"
              ? 0.6
              : 0.3;

        await db
          .update(jobs)
          .set({
            status,
            score,
            score_reason: classification.reason,
            is_remote_eu: classification.isRemoteEU,
            remote_eu_confidence: classification.confidence,
            remote_eu_reason: classification.reason,
            updated_at: new Date().toISOString(),
          })
          .where(eq(jobs.id, jobId));
      } catch (dbErr) {
        console.error("Error saving classification to database:", dbErr);
      }
    }

    return { ok: true, data: classification };
  } catch (err) {
    console.error("Error classifying job:", err);
    return { ok: false, error: "Could not classify job" };
  }
};
