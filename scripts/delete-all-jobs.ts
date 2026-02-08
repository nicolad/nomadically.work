#!/usr/bin/env tsx

/**
 * Delete All Jobs - Removes all job records from the database
 * 
 * ⚠️  WARNING: This will permanently delete ALL jobs and their associated data!
 * 
 * Usage:
 *   pnpm tsx scripts/delete-all-jobs.ts
 */

import { db } from "../src/db";
import { jobs, jobSkillTags } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  console.log("⚠️  WARNING: This will delete ALL jobs from the database!");
  console.log("This action cannot be undone.\n");

  try {
    // First, delete all job skill tags (foreign key constraint)
    console.log("🗑️  Deleting job skill tags...");
    const deletedTags = await db.delete(jobSkillTags).execute();
    console.log(`   Deleted ${deletedTags.rowsAffected || 0} skill tags\n`);

    // Then delete all jobs
    console.log("🗑️  Deleting all jobs...");
    const deletedJobs = await db.delete(jobs).execute();
    console.log(`   Deleted ${deletedJobs.rowsAffected || 0} jobs\n`);

    console.log("✅ All jobs have been deleted successfully!");
  } catch (error) {
    console.error("❌ Error deleting jobs:");
    console.error(error);
    process.exitCode = 1;
  }
}

main();
