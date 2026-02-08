/**
 * Remote EU Classification Evals
 * Regression tests for job posting classification accuracy
 *
 * Run with: pnpm test:eval
 * 
 * @see src/evals/remote-eu/ - Centralized evaluation module
 */

import { describe, it, expect } from "vitest";
import {
  scoreRemoteEUClassification,
  remoteEUTestCases,
  type RemoteEUClassification,
} from "./remote-eu";

// Mock classifier function - replace this with your actual implementation
async function classifyRemoteEU(jobPosting: {
  title: string;
  location: string;
  description: string;
}): Promise<RemoteEUClassification> {
  // TODO: Replace with actual classification logic
  // This could call your AI agent, use rules, or a combination

  const location = jobPosting.location.toLowerCase();
  const description = jobPosting.description.toLowerCase();

  // Simple rule-based mock for demonstration
  // In production, this would be your AI agent or classifier

  // Explicit EU mentions
  if (location.includes("remote - eu") || location.includes("remote eu")) {
    return {
      isRemoteEU: true,
      confidence: "high",
      reason: "Explicit EU remote mention in location",
    };
  }

  // EMEA without EU restriction
  if (
    location.includes("emea") &&
    !description.includes("eu member") &&
    !description.includes("european union")
  ) {
    return {
      isRemoteEU: false,
      confidence: "high",
      reason: "EMEA includes non-EU countries",
    };
  }

  // UK only
  if (location.includes("uk") && !location.includes("eu")) {
    return {
      isRemoteEU: false,
      confidence: "high",
      reason: "UK is not part of EU",
    };
  }

  // Switzerland
  if (location.includes("switzerland")) {
    return {
      isRemoteEU: false,
      confidence: "high",
      reason: "Switzerland is not an EU member",
    };
  }

  // EU work authorization
  if (
    description.includes("eu work authorization") ||
    description.includes("eu passport")
  ) {
    return {
      isRemoteEU: true,
      confidence: "high",
      reason: "Requires EU work authorization",
    };
  }

  // Default fallback
  return {
    isRemoteEU: false,
    confidence: "low",
    reason: "Unable to determine with confidence",
  };
}

describe("Remote EU Classification Evals", () => {
  remoteEUTestCases.forEach((testCase) => {
    it(`should correctly classify: ${testCase.description}`, async () => {
      // Get actual classification from your classifier
      const actualClassification = await classifyRemoteEU(testCase.jobPosting);

      // Run scorer
      const result = scoreRemoteEUClassification({
        jobPosting: testCase.jobPosting,
        expectedClassification: testCase.expectedClassification,
        actualClassification,
      });

      // Log detailed results
      console.log(`\nTest Case: ${testCase.id}`);
      console.log(`Description: ${testCase.description}`);
      console.log(`Score: ${result.score}`);
      console.log(`Expected:`, testCase.expectedClassification);
      console.log(`Actual:`, actualClassification);
      if (result.metadata) {
        console.log(`Metadata:`, result.metadata);
      }

      // Assert minimum score threshold
      // 1.0 = perfect match (correct classification + confidence)
      // 0.5 = correct classification but wrong confidence
      // 0.0 = wrong classification
      expect(result.score).toBeGreaterThanOrEqual(0.5);

      // For high confidence expectations, require perfect match
      if (testCase.expectedClassification.confidence === "high") {
        expect(result.score).toBe(1.0);
      }
    });
  });

  it("should report overall accuracy", async () => {
    let totalScore = 0;
    let perfectMatches = 0;

    for (const testCase of remoteEUTestCases) {
      const actualClassification = await classifyRemoteEU(testCase.jobPosting);
      const result = scoreRemoteEUClassification({
        jobPosting: testCase.jobPosting,
        expectedClassification: testCase.expectedClassification,
        actualClassification,
      });

      totalScore += result.score;
      if (result.score === 1.0) perfectMatches++;
    }

    const accuracy = totalScore / remoteEUTestCases.length;
    const perfectMatchRate = perfectMatches / remoteEUTestCases.length;

    console.log("\n=== Overall Results ===");
    console.log(`Total test cases: ${remoteEUTestCases.length}`);
    console.log(`Average accuracy: ${(accuracy * 100).toFixed(2)}%`);
    console.log(
      `Perfect matches: ${perfectMatches}/${remoteEUTestCases.length} (${(perfectMatchRate * 100).toFixed(2)}%)`,
    );

    // Set your quality threshold
    expect(accuracy).toBeGreaterThanOrEqual(0.8); // 80% minimum accuracy
  });
});
