/**
 * Cloudflare Workers AI Integration
 *
 * Provides utilities for using Cloudflare Workers AI models
 * with Vercel AI SDK.
 */

import { embedMany } from "ai";
import { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } from "@/config/env";

// ============================================================================
// Model Categories
// ============================================================================

export const WORKERS_AI_MODELS = {
  CHAT: {
    LATEST:
      "cloudflare-ai-gateway/workers-ai/@cf/meta/llama-4-scout-17b-16e-instruct",
    BALANCED: "cloudflare-ai-gateway/workers-ai/@cf/meta/llama-3.2-3b-instruct",
    FAST: "cloudflare-ai-gateway/workers-ai/@cf/meta/llama-3.1-8b-instruct-awq",
    POWERFUL:
      "cloudflare-ai-gateway/workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    ULTRA_BUDGET:
      "cloudflare-ai-gateway/workers-ai/@cf/ibm-granite/granite-4.0-h-micro",
  },

  CODE: "cloudflare-ai-gateway/workers-ai/@cf/qwen/qwen2.5-coder-32b-instruct",
  REASONING: "cloudflare-ai-gateway/workers-ai/@cf/qwen/qwq-32b",
  VISION:
    "cloudflare-ai-gateway/workers-ai/@cf/meta/llama-3.2-11b-vision-instruct",

  EMBEDDINGS: {
    SMALL: "@cf/baai/bge-small-en-v1.5",
    BASE: "@cf/baai/bge-base-en-v1.5",
    LARGE: "@cf/baai/bge-large-en-v1.5",
    MULTILINGUAL: "@cf/baai/bge-m3",
    CHINESE: "@cf/qwen/qwen3-embedding-0.6b",
  },

  TTS: {
    ENGLISH: "@cf/deepgram/aura-2-en",
    SPANISH: "@cf/deepgram/aura-2-es",
    EXPRESSIVE: "@cf/myshell-ai/melotts",
  },
  STT: {
    NOVA: "@cf/deepgram/nova-3",
  },

  MODERATION: "@cf/meta/llama-guard-3-8b",
  RERANKER: "@cf/baai/bge-reranker-base",
} as const;

// ============================================================================
// Embedding Utilities (no Mastra dependency)
// ============================================================================

/**
 * Embeds text using Cloudflare Workers AI via direct fetch
 */
export async function embedWithWorkersAI(
  values: string[],
  modelId: string = WORKERS_AI_MODELS.EMBEDDINGS.SMALL,
): Promise<number[][]> {
  if (!Array.isArray(values) || values.some((v) => typeof v !== "string")) {
    throw new TypeError("values must be an array of strings");
  }

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    throw new Error(
      "Missing Cloudflare credentials. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your environment.",
    );
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${modelId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
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

  if (!result.success || !result.result?.data) {
    throw new Error(
      `Unexpected Cloudflare API response: ${JSON.stringify(result)}`,
    );
  }

  return result.result.data;
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
// Type Exports
// ============================================================================

export type WorkersAIModelId =
  | (typeof WORKERS_AI_MODELS.CHAT)[keyof typeof WORKERS_AI_MODELS.CHAT]
  | typeof WORKERS_AI_MODELS.CODE
  | typeof WORKERS_AI_MODELS.REASONING
  | typeof WORKERS_AI_MODELS.VISION
  | (typeof WORKERS_AI_MODELS.EMBEDDINGS)[keyof typeof WORKERS_AI_MODELS.EMBEDDINGS]
  | (typeof WORKERS_AI_MODELS.TTS)[keyof typeof WORKERS_AI_MODELS.TTS]
  | (typeof WORKERS_AI_MODELS.STT)[keyof typeof WORKERS_AI_MODELS.STT]
  | typeof WORKERS_AI_MODELS.MODERATION
  | typeof WORKERS_AI_MODELS.RERANKER;

export type AgentContext = {
  priority?: "low" | "medium" | "high";
  taskType?: "code" | "reasoning" | "chat" | "vision";
  budget?: "minimal" | "standard" | "premium";
  inputTokens?: number;
};
