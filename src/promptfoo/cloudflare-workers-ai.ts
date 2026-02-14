/**
 * Cloudflare Workers AI Provider
 * 
 * Provides access to AI models running on Cloudflare's edge infrastructure
 * with OpenAI-compatible API endpoints
 */

import {
  CLOUDFLARE_ENDPOINTS,
  buildWorkersAIEndpoints,
  ERROR_MESSAGES,
  ENV_VARS,
  DEFAULT_CONFIG,
  HTTP_HEADERS,
  CLOUDFLARE_PROVIDER_TYPES,
} from './constants';

import type {
  CloudflareWorkersAIConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  TextCompletionRequest,
  TextCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ChatMessage,
} from './types';

/**
 * Cloudflare Workers AI Client
 * Supports chat completions, text completions, and embeddings
 */
export class CloudflareWorkersAIProvider {
  private accountId: string;
  private apiKey: string;
  private config: CloudflareWorkersAIConfig;

  constructor(config: CloudflareWorkersAIConfig) {
    this.config = config;

    // Resolve account ID
    const accountIdEnvar = config.accountIdEnvar || ENV_VARS.CLOUDFLARE_ACCOUNT_ID;
    this.accountId = config.accountId || (typeof process !== 'undefined' ? process.env[accountIdEnvar] : undefined) || "";
    
    if (!this.accountId) {
      throw new Error(ERROR_MESSAGES.NO_ACCOUNT_ID);
    }

    // Resolve API key
    const apiKeyEnvar = config.apiKeyEnvar || ENV_VARS.CLOUDFLARE_API_KEY;
    this.apiKey = config.apiKey || (typeof process !== 'undefined' ? process.env[apiKeyEnvar] : undefined) || "";
    
    if (!this.apiKey) {
      throw new Error(ERROR_MESSAGES.NO_API_KEY);
    }

    // Validate model name
    if (!config.model.startsWith('@')) {
      throw new Error(ERROR_MESSAGES.INVALID_MODEL);
    }
  }

  /**
   * Get the appropriate endpoint based on provider type
   */
  private getEndpoint(): string {
    const endpoints = buildWorkersAIEndpoints(this.accountId);
    const type = this.config.type || CLOUDFLARE_PROVIDER_TYPES.CHAT;

    switch (type) {
      case CLOUDFLARE_PROVIDER_TYPES.CHAT:
        return this.config.apiBaseUrl || endpoints.chat;
      case CLOUDFLARE_PROVIDER_TYPES.COMPLETION:
        return this.config.apiBaseUrl || endpoints.completions;
      case CLOUDFLARE_PROVIDER_TYPES.EMBEDDING:
        return this.config.apiBaseUrl || endpoints.embeddings;
      default:
        throw new Error(ERROR_MESSAGES.INVALID_PROVIDER_TYPE);
    }
  }

  /**
   * Common request headers
   */
  private getHeaders(): HeadersInit {
    return {
      [HTTP_HEADERS.AUTHORIZATION]: `Bearer ${this.apiKey}`,
      [HTTP_HEADERS.CONTENT_TYPE]: HTTP_HEADERS.APPLICATION_JSON,
      [HTTP_HEADERS.ACCEPT]: HTTP_HEADERS.APPLICATION_JSON,
    };
  }

  /**
   * Chat completion (conversational AI)
   */
  async chatCompletion(
    messages: ChatMessage[],
    options?: Partial<CloudflareWorkersAIConfig>
  ): Promise<ChatCompletionResponse> {
    const endpoint = this.getEndpoint();
    
    const requestBody: ChatCompletionRequest = {
      model: this.config.model,
      messages,
      temperature: options?.temperature ?? this.config.temperature ?? DEFAULT_CONFIG.TEMPERATURE,
      max_tokens: options?.max_tokens ?? this.config.max_tokens ?? DEFAULT_CONFIG.MAX_TOKENS,
      top_p: options?.top_p ?? this.config.top_p ?? DEFAULT_CONFIG.TOP_P,
      frequency_penalty: options?.frequency_penalty ?? this.config.frequency_penalty ?? DEFAULT_CONFIG.FREQUENCY_PENALTY,
      presence_penalty: options?.presence_penalty ?? this.config.presence_penalty ?? DEFAULT_CONFIG.PRESENCE_PENALTY,
      stop: options?.stop ?? this.config.stop,
      stream: false,
    };

    if (this.config.seed !== undefined) {
      requestBody.seed = this.config.seed;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Cloudflare Workers AI error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Text completion
   */
  async textCompletion(
    prompt: string,
    options?: Partial<CloudflareWorkersAIConfig>
  ): Promise<TextCompletionResponse> {
    const endpoint = this.getEndpoint();
    
    const requestBody: TextCompletionRequest = {
      model: this.config.model,
      prompt,
      max_tokens: options?.max_tokens ?? this.config.max_tokens ?? DEFAULT_CONFIG.MAX_TOKENS,
      temperature: options?.temperature ?? this.config.temperature ?? DEFAULT_CONFIG.TEMPERATURE,
      top_p: options?.top_p ?? this.config.top_p ?? DEFAULT_CONFIG.TOP_P,
      frequency_penalty: options?.frequency_penalty ?? this.config.frequency_penalty ?? DEFAULT_CONFIG.FREQUENCY_PENALTY,
      presence_penalty: options?.presence_penalty ?? this.config.presence_penalty ?? DEFAULT_CONFIG.PRESENCE_PENALTY,
      stop: options?.stop ?? this.config.stop,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Cloudflare Workers AI error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Generate embeddings
   */
  async embeddings(
    input: string | string[],
    options?: { encoding_format?: "float" | "base64" }
  ): Promise<EmbeddingResponse> {
    const endpoint = this.getEndpoint();
    
    const requestBody: EmbeddingRequest = {
      model: this.config.model,
      input,
      encoding_format: options?.encoding_format,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Cloudflare Workers AI error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Simple chat helper - sends a single message and returns the response text
   */
  async chat(
    message: string,
    systemPrompt?: string,
    options?: Partial<CloudflareWorkersAIConfig>
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: message,
    });

    const response = await this.chatCompletion(messages, options);
    return response.choices[0].message.content;
  }
}

/**
 * Create a Cloudflare Workers AI provider instance
 */
export function createCloudflareWorkersAIProvider(
  config: CloudflareWorkersAIConfig
): CloudflareWorkersAIProvider {
  return new CloudflareWorkersAIProvider(config);
}

/**
 * Helper: Chat with Cloudflare Workers AI using a single function call
 */
export async function chatWithCloudflareAI(
  model: string,
  message: string,
  options?: {
    systemPrompt?: string;
    accountId?: string;
    apiKey?: string;
    temperature?: number;
    max_tokens?: number;
  }
): Promise<string> {
  const provider = createCloudflareWorkersAIProvider({
    model,
    accountId: options?.accountId,
    apiKey: options?.apiKey,
    temperature: options?.temperature,
    max_tokens: options?.max_tokens,
  });

  return provider.chat(message, options?.systemPrompt);
}
