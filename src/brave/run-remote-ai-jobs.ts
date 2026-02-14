/**
 * Runner script for Remote AI Jobs Workflow
 *
 * Searches for fully-remote AI/ML/LLM engineering jobs posted in last 24h
 * Returns two buckets: worldwide and europe
 *
 * Usage:
 *   pnpm tsx src/brave/run-remote-ai-jobs.ts
 *   pnpm tsx src/brave/run-remote-ai-jobs.ts --hint "LangChain OR CrewAI"
 */
import { remoteAiJobsLast24hWorldwideEuWorkflow } from "./remote-ai-jobs-last-24h-worldwide-eu";
import { writeFileSync } from "fs";

async function main() {
  // Parse query hint from command line args
  const args = process.argv.slice(2);
  const hintIndex = args.indexOf("--hint");
  const queryHint = hintIndex !== -1 ? args[hintIndex + 1] : undefined;

  console.log("🔍 Searching for remote AI jobs (last 24h)...");
  if (queryHint) {
    console.log(`   Query hint: ${queryHint}`);
  }

  const startTime = Date.now();

  try {
    // Create and execute the workflow run
    const run = await remoteAiJobsLast24hWorldwideEuWorkflow.createRun();
    const workflowResult = await run.start({
      inputData: {
        queryHint,
        maxCandidatesPerMode: 40,
        verifyTopNWithContext: 12,
        minConfidence: 0.55,
      },
    });

    if (workflowResult.status !== "success" || !workflowResult.result) {
      console.error("\\n❌ Workflow failed:", workflowResult.status);
      process.exit(1);
    }

    const result = workflowResult.result;
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("\n✅ Search complete!");
    console.log(`   Duration: ${duration}s`);
    console.log(`   Worldwide jobs: ${result.worldwide.length}`);
    console.log(`   Europe jobs: ${result.europe.length}`);

    // Display jobs
    if (result.worldwide.length > 0) {
      console.log("\n🌍 WORLDWIDE REMOTE JOBS:");
      result.worldwide.forEach((job: any, i: number) => {
        const hours = job.postedHoursAgo ?? "?";
        const confidence = (job.confidence * 100).toFixed(0);
        console.log(
          `\n${i + 1}. ${job.title} @ ${job.company} (${hours}h ago, ${confidence}% confidence)`,
        );
        console.log(`   ${job.sourceUrl}`);
        if (job.applyUrl) {
          console.log(`   Apply: ${job.applyUrl}`);
        }
        if (job.evidence.length > 0) {
          console.log(`   Evidence: ${job.evidence[0]}`);
        }
      });
    }

    if (result.europe.length > 0) {
      console.log("\n🇪🇺 EUROPE REMOTE JOBS:");
      result.europe.forEach((job: any, i: number) => {
        const hours = job.postedHoursAgo ?? "?";
        const confidence = (job.confidence * 100).toFixed(0);
        console.log(
          `\n${i + 1}. ${job.title} @ ${job.company} (${hours}h ago, ${confidence}% confidence)`,
        );
        console.log(`   ${job.sourceUrl}`);
        if (job.applyUrl) {
          console.log(`   Apply: ${job.applyUrl}`);
        }
        if (job.evidence.length > 0) {
          console.log(`   Evidence: ${job.evidence[0]}`);
        }
      });
    }

    // Save results to JSON
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `results/remote-ai-jobs-${timestamp}.json`;
    writeFileSync(
      filename,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          queryHint,
          duration,
          worldwide: result.worldwide,
          europe: result.europe,
        },
        null,
        2,
      ),
    );
    console.log(`\n💾 Results saved to: ${filename}`);
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
