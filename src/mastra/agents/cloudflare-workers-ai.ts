/**
 * Cloudflare Workers AI Integration
 * 
 * Provides utilities and examples for using Cloudflare Workers AI models
 * with Mastra agents. Workers AI offers edge deployment with low latency
 * and cost-effective pricing.
 * 
 * Documentation: https://developers.cloudflare.com/workers-ai/
 */

import { Agent } from "@mastra/core/agent";
import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { embedMany } from "ai";
import { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } from "@/config/env";

// ============================================================================
// Model Categories
// ============================================================================

/**
 * Recommended Workers AI models by use case
 */
export const WORKERS_AI_MODELS = {
  // Chat & Text Generation
  CHAT: {
    LATEST: "cloudflare-ai-gateway/workers-ai/@cf/meta/llama-4-scout-17b-16e-instruct",
    BALANCED: "cloudflare-ai-gateway/workers-ai/@cf/meta/llama-3.2-3b-instruct",
    FAST: "cloudflare-ai-gateway/workers-ai/@cf/meta/llama-3.1-8b-instruct-awq",
    POWERFUL: "cloudflare-ai-gateway/workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    ULTRA_BUDGET: "cloudflare-ai-gateway/workers-ai/@cf/ibm-granite/granite-4.0-h-micro",
  },
  
  // Specialized Tasks
  CODE: "cloudflare-ai-gateway/workers-ai/@cf/qwen/qwen2.5-coder-32b-instruct",
  REASONING: "cloudflare-ai-gateway/workers-ai/@cf/qwen/qwq-32b",
  VISION: "cloudflare-ai-gateway/workers-ai/@cf/meta/llama-3.2-11b-vision-instruct",
  
  // Embeddings
  EMBEDDINGS: {
    SMALL: "@cf/baai/bge-small-en-v1.5",      // 384-dim, $0.02/1M
    BASE: "@cf/baai/bge-base-en-v1.5",        // 768-dim, $0.07/1M
    LARGE: "@cf/baai/bge-large-en-v1.5",      // 1024-dim, $0.07/1M
    MULTILINGUAL: "@cf/baai/bge-m3",          // Multilingual, $0.01/1M
    CHINESE: "@cf/qwen/qwen3-embedding-0.6b", // Chinese-optimized, $0.01/1M
  },
  
  // Audio
  TTS: {
    ENGLISH: "@cf/deepgram/aura-2-en",
    SPANISH: "@cf/deepgram/aura-2-es",
    EXPRESSIVE: "@cf/myshell-ai/melotts",
  },
  STT: {
    NOVA: "@cf/deepgram/nova-3",
  },
  
  // Moderation & Safety
  MODERATION: "@cf/meta/llama-guard-3-8b",
  RERANKER: "@cf/baai/bge-reranker-base",
} as const;

// ============================================================================
// Agent Factory Functions
// ============================================================================

/**
 * Creates a general-purpose chat agent with cost optimization
 */
export function createChatAgent(options?: {
  id?: string;
  name?: string;
  instructions?: string;
  model?: string;
}) {
  return new Agent({
    id: options?.id || "workers-ai-chat",
    name: options?.name || "Workers AI Chat Agent",
    instructions: options?.instructions || "You are a helpful assistant running on Cloudflare's edge network.",
    model: options?.model || WORKERS_AI_MODELS.CHAT.BALANCED,
  });
}

/**
 * Creates a code generation agent
 */
export function createCodeAgent(options?: {
  id?: string;
  name?: string;
  instructions?: string;
}) {
  return new Agent({
    id: options?.id || "workers-ai-code",
    name: options?.name || "Code Generator",
    instructions: options?.instructions || "You are an expert programmer. Write clean, efficient, well-documented code.",
    model: WORKERS_AI_MODELS.CODE,
  });
}

/**
 * Creates a reasoning agent for complex tasks
 */
export function createReasoningAgent(options?: {
  id?: string;
  name?: string;
  instructions?: string;
}) {
  return new Agent({
    id: options?.id || "workers-ai-reasoning",
    name: options?.name || "Reasoning Agent",
    instructions: options?.instructions || "Think step by step. Break down complex problems into manageable parts.",
    model: WORKERS_AI_MODELS.REASONING,
  });
}

/**
 * Creates a vision agent for image analysis
 */
export function createVisionAgent(options?: {
  id?: string;
  name?: string;
  instructions?: string;
}) {
  return new Agent({
    id: options?.id || "workers-ai-vision",
    name: options?.name || "Vision Agent",
    instructions: options?.instructions || "Analyze images in detail. Describe what you see accurately and comprehensively.",
    model: WORKERS_AI_MODELS.VISION,
  });
}

/**
 * Creates a dynamic agent that selects models based on context
 */
export function createDynamicAgent(options?: {
  id?: string;
  name?: string;
  instructions?: string;
}) {
  return new Agent({
    id: options?.id || "workers-ai-dynamic",
    name: options?.name || "Dynamic Agent",
    instructions: options?.instructions || "You are an adaptive assistant.",
    model: ({ requestContext }) => {
      const context = requestContext as {
        priority?: "low" | "medium" | "high";
        taskType?: "code" | "reasoning" | "chat";
        budget?: "minimal" | "standard" | "premium";
      };

      // Task-specific models
      if (context.taskType === "code") {
        return WORKERS_AI_MODELS.CODE;
      }
      if (context.taskType === "reasoning") {
        return WORKERS_AI_MODELS.REASONING;
      }

      // Budget-based selection
      if (context.budget === "minimal") {
        return WORKERS_AI_MODELS.CHAT.ULTRA_BUDGET;
      }
      if (context.budget === "premium") {
        return WORKERS_AI_MODELS.CHAT.POWERFUL;
      }

      // Priority-based selection
      if (context.priority === "high") {
        return WORKERS_AI_MODELS.CHAT.LATEST;
      }
      if (context.priority === "low") {
        return WORKERS_AI_MODELS.CHAT.FAST;
      }

      // Default to balanced model
      return WORKERS_AI_MODELS.CHAT.BALANCED;
    },
  });
}

// ============================================================================
// Embedding Utilities
// ============================================================================

/**
 * Creates an embedding model instance for Cloudflare Workers AI
 */
export function createEmbeddingModel(modelId: string = WORKERS_AI_MODELS.EMBEDDINGS.SMALL) {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    throw new Error(
      "Missing Cloudflare credentials. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your environment.",
    );
  }

  return new ModelRouterEmbeddingModel({
    providerId: "cloudflare-workers-ai",
    modelId,
    url: `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
    apiKey: CLOUDFLARE_API_TOKEN,
  });
}

/**
 * Embeds text using Cloudflare Workers AI
 * 
 * @param values - Array of strings to embed
 * @param modelId - Model to use (default: bge-small-en-v1.5)
 * @returns Array of embedding vectors
 * 
 * @example
 * ```typescript
 * const embeddings = await embedWithWorkersAI([
 *   "JavaScript is a programming language",
 *   "Python is used for data science"
 * ]);
 * ```
 */
export async function embedWithWorkersAI(
  values: string[],
  modelId: string = WORKERS_AI_MODELS.EMBEDDINGS.SMALL,
): Promise<number[][]> {
  if (!Array.isArray(values) || values.some((v) => typeof v !== "string")) {
    throw new TypeError("values must be an array of strings");
  }

  const model = createEmbeddingModel(modelId);
  const { embeddings } = await embedMany({ model, values });
  
  return embeddings;
}

/**
 * Embeds a single text string
 */
export async function embedText(
  text: string,
  modelId: string = WORKERS_AI_MODELS.EMBEDDINGS.SMALL,
): Promise<number[]> {
  const [embedding] = await embedWithWorkersAI([text], modelId);
  return embedding;
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example: Simple chat interaction
 */
export async function exampleSimpleChat() {
  const agent = createChatAgent();
  const response = await agent.generate("What is edge computing?");
  return response;
}

/**
 * Example: Code generation
 */
export async function exampleCodeGeneration() {
  const agent = createCodeAgent();
  const response = await agent.generate(
    "Write a TypeScript function to calculate the Fibonacci sequence using memoization"
  );
  return response;
}

/**
 * Example: Vision analysis
 */
export async function exampleVisionAnalysis(imageUrl: string) {
  const agent = createVisionAgent();
  const response = await agent.generate({
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "Describe this image in detail" },
        { type: "image", image: imageUrl },
      ],
    }],
  });
  return response;
}

/**
 * Example: Dynamic model selection
 */
export async function exampleDynamicAgent() {
  const agent = createDynamicAgent();
  
  // High priority task - uses latest model
  const urgentResponse = await agent.generate(
    "Explain quantum computing",
    { requestContext: { priority: "high" } }
  );
  
  // Code task - uses code specialist model
  const codeResponse = await agent.generate(
    "Write a React component",
    { requestContext: { taskType: "code" } }
  );
  
  // Budget task - uses cheapest model
  const budgetResponse = await agent.generate(
    "Say hello",
    { requestContext: { budget: "minimal" } }
  );
  
  return { urgentResponse, codeResponse, budgetResponse };
}

/**
 * Example: Embeddings for semantic search
 */
export async function exampleEmbeddings() {
  const documents = [
    "TypeScript is a typed superset of JavaScript",
    "Python is popular for machine learning",
    "Rust provides memory safety without garbage collection",
  ];
  
  const query = "programming language with types";
  
  // Embed all documents and query
  const [docEmbeddings, queryEmbedding] = await Promise.all([
    embedWithWorkersAI(documents),
    embedText(query),
  ]);
  
  // Calculate cosine similarity (simplified)
  const similarities = docEmbeddings.map((docEmbed) => {
    const dotProduct = docEmbed.reduce((sum, val, i) => sum + val * queryEmbedding[i], 0);
    const magnitude1 = Math.sqrt(docEmbed.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitude1 * magnitude2);
  });
  
  // Find most similar document
  const maxIndex = similarities.indexOf(Math.max(...similarities));
  
  return {
    query,
    mostSimilar: documents[maxIndex],
    similarity: similarities[maxIndex],
  };
}

// ============================================================================
// Type Exports
// ============================================================================

export type WorkersAIModelId = 
  | typeof WORKERS_AI_MODELS.CHAT[keyof typeof WORKERS_AI_MODELS.CHAT]
  | typeof WORKERS_AI_MODELS.CODE
  | typeof WORKERS_AI_MODELS.REASONING
  | typeof WORKERS_AI_MODELS.VISION
  | typeof WORKERS_AI_MODELS.EMBEDDINGS[keyof typeof WORKERS_AI_MODELS.EMBEDDINGS]
  | typeof WORKERS_AI_MODELS.TTS[keyof typeof WORKERS_AI_MODELS.TTS]
  | typeof WORKERS_AI_MODELS.STT[keyof typeof WORKERS_AI_MODELS.STT]
  | typeof WORKERS_AI_MODELS.MODERATION
  | typeof WORKERS_AI_MODELS.RERANKER;

export type AgentContext = {
  priority?: "low" | "medium" | "high";
  taskType?: "code" | "reasoning" | "chat" | "vision";
  budget?: "minimal" | "standard" | "premium";
  inputTokens?: number;
};
