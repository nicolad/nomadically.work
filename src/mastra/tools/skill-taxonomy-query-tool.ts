import { createVectorQueryTool } from "@mastra/rag";
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";

import {
  SKILLS_VECTOR_STORE_NAME,
  SKILLS_VECTOR_INDEX,
} from "../vectors/skills-vector";

export const skillTaxonomyQueryTool = createVectorQueryTool({
  id: "skill-taxonomy-query",
  description:
    "Find canonical skill tags from the taxonomy by semantic similarity to job text.",
  vectorStoreName: SKILLS_VECTOR_STORE_NAME,
  indexName: SKILLS_VECTOR_INDEX,
  model: new ModelRouterEmbeddingModel("openai/text-embedding-3-small"),
});
