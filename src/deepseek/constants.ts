/**
 * DeepSeek API Constants
 * 
 * API Documentation: https://api-docs.deepseek.com/
 */

export const DEEPSEEK_API_BASE_URL = 'https://api.deepseek.com';
export const DEEPSEEK_API_V1_URL = 'https://api.deepseek.com/v1';
export const DEEPSEEK_API_BETA_URL = 'https://api.deepseek.com/beta';

/**
 * Available DeepSeek models
 */
export const DEEPSEEK_MODELS = {
  /**
   * DeepSeek-V3.2 Chat (128K context)
   * Non-thinking mode for general conversations
   */
  CHAT: 'deepseek-chat',
  
  /**
   * DeepSeek-V3.2 Reasoner (128K context)
   * Thinking mode with chain-of-thought reasoning
   */
  REASONER: 'deepseek-reasoner',
} as const;

export type DeepSeekModel = typeof DEEPSEEK_MODELS[keyof typeof DEEPSEEK_MODELS];

/**
 * Default API configuration
 */
export const DEFAULT_CONFIG = {
  maxRetries: 3,
  timeout: 60000, // 60 seconds
  temperature: 1.0,
  maxTokens: 4096,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
} as const;

/**
 * HTTP headers
 */
export const HTTP_HEADERS = {
  CONTENT_TYPE: 'application/json',
  AUTHORIZATION: 'Authorization',
  ACCEPT: 'application/json',
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  NO_API_KEY: 'DEEPSEEK_API_KEY environment variable is required',
  INVALID_RESPONSE: 'Invalid response from DeepSeek API',
  NETWORK_ERROR: 'Network error while calling DeepSeek API',
  TIMEOUT_ERROR: 'Request to DeepSeek API timed out',
  RATE_LIMIT: 'DeepSeek API rate limit exceeded',
  INVALID_MODEL: 'Invalid model specified',
} as const;
