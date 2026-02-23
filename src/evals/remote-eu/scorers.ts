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
 * Confidence-based scorer for Remote EU classification.
 *
 * - High confidence: 1.0
 * - Medium confidence: 0.7
 * - Low confidence: 0.4
 */
export function scoreRemoteEUConfidence(
  classification: RemoteEUClassification,
): { score: number; reason: string } {
  const confidenceScore =
    classification.confidence === "high"
      ? 1.0
      : classification.confidence === "medium"
        ? 0.7
        : 0.4;

  return {
    score: confidenceScore,
    reason: `Classification: ${classification.isRemoteEU ? "EU Remote" : "Non-EU"} (${classification.confidence} confidence) - ${classification.reason}`,
  };
}
