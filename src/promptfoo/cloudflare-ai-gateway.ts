/**
 * Cloudflare AI Gateway Provider
 * 
 * Routes AI requests through Cloudflare AI Gateway for:
 * - Caching (reduce costs)
 * - Rate limiting (quota protection)
 * - Analytics (usage tracking)
 * - Logging (debugging)
 */

import {
  buildAIGatewayEndpoint,
  ERROR_MESSAGES,
  ENV_VARS,
  DEFAULT_CONFIG,
  HTTP_HEADERS,
  AI_GATEWAY_PROVIDERS,
  type AIGatewayProvider,
} from './constants';

import type {
  CloudflareAIGatewayConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
} from './types';

/**
 * Map of gateway providers to their required environment variable names
 */
const PROVIDER_API_KEY_MAP: Record<string, string> = {
  [AI_GATEWAY_PROVIDERS.OPENAI]: ENV_VARS.OPENAI_API_KEY,
  [AI_GATEWAY_PROVIDERS.ANTHROPIC]: ENV_VARS.ANTHROPIC_API_KEY,
  [AI_GATEWAY_PROVIDERS.GROQ]: ENV_VARS.GROQ_API_KEY,
  [AI_GATEWAY_PROVIDERS.PERPLEXITY]: ENV_VARS.PERPLEXITY_API_KEY,
  [AI_GATEWAY_PROVIDERS.GOOGLE_AI_STUDIO]: ENV_VARS.GOOGLE_API_KEY,
  [AI_GATEWAY_PROVIDERS.MISTRAL]: ENV_VARS.MISTRAL_API_KEY,
  [AI_GATEWAY_PROVIDERS.COHERE]: ENV_VARS.COHERE_API_KEY,
  [AI_GATEWAY_PROVIDERS.AZURE_OPENAI]: ENV_VARS.AZURE_OPENAI_API_KEY,
  [AI_GATEWAY_PROVIDERS.WORKERS_AI]: ENV_VARS.CLOUDFLARE_API_KEY,
  [AI_GATEWAY_PROVIDERS.HUGGINGFACE]: ENV_VARS.HUGGINGFACE_API_KEY,
  [AI_GATEWAY_PROVIDERS.REPLICATE]: ENV_VARS.REPLICATE_API_KEY,
  [AI_GATEWAY_PROVIDERS.GROK]: ENV_VARS.XAI_API_KEY,
};

/**
 * Cloudflare AI Gateway Client
 * Routes requests through Cloudflare's AI Gateway for caching, analytics, and rate limiting
 */
export class CloudflareAIGatewayProvider {
  private accountId: string;
  private gatewayId: string;
  private provider: string;
  private model: string;
  private providerApiKey?: string;
  private cfAigToken?: string;
  private config: CloudflareAIGatewayConfig;

  constructor(config: CloudflareAIGatewayConfig) {
    this.config = config;
    this.provider = config.provider;
    this.model = config.model;

    // Resolve account ID
    const accountIdEnvar = config.accountIdEnvar || ENV_VARS.CLOUDFLARE_ACCOUNT_ID;
    this.accountId = config.accountId || process.env[accountIdEnvar] || "";
    
    if (!this.accountId) {
      throw new Error(ERROR_MESSAGES.NO_ACCOUNT_ID);
    }

    // Resolve gateway ID
    const gatewayIdEnvar = config.gatewayIdEnvar || ENV_VARS.CLOUDFLARE_GATEWAY_ID;
    this.gatewayId = config.gatewayId || process.env[gatewayIdEnvar] || "";
    
    if (!this.gatewayId) {
      throw new Error(ERROR_MESSAGES.NO_GATEWAY_ID);
    }

    // Resolve gateway auth token (optional)
    const cfAigTokenEnvar = config.cfAigTokenEnvar || ENV_VARS.CF_AIG_TOKEN;
    this.cfAigToken = config.cfAigToken || process.env[cfAigTokenEnvar];

    // Resolve provider API key (optional if using BYOK)
    const defaultApiKeyEnvar = PROVIDER_API_KEY_MAP[config.provider];
    const apiKeyEnvar = config.providerApiKeyEnvar || defaultApiKeyEnvar;
    this.providerApiKey = config.providerApiKey || (apiKeyEnvar ? process.env[apiKeyEnvar] : undefined);

    // Validate Azure-specific configuration
    if (config.provider === AI_GATEWAY_PROVIDERS.AZURE_OPENAI) {
      if (!config.resourceName || !config.deploymentName) {
        throw new Error(ERROR_MESSAGES.AZURE_MISSING_CONFIG);
      }
    }
  }

  /**
   * Build the gateway endpoint URL
   */
  private getEndpoint(): string {
    const baseUrl = buildAIGatewayEndpoint(
      this.accountId,
      this.gatewayId,
      this.provider
    );

    // Azure OpenAI has a special URL structure
    if (this.provider === AI_GATEWAY_PROVIDERS.AZURE_OPENAI) {
      const apiVersion = this.config.apiVersion || DEFAULT_CONFIG.AZURE_API_VERSION;
      return `${baseUrl}/openai/deployments/${this.config.deploymentName}/chat/completions?api-version=${apiVersion}`;
    }

    // Workers AI includes model in URL path
    if (this.provider === AI_GATEWAY_PROVIDERS.WORKERS_AI) {
      return `${baseUrl}/chat/completions`;
    }

    // Standard OpenAI-compatible endpoint
    return `${baseUrl}/chat/completions`;
  }

  /**
   * Build request headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      [HTTP_HEADERS.CONTENT_TYPE]: HTTP_HEADERS.APPLICATION_JSON,
      [HTTP_HEADERS.ACCEPT]: HTTP_HEADERS.APPLICATION_JSON,
    };

    // Add provider API key if available
    if (this.providerApiKey) {
      headers[HTTP_HEADERS.AUTHORIZATION] = `Bearer ${this.providerApiKey}`;
    }

    // Add gateway auth token if required
    if (this.cfAigToken) {
      headers[HTTP_HEADERS.CF_AIG_TOKEN] = `Bearer ${this.cfAigToken}`;
    }

    return headers;
  }

  /**
   * Chat completion through AI Gateway
   */
  async chatCompletion(
    messages: ChatMessage[],
    options?: Partial<CloudflareAIGatewayConfig>
  ): Promise<ChatCompletionResponse> {
    const endpoint = this.getEndpoint();
    
    const requestBody: ChatCompletionRequest = {
      model: this.model,
      messages,
      temperature: options?.temperature ?? this.config.temperature ?? DEFAULT_CONFIG.TEMPERATURE,
      max_tokens: options?.max_tokens ?? this.config.max_tokens ?? DEFAULT_CONFIG.MAX_TOKENS,
      top_p: options?.top_p ?? this.config.top_p ?? DEFAULT_CONFIG.TOP_P,
      frequency_penalty: options?.frequency_penalty ?? this.config.frequency_penalty ?? DEFAULT_CONFIG.FREQUENCY_PENALTY,
      presence_penalty: options?.presence_penalty ?? this.config.presence_penalty ?? DEFAULT_CONFIG.PRESENCE_PENALTY,
      stop: options?.stop ?? this.config.stop,
      stream: false,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Cloudflare AI Gateway error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Simple chat helper
   */
  async chat(
    message: string,
    systemPrompt?: string,
    options?: Partial<CloudflareAIGatewayConfig>
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
 * Create a Cloudflare AI Gateway provider instance
 */
export function createCloudflareAIGatewayProvider(
  config: CloudflareAIGatewayConfig
): CloudflareAIGatewayProvider {
  return new CloudflareAIGatewayProvider(config);
}

/**
 * Helper: Chat through AI Gateway with a single function call
 */
export async function chatThroughGateway(
  provider: AIGatewayProvider | string,
  model: string,
  message: string,
  options?: {
    systemPrompt?: string;
    accountId?: string;
    gatewayId?: string;
    cfAigToken?: string;
    providerApiKey?: string;
    temperature?: number;
    max_tokens?: number;
  }
): Promise<string> {
  const gatewayProvider = createCloudflareAIGatewayProvider({
    provider,
    model,
    accountId: options?.accountId,
    gatewayId: options?.gatewayId,
    cfAigToken: options?.cfAigToken,
    providerApiKey: options?.providerApiKey,
    temperature: options?.temperature,
    max_tokens: options?.max_tokens,
  });

  return gatewayProvider.chat(message, options?.systemPrompt);
}
