import { companyResolvers } from "./resolvers/company";
import { jobResolvers } from "./resolvers/job";
import { userSettingsResolvers } from "./resolvers/user-settings";
// import { textToSqlResolvers } from "./resolvers/text-to-sql"; // Disabled: Uses Node.js modules incompatible with Edge Runtime
// import { executeSqlResolvers } from "./resolvers/execute-sql"; // Disabled: Uses Node.js modules incompatible with Edge Runtime
import { promptResolvers } from "./resolvers/prompts";
import { applicationResolvers } from "./resolvers/application";
import { langsmithResolvers } from "./resolvers/langsmith";
import { resumeResolvers } from "./resolvers/resume";
import { prepResolvers } from "./resolvers/prep";
import { trackResolvers } from "./resolvers/track";
import { merge } from "lodash";

export const resolvers = merge(
  {},
  companyResolvers,
  jobResolvers,
  userSettingsResolvers,
  // textToSqlResolvers, // Disabled: Uses Node.js modules incompatible with Edge Runtime
  // executeSqlResolvers, // Disabled: Uses Node.js modules incompatible with Edge Runtime
  promptResolvers,
  applicationResolvers,
  langsmithResolvers,
  resumeResolvers,
  prepResolvers,
  trackResolvers,
);
