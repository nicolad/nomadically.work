import { schedules, logger } from "@trigger.dev/sdk/v3";
import { drizzle } from "drizzle-orm/d1";
import { sql } from "drizzle-orm";
import { jobs } from "../db/schema";
import { createD1HttpClient } from "../db/d1-http";
import { enhanceJobTask, type EnhanceJobPayload } from "./enhance-job";

function getDb() {
  const d1Client = createD1HttpClient();
  return drizzle(d1Client as any);
}

/**
 * Scheduled task: find un-enhanced jobs and fan out to individual enhance-job tasks.
 *
 * Runs every 6 hours. Picks up jobs that have no enhanced ATS data yet
 * (no absolute_url, no departments, no ashby_department, etc.)
 * and triggers individual enhancement tasks for each.
 */
export const enhanceJobsScheduled = schedules.task({
  id: "enhance-jobs-scheduled",
  cron: "0 */6 * * *", // every 6 hours
  maxDuration: 300,
  run: async () => {
    logger.info("Starting scheduled job enhancement scan...");

    const db = getDb();

    // Find jobs that haven't been enhanced yet across all ATS sources.
    // A job is "un-enhanced" if it has no ATS-specific data populated.
    // Fetch up to 250 then filter out Ashby board-level URLs in JS to avoid
    // D1 SQL quirks with parameterized LIKE/GLOB patterns.
    const candidates = await db
      .select({
        id: jobs.id,
        source_kind: jobs.source_kind,
        url: jobs.url,
        company_key: jobs.company_key,
        external_id: jobs.external_id,
      })
      .from(jobs)
      .where(
        sql`${jobs.source_kind} IN ('greenhouse', 'ashby')
            AND ${jobs.status} IS NOT 'closed'
            AND ${jobs.absolute_url} IS NULL
            AND ${jobs.ashby_department} IS NULL
            AND ${jobs.departments} IS NULL`,
      )
      .limit(250);

    // Filter out Ashby board-level entries (url = external_id = board URL, no job UUID path)
    const unenhanced = candidates
      .filter((job) => {
        if (job.source_kind !== "ashby") return true;
        if (job.url !== job.external_id) return true;
        // Ashby job URLs have 2 path segments: /{board}/{uuid}
        // Board URLs have 1: /{board} — skip those
        try {
          const parts = new URL(job.url).pathname.split("/").filter(Boolean);
          return parts.length >= 2;
        } catch {
          return false;
        }
      })
      .slice(0, 200);

    logger.info(`Found ${unenhanced.length} un-enhanced jobs (${candidates.length} candidates)`);

    if (unenhanced.length === 0) {
      return { total: 0, triggered: 0 };
    }

    // Build payloads for batch trigger
    const payloads: { payload: EnhanceJobPayload }[] = unenhanced.map((job) => ({
      payload: {
        jobId: job.id,
        source: job.source_kind,
        url: job.url,
        companyKey: job.company_key,
        externalId: job.external_id,
      },
    }));

    // Fan out to individual enhance-job tasks
    const results = await enhanceJobTask.batchTriggerAndWait(payloads);

    const succeeded = results.runs.filter((r) => r.ok).length;
    const failed = results.runs.filter((r) => !r.ok).length;

    logger.info("Enhancement batch complete", {
      total: unenhanced.length,
      succeeded,
      failed,
    });

    return { total: unenhanced.length, succeeded, failed };
  },
});
