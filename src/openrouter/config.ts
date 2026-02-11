/**
 * OpenRouter Configuration
 * 
 * Using DeepSeek models exclusively through OpenRouter.
 * DeepSeek offers cost-effective, high-performance models for various tasks.
 */

export const OPENROUTER_CONFIG = {
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
} as const;

/**
 * DeepSeek Models available through OpenRouter
 */
export const DEEPSEEK_MODELS = {
  // DeepSeek Chat - General purpose conversational AI
  CHAT: 'deepseek/deepseek-chat',
  
  // DeepSeek R1 - Latest reasoning model
  R1: 'deepseek/deepseek-r1',
  
  // DeepSeek R1 Distill variants
  R1_DISTILL_QWEN_32B: 'deepseek/deepseek-r1-distill-qwen-32b',
  R1_DISTILL_LLAMA_70B: 'deepseek/deepseek-r1-distill-llama-70b',
  
  // DeepSeek Coder - Specialized for code generation
  CODER: 'deepseek/deepseek-coder',
} as const;

export type DeepSeekModel = typeof DEEPSEEK_MODELS[keyof typeof DEEPSEEK_MODELS];

/**
 * OpenRouter request options
 */
export interface OpenRouterOptions {
  /**
   * Reasoning configuration for models that support it
   */
  reasoning?: {
    max_tokens?: number;
  };
  
  /**
   * Custom headers for OpenRouter requests
   */
  headers?: {
    'HTTP-Referer'?: string;
    'X-Title'?: string;
  };
}

/**
 * Default OpenRouter options
 */
export const DEFAULT_OPENROUTER_OPTIONS: OpenRouterOptions = {
  reasoning: {
    max_tokens: 10000,
  },
  headers: {
    'X-Title': 'Nomadically.work',
  },
};
