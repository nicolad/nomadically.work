import { createScorer } from "@mastra/core/evals";
import type {
  RemoteEUClassification,
  RemoteEUScoreInput,
  RemoteEUScoreResult,
} from "./schema";

/**
 * Detailed scorer for Remote EU classification evaluation.
 * 
 * Scoring logic:
 * - Correct classification + matching confidence = 1.0
 * - Correct classification + mismatched confidence = 0.5
 * - Incorrect classification = 0.0
 * 
 * @param input - Contains job posting, expected, and actual classifications
 * @returns Score (0-1) with detailed metadata
 */
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

/**
 * Mastra-compatible scorer for Remote EU classification.
 * 
 * Evaluates classification quality based on confidence level:
 * - High confidence: 1.0
 * - Medium confidence: 0.7
 * - Low confidence: 0.4
 * 
 * Use with Mastra's evaluation framework for live scoring.
 */
export const remoteEUScorer = createScorer({
  id: "remote-eu-classifier",
  description: "Evaluates job classification accuracy for Remote EU positions",
})
  .generateScore(({ run }) => {
    const classification = run.output as RemoteEUClassification;

    // Higher score for high confidence classifications
    const confidenceScore =
      classification.confidence === "high"
        ? 1.0
        : classification.confidence === "medium"
          ? 0.7
          : 0.4;

    return confidenceScore;
  })
  .generateReason(({ run }) => {
    const classification = run.output as RemoteEUClassification;
    return `Classification: ${classification.isRemoteEU ? "EU Remote" : "Non-EU"} (${classification.confidence} confidence) - ${classification.reason}`;
  });


