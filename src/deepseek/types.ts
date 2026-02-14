/**
 * DeepSeek API Types
 * 
 * Based on OpenAI-compatible API format
 */

import type { DeepSeekModel } from './constants';

/**
 * Chat message roles
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Chat message
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  prefix?: boolean; // Beta: Chat prefix completion - set to true on last assistant message
}

/**
 * Tool call structure
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Function tool definition
 */
export interface FunctionTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
  };
}

/**
 * Chat completion request
 */
export interface ChatCompletionRequest {
  model: DeepSeekModel | string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  tools?: FunctionTool[];
  tool_choice?: 'none' | 'auto' | { type: 'function'; function: { name: string } };
  response_format?: { type: 'text' | 'json_object' };
  logprobs?: boolean;
  top_logprobs?: number;
  n?: number;
  user?: string;
}

/**
 * Chat completion choice
 */
export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  logprobs?: {
    content: Array<{
      token: string;
      logprob: number;
      top_logprobs: Array<{
        token: string;
        logprob: number;
      }>;
    }>;
  } | null;
}

/**
 * Token usage information
 */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: TokenUsage;
  system_fingerprint?: string;
}

/**
 * Streaming chunk delta
 */
export interface ChatCompletionChunkDelta {
  role?: MessageRole;
  content?: string;
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: 'function';
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
}

/**
 * Streaming chunk choice
 */
export interface ChatCompletionStreamChoice {
  index: number;
  delta: ChatCompletionChunkDelta;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  logprobs?: {
    content: Array<{
      token: string;
      logprob: number;
      top_logprobs: Array<{
        token: string;
        logprob: number;
      }>;
    }>;
  } | null;
}

/**
 * Chat completion streaming chunk
 */
export interface ChatCompletionStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatCompletionStreamChoice[];
  usage?: TokenUsage;
}

/**
 * API error response
 */
export interface DeepSeekError {
  error: {
    message: string;
    type?: string;
    code?: string | number;
    param?: string;
  };
}

/**
 * DeepSeek client configuration
 */
export interface DeepSeekConfig {
  apiKey?: string;
  baseURL?: string;
  maxRetries?: number;
  timeout?: number;
  defaultModel?: DeepSeekModel | string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  useBeta?: boolean; // Enable beta features (chat prefix completion, FIM)
}

/**
 * FIM (Fill In the Middle) Completion Request (Beta)
 * Requires base_url="https://api.deepseek.com/beta"
 */
export interface FIMCompletionRequest {
  model: DeepSeekModel | string;
  prompt: string;
  suffix?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  user?: string;
}

/**
 * FIM completion choice
 */
export interface FIMCompletionChoice {
  text: string;
  index: number;
  logprobs?: any;
  finish_reason: 'stop' | 'length' | null;
}

/**
 * FIM completion response
 */
export interface FIMCompletionResponse {
  id: string;
  object: 'text_completion';
  created: number;
  model: string;
  choices: FIMCompletionChoice[];
  usage: TokenUsage;
}

/**
 * FIM streaming chunk
 */
export interface FIMCompletionStreamChunk {
  id: string;
  object: 'text_completion';
  created: number;
  model: string;
  choices: Array<{
    text: string;
    index: number;
    logprobs?: any;
    finish_reason: 'stop' | 'length' | null;
  }>;
}
