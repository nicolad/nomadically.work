#!/usr/bin/env tsx

import { config } from "dotenv";
import { db } from "../src/db";
import { jobs } from "../src/db/schema";
import { last, split } from "lodash";

config({ path: ".env.local" });

const searchId = process.argv[2] || "7434532002";

async function testJobQuery() {
  console.log(`\n🔍 Testing job query with ID: ${searchId}...\n`);

  // Mimic the resolver logic
  const allJobs = await db.select().from(jobs);
  console.log(`Total jobs in database: ${allJobs.length}\n`);

  const result = allJobs.find((job) => {
    const jobId = last(split(job.external_id, "/"));
    const matches = jobId === searchId;

    if (job.external_id.includes(searchId)) {
      console.log(`Checking job ${job.id}:`);
      console.log(`  external_id: ${job.external_id}`);
      console.log(`  Last segment: ${jobId}`);
      console.log(`  Searching for: ${searchId}`);
      console.log(`  Match: ${matches ? "✅" : "❌"}`);
      console.log();
    }

    return matches;
  });

  if (result) {
    console.log("\n✅ Found job:");
    console.log(`  ID: ${result.id}`);
    console.log(`  External ID: ${result.external_id}`);
    console.log(`  Title: ${result.title}`);
  } else {
    console.log("\n❌ No job found with matching logic");
  }
}

testJobQuery()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
