import { task, logger } from "@trigger.dev/sdk/v3";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { jobs } from "../db/schema";
import { createD1HttpClient } from "../db/d1-http";
import {
  fetchGreenhouseJobPost,
  saveGreenhouseJobData,
} from "../ingestion/greenhouse";
import {
  fetchAshbyJobPostFromUrl,
  saveAshbyJobData,
} from "../ingestion/ashby";

export interface EnhanceJobPayload {
  /** Database job ID */
  jobId: number;
  /** ATS source: greenhouse, ashby */
  source: string;
  /** Job posting URL */
  url: string;
  /** Company key / board token */
  companyKey: string;
  /** External ID URL for extracting identifiers */
  externalId?: string;
}

function getDb() {
  const d1Client = createD1HttpClient();
  return drizzle(d1Client as any);
}

export const enhanceJobTask = task({
  id: "enhance-job",
  maxDuration: 120,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  queue: {
    concurrencyLimit: 5,
  },
  run: async (payload: EnhanceJobPayload) => {
    const { jobId, source, url, companyKey, externalId } = payload;
    const sourceLower = source.toLowerCase();

    logger.info(`Enhancing ${sourceLower} job ${jobId}`, {
      url,
      companyKey,
    });

    const db = getDb();

    if (sourceLower === "greenhouse") {
      const data = await fetchGreenhouseJobPost(url, { questions: true });
      const updated = await saveGreenhouseJobData(db, jobId, data);
      logger.info(`Enhanced Greenhouse job ${jobId}`);
      return { success: true, jobId, source: sourceLower, title: updated?.title };
    }

    if (sourceLower === "ashby") {
      // Skip board-level URLs (e.g. https://jobs.ashbyhq.com/company) — these are company
      // discovery records, not individual job postings, and cannot be enhanced.
      const urlParts = new URL(url).pathname.split("/").filter(Boolean);
      if (urlParts.length < 2) {
        logger.warn(`Skipping board-level Ashby URL for job ${jobId}: ${url}`);
        return { success: false, skipped: true, jobId, source: sourceLower, reason: "board-level URL" };
      }

      const data = await fetchAshbyJobPostFromUrl(url, {
        includeCompensation: true,
      });
      const updated = await saveAshbyJobData(db, jobId, data, companyKey);
      logger.info(`Enhanced Ashby job ${jobId}`);
      return { success: true, jobId, source: sourceLower, title: updated?.title };
    }

    // Mark 404'd jobs as closed
    logger.warn(`Unsupported ATS source: ${source}`);
    return { success: false, jobId, source: sourceLower, error: "Unsupported source" };
  },
  handleError: async (payload, error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const is404 =
      errorMessage.includes("404") ||
      errorMessage.toLowerCase().includes("not found") ||
      errorMessage.toLowerCase().includes("no longer exists");

    if (is404) {
      logger.info(`Job ${payload.jobId} no longer exists (404), marking as not-found`);
      try {
        const db = getDb();
        // Set absolute_url to sentinel so the scheduler's `IS NULL` filter skips it forever.
        // Using status='closed' proved unreliable (field used for classification).
        await db
          .update(jobs)
          .set({ absolute_url: "[not-found]", updated_at: new Date().toISOString() })
          .where(eq(jobs.id, payload.jobId));
        logger.info(`Marked job ${payload.jobId} absolute_url=[not-found]`);
      } catch (dbError) {
        logger.error("Failed to mark job as not-found", { dbError });
      }
      // Don't retry 404s
      return { skipRetrying: true };
    }

    // Let other errors retry
    logger.error(`Failed to enhance job ${payload.jobId}`, { error: errorMessage });
  },
});
