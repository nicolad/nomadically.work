"use server";

import { mastra } from "@/mastra";
import { z } from "zod";
import type { RemoteEUClassification } from "@/lib/evals/scorers/remote-eu-scorer";

export type JobClassificationInput = {
  title: string;
  location: string;
  description: string;
};

export type JobClassificationResponse = RemoteEUClassification;

export const classifyJob = async ({
  title,
  location,
  description,
}: JobClassificationInput): Promise<{
  ok: boolean;
  data?: JobClassificationResponse;
  error?: string;
}> => {
  try {
    const jobClassifierAgent = mastra.getAgent("jobClassifierAgent");

    console.log("Calling job classifier agent");

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

Consider:
- EMEA includes non-EU countries (UK post-Brexit, Switzerland, Middle East)
- CET timezone is not exclusive to EU
- UK is not part of EU since Brexit
- EU work authorization suggests EU remote
- Must be fully remote, not hybrid or onsite

Provide your classification with confidence level and reasoning.`,
            },
          ],
        },
      ],
      {
        structuredOutput: {
          schema: z.object({
            isRemoteEU: z.boolean(),
            confidence: z.enum(["high", "medium", "low"]),
            reason: z.string(),
          }),
        },
      },
    );

    const { object } = response || {};

    console.log(
      "Job classification response:",
      JSON.stringify(object, null, 2),
    );

    return { ok: true, data: object as JobClassificationResponse };
  } catch (err) {
    console.error("Error classifying job:", err);
    return { ok: false, error: "Could not classify job" };
  }
};
