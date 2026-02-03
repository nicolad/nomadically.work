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
