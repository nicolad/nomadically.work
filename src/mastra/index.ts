import { Mastra } from "@mastra/core";
import { serve } from "@mastra/inngest";

import { observability } from "@/observability";
import {
  jobClassifierAgent,
  sqlAgent,
  adminAssistantAgent,
  postgresAgent,
  sqlGenerationAgent,
} from "@/agents";
import { personalizationAgent, recommendationAgent } from "@/memory";
import {
  skillsVector,
  SKILLS_VECTOR_STORE_NAME,
  extractJobSkillsWorkflow,
} from "@/lib/skills";
import {
  discoverConsultanciesCommonCrawlWorkflow,
  ccxGetRecentCrawlIdsTool,
  ccxCdxLatestTool,
  ccxFetchHtmlFromWarcTool,
} from "@/lib/common-crawl";
import { inngest } from "./inngest";
import { workspace } from "@/workspace";
import {
  inspectJobDecisionTool,
  rerunJobClassifierTool,
  diffSnapshotsTool,
} from "@/workspace/ops-skills";

// Import scheduled workflows
import {
  hourlyJobIngestionWorkflow,
  dailySkillExtractionWorkflow,
  weeklyCompanyDiscoveryWorkflow,
  dailyCleanupWorkflow,
  dailyDigestTriggerWorkflow,
} from "@/workflows/scheduled";

// Import flow control workflows
import {
  userProcessingWorkflow,
  apiSyncWorkflow,
  emailNotificationWorkflow,
  searchIndexWorkflow,
  orderProcessingWorkflow,
  comprehensiveWorkflow,
} from "@/workflows/flow-control";

// Import database tools and workflow
import { databaseIntrospectionTool } from "@/tools/database/database-introspection-tool";
import { databaseSeedingTool } from "@/tools/database/database-seeding-tool";
import { sqlGenerationTool } from "@/tools/database/sql-generation-tool";
import { sqlExecutionTool } from "@/tools/database/sql-execution-tool";
import { databaseQueryWorkflow } from "@/workflows/database-query";

// Import custom Inngest functions
import {
  userRegistrationFunction,
  jobApplicationFunction,
  jobViewFunction,
  jobFeedbackFunction,
  preferenceUpdateFunction,
  emailNotificationFunction,
  newJobsAlertFunction,
  dailyDigestFunction,
} from "@/inngest/custom-functions";

/**
 * Mastra Configuration
 *
 * Storage and vectors are now managed separately via D1.
 * Mastra will use in-memory storage for development.
 * For production persistence, configure external storage separately.
 */

export const mastra = new Mastra({
  agents: {
    jobClassifierAgent,
    sqlAgent,
    personalizationAgent,
    recommendationAgent,
    adminAssistantAgent,
    postgresAgent,
    sqlGenerationAgent,
  },
  // Storage is optional - using in-memory for simplicity
  // For production, configure external storage as needed
  workflows: {
    // Production workflows
    extractJobSkillsWorkflow,
    discoverConsultancies: discoverConsultanciesCommonCrawlWorkflow,

    // Scheduled workflows (cron-based)
    hourlyJobIngestion: hourlyJobIngestionWorkflow,
    dailySkillExtraction: dailySkillExtractionWorkflow,
    weeklyCompanyDiscovery: weeklyCompanyDiscoveryWorkflow,
    dailyCleanup: dailyCleanupWorkflow,
    dailyDigestTrigger: dailyDigestTriggerWorkflow,

    // Flow control examples
    userProcessing: userProcessingWorkflow,
    apiSync: apiSyncWorkflow,
    emailNotification: emailNotificationWorkflow,
    searchIndex: searchIndexWorkflow,
    orderProcessing: orderProcessingWorkflow,
    comprehensive: comprehensiveWorkflow,

    // Database workflows
    databaseQuery: databaseQueryWorkflow,
  },
  tools: {
    // Common Crawl tools
    ccxGetRecentCrawlIds: ccxGetRecentCrawlIdsTool,
    ccxCdxLatest: ccxCdxLatestTool,
    ccxFetchHtmlFromWarc: ccxFetchHtmlFromWarcTool,

    // Ops tools for admin assistant
    inspectJobDecision: inspectJobDecisionTool,
    rerunJobClassifier: rerunJobClassifierTool,
    diffSnapshots: diffSnapshotsTool,

    // Database tools
    databaseIntrospection: databaseIntrospectionTool,
    databaseSeeding: databaseSeedingTool,
    sqlGeneration: sqlGenerationTool,
    sqlExecution: sqlExecutionTool,
  },
  server: {
    host: "0.0.0.0",
    // Auth is now handled by Clerk middleware at the Next.js level
    apiRoutes: [
      {
        path: "/api/inngest",
        method: "ALL",
        createHandler: async ({ mastra }) => {
          return serve({
            mastra,
            inngest,
            functions: [
              userRegistrationFunction,
              jobApplicationFunction,
              jobViewFunction,
              jobFeedbackFunction,
              preferenceUpdateFunction,
              emailNotificationFunction,
              newJobsAlertFunction,
              dailyDigestFunction,
            ],
          });
        },
      },
    ],
  },
  observability,
});
