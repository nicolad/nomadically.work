import { createVectorQueryTool } from "@mastra/rag";
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";

import {
  SKILLS_VECTOR_STORE_NAME,
  SKILLS_VECTOR_INDEX,
} from "../vectors/skills-vector";

/**
 * NOTE: Embeddings still require OpenAI API key (OPENAI_API_KEY in .env.local)
 * DeepSeek doesn't offer embedding models yet, so we use OpenAI only for this.
 * All chat/reasoning models use DeepSeek.
 */
export const skillTaxonomyQueryTool = createVectorQueryTool({
  id: "skill-taxonomy-query",
  description:
    "Find canonical skill tags from the taxonomy by semantic similarity to job text.",
  vectorStoreName: SKILLS_VECTOR_STORE_NAME,
  indexName: SKILLS_VECTOR_INDEX,
  model: new ModelRouterEmbeddingModel("openai/text-embedding-3-small"),
});
