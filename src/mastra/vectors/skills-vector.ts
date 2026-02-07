import { LibSQLVector } from "@mastra/libsql";

export const SKILLS_VECTOR_STORE_NAME = "skills";
export const SKILLS_VECTOR_INDEX = "skills_taxonomy";

export const skillsVector = new LibSQLVector({
  id: "skills-vector",
  url: process.env.TURSO_DB_URL!,
  authToken: process.env.TURSO_DB_AUTH_TOKEN!,
});

export async function ensureSkillsVectorIndex(): Promise<void> {
  // dimension must match your embedding model output
  // openai/text-embedding-3-small outputs 1536 dimensions
  await skillsVector.createIndex({
    indexName: SKILLS_VECTOR_INDEX,
    dimension: 1536,
  });
}
