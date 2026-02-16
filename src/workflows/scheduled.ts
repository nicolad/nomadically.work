/**
 * Scheduled Inngest Workflows
 *
 * Cron-triggered workflows for regular job platform maintenance:
 * - Hourly job ingestion
 * - Daily skill extraction
 * - Weekly company discovery
 * - Daily cleanup
 */

import { z } from "zod";
import { init } from "@mastra/inngest";
import { inngest } from "../mastra/inngest";
// import { turso as db } from "@/db"; // Removed - migrated to D1
// TODO: Update to use D1 database

const { createWorkflow, createStep } = init(inngest);

// ============================================================================
// Hourly Job Ingestion Workflow
// ============================================================================

const fetchNewJobsStep = createStep({
  id: "fetch-new-jobs",
  inputSchema: z.object({
    sources: z.array(z.string()),
  }),
  outputSchema: z.object({
    jobIds: z.array(z.number()),
    source: z.string(),
    count: z.number(),
  }),
  execute: async ({ inputData }) => {
    console.log(
      `Fetching new jobs from sources: ${inputData.sources.join(", ")}`,
    );

    // TODO: Implement actual job fetching logic
    // This would call your existing job ingestion system

    const jobIds: number[] = [];

    return {
      jobIds,
      source: inputData.sources[0] || "unknown",
      count: jobIds.length,
    };
  },
});

const notifyNewJobsStep = createStep({
  id: "notify-new-jobs",
  inputSchema: z.object({
    jobIds: z.array(z.number()),
    source: z.string(),
    count: z.number(),
  }),
  outputSchema: z.object({
    notified: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.count > 0) {
      // Send event for new jobs
      await inngest.send({
        name: "jobs/new-batch",
        data: {
          jobIds: inputData.jobIds,
          source: inputData.source,
        },
      });

      console.log(`Notified about ${inputData.count} new jobs`);
    }

    return {
      notified: inputData.count > 0,
    };
  },
});

export const hourlyJobIngestionWorkflow = createWorkflow({
  id: "hourly-job-ingestion",
  inputSchema: z.object({
    sources: z.array(z.string()),
  }),
  outputSchema: z.object({
    notified: z.boolean(),
  }),
  cron: "0 * * * *", // Every hour at minute 0
  inputData: {
    sources: ["ashby", "greenhouse", "lever"],
  },
  // Flow control
  concurrency: {
    limit: 1, // Only one ingestion at a time
  },
  rateLimit: {
    period: "1h",
    limit: 1, // Max once per hour
  },
})
  .then(fetchNewJobsStep)
  .then(notifyNewJobsStep);

hourlyJobIngestionWorkflow.commit();

// ============================================================================
// Daily Skill Extraction Workflow
// ============================================================================

const getUnprocessedJobsStep = createStep({
  id: "get-unprocessed-jobs",
  inputSchema: z.object({
    batchSize: z.number(),
  }),
  outputSchema: z.object({
    jobIds: z.array(z.number()),
    count: z.number(),
  }),
  execute: async ({ inputData }) => {
    // Get jobs without skill tags
    // TODO: Re-implement with D1 database
    console.log('[D1 Migration] getUnprocessedJobsStep disabled - returning empty list');
    
    return {
      jobIds: [],
      count: 0,
    };
    
    /* D1 Implementation needed:
    const result = await db.execute({
      sql: `
        SELECT j.id
        FROM jobs j
        LEFT JOIN job_skill_tags jst ON j.id = jst.job_id
        WHERE jst.job_id IS NULL
        AND j.description IS NOT NULL
        ORDER BY j.created_at DESC
        LIMIT ?
      `,
      args: [inputData.batchSize],
    });

    const jobIds = result.rows.map((row) => row.id as number);

    console.log(`Found ${jobIds.length} jobs needing skill extraction`);

    return {
      jobIds,
      count: jobIds.length,
    };
    */
  },
});

const extractSkillsStep = createStep({
  id: "extract-skills",
  inputSchema: z.object({
    jobIds: z.array(z.number()),
    count: z.number(),
  }),
  outputSchema: z.object({
    processed: z.number(),
    failed: z.number(),
  }),
  execute: async ({ inputData }) => {
    let processed = 0;
    let failed = 0;

    // Trigger skill extraction workflow for each job
    for (const jobId of inputData.jobIds) {
      try {
        // TODO: Trigger your existing extractJobSkillsWorkflow
        console.log(`Extracting skills for job ${jobId}`);
        processed++;
      } catch (error) {
        console.error(`Failed to extract skills for job ${jobId}:`, error);
        failed++;
      }
    }

    return {
      processed,
      failed,
    };
  },
});

export const dailySkillExtractionWorkflow = createWorkflow({
  id: "daily-skill-extraction",
  inputSchema: z.object({
    batchSize: z.number(),
  }),
  outputSchema: z.object({
    processed: z.number(),
    failed: z.number(),
  }),
  cron: "0 2 * * *", // Daily at 2 AM
  inputData: {
    batchSize: 100,
  },
  // Flow control
  concurrency: {
    limit: 1,
  },
  throttle: {
    period: "24h",
    limit: 1,
  },
})
  .then(getUnprocessedJobsStep)
  .then(extractSkillsStep);

dailySkillExtractionWorkflow.commit();

// ============================================================================
// Weekly Company Discovery Workflow
// ============================================================================

const discoverNewCompaniesStep = createStep({
  id: "discover-new-companies",
  inputSchema: z.object({
    crawlId: z.string().optional(),
  }),
  outputSchema: z.object({
    companiesFound: z.number(),
    crawlId: z.string(),
  }),
  execute: async ({ inputData }) => {
    console.log("Starting company discovery from Common Crawl");

    // TODO: Trigger your discoverConsultanciesCommonCrawlWorkflow

    return {
      companiesFound: 0,
      crawlId: inputData.crawlId || "CC-MAIN-2026-10",
    };
  },
});

const updateCompanyDataStep = createStep({
  id: "update-company-data",
  inputSchema: z.object({
    companiesFound: z.number(),
    crawlId: z.string(),
  }),
  outputSchema: z.object({
    updated: z.number(),
  }),
  execute: async ({ inputData }) => {
    console.log(`Processing ${inputData.companiesFound} discovered companies`);

    // TODO: Update company metadata, fetch ATS boards, etc.

    return {
      updated: inputData.companiesFound,
    };
  },
});

export const weeklyCompanyDiscoveryWorkflow = createWorkflow({
  id: "weekly-company-discovery",
  inputSchema: z.object({
    crawlId: z.string().optional(),
  }),
  outputSchema: z.object({
    updated: z.number(),
  }),
  cron: "0 3 * * 0", // Every Sunday at 3 AM
  inputData: {},
  // Flow control
  concurrency: {
    limit: 1,
  },
  throttle: {
    period: "7d",
    limit: 1,
  },
})
  .then(discoverNewCompaniesStep)
  .then(updateCompanyDataStep);

weeklyCompanyDiscoveryWorkflow.commit();

// ============================================================================
// Daily Cleanup Workflow
// ============================================================================

const cleanupExpiredJobsStep = createStep({
  id: "cleanup-expired-jobs",
  inputSchema: z.object({
    daysOld: z.number(),
  }),
  outputSchema: z.object({
    deleted: z.number(),
  }),
  execute: async ({ inputData }) => {
    // Delete jobs older than X days with status "closed" or "expired"
    // TODO: Re-implement with D1 database
    console.log('[D1 Migration] cleanupExpiredJobsStep disabled');
    
    return {
      deleted: 0,
    };
    
    /* D1 Implementation needed:
    const result = await db.execute({
      sql: `
        DELETE FROM jobs
        WHERE status IN ('closed', 'expired')
        AND created_at < datetime('now', '-' || ? || ' days')
      `,
      args: [inputData.daysOld],
    });

    const deleted = result.rowsAffected || 0;
    console.log(`Deleted ${deleted} expired jobs`);

    return {
      deleted,
    };
    */
  },
});

const cleanupOldPreferencesStep = createStep({
  id: "cleanup-old-preferences",
  inputSchema: z.object({
    deleted: z.number(),
  }),
  outputSchema: z.object({
    jobsDeleted: z.number(),
    preferencesDeleted: z.number(),
  }),
  execute: async ({ inputData }) => {
    // Delete low-confidence preferences older than 90 days
    // TODO: Re-implement with D1 database
    console.log('[D1 Migration] cleanupOldPreferencesStep disabled');
    
    return {
      jobsDeleted: inputData.deleted,
      preferencesDeleted: 0,
    };
    
    /* D1 Implementation needed:
    const result = await db.execute({
      sql: `
        DELETE FROM user_preferences
        WHERE confidence < 0.5
        AND observed_at < datetime('now', '-90 days')
      `,
      args: [],
    });

    const preferencesDeleted = result.rowsAffected || 0;
    console.log(`Deleted ${preferencesDeleted} old low-confidence preferences`);

    return {
      jobsDeleted: inputData.deleted,
      preferencesDeleted,
    };
    */
  },
});

export const dailyCleanupWorkflow = createWorkflow({
  id: "daily-cleanup",
  inputSchema: z.object({
    daysOld: z.number(),
  }),
  outputSchema: z.object({
    jobsDeleted: z.number(),
    preferencesDeleted: z.number(),
  }),
  cron: "0 4 * * *", // Daily at 4 AM
  inputData: {
    daysOld: 90,
  },
  // Flow control
  concurrency: {
    limit: 1,
  },
})
  .then(cleanupExpiredJobsStep)
  .then(cleanupOldPreferencesStep);

dailyCleanupWorkflow.commit();

// ============================================================================
// Daily Digest Trigger Workflow
// ============================================================================

const triggerDailyDigestStep = createStep({
  id: "trigger-daily-digest",
  inputSchema: z.object({
    time: z.string(),
  }),
  outputSchema: z.object({
    triggered: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    console.log(`Triggering daily digest at ${inputData.time}`);

    await inngest.send({
      name: "cron/daily-digest",
      data: {
        timestamp: new Date().toISOString(),
      },
    });

    return {
      triggered: true,
    };
  },
});

export const dailyDigestTriggerWorkflow = createWorkflow({
  id: "daily-digest-trigger",
  inputSchema: z.object({
    time: z.string(),
  }),
  outputSchema: z.object({
    triggered: z.boolean(),
  }),
  cron: "0 9 * * *", // Every day at 9 AM
  inputData: {
    time: "09:00",
  },
  // Flow control
  throttle: {
    period: "24h",
    limit: 1,
  },
}).then(triggerDailyDigestStep);

dailyDigestTriggerWorkflow.commit();
