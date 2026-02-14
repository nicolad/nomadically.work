/**
 * Promptfoo Cloudflare Integration
 * 
 * Provides integration with Cloudflare Workers AI and AI Gateway
 * for LLM evaluation and testing
 */

// ============================================================================
// CLOUDFLARE WORKERS AI
// ============================================================================

export {
  CloudflareWorkersAIProvider,
  createCloudflareWorkersAIProvider,
  chatWithCloudflareAI,
} from './cloudflare-workers-ai';

// ============================================================================
// CLOUDFLARE AI GATEWAY
// ============================================================================

export {
  CloudflareAIGatewayProvider,
  createCloudflareAIGatewayProvider,
  chatThroughGateway,
} from './cloudflare-ai-gateway';

// ============================================================================
// CONSTANTS
// ============================================================================

export {
  CLOUDFLARE_ENDPOINTS,
  CLOUDFLARE_AI_MODELS,
  CLOUDFLARE_PROVIDER_TYPES,
  AI_GATEWAY_PROVIDERS,
  ENV_VARS,
  DEFAULT_CONFIG,
  HTTP_HEADERS,
  ERROR_MESSAGES,
  CHAT_COMPLETION_DEFAULTS,
  buildWorkersAIEndpoints,
  buildAIGatewayEndpoint,
  type CloudflareProviderType,
  type AIGatewayProvider,
} from './constants';

// ============================================================================
// TYPES
// ============================================================================

export type {
  CloudflareBaseConfig,
  CloudflareWorkersAIConfig,
  CloudflareAIGatewayConfig,
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChoice,
  ChatCompletionUsage,
  TextCompletionRequest,
  TextCompletionResponse,
  TextCompletionChoice,
  EmbeddingRequest,
  EmbeddingResponse,
  EmbeddingData,
  ProviderResponse,
  PromptfooCloudflareProvider,
  PromptfooConfig,
  PromptfooTest,
  PromptfooAssertion,
} from './types';

// ============================================================================
// UTILITIES
// ============================================================================

export {
  formatMessage,
  formatConversation,
  getEnvVar,
  validateEnvVars,
  isValidCloudflareModel,
  parseGatewayProviderId,
  parseWorkersAIProviderId,
  extractTextFromResponse,
  getTokenUsage,
  retryWithBackoff,
  estimateCost,
  formatRequestLog,
  formatResponseLog,
} from './utils';
