/**
 * OpenRouter Provider for Mastra
 * 
 * This module provides OpenRouter integration using DeepSeek models exclusively.
 * OpenRouter offers unified access to multiple AI models with simplified billing.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { 
  OPENROUTER_CONFIG, 
  DEEPSEEK_MODELS, 
  DEFAULT_OPENROUTER_OPTIONS,
  type OpenRouterOptions 
} from './config';

/**
 * Create OpenRouter provider instance
 * 
 * OpenRouter is compatible with the OpenAI SDK, so we use createOpenAI
 * with OpenRouter's base URL and configuration.
 */
export function createOpenRouter(options?: OpenRouterOptions & { throwOnMissingKey?: boolean }) {
  const throwOnMissingKey = options?.throwOnMissingKey ?? true;
  
  if (!OPENROUTER_CONFIG.apiKey && throwOnMissingKey) {
    throw new Error(
      'OPENROUTER_API_KEY is not defined in environment variables. ' +
      'Get your API key from https://openrouter.ai/keys'
    );
  }

  const mergedOptions = {
    ...DEFAULT_OPENROUTER_OPTIONS,
    ...options,
  };

  return createOpenAI({
    apiKey: OPENROUTER_CONFIG.apiKey || 'dummy-key-for-testing',
    baseURL: OPENROUTER_CONFIG.baseURL,
    headers: {
      ...mergedOptions.headers,
    },
  });
}

/**
 * Pre-configured OpenRouter instance with DeepSeek defaults
 * Lazy-loaded to allow imports without API key
 */
let _openrouter: ReturnType<typeof createOpenAI> | null = null;
export const openrouter = new Proxy({} as ReturnType<typeof createOpenAI>, {
  get(_, prop) {
    if (!_openrouter) {
      _openrouter = createOpenRouter();
    }
    return (_openrouter as any)[prop];
  },
  apply(_, thisArg, args) {
    if (!_openrouter) {
      _openrouter = createOpenRouter();
    }
    return (_openrouter as any)(...args);
  },
});

/**
 * Helper function to create model instance with specific DeepSeek model
 */
export function createDeepSeekModel(
  modelId: keyof typeof DEEPSEEK_MODELS = 'CHAT',
  options?: OpenRouterOptions & { throwOnMissingKey?: boolean }
) {
  const provider = createOpenRouter(options);
  return provider(DEEPSEEK_MODELS[modelId]);
}

/**
 * Pre-configured DeepSeek model instances
 */
export const deepseekModels = {
  /** DeepSeek Chat - General purpose conversational AI */
  chat: (options?: OpenRouterOptions & { throwOnMissingKey?: boolean }) => 
    createDeepSeekModel('CHAT', options),
  
  /** DeepSeek R1 - Latest reasoning model */
  r1: (options?: OpenRouterOptions & { throwOnMissingKey?: boolean }) => 
    createDeepSeekModel('R1', options),
  
  /** DeepSeek R1 Distill Qwen 32B - Distilled reasoning model */
  r1DistillQwen32B: (options?: OpenRouterOptions & { throwOnMissingKey?: boolean }) => 
    createDeepSeekModel('R1_DISTILL_QWEN_32B', options),
  
  /** DeepSeek R1 Distill Llama 70B - Distilled reasoning model */
  r1DistillLlama70B: (options?: OpenRouterOptions & { throwOnMissingKey?: boolean }) => 
    createDeepSeekModel('R1_DISTILL_LLAMA_70B', options),
  
  /** DeepSeek Coder - Specialized for code generation */
  coder: (options?: OpenRouterOptions & { throwOnMissingKey?: boolean }) => 
    createDeepSeekModel('CODER', options),
} as const;
