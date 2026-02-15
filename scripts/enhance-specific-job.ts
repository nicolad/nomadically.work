#!/usr/bin/env tsx

import { config } from "dotenv";
import { db } from "../src/db";
import { jobs } from "../src/db/schema";
import { like } from "drizzle-orm";
import {
  fetchGreenhouseJobPost,
  saveGreenhouseJobData,
} from "../src/ingestion/greenhouse";

config({ path: ".env.local" });

const searchId = process.argv[2] || "4650122006";

async function enhanceSpecificJob() {
  console.log(`\n🔍 Finding and enhancing job: ${searchId}...\n`);

  const results = await db
    .select()
    .from(jobs)
    .where(like(jobs.external_id, `%${searchId}%`));

  if (results.length === 0) {
    console.log("❌ Job not found");
    return;
  }

  const job = results[0];

  console.log("Job Details:");
  console.log("━".repeat(60));
  console.log(`Database ID:     ${job.id}`);
  console.log(`Title:           ${job.title}`);
  console.log(`Company:         ${job.company_key}`);
  console.log(`Source:          ${job.source_kind}`);
  console.log(`URL:             ${job.url}`);
  console.log(`Has ATS Data:    ${job.ats_data ? "✅ Yes" : "❌ No"}`);
  console.log("━".repeat(60));

  if (job.ats_data) {
    console.log("\n✓ Job is already enhanced, skipping...");
    return;
  }

  console.log("\n📥 Attempting to fetch from Greenhouse API...");

  try {
    const greenhouseData = await fetchGreenhouseJobPost(job.url, {
      questions: true,
    });

    console.log("\n✅ Success! Fetched data:");
    console.log(`   Title: ${greenhouseData.title}`);
    console.log(`   Internal Job ID: ${greenhouseData.internal_job_id}`);

    console.log("\n💾 Saving to database...");
    await saveGreenhouseJobData(job.id, greenhouseData);
    console.log("✅ Saved successfully!");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const is404 =
      errorMessage.includes("404") || errorMessage.includes("Job not found");

    if (is404) {
      console.log("\n⏭️  Job no longer exists on Greenhouse (404)");
      console.log(
        "   This is expected - jobs get removed when positions are filled",
      );
    } else {
      console.error("\n❌ Failed to enhance:");
      console.error(`   ${errorMessage}`);
    }
  }
}

enhanceSpecificJob()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
