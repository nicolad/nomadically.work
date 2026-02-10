import { companyResolvers } from "./resolvers/company";
import { jobResolvers } from "./resolvers/job";
import { userSettingsResolvers } from "./resolvers/user-settings";
import { textToSqlResolvers } from "./resolvers/text-to-sql";
import { executeSqlResolvers } from "./resolvers/execute-sql";
import { promptResolvers } from "./resolvers/prompts";
import { merge } from "lodash";

export const resolvers = merge(
  {},
  companyResolvers,
  jobResolvers,
  userSettingsResolvers,
  textToSqlResolvers,
  executeSqlResolvers,
  promptResolvers,
);
