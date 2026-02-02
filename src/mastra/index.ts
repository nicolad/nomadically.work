import { Mastra } from "@mastra/core";

import { jobClassifierAgent } from "./agents";

export const mastra = new Mastra({
  agents: { jobClassifierAgent },
});
