import { LibSQLVector } from "@mastra/libsql";

export const SKILLS_VECTOR_STORE_NAME = "skills";
export const SKILLS_VECTOR_INDEX = "skills_taxonomy";

// Lazy initialization to avoid build-time errors
let _skillsVector: LibSQLVector | null = null;

export const getSkillsVector = (): LibSQLVector => {
  if (!_skillsVector) {
    _skillsVector = new LibSQLVector({
      id: "skills-vector",
      url: process.env.TURSO_DB_URL!,
      authToken: process.env.TURSO_DB_AUTH_TOKEN!,
    });
  }
  return _skillsVector;
};

// For backwards compatibility - direct export
export const skillsVector = new LibSQLVector({
  id: "skills-vector",
  url: process.env.TURSO_DB_URL!,
  authToken: process.env.TURSO_DB_AUTH_TOKEN!,
});

export async function ensureSkillsVectorIndex(): Promise<void> {
  // dimension must match your embedding model output
  // openai/text-embedding-3-small outputs 1536 dimensions
  const vector = getSkillsVector();
  await vector.createIndex({
    indexName: SKILLS_VECTOR_INDEX,
    dimension: 1536,
  });
}
