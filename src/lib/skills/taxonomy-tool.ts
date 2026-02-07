import { createVectorQueryTool } from "@mastra/rag";
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";

import {
  SKILLS_VECTOR_STORE_NAME,
  SKILLS_VECTOR_INDEX,
} from "./vector";

/**
 * NOTE: Embeddings still require OpenAI API key (OPENAI_API_KEY in .env.local)
 * DeepSeek doesn't offer embedding models yet, so we use OpenAI only for this.
 * All chat/reasoning models use DeepSeek.
 */

// Lazy initialization to avoid build-time errors when API keys aren't available
let _tool: any = null;

export const getSkillTaxonomyQueryTool = () => {
  if (!_tool) {
    _tool = createVectorQueryTool({
      id: "skill-taxonomy-query",
      description:
        "Find canonical skill tags from the taxonomy by semantic similarity to job text.",
      vectorStoreName: SKILLS_VECTOR_STORE_NAME,
      indexName: SKILLS_VECTOR_INDEX,
      model: new ModelRouterEmbeddingModel("openai/text-embedding-3-small"),
    });
  }
  return _tool;
};

// For backwards compatibility
export const skillTaxonomyQueryTool = (() => {
  try {
    return createVectorQueryTool({
      id: "skill-taxonomy-query",
      description:
        "Find canonical skill tags from the taxonomy by semantic similarity to job text.",
      vectorStoreName: SKILLS_VECTOR_STORE_NAME,
      indexName: SKILLS_VECTOR_INDEX,
      model: new ModelRouterEmbeddingModel("openai/text-embedding-3-small"),
    });
  } catch (e) {
    // Return a dummy object during build time
    return null as any;
  }
})();
