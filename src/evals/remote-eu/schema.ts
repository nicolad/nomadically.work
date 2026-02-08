import { z } from "zod";

/**
 * Schema for Remote EU job classification results.
 * 
 * Defines the structure of classification outputs including
 * boolean decision, confidence level, and reasoning.
 */
export const remoteEUClassificationSchema = z.object({
  isRemoteEU: z.boolean().describe("Whether the job is a Remote EU position"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confidence level of the classification"),
  reason: z.string().describe("Explanation for the classification decision"),
});

/**
 * Type representing a Remote EU classification result.
 */
export type RemoteEUClassification = z.infer<
  typeof remoteEUClassificationSchema
>;

/**
 * Input structure for scoring Remote EU classifications.
 */
export type RemoteEUScoreInput = {
  jobPosting: {
    title: string;
    location: string;
    description: string;
  };
  expectedClassification: RemoteEUClassification;
  actualClassification: RemoteEUClassification;
};

/**
 * Result structure from scoring a Remote EU classification.
 */
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

/**
 * Test case structure for Remote EU classification evaluation.
 */
export type RemoteEUTestCase = {
  id: string;
  description: string;
  jobPosting: {
    title: string;
    location: string;
    description: string;
  };
  expectedClassification: RemoteEUClassification;
};
