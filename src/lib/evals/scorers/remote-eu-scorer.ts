import { z } from "zod";

/**
 * Remote EU Classification Scorer
 * Scores job classification accuracy for Remote EU jobs
 */

const remoteEUClassificationSchema = z.object({
  isRemoteEU: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  reason: z.string(),
});

export type RemoteEUClassification = z.infer<
  typeof remoteEUClassificationSchema
>;

export type RemoteEUScoreInput = {
  jobPosting: {
    title: string;
    location: string;
    description: string;
  };
  expectedClassification: RemoteEUClassification;
  actualClassification: RemoteEUClassification;
};

export type RemoteEUScoreResult = {
  score: number;
  metadata: {
    expected: RemoteEUClassification;
    actual: RemoteEUClassification;
    isCorrect: boolean;
    confidenceMatch: boolean;
    details: {
      jobTitle: string;
      location: string;
      expectedReason: string;
      actualReason: string;
    };
  };
};

export function scoreRemoteEUClassification(
  input: RemoteEUScoreInput,
): RemoteEUScoreResult {
  const { expectedClassification, actualClassification, jobPosting } = input;

  const isCorrect =
    expectedClassification.isRemoteEU === actualClassification.isRemoteEU;

  let confidenceScore = 1;
  if (expectedClassification.confidence !== actualClassification.confidence) {
    confidenceScore = 0.5;
  }

  const score = isCorrect ? confidenceScore : 0;

  return {
    score,
    metadata: {
      expected: expectedClassification,
      actual: actualClassification,
      isCorrect,
      confidenceMatch:
        expectedClassification.confidence === actualClassification.confidence,
      details: {
        jobTitle: jobPosting.title,
        location: jobPosting.location,
        expectedReason: expectedClassification.reason,
        actualReason: actualClassification.reason,
      },
    },
  };
}

// Mastra-compatible scorer function
export const remoteEUScorer = {
  name: "remote-eu-classifier",
  description: "Evaluates job classification accuracy for Remote EU positions",
  scorer: async ({ output }: { output: any }) => {
    const classification = output as RemoteEUClassification;

    // Higher score for high confidence classifications
    const confidenceScore =
      classification.confidence === "high"
        ? 1.0
        : classification.confidence === "medium"
          ? 0.7
          : 0.4;

    return {
      score: confidenceScore,
      label: classification.isRemoteEU ? "eu-remote" : "non-eu",
      metadata: {
        confidence: classification.confidence,
        reason: classification.reason,
        isRemoteEU: classification.isRemoteEU,
      },
    };
  },
};
