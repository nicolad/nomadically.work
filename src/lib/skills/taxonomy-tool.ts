import { z } from "zod";
import {
  getSkillsVector,
  SKILLS_VECTOR_INDEX,
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_WORKERS_AI_KEY,
} from "./vector";

/**
 * Embed text using Cloudflare Workers AI API directly
 */
async function embedText(text: string): Promise<number[]> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_WORKERS_AI_KEY) {
    throw new Error(
      "Missing Cloudflare credentials. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_WORKERS_AI_KEY in your .env file",
    );
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/baai/bge-small-en-v1.5`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_WORKERS_AI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: [text] }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  if (!result.success || !result.result?.data?.[0]) {
    throw new Error(
      `Unexpected Cloudflare API response: ${JSON.stringify(result)}`,
    );
  }

  return result.result.data[0];
}

const inputSchema = z.object({
  queryText: z.string().describe("The job description text to match"),
  topK: z
    .number()
    .optional()
    .default(50)
    .describe("Number of top results to return"),
});

/**
 * Find canonical skill tags from the taxonomy by semantic similarity to job text.
 */
export async function querySkillTaxonomy(params: z.infer<typeof inputSchema>) {
  const { queryText, topK = 50 } = params;

  if (!queryText) {
    throw new Error('Missing required parameter "queryText"');
  }

  // Embed the query text
  const embedding = await embedText(queryText);

  // Query the vector store
  const vector = getSkillsVector();
  const results = await vector.query({
    indexName: SKILLS_VECTOR_INDEX,
    queryVector: embedding,
    topK,
  });

  // Format results
  const sources = results.map((r) => ({
    id: r.id,
    score: r.score,
    metadata: r.metadata,
  }));

  const relevantContext = sources
    .map(
      (s) => `${s.metadata?.label || s.id} (${s.metadata?.tag || s.id})`,
    )
    .join(", ");

  return {
    relevantContext: relevantContext ? [relevantContext] : [],
    sources,
  };
}

/**
 * Lazy-initialized wrapper for backwards compatibility
 */
let _tool: any = null;

export const getSkillTaxonomyQueryTool = () => {
  if (!_tool) {
    _tool = {
      id: "skill-taxonomy-query",
      description:
        "Find canonical skill tags from the taxonomy by semantic similarity to job text.",
      execute: async (paramsOrWrapper: any) => {
        const queryText =
          paramsOrWrapper?.queryText ||
          paramsOrWrapper?.inputData?.queryText ||
          paramsOrWrapper?.data?.queryText;

        const topK =
          paramsOrWrapper?.topK ||
          paramsOrWrapper?.inputData?.topK ||
          paramsOrWrapper?.data?.topK ||
          50;

        return querySkillTaxonomy({ queryText, topK });
      },
    };
  }
  return _tool;
};

// For backwards compatibility
export const skillTaxonomyQueryTool = getSkillTaxonomyQueryTool();
