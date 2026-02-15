#!/usr/bin/env tsx

import { config } from "dotenv";
import { db } from "../src/db";
import { jobs } from "../src/db/schema";
import { like } from "drizzle-orm";

config({ path: ".env.local" });

const searchId = process.argv[2] || "7564362";

async function findJob() {
  console.log(
    `\n🔍 Searching for job with ID/external_id containing: ${searchId}...\n`,
  );

  // Search by external_id pattern
  const results = await db
    .select()
    .from(jobs)
    .where(like(jobs.external_id, `%${searchId}%`));

  if (results.length === 0) {
    console.log("❌ No jobs found");
    return;
  }

  console.log(`Found ${results.length} job(s):\n`);

  for (const job of results) {
    console.log("━".repeat(60));
    console.log(`Database ID:     ${job.id}`);
    console.log(`External ID:     ${job.external_id}`);
    console.log(`Title:           ${job.title}`);
    console.log(`Company:         ${job.company_key}`);
    console.log(`Source:          ${job.source_kind}`);
    console.log(`URL:             ${job.url}`);
    console.log(`Has ATS Data:    ${job.ats_data ? "✅ Yes" : "❌ No"}`);
    console.log(`Internal Job ID: ${job.internal_job_id || "(none)"}`);
    console.log(`Requisition ID:  ${job.requisition_id || "(none)"}`);
    console.log(`Created:         ${job.created_at}`);
    console.log(`Updated:         ${job.updated_at}`);
    console.log("━".repeat(60));
    console.log();
  }
}

findJob()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
