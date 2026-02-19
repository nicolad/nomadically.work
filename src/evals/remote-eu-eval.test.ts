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

// EU member countries list for validation
const EU_MEMBERS = new Set([
  "austria", "belgium", "bulgaria", "croatia", "cyprus", "czech republic",
  "czechia", "denmark", "estonia", "finland", "france", "germany", "greece",
  "hungary", "ireland", "italy", "latvia", "lithuania", "luxembourg", "malta",
  "netherlands", "poland", "portugal", "romania", "slovakia", "slovenia",
  "spain", "sweden"
]);

const EEA_NON_EU = new Set(["norway", "iceland", "liechtenstein"]);
const SCHENGEN_ONLY = new Set(["switzerland"]);
const UK = "united kingdom";
const NON_EU_REGIONS = new Set(["middle east", "africa", "asia", "america"]);

// Mock classifier function with improved EU-remote detection
async function classifyRemoteEU(jobPosting: {
  title: string;
  location: string;
  description: string;
}): Promise<RemoteEUClassification> {
  const location = jobPosting.location.toLowerCase().trim();
  const description = jobPosting.description.toLowerCase();
  const title = jobPosting.title.toLowerCase();
  const fullText = `${title} ${location} ${description}`;

  // Rule 0: Not fully remote (check first, highest priority for rejection)
  const isRemote = location.includes("remote") ||
                   description.includes("fully remote") ||
                   location.includes("work from");

  if (!isRemote && (location.includes("hybrid") ||
                     location.includes("office") ||
                     location.includes("on-site") ||
                     location.includes("onsite") ||
                     description.includes("days per week in office") ||
                     description.includes("3 days onsite") ||
                     description.match(/\d+\s*days?\s*(?:per\s*)?week\s*in\s*office/))) {
    return {
      isRemoteEU: false,
      confidence: "high",
      reason: "Position is not fully remote",
    };
  }

  // Rule 1: Explicit EU-only remote mentions (highest priority)
  // Use word boundaries to distinguish "eu" from "europe"
  const isExplicitEURemote =
    location.includes("remote - eu") ||
    location.includes("remote eu") ||
    location.includes("eu only") ||
    location.match(/\beu\b.*\bonly\b/) ||
    (location.includes("remote") && location.includes(" eu") && !location.includes("remote - europe"));

  if (isExplicitEURemote) {
    return {
      isRemoteEU: true,
      confidence: "high",
      reason: "Explicitly states EU-only remote work",
    };
  }

  // Rule 2: Specific EU countries listed (only EU countries, no EMEA/UK/Switzerland)
  const mentionedCountries = Array.from(EU_MEMBERS).filter(country =>
    location.includes(country) || fullText.includes(country)
  );

  if (mentionedCountries.length > 0) {
    // Check for non-EU countries in the same location
    const hasNonEU = location.includes("uk") ||
                    location.includes("switzerland") ||
                    location.includes("emea") ||
                    location.includes("worldwide");

    if (!hasNonEU) {
      return {
        isRemoteEU: true,
        confidence: "high",
        reason: `Lists only EU member countries: ${mentionedCountries.slice(0, 3).join(", ")}${mentionedCountries.length > 3 ? ", ..." : ""}`,
      };
    }
  }

  // Rule 3: EU work authorization/passport requirement (strong signal)
  if (
    description.includes("eu work authorization") ||
    description.includes("eu passport") ||
    description.includes("eu citizen") ||
    description.includes("right to work in the eu") ||
    description.includes("eu residency")
  ) {
    return {
      isRemoteEU: true,
      confidence: "high",
      reason: "Requires EU work authorization or residency",
    };
  }

  // Rule 4: EMEA explicitly restricted to EU only
  if (location.includes("emea") && description.includes("eu member")) {
    return {
      isRemoteEU: true,
      confidence: "high",
      reason: "EMEA explicitly restricted to EU member states",
    };
  }

  // Rule 5: EEA mention (includes non-EU but majority EU)
  if (location.includes("eea") && !location.includes("emea")) {
    return {
      isRemoteEU: true,
      confidence: "medium",
      reason: "EEA includes EU countries plus Norway, Iceland, Liechtenstein",
    };
  }

  // Rule 6: Mixed EU + non-EU countries
  const hasMixedRegions = (location.includes("eu") || mentionedCountries.length > 0) &&
                         (location.includes("uk") || location.includes("switzerland") || location.includes("emea"));

  if (hasMixedRegions && mentionedCountries.length > 0) {
    return {
      isRemoteEU: true,
      confidence: "medium",
      reason: "Includes EU countries among other regions",
    };
  }

  // Rule 7: EMEA (includes non-EU countries - reject)
  if (location.includes("emea") && !location.includes("eu member")) {
    return {
      isRemoteEU: false,
      confidence: "high",
      reason: "EMEA includes non-EU countries (UK post-Brexit, Switzerland, Middle East)",
    };
  }

  // Rule 8: Generic "Remote - Europe" without EU spec - CHECK EARLY (ambiguous)
  // Must check for explicit EU mention (not just 'eu' substring in 'europe')
  const hasExplicitEU = /\beu\b/.test(location) ||
                        location.includes("eu only") ||
                        location.includes("eu member") ||
                        location.includes("eu countries");
  const hasEEA = location.includes("eea");

  if (location.includes("remote") && location.includes("europe") &&
      !mentionedCountries.length &&
      !hasExplicitEU &&
      !hasEEA) {
    return {
      isRemoteEU: false,
      confidence: "low",
      reason: "Europe is too broad - could include non-EU countries",
    };
  }

  // Rule 9: CET/CEST timezone mention (ambiguous - not exclusive to EU)
  if ((location.includes("cet") || location.includes("cest")) &&
      !location.includes("eu") &&
      !mentionedCountries.length) {
    return {
      isRemoteEU: false,
      confidence: "medium",
      reason: "CET timezone is not exclusive to EU (includes Switzerland, some African countries)",
    };
  }

  // Rule 10: UK-only positions (post-Brexit, not EU)
  if (location.includes("uk") && !location.includes("eu") && !location.includes("emea")) {
    return {
      isRemoteEU: false,
      confidence: "high",
      reason: "UK is not part of the EU since Brexit",
    };
  }

  // Rule 11: Switzerland-only (not EU, but Schengen)
  if (location.includes("switzerland") && !location.includes("eu")) {
    return {
      isRemoteEU: false,
      confidence: "high",
      reason: "Switzerland is not an EU member state",
    };
  }

  // Rule 12: Schengen area mention (partially EU, ambiguous)
  if (location.includes("schengen")) {
    return {
      isRemoteEU: true,
      confidence: "medium",
      reason: "Most Schengen countries are EU members, though some are not",
    };
  }

  // Rule 13: Worldwide or global scope (unlikely to be EU-only)
  if ((location.includes("worldwide") || location.includes("global")) &&
      !location.includes("eu")) {
    return {
      isRemoteEU: false,
      confidence: "high",
      reason: "Worldwide scope does not restrict to EU",
    };
  }

  // Default fallback - insufficient information
  return {
    isRemoteEU: false,
    confidence: "low",
    reason: "Unable to determine with confidence from available information",
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
