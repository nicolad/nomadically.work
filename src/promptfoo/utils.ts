/**
 * Utility functions for Cloudflare integration
 */

import type { ChatMessage } from './types';

// ============================================================================
// MESSAGE FORMATTING
// ============================================================================

/**
 * Format a simple message for chat completion
 */
export function formatMessage(
  content: string,
  role: 'system' | 'user' | 'assistant' = 'user'
): ChatMessage {
  return { role, content };
}

/**
 * Format a conversation with system prompt
 */
export function formatConversation(
  userMessage: string,
  systemPrompt?: string,
  previousMessages: ChatMessage[] = []
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push(formatMessage(systemPrompt, 'system'));
  }

  messages.push(...previousMessages);
  messages.push(formatMessage(userMessage, 'user'));

  return messages;
}

// ============================================================================
// ENVIRONMENT VARIABLE HELPERS
// ============================================================================

/**
 * Get environment variable with fallback
 */
export function getEnvVar(
  name: string,
  fallback?: string,
  required: boolean = false
): string | undefined {
  const value = process.env[name] || fallback;

  if (required && !value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }

  return value;
}

/**
 * Validate required environment variables
 */
export function validateEnvVars(required: string[]): void {
  const missing = required.filter(name => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

// ============================================================================
// MODEL VALIDATION
// ============================================================================

/**
 * Check if a model name is valid for Cloudflare Workers AI
 */
export function isValidCloudflareModel(model: string): boolean {
  return model.startsWith('@cf/') || model.startsWith('@hf/');
}

/**
 * Extract provider and model name from a gateway provider ID
 * Format: "cloudflare-gateway:{provider}:{model}"
 */
export function parseGatewayProviderId(id: string): {
  provider: string;
  model: string;
} | null {
  const match = id.match(/^cloudflare-gateway:([^:]+):(.+)$/);
  
  if (!match) {
    return null;
  }

  return {
    provider: match[1],
    model: match[2],
  };
}

/**
 * Extract provider type and model from Workers AI provider ID
 * Format: "cloudflare-ai:{type}:{model}"
 */
export function parseWorkersAIProviderId(id: string): {
  type: 'chat' | 'completion' | 'embedding';
  model: string;
} | null {
  const match = id.match(/^cloudflare-ai:(chat|completion|embedding):(.+)$/);
  
  if (!match) {
    return null;
  }

  return {
    type: match[1] as 'chat' | 'completion' | 'embedding',
    model: match[2],
  };
}

// ============================================================================
// RESPONSE FORMATTING
// ============================================================================

/**
 * Extract text content from chat completion response
 */
export function extractTextFromResponse(response: any): string {
  if (response?.choices?.[0]?.message?.content) {
    return response.choices[0].message.content;
  }

  if (response?.choices?.[0]?.text) {
    return response.choices[0].text;
  }

  throw new Error('Unable to extract text from response');
}

/**
 * Calculate token usage from response
 */
export function getTokenUsage(response: any): {
  prompt: number;
  completion: number;
  total: number;
} | null {
  const usage = response?.usage;

  if (!usage) {
    return null;
  }

  return {
    prompt: usage.prompt_tokens || 0,
    completion: usage.completion_tokens || 0,
    total: usage.total_tokens || 0,
  };
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  throw lastError;
}

// ============================================================================
// COST ESTIMATION
// ============================================================================

/**
 * Estimate cost based on token usage (rough approximation)
 * Prices vary by model and provider
 */
export function estimateCost(
  promptTokens: number,
  completionTokens: number,
  model: string
): number {
  // Cloudflare Workers AI pricing is typically much lower than direct API calls
  // This is a very rough approximation
  const pricePerMillionPromptTokens = 0.5;
  const pricePerMillionCompletionTokens = 1.5;

  const promptCost = (promptTokens / 1_000_000) * pricePerMillionPromptTokens;
  const completionCost = (completionTokens / 1_000_000) * pricePerMillionCompletionTokens;

  return promptCost + completionCost;
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * Format a request for logging
 */
export function formatRequestLog(
  provider: string,
  model: string,
  messages: ChatMessage[],
  config?: Record<string, any>
): string {
  return `[${provider}] ${model}
Messages: ${messages.length}
Config: ${JSON.stringify(config || {}, null, 2)}`;
}

/**
 * Format a response for logging
 */
export function formatResponseLog(response: any): string {
  const text = extractTextFromResponse(response);
  const usage = getTokenUsage(response);

  return `Response: ${text.substring(0, 100)}...
Usage: ${usage ? `${usage.prompt} prompt + ${usage.completion} completion = ${usage.total} total tokens` : 'N/A'}`;
}
