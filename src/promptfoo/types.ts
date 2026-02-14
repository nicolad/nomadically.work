/**
 * TypeScript types for Promptfoo Cloudflare Integration
 */

import type { CloudflareProviderType, AIGatewayProvider } from './constants';

// ============================================================================
// BASE CONFIGURATION
// ============================================================================

export interface CloudflareBaseConfig {
  /** Cloudflare account ID */
  accountId?: string;
  
  /** Environment variable name for account ID */
  accountIdEnvar?: string;
  
  /** Cloudflare API key (for Workers AI) */
  apiKey?: string;
  
  /** Environment variable name for API key */
  apiKeyEnvar?: string;
}

// ============================================================================
// WORKERS AI CONFIGURATION
// ============================================================================

export interface CloudflareWorkersAIConfig extends CloudflareBaseConfig {
  /** Model name (e.g., "@cf/meta/llama-3.1-8b-instruct") */
  model: string;
  
  /** Provider type: chat, completion, or embedding */
  type?: CloudflareProviderType;
  
  /** OpenAI-compatible parameters */
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  seed?: number;
  
  /** Custom API base URL (optional override) */
  apiBaseUrl?: string;
}

// ============================================================================
// AI GATEWAY CONFIGURATION
// ============================================================================

export interface CloudflareAIGatewayConfig extends CloudflareBaseConfig {
  /** Gateway ID */
  gatewayId?: string;
  
  /** Environment variable name for gateway ID */
  gatewayIdEnvar?: string;
  
  /** Gateway authentication token (for authenticated gateways) */
  cfAigToken?: string;
  
  /** Environment variable name for gateway token */
  cfAigTokenEnvar?: string;
  
  /** Provider to route through (openai, anthropic, groq, etc.) */
  provider: AIGatewayProvider | string;
  
  /** Model name for the provider */
  model: string;
  
  /** Provider-specific API key */
  providerApiKey?: string;
  
  /** Environment variable name for provider API key */
  providerApiKeyEnvar?: string;
  
  /** OpenAI-compatible parameters */
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  
  /** Azure-specific configuration */
  resourceName?: string;
  deploymentName?: string;
  apiVersion?: string;
}

// ============================================================================
// CHAT MESSAGES
// ============================================================================

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ============================================================================
// CHAT COMPLETION REQUEST
// ============================================================================

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  seed?: number;
}

// ============================================================================
// CHAT COMPLETION RESPONSE
// ============================================================================

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: ChatCompletionUsage;
}

// ============================================================================
// TEXT COMPLETION REQUEST
// ============================================================================

export interface TextCompletionRequest {
  model: string;
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
}

// ============================================================================
// TEXT COMPLETION RESPONSE
// ============================================================================

export interface TextCompletionChoice {
  text: string;
  index: number;
  finish_reason: string;
}

export interface TextCompletionResponse {
  id: string;
  object: "text_completion";
  created: number;
  model: string;
  choices: TextCompletionChoice[];
  usage: ChatCompletionUsage;
}

// ============================================================================
// EMBEDDING REQUEST
// ============================================================================

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
  encoding_format?: "float" | "base64";
}

// ============================================================================
// EMBEDDING RESPONSE
// ============================================================================

export interface EmbeddingData {
  object: "embedding";
  embedding: number[];
  index: number;
}

export interface EmbeddingResponse {
  object: "list";
  data: EmbeddingData[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// PROVIDER RESPONSE (UNIFIED)
// ============================================================================

export type ProviderResponse = ChatCompletionResponse | TextCompletionResponse | EmbeddingResponse;

// ============================================================================
// PROMPTFOO INTEGRATION
// ============================================================================

/**
 * Configuration for promptfoo YAML files
 */
export interface PromptfooCloudflareProvider {
  id: string;
  config?: CloudflareWorkersAIConfig | CloudflareAIGatewayConfig;
}

export interface PromptfooConfig {
  prompts: string[];
  providers: PromptfooCloudflareProvider[];
  tests?: PromptfooTest[];
}

export interface PromptfooTest {
  vars?: Record<string, string>;
  assert?: PromptfooAssertion[];
}

export interface PromptfooAssertion {
  type: string;
  value?: string;
  threshold?: number;
}
