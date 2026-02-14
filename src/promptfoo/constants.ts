/**
 * Promptfoo Cloudflare Integration Constants
 * 
 * Configuration for Cloudflare Workers AI and AI Gateway
 */

// ============================================================================
// CLOUDFLARE API ENDPOINTS
// ============================================================================

export const CLOUDFLARE_ENDPOINTS = {
  /** Base URL for Cloudflare API */
  BASE: "https://api.cloudflare.com/client/v4",
  
  /** AI Gateway base URL */
  AI_GATEWAY_BASE: "https://gateway.ai.cloudflare.com/v1",
} as const;

// ============================================================================
// CLOUDFLARE WORKERS AI MODELS (2025)
// ============================================================================

/**
 * Latest flagship models available on Cloudflare Workers AI
 */
export const CLOUDFLARE_AI_MODELS = {
  // OpenAI Models
  OPENAI_GPT_OSS_120B: "@cf/openai/gpt-oss-120b",
  OPENAI_GPT_OSS_20B: "@cf/openai/gpt-oss-20b",
  
  // Meta Llama Models
  LLAMA_4_SCOUT_17B: "@cf/meta/llama-4-scout-17b-16e-instruct",
  LLAMA_3_3_70B_FAST: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  LLAMA_3_2_11B_VISION: "@cf/meta/llama-3.2-11b-vision-instruct",
  LLAMA_3_1_8B: "@cf/meta/llama-3.1-8b-instruct",
  
  // DeepSeek Models
  DEEPSEEK_R1_DISTILL_QWEN_32B: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
  
  // Qwen Models
  QWEN_QWQ_32B: "@cf/qwen/qwq-32b",
  QWEN_2_5_CODER_32B: "@cf/qwen/qwen2.5-coder-32b-instruct",
  
  // Mistral Models
  MISTRAL_SMALL_3_1_24B: "@cf/mistralai/mistral-small-3.1-24b-instruct",
  
  // Google Models
  GEMMA_3_12B: "@cf/google/gemma-3-12b-it",
  EMBEDDING_GEMMA_300M: "@cf/google/embeddinggemma-300m",
  
  // Nous Research
  HERMES_2_PRO_MISTRAL_7B: "@hf/nousresearch/hermes-2-pro-mistral-7b",
  
  // Other Popular Models
  MICROSOFT_PHI_2: "@cf/microsoft/phi-2",
  BGE_LARGE_EN_V1_5: "@cf/baai/bge-large-en-v1.5",
} as const;

// ============================================================================
// PROVIDER TYPES
// ============================================================================

export const CLOUDFLARE_PROVIDER_TYPES = {
  CHAT: "chat",
  COMPLETION: "completion",
  EMBEDDING: "embedding",
} as const;

export type CloudflareProviderType = (typeof CLOUDFLARE_PROVIDER_TYPES)[keyof typeof CLOUDFLARE_PROVIDER_TYPES];

// ============================================================================
// AI GATEWAY SUPPORTED PROVIDERS
// ============================================================================

export const AI_GATEWAY_PROVIDERS = {
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  GROQ: "groq",
  PERPLEXITY: "perplexity-ai",
  GOOGLE_AI_STUDIO: "google-ai-studio",
  MISTRAL: "mistral",
  COHERE: "cohere",
  AZURE_OPENAI: "azure-openai",
  WORKERS_AI: "workers-ai",
  HUGGINGFACE: "huggingface",
  REPLICATE: "replicate",
  GROK: "grok",
} as const;

export type AIGatewayProvider = (typeof AI_GATEWAY_PROVIDERS)[keyof typeof AI_GATEWAY_PROVIDERS];

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

export const ENV_VARS = {
  // Cloudflare Account & Gateway
  CLOUDFLARE_ACCOUNT_ID: "CLOUDFLARE_ACCOUNT_ID",
  CLOUDFLARE_GATEWAY_ID: "CLOUDFLARE_GATEWAY_ID",
  CLOUDFLARE_API_KEY: "CLOUDFLARE_API_KEY",
  CF_AIG_TOKEN: "CF_AIG_TOKEN",
  
  // Provider API Keys
  OPENAI_API_KEY: "OPENAI_API_KEY",
  ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY",
  GROQ_API_KEY: "GROQ_API_KEY",
  PERPLEXITY_API_KEY: "PERPLEXITY_API_KEY",
  GOOGLE_API_KEY: "GOOGLE_API_KEY",
  MISTRAL_API_KEY: "MISTRAL_API_KEY",
  COHERE_API_KEY: "COHERE_API_KEY",
  AZURE_OPENAI_API_KEY: "AZURE_OPENAI_API_KEY",
  HUGGINGFACE_API_KEY: "HUGGINGFACE_API_KEY",
  REPLICATE_API_KEY: "REPLICATE_API_KEY",
  XAI_API_KEY: "XAI_API_KEY",
} as const;

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_CONFIG = {
  /** Default temperature for chat completions */
  TEMPERATURE: 0.7,
  
  /** Default max tokens */
  MAX_TOKENS: 1000,
  
  /** Default top_p */
  TOP_P: 1.0,
  
  /** Default frequency penalty */
  FREQUENCY_PENALTY: 0,
  
  /** Default presence penalty */
  PRESENCE_PENALTY: 0,
  
  /** Azure API version */
  AZURE_API_VERSION: "2024-12-01-preview",
} as const;

// ============================================================================
// OPENAI-COMPATIBLE ENDPOINTS
// ============================================================================

/**
 * Build Cloudflare Workers AI endpoint URLs
 */
export const buildWorkersAIEndpoints = (accountId: string) => ({
  chat: `${CLOUDFLARE_ENDPOINTS.BASE}/accounts/${accountId}/ai/v1/chat/completions`,
  completions: `${CLOUDFLARE_ENDPOINTS.BASE}/accounts/${accountId}/ai/v1/completions`,
  embeddings: `${CLOUDFLARE_ENDPOINTS.BASE}/accounts/${accountId}/ai/v1/embeddings`,
});

/**
 * Build AI Gateway endpoint URL
 */
export const buildAIGatewayEndpoint = (
  accountId: string,
  gatewayId: string,
  provider: string
): string => {
  return `${CLOUDFLARE_ENDPOINTS.AI_GATEWAY_BASE}/${accountId}/${gatewayId}/${provider}`;
};

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  NO_ACCOUNT_ID: "Cloudflare account ID is required. Set CLOUDFLARE_ACCOUNT_ID environment variable or pass it as a parameter.",
  NO_API_KEY: "Cloudflare API key is required. Set CLOUDFLARE_API_KEY environment variable or pass it as a parameter.",
  NO_GATEWAY_ID: "Cloudflare gateway ID is required. Set CLOUDFLARE_GATEWAY_ID environment variable or pass it as a parameter.",
  NO_PROVIDER_API_KEY: (provider: string) => `${provider} API key is required. Set the appropriate environment variable or configure BYOK in your Cloudflare gateway.`,
  INVALID_PROVIDER_TYPE: "Invalid provider type. Must be 'chat', 'completion', or 'embedding'.",
  INVALID_MODEL: "Invalid model name. Must start with @ or @hf/",
  AZURE_MISSING_CONFIG: "Azure OpenAI requires resourceName and deploymentName configuration.",
} as const;

// ============================================================================
// HTTP HEADERS
// ============================================================================

export const HTTP_HEADERS = {
  AUTHORIZATION: "Authorization",
  CONTENT_TYPE: "Content-Type",
  ACCEPT: "Accept",
  CF_AIG_TOKEN: "cf-aig-authorization",
  APPLICATION_JSON: "application/json",
} as const;

// ============================================================================
// CHAT COMPLETION DEFAULTS
// ============================================================================

export const CHAT_COMPLETION_DEFAULTS = {
  /** Default role for system messages */
  SYSTEM_ROLE: "system" as const,
  
  /** Default role for user messages */
  USER_ROLE: "user" as const,
  
  /** Default role for assistant messages */
  ASSISTANT_ROLE: "assistant" as const,
} as const;
