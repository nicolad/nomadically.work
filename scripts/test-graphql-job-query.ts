#!/usr/bin/env tsx

import { config } from "dotenv";
import { db } from "../src/db";
import { jobs } from "../src/db/schema";
import { like } from "drizzle-orm";
import { last, split } from "lodash";

config({ path: ".env.local" });

const searchId = process.argv[2] || "7434532002";

async function testJobQuery() {
  console.log(`\n🔍 Testing job query with ID: ${searchId}...\n`);

  // Test the first query
  console.log(`Query 1: WHERE external_id LIKE '%/${searchId}'`);
  const results1 = await db
    .select()
    .from(jobs)
    .where(like(jobs.external_id, `%/${searchId}`));

  console.log(`  Found: ${results1.length} job(s)`);
  if (results1.length > 0) {
    console.log(`  ✅ First job: ${results1[0].title}`);
    console.log(`     External ID: ${results1[0].external_id}`);
  }

  // Test the second query
  console.log(`\nQuery 2: WHERE external_id LIKE '%${searchId}%'`);
  const results2 = await db
    .select()
    .from(jobs)
    .where(like(jobs.external_id, `%${searchId}%`));

  console.log(`  Found: ${results2.length} job(s)`);
  if (results2.length > 0) {
    const exactMatch = results2.find((job) => {
      const jobId = last(split(job.external_id, "/"));
      return jobId === searchId;
    });

    if (exactMatch) {
      console.log(`  ✅ Exact match found: ${exactMatch.title}`);
      console.log(`     External ID: ${exactMatch.external_id}`);
    } else {
      console.log(
        `  ⚠️  No exact match, showing first result: ${results2[0].title}`,
      );
      console.log(`     External ID: ${results2[0].external_id}`);
    }
  }

  console.log("\n✅ Test complete\n");
}

testJobQuery()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
