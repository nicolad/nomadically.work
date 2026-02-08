import { Mastra } from "@mastra/core";
import { MastraCompositeStore } from "@mastra/core/storage";
import { MemoryLibSQL, ScoresLibSQL } from "@mastra/libsql";
import { serve } from "@mastra/inngest";

import { observability } from "@/observability";
import {
  jobClassifierAgent,
  sqlAgent,
  personalizationAgent,
  recommendationAgent,
} from "@/agents";
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
  },
  storage,
  vectors: {
    [SKILLS_VECTOR_STORE_NAME]: skillsVector,
  },
  workflows: {
    extractJobSkillsWorkflow,
    discoverConsultancies: discoverConsultanciesCommonCrawlWorkflow,
  },
  tools: {
    ccxGetRecentCrawlIds: ccxGetRecentCrawlIdsTool,
    ccxCdxLatest: ccxCdxLatestTool,
    ccxFetchHtmlFromWarc: ccxFetchHtmlFromWarcTool,
  },
  server: {
    host: "0.0.0.0",
    apiRoutes: [
      {
        path: "/api/inngest",
        method: "ALL",
        createHandler: async ({ mastra }) => {
          return serve({ mastra, inngest });
        },
      },
    ],
  },
  observability,
});
