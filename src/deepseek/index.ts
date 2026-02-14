/**
 * DeepSeek API Client
 * 
 * Direct API implementation (no SDK dependencies)
 * OpenAI-compatible format
 * 
 * @example
 * ```typescript
 * import { createDeepSeekClient, DEEPSEEK_MODELS } from '@/deepseek';
 * 
 * const client = createDeepSeekClient();
 * 
 * // Simple chat
 * const response = await client.chatCompletion('Hello!', {
 *   model: DEEPSEEK_MODELS.CHAT,
 *   temperature: 0.7,
 * });
 * 
 * // Advanced chat with multiple messages
 * const completion = await client.chat({
 *   model: DEEPSEEK_MODELS.REASONER,
 *   messages: [
 *     { role: 'system', content: 'You are a helpful assistant.' },
 *     { role: 'user', content: 'Explain quantum computing.' },
 *   ],
 *   temperature: 0.5,
 *   max_tokens: 1000,
 * });
 * 
 * // Streaming
 * for await (const chunk of client.chatStream({
 *   model: DEEPSEEK_MODELS.CHAT,
 *   messages: [{ role: 'user', content: 'Tell me a story.' }],
 * })) {
 *   console.log(chunk.choices[0]?.delta?.content || '');
 * }
 * ```
 */

export { DeepSeekClient, createDeepSeekClient, getDefaultClient, chat } from './client';
export { 
  DEEPSEEK_MODELS, 
  DEEPSEEK_API_BASE_URL, 
  DEEPSEEK_API_V1_URL, 
  DEEPSEEK_API_BETA_URL,
  DEFAULT_CONFIG 
} from './constants';
export type {
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionStreamChunk,
  FIMCompletionRequest,
  FIMCompletionResponse,
  FIMCompletionStreamChunk,
  DeepSeekConfig,
  DeepSeekError,
  MessageRole,
  TokenUsage,
  FunctionTool,
  ToolCall,
} from './types';
