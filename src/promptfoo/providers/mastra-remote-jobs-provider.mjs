// src/promptfoo/providers/mastra-remote-jobs-provider.mjs
// JavaScript wrapper to load TypeScript provider via tsx

import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Register tsx loader for TypeScript support
register("tsx", pathToFileURL("./"));

// Import the TypeScript provider
const { default: MastraRemoteJobsProvider } =
  await import("./mastra-remote-jobs-provider.ts");

export default MastraRemoteJobsProvider;
