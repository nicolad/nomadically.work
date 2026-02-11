import { loadFilesSync } from "@graphql-tools/load-files";
import { join } from "path";
import { gql } from "@apollo/client";

const schemaFiles = loadFilesSync(join(process.cwd(), "schema/**/*.graphql"));

export const typeDefs = schemaFiles.map((schema) =>
  typeof schema === "string" ? gql`${schema}` : schema
);
  ${schemaString}
`;
