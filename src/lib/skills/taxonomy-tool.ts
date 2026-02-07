import { createVectorQueryTool } from "@mastra/rag";
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";

import {
  SKILLS_VECTOR_STORE_NAME,
  SKILLS_VECTOR_INDEX,
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_API_TOKEN,
} from "./vector";

/**
 * Uses Cloudflare Workers AI for embeddings (@cf/baai/bge-small-en-v1.5)
 * No OpenAI API key required!
 */

// Lazy initialization to avoid build-time errors when API keys aren't available
let _tool: any = null;

export const getSkillTaxonomyQueryTool = () => {
  if (!_tool) {
    // Validate required environment variables
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      throw new Error(
        "Missing Cloudflare credentials. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your .env file",
      );
    }

    // Use Cloudflare Workers AI embeddings
    const embeddingModel = new ModelRouterEmbeddingModel({
      providerId: "cloudflare-workers-ai",
      modelId: "@cf/baai/bge-small-en-v1.5",
      url: `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
      apiKey: CLOUDFLARE_API_TOKEN,
    });

    _tool = createVectorQueryTool({
      id: "skill-taxonomy-query",
      description:
        "Find canonical skill tags from the taxonomy by semantic similarity to job text.",
      vectorStoreName: SKILLS_VECTOR_STORE_NAME,
      indexName: SKILLS_VECTOR_INDEX,
      model: embeddingModel,
      includeSources: true,
    });
  }
  return _tool;
};

// For backwards compatibility
export const skillTaxonomyQueryTool = (() => {
  try {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      console.warn(
        "⚠️  Cloudflare credentials not found. Skill taxonomy tool may not work.",
      );
      return null as any;
    }

    const embeddingModel = new ModelRouterEmbeddingModel({
      providerId: "cloudflare-workers-ai",
      modelId: "@cf/baai/bge-small-en-v1.5",
      url: `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
      apiKey: CLOUDFLARE_API_TOKEN,
    });

    return createVectorQueryTool({
      id: "skill-taxonomy-query",
      description:
        "Find canonical skill tags from the taxonomy by semantic similarity to job text.",
      vectorStoreName: SKILLS_VECTOR_STORE_NAME,
      indexName: SKILLS_VECTOR_INDEX,
      model: embeddingModel,
      includeSources: true,
    });
  } catch (e) {
    // Return a dummy object during build time
    return null as any;
  }
})();
