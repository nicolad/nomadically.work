import { makeExecutableSchema } from "@graphql-tools/schema";
import { loadFilesSync } from "@graphql-tools/load-files";
import { join } from "path";
import { resolvers } from "./resolvers";

const typeDefs = loadFilesSync(join(process.cwd(), "schema/**/*.graphql"));

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
