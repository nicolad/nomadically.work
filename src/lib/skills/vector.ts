import { LibSQLVector } from "@mastra/libsql";
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { embedMany } from "ai";
import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_API_TOKEN,
  TURSO_DB_URL,
  TURSO_DB_AUTH_TOKEN,
} from "@/config/env";

export const SKILLS_VECTOR_STORE_NAME = "skills";
export const SKILLS_VECTOR_INDEX = "skills_taxonomy";

export type EmbeddingVector = number[];

// Re-export Cloudflare config for use in other skill modules
export { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN };

// Lazy initialization to avoid build-time errors
let _skillsVector: LibSQLVector | null = null;

export const getSkillsVector = (): LibSQLVector => {
  if (!_skillsVector) {
    _skillsVector = new LibSQLVector({
      id: "skills-vector",
      url: TURSO_DB_URL,
      authToken: TURSO_DB_AUTH_TOKEN,
    });
  }
  return _skillsVector;
};

// For backwards compatibility - direct export
export const skillsVector = new LibSQLVector({
  id: "skills-vector",
  url: TURSO_DB_URL,
  authToken: TURSO_DB_AUTH_TOKEN,
});

/**
 * Embeds text using Cloudflare Workers AI:
 *   cloudflare-workers-ai/@cf/baai/bge-small-en-v1.5
 *
 * Notes:
 * - The underlying model outputs 384-dim vectors and has a 512 token input limit. (Chunk long inputs.)
 */
export async function embedWithCloudflareBgeSmall(
  values: string[],
): Promise<EmbeddingVector[]> {
  if (!Array.isArray(values) || values.some((v) => typeof v !== "string")) {
    throw new TypeError("values must be an array of strings");
  }

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    throw new Error(
      "Missing Cloudflare credentials. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your .env file",
    );
  }

  const model = new ModelRouterEmbeddingModel({
    providerId: "cloudflare-workers-ai",
    modelId: "@cf/baai/bge-small-en-v1.5",
    url: `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
    apiKey: CLOUDFLARE_API_TOKEN,
  });

  const { embeddings } = await embedMany({
    model,
    values,
  });

  return embeddings;
}

export async function ensureSkillsVectorIndex(): Promise<void> {
  // dimension must match your embedding model output
  // @cf/baai/bge-small-en-v1.5 outputs 384 dimensions
  const vector = getSkillsVector();
  await vector.createIndex({
    indexName: SKILLS_VECTOR_INDEX,
    dimension: 384,
  });
}
