// test-live-workflow.ts - Quick test of live workflow
import { remoteAiJobsLast24hWorldwideEuWorkflow } from "./src/brave/remote-ai-jobs-last-24h-worldwide-eu.js";

async function test() {
  console.log("Testing live workflow...");

  try {
    const result = await remoteAiJobsLast24hWorldwideEuWorkflow.execute({
      triggerData: {
        maxCandidatesPerMode: 5,
        verifyTopNWithContext: 3,
        minConfidence: 0.6,
        queryHint: "agentic",
      },
    });

    console.log("\n✅ Success!");
    console.log("Worldwide jobs:", result.worldwide?.length ?? 0);
    console.log("Europe jobs:", result.europe?.length ?? 0);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }
  }
}

test();
