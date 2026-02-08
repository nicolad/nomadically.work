import { LibSQLVector } from "@mastra/libsql";
import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_WORKERS_AI_KEY,
  TURSO_DB_URL,
  TURSO_DB_AUTH_TOKEN,
} from "@/config/env";

export const SKILLS_VECTOR_STORE_NAME = "skills";
export const SKILLS_VECTOR_INDEX = "skills_taxonomy";

export type EmbeddingVector = number[];

// Re-export Cloudflare config for use in other skill modules
export { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_WORKERS_AI_KEY };

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

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_WORKERS_AI_KEY) {
    throw new Error(
      "Missing Cloudflare credentials. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_WORKERS_AI_KEY in your .env file",
    );
  }

  // Call Cloudflare Workers AI API directly to avoid AI SDK compatibility issues
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/baai/bge-small-en-v1.5`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_WORKERS_AI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: values }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  // Cloudflare returns { result: { shape: [n, 384], data: [[...], [...]] } }
  if (!result.success || !result.result?.data) {
    throw new Error(
      `Unexpected Cloudflare API response: ${JSON.stringify(result)}`,
    );
  }

  return result.result.data as number[][];
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
