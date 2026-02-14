/**
 * DeepSeek API Client
 * 
 * Direct API implementation using fetch (no SDK dependencies)
 * OpenAI-compatible API format
 */

import {
  DEEPSEEK_API_BASE_URL,
  DEEPSEEK_API_BETA_URL,
  DEFAULT_CONFIG,
  HTTP_HEADERS,
  ERROR_MESSAGES,
  DEEPSEEK_MODELS,
} from './constants';

import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionStreamChunk,
  FIMCompletionRequest,
  FIMCompletionResponse,
  FIMCompletionStreamChunk,
  ChatMessage,
  DeepSeekConfig,
  DeepSeekError,
} from './types';

/**
 * DeepSeek API Client
 * 
 * @example
 * ```typescript
 * const client = new DeepSeekClient({
 *   apiKey: process.env.DEEPSEEK_API_KEY,
 * });
 * 
 * const response = await client.chat({
 *   model: 'deepseek-chat',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 * ```
 */
export class DeepSeekClient {
  private apiKey: string;
  private baseURL: string;
  private maxRetries: number;
  private timeout: number;
  private defaultModel: string;

  constructor(config: DeepSeekConfig = {}) {
    this.apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error(ERROR_MESSAGES.NO_API_KEY);
    }

    // Use beta URL if requested, otherwise use config baseURL or default
    const defaultBaseURL = config.useBeta ? DEEPSEEK_API_BETA_URL : DEEPSEEK_API_BASE_URL;
    this.baseURL = config.baseURL || defaultBaseURL;
    this.maxRetries = config.maxRetries ?? DEFAULT_CONFIG.maxRetries;
    this.timeout = config.timeout ?? DEFAULT_CONFIG.timeout;
    this.defaultModel = config.defaultModel || DEEPSEEK_MODELS.CHAT;
  }

  /**
   * Create a chat completion
   */
  async chat(
    request: Partial<ChatCompletionRequest> & { messages: ChatMessage[] }
  ): Promise<ChatCompletionResponse> {
    const fullRequest: ChatCompletionRequest = {
      model: request.model || this.defaultModel,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      top_p: request.top_p,
      frequency_penalty: request.frequency_penalty,
      presence_penalty: request.presence_penalty,
      stop: request.stop,
      stream: false,
      tools: request.tools,
      tool_choice: request.tool_choice,
      response_format: request.response_format,
      logprobs: request.logprobs,
      top_logprobs: request.top_logprobs,
      n: request.n,
      user: request.user,
    };

    return this.makeRequest<ChatCompletionResponse>(
      '/chat/completions',
      fullRequest
    );
  }

  /**
   * Create a streaming chat completion
   * Returns an async generator that yields chunks
   */
  async *chatStream(
    request: Partial<ChatCompletionRequest> & { messages: ChatMessage[] }
  ): AsyncGenerator<ChatCompletionStreamChunk, void, unknown> {
    const fullRequest: ChatCompletionRequest = {
      ...request,
      model: request.model || this.defaultModel,
      stream: true,
    };

    const response = await this.makeStreamRequest('/chat/completions', fullRequest);
    
    if (!response.body) {
      throw new Error('No response body for streaming request');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          
          if (!trimmed || trimmed === 'data: [DONE]') {
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              yield data as ChatCompletionStreamChunk;
            } catch (e) {
              console.error('Failed to parse SSE data:', trimmed, e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Helper: Simple chat completion (single message)
   */
  async chatCompletion(
    message: string,
    options?: {
      systemPrompt?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    if (options?.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: message,
    });

    const response = await this.chat({
      model: options?.model,
      messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * FIM (Fill In the Middle) Completion (Beta)
   * Requires useBeta=true or baseURL='https://api.deepseek.com/beta'
   * 
   * @example
   * ```typescript
   * const response = await client.fimCompletion({
   *   prompt: 'def fib(a):',
   *   suffix: '    return fib(a-1) + fib(a-2)',
   *   max_tokens: 128,
   * });
   * console.log(response.choices[0].text);
   * ```
   */
  async fimCompletion(
    request: Partial<FIMCompletionRequest> & { prompt: string }
  ): Promise<FIMCompletionResponse> {
    const fullRequest: FIMCompletionRequest = {
      model: request.model || this.defaultModel,
      prompt: request.prompt,
      suffix: request.suffix,
      max_tokens: request.max_tokens || 4096, // FIM max is 4K
      temperature: request.temperature,
      top_p: request.top_p,
      frequency_penalty: request.frequency_penalty,
      presence_penalty: request.presence_penalty,
      stop: request.stop,
      stream: false,
      user: request.user,
    };

    return this.makeRequest<FIMCompletionResponse>(
      '/completions',
      fullRequest
    );
  }

  /**
   * FIM streaming completion (Beta)
   */
  async *fimCompletionStream(
    request: Partial<FIMCompletionRequest> & { prompt: string }
  ): AsyncGenerator<FIMCompletionStreamChunk, void, unknown> {
    const fullRequest: FIMCompletionRequest = {
      ...request,
      model: request.model || this.defaultModel,
      max_tokens: request.max_tokens || 4096,
      stream: true,
    };

    const response = await this.makeStreamRequest('/completions', fullRequest);
    
    if (!response.body) {
      throw new Error('No response body for streaming request');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          
          if (!trimmed || trimmed === 'data: [DONE]') {
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              yield data as FIMCompletionStreamChunk;
            } catch (e) {
              console.error('Failed to parse SSE data:', trimmed, e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Make a non-streaming API request
   */
  private async makeRequest<T>(
    endpoint: string,
    body: any,
    attempt = 0
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [HTTP_HEADERS.AUTHORIZATION]: `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as DeepSeekError;
        const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // Retry on rate limit or server errors
        if (
          (response.status === 429 || response.status >= 500) &&
          attempt < this.maxRetries
        ) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeRequest<T>(endpoint, body, attempt + 1);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(ERROR_MESSAGES.TIMEOUT_ERROR);
        }
        throw error;
      }

      throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
    }
  }

  /**
   * Make a streaming API request
   */
  private async makeStreamRequest(
    endpoint: string,
    body: any
  ): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [HTTP_HEADERS.AUTHORIZATION]: `Bearer ${this.apiKey}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as DeepSeekError;
      const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return response;
  }
}

/**
 * Create a DeepSeek client instance
 */
export function createDeepSeekClient(config?: DeepSeekConfig): DeepSeekClient {
  return new DeepSeekClient(config);
}

/**
 * Create a singleton instance with default config
 */
let defaultClient: DeepSeekClient | null = null;

export function getDefaultClient(): DeepSeekClient {
  if (!defaultClient) {
    defaultClient = createDeepSeekClient();
  }
  return defaultClient;
}

/**
 * Helper: Quick chat completion
 */
export async function chat(
  message: string,
  options?: {
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const client = getDefaultClient();
  return client.chatCompletion(message, options);
}
