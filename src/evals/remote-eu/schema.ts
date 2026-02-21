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
    country?: string;
    workplace_type?: string;
    is_remote?: boolean;
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
    /** ISO 3166 country code from ATS enrichment (e.g. "DE", "US") */
    country?: string;
    /** ATS workplace type (e.g. "remote", "hybrid", "on-site") */
    workplace_type?: string;
    /** ATS remote flag (from any ATS provider) */
    is_remote?: boolean;
  };
  expectedClassification: RemoteEUClassification;
};
