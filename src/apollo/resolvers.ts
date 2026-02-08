import { companyResolvers } from "./resolvers/company";
import { jobResolvers } from "./resolvers/job";
import { userSettingsResolvers } from "./resolvers/user-settings";
import { merge } from "lodash";

export const resolvers = merge(
  {},
  companyResolvers,
  jobResolvers,
  userSettingsResolvers,
);
