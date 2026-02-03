import { Mastra } from "@mastra/core";
import { MastraCompositeStore } from "@mastra/core/storage";
import { MemoryLibSQL, ScoresLibSQL } from "@mastra/libsql";

import { jobClassifierAgent } from "./agents";

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
  agents: { jobClassifierAgent },
  storage,
});
