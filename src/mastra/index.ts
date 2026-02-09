import { Mastra } from "@mastra/core";
import { MastraCompositeStore } from "@mastra/core/storage";
import { 
  MemoryLibSQL, 
  ScoresLibSQL, 
  WorkflowsLibSQL, 
  ObservabilityLibSQL 
} from "@mastra/libsql";
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
import { mastraAuth } from "./auth";

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

/**
 * Storage Configuration
 * 
 * Using composite storage with LibSQL (Turso) for all domains.
 * Turso provides edge-replicated SQLite with global low latency.
 * 
 * Benefits of LibSQL/Turso:
 * - No separate database server required
 * - Edge replication for global performance
 * - SQLite compatibility with distributed features
 * - Automatic schema migration on first interaction
 * 
 * Storage domains:
 * - memory: Agent conversations, threads, and message history
 * - scores: Evaluation scores from evals and scorers
 * - workflows: Workflow execution state and traces
 * - observability: Langfuse traces, spans, and generations
 * 
 * For local development, you can use file:./mastra.db instead of Turso.
 * Use absolute paths when running mastra dev alongside Next.js:
 * url: `file:${process.cwd()}/mastra.db`
 */
const storage = new MastraCompositeStore({
  id: "turso-storage",
  domains: {
    // Memory domain: Agent conversations with automatic thread management
    // Includes: messages, threads, resources, and working memory
    memory: new MemoryLibSQL({
      url: process.env.TURSO_DB_URL!,
      authToken: process.env.TURSO_DB_AUTH_TOKEN!,
    }),

    // Scores domain: Evaluation results from evals and live scorers
    // Includes: evaluation datasets, scores, and metrics
    scores: new ScoresLibSQL({
      url: process.env.TURSO_DB_URL!,
      authToken: process.env.TURSO_DB_AUTH_TOKEN!,
    }),

    // Workflows domain: Workflow execution state and history
    // Includes: workflow runs, step results, and execution traces
    workflows: new WorkflowsLibSQL({
      url: process.env.TURSO_DB_URL!,
      authToken: process.env.TURSO_DB_AUTH_TOKEN!,
    }),

    // Observability domain: Langfuse integration for tracing
    // Includes: traces, spans, generations, and prompt versions
    observability: new ObservabilityLibSQL({
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
    auth: mastraAuth,
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
