import { Mastra } from "@mastra/core";
import { MastraCompositeStore } from "@mastra/core/storage";
import { MemoryLibSQL, ScoresLibSQL } from "@mastra/libsql";
import { serve } from "@mastra/inngest";

import { observability } from "@/observability";
import {
  jobClassifierAgent,
  sqlAgent,
  adminAssistantAgent,
} from "@/agents";
import {
  personalizationAgent,
  recommendationAgent,
} from "@/memory";
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

// Configure composite storage with libSQL for all domains
const storage = new MastraCompositeStore({
  id: "turso-storage",
  domains: {
    memory: new MemoryLibSQL({
      url: process.env.TURSO_DB_URL!,
      authToken: process.env.TURSO_DB_AUTH_TOKEN!,
    }),
    scores: new ScoresLibSQL({
      url: process.env.TURSO_DB_URL!,
      authToken: process.env.TURSO_DB_AUTH_TOKEN!,
    }),
  },
});

export const mastra = new Mastra({
  agents: {
    jobClassifierAgent,
    sqlAgent,
    personalizationAgent,
    recommendationAgent,
    adminAssistantAgent,
  },
  storage,
  workspace,
  vectors: {
    [SKILLS_VECTOR_STORE_NAME]: skillsVector,
  },
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
  },
  server: {
    host: "0.0.0.0",
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
