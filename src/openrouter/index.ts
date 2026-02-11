/**
 * OpenRouter Integration for Nomadically.work
 * 
 * This module provides OpenRouter integration using DeepSeek models exclusively.
 * 
 * @example Basic usage with Mastra Agent
 * ```ts
 * import { createChatAgent } from '@/openrouter';
 * 
 * const agent = createChatAgent({
 *   name: 'My Assistant',
 *   instructions: 'You are a helpful assistant.',
 * });
 * 
 * const response = await agent.generate([
 *   { role: 'user', content: 'Hello!' }
 * ]);
 * ```
 * 
 * @example Using specific DeepSeek models
 * ```ts
 * import { deepseekModels } from '@/openrouter';
 * 
 * const chatModel = deepseekModels.chat();
 * const reasoningModel = deepseekModels.r1();
 * const coderModel = deepseekModels.coder();
 * ```
 * 
 * @example Direct provider usage
 * ```ts
 * import { openrouter, DEEPSEEK_MODELS } from '@/openrouter';
 * 
 * const model = openrouter(DEEPSEEK_MODELS.CHAT);
 * ```
 */

// Core configuration
export {
  OPENROUTER_CONFIG,
  DEEPSEEK_MODELS,
  DEFAULT_OPENROUTER_OPTIONS,
  type DeepSeekModel,
  type OpenRouterOptions,
} from './config';

// Provider and model instances
export {
  createOpenRouter,
  openrouter,
  createDeepSeekModel,
  deepseekModels,
} from './provider';

// Agent helpers
export {
  createChatAgent,
  createReasoningAgent,
  createCodingAgent,
  agentTemplates,
  type AgentConfig,
} from './agents';
