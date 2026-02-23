#!/usr/bin/env tsx

/**
 * Remote EU Job Classification Evaluation with Langfuse
 *
 * Uses Vercel AI SDK for classification and Langfuse for tracing.
 *
 * Usage:
 *   pnpm tsx scripts/eval-remote-eu-langfuse.ts
 */

import { Langfuse } from "langfuse";
import { getPrompt, PROMPTS } from "../src/observability";
import { remoteEUTestCases } from "../src/evals/remote-eu/test-data";
import { scoreRemoteEUClassification } from "../src/evals/remote-eu/scorers";
import type { RemoteEUClassification } from "../src/evals/remote-eu/schema";
import { deepseek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { z } from "zod";
import {
  LANGFUSE_SECRET_KEY,
  LANGFUSE_PUBLIC_KEY,
  LANGFUSE_BASE_URL,
} from "../src/config/env";

// Initialize Langfuse client
const langfuse = new Langfuse({
  secretKey: LANGFUSE_SECRET_KEY,
  publicKey: LANGFUSE_PUBLIC_KEY,
  baseUrl: LANGFUSE_BASE_URL,
});

// Remote EU classification schema
const remoteEUSchema = z.object({
  isRemoteEU: z.boolean().describe("Whether the job is a remote EU position"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confidence level of the classification"),
  reason: z.string().describe("Explanation for the classification decision"),
});

interface EvaluationResult {
  testCaseId: string;
  description: string;
  score: number;
  isCorrect: boolean;
  confidenceMatch: boolean;
  expected: RemoteEUClassification;
  actual: RemoteEUClassification;
  traceUrl?: string;
}

async function evaluateTestCase(
  testCase: (typeof remoteEUTestCases)[0],
  promptText: string,
  sessionId: string,
): Promise<EvaluationResult> {
  console.log(`\nEvaluating: ${testCase.description}`);
  console.log(`   Location: ${testCase.jobPosting.location}`);
  console.log(`   Title: ${testCase.jobPosting.title}`);

  const trace = langfuse.trace({
    name: "remote-eu-classification",
    sessionId,
    metadata: {
      testCaseId: testCase.id,
      description: testCase.description,
    },
  });

  try {
    const generation = trace.generation({
      name: "classify-job",
      model: "deepseek-chat",
      input: {
        jobPosting: testCase.jobPosting,
        prompt: promptText,
      },
      metadata: {
        testCase: testCase.id,
      },
    });

    const result = await generateObject({
      model: deepseek("deepseek-chat"),
      system: promptText,
      prompt: `Job Title: ${testCase.jobPosting.title}
Location: ${testCase.jobPosting.location}
Description: ${testCase.jobPosting.description}

Classify this job posting.`,
      schema: remoteEUSchema,
    });

    const actualClassification: RemoteEUClassification = result.object;

    generation.update({
      output: actualClassification,
      usage: {
        promptTokens: result.usage?.promptTokens || 0,
        completionTokens: result.usage?.completionTokens || 0,
        totalTokens: result.usage?.totalTokens || 0,
      },
    });

    const scoreResult = scoreRemoteEUClassification({
      jobPosting: testCase.jobPosting,
      expectedClassification: testCase.expectedClassification,
      actualClassification,
    });

    trace.score({
      name: "remote-eu-accuracy",
      value: scoreResult.score,
      comment: scoreResult.metadata.isCorrect
        ? "Correct classification"
        : `Incorrect: Expected ${scoreResult.metadata.expected.isRemoteEU}, got ${scoreResult.metadata.actual.isRemoteEU}`,
    });

    trace.score({
      name: "confidence-match",
      value: scoreResult.metadata.confidenceMatch ? 1 : 0,
      comment: `Expected: ${scoreResult.metadata.expected.confidence}, Got: ${scoreResult.metadata.actual.confidence}`,
    });

    generation.end();

    console.log(
      `   Result: ${actualClassification.isRemoteEU ? "EU Remote" : "Non-EU"} (${actualClassification.confidence})`,
    );
    console.log(
      `   Expected: ${testCase.expectedClassification.isRemoteEU ? "EU Remote" : "Non-EU"} (${testCase.expectedClassification.confidence})`,
    );
    console.log(
      `   Score: ${scoreResult.score} ${scoreResult.metadata.isCorrect ? "PASS" : "FAIL"}`,
    );

    return {
      testCaseId: testCase.id,
      description: testCase.description,
      score: scoreResult.score,
      isCorrect: scoreResult.metadata.isCorrect,
      confidenceMatch: scoreResult.metadata.confidenceMatch,
      expected: testCase.expectedClassification,
      actual: actualClassification,
      traceUrl: trace.url,
    };
  } catch (error) {
    console.error(
      `   Error evaluating test case ${testCase.id}:`,
      error instanceof Error ? error.message : error,
    );

    trace.update({
      level: "ERROR",
      output: { error: error instanceof Error ? error.message : String(error) },
    });

    throw error;
  }
}

async function runEvaluation() {
  console.log("Remote EU Job Classification Evaluation");
  console.log("==========================================\n");

  console.log("Fetching prompt from Langfuse...");
  const { text: promptText } = await getPrompt(PROMPTS.JOB_CLASSIFIER);
  console.log(`Using latest prompt version\n${promptText.substring(0, 100)}...\n`);

  const testCases = remoteEUTestCases;
  console.log(`Running ${testCases.length} test cases...`);

  const sessionId = `eval-${Date.now()}`;
  const results: EvaluationResult[] = [];

  for (const testCase of testCases) {
    try {
      const result = await evaluateTestCase(testCase, promptText, sessionId);
      results.push(result);
    } catch (error) {
      console.error(`Failed to evaluate ${testCase.id}, skipping...`);
    }
  }

  console.log("\nSending traces to Langfuse...");
  await langfuse.flushAsync();

  console.log("\n\nEVALUATION SUMMARY");
  console.log("=====================\n");

  const correctClassifications = results.filter((r) => r.isCorrect).length;
  const accuracy = (correctClassifications / results.length) * 100;
  const avgScore =
    results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const confidenceMatches = results.filter((r) => r.confidenceMatch).length;
  const confidenceAccuracy = (confidenceMatches / results.length) * 100;

  console.log(`Total Test Cases: ${results.length}`);
  console.log(
    `Correct Classifications: ${correctClassifications}/${results.length}`,
  );
  console.log(`Accuracy: ${accuracy.toFixed(1)}%`);
  console.log(`Average Score: ${avgScore.toFixed(2)}`);
  console.log(
    `Confidence Match: ${confidenceMatches}/${results.length} (${confidenceAccuracy.toFixed(1)}%)`,
  );

  const failures = results.filter((r) => !r.isCorrect);
  if (failures.length > 0) {
    console.log("\nFAILED CLASSIFICATIONS:");
    failures.forEach((f) => {
      console.log(`\n  ${f.testCaseId}: ${f.description}`);
      console.log(
        `    Expected: ${f.expected.isRemoteEU ? "EU Remote" : "Non-EU"} (${f.expected.confidence})`,
      );
      console.log(
        `    Got: ${f.actual.isRemoteEU ? "EU Remote" : "Non-EU"} (${f.actual.confidence})`,
      );
      console.log(`    Expected Reason: ${f.expected.reason}`);
      console.log(`    Actual Reason: ${f.actual.reason}`);
    });
  }

  console.log("\nEvaluation complete!");

  if (accuracy < 80) {
    console.log("\nWarning: Accuracy below 80% threshold");
    process.exit(1);
  }
}

runEvaluation().catch((error) => {
  console.error("Evaluation failed:", error);
  process.exit(1);
});
