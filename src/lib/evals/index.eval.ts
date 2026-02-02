import { Eval } from "braintrust";
import { remoteEUTestCases } from "./remote-eu-test-data";
import { classifyJob } from "../mastra/actions";
import { scoreRemoteEUClassification } from "./scorers/remote-eu-scorer";
import type { RemoteEUClassification } from "./scorers/remote-eu-scorer";

const jobClassificationScorer = ({
  output,
  expected,
}: {
  output: RemoteEUClassification;
  expected: RemoteEUClassification;
}) => {
  const isCorrect = output?.isRemoteEU === expected?.isRemoteEU;
  const confidenceMatch = output?.confidence === expected?.confidence;

  return {
    name: "jobClassificationScorer",
    score: isCorrect ? (confidenceMatch ? 1 : 0.5) : 0,
  };
};

Eval("Remote EU Job Classification", {
  data: () => {
    return remoteEUTestCases.slice(0, 5).map((testCase) => ({
      input: testCase.jobPosting,
      expected: testCase.expectedClassification,
    }));
  },
  task: async (input) => {
    const result = await classifyJob({
      title: input.title,
      location: input.location,
      description: input.description,
    });

    if (!result.ok || !result.data) {
      return {
        isRemoteEU: false,
        confidence: "low" as const,
        reason: "Classification failed",
      };
    }

    return result.data;
  },
  scores: [jobClassificationScorer],
});
