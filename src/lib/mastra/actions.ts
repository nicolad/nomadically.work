"use server";

import { mastra } from "@/mastra";
import { z } from "zod";
import { createWorkflow, createStep } from "@mastra/core/workflows";
import type { RemoteEUClassification } from "@/lib/evals/scorers/remote-eu-scorer";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

export type JobClassificationInput = {
  title: string;
  location: string;
  description: string;
};

export type JobClassificationResponse = RemoteEUClassification;

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

const classifyJobStep = createStep({
  id: "classify-job",
  inputSchema: JobClassificationInputSchema,
  outputSchema: JobClassificationOutputSchema,

  execute: async ({ inputData }) => {
    const { title, location, description } = inputData;

    const jobClassifierAgent = mastra.getAgent("jobClassifierAgent");

    console.log("=== Job Classification Debug ===");
    console.log("Title:", title);
    console.log("Location:", location);
    console.log("Description preview:", description.substring(0, 200));

    const response = await jobClassifierAgent.generate(
      [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this job posting and determine if it is a Remote EU position.

Title: ${title}
Location: ${location}
Description: ${description}

EU Countries include: Germany, France, Ireland, Poland, Romania, Netherlands, Belgium, Spain, Italy, Portugal, Austria, Sweden, Denmark, Finland, Czech Republic, Greece, Hungary, and others in the European Union.

NOT EU: UK (post-Brexit), Switzerland, Norway, Turkey, Middle East countries.

Consider ALL locations listed (primary and secondary). A job is Remote EU if:
- It explicitly mentions remote work in EU countries
- Lists specific EU cities/countries in locations (e.g., "Germany - Berlin", "Poland - Warsaw", "Ireland - Dublin")
- States "EU remote" or "European Union"
- Requires EU work authorization

NOT Remote EU if:
- Only mentions EMEA (includes non-EU)
- Only mentions CET timezone (not specific to EU)
- Only UK locations (UK is not EU)
- Hybrid or office-based only
- Only non-EU European countries (Switzerland, Norway, UK)

Provide your classification with confidence level and reasoning.`,
            },
          ],
        },
      ],
      {
        structuredOutput: {
          schema: JobClassificationOutputSchema,
        },
      },
    );

    const { object } = response || {};
    if (!object)
      throw new Error("Job classifier agent returned no structured output");

    console.log("=== Classification Result ===");
    console.log("IsRemoteEU:", object.isRemoteEU);
    console.log("Confidence:", object.confidence);
    console.log("Reason:", object.reason);
    console.log("=============================");

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
      console.error("Workflow did not succeed:", result.status, result);
      return {
        ok: false,
        error: `Could not classify job (workflow status: ${result.status})`,
      };
    }

    const classification = result.result as JobClassificationResponse;

    // Save classification result to database if jobId is provided
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
            updated_at: new Date().toISOString(),
          })
          .where(eq(jobs.id, jobId));

        console.log(`Saved classification for job ${jobId}:`, {
          status,
          score,
          reason: classification.reason,
        });
      } catch (dbErr) {
        console.error("Error saving classification to database:", dbErr);
        // Don't fail the whole operation if DB save fails
      }
    }

    return { ok: true, data: classification };
  } catch (err) {
    console.error("Error classifying job:", err);
    return { ok: false, error: "Could not classify job" };
  }
};
