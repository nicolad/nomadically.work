import { Mastra } from "@mastra/core";

import { jobClassifierAgent } from "./agents";

// Mastra will use TURSO_DB_URL and TURSO_DB_AUTH_TOKEN from environment
export const mastra = new Mastra({
  agents: { jobClassifierAgent },
});
