/**
 * Environment Configuration Module
 *
 * Loads and validates environment variables for scripts and applications.
 * Uses dotenv to inject variables from .env.local
 *
 * Environment variables required:
 * - LANGFUSE_SECRET_KEY
 * - LANGFUSE_PUBLIC_KEY
 * - LANGFUSE_BASE_URL
 * - OPENAI_API_KEY (or other LLM provider)
 */

import { config } from "dotenv";
import path from "path";

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
config({ path: envPath });

/**
 * Environment variable configuration with validation
 */
export interface EnvConfig {
  // Langfuse Configuration
  langfuse: {
    secretKey: string;
    publicKey: string;
    baseUrl: string;
  };

  // LLM Provider Configuration
  llm: {
    openaiApiKey?: string;
    deepseekApiKey?: string;
  };

  // Cloudflare D1 Configuration
  d1?: {
    accountId: string;
    databaseId: string;
    apiToken: string;
  };

  // Other APIs
  apis?: {
    resendApiKey?: string;
    braveApiKey?: string;
  };
}

/**
 * Get required environment variable or throw error
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Please ensure it's set in .env.local`,
    );
  }
  return value;
}

/**
 * Get optional environment variable
 */
function getOptionalEnv(key: string): string | undefined {
  return process.env[key];
}

/**
 * Validate and load environment configuration
 */
export function loadEnvConfig(): EnvConfig {
  return {
    langfuse: {
      secretKey: getRequiredEnv("LANGFUSE_SECRET_KEY"),
      publicKey: getRequiredEnv("LANGFUSE_PUBLIC_KEY"),
      baseUrl: getRequiredEnv("LANGFUSE_BASE_URL"),
    },

    llm: {
      openaiApiKey: getOptionalEnv("OPENAI_API_KEY"),
      deepseekApiKey: getOptionalEnv("DEEPSEEK_API_KEY"),
    },

    d1: process.env.CLOUDFLARE_ACCOUNT_ID
      ? {
          accountId: getRequiredEnv("CLOUDFLARE_ACCOUNT_ID"),
          databaseId: getRequiredEnv("CLOUDFLARE_D1_DATABASE_ID"),
          apiToken: getRequiredEnv("CLOUDFLARE_API_TOKEN"),
        }
      : undefined,

    apis: {
      resendApiKey: getOptionalEnv("RESEND_API_KEY"),
      braveApiKey: getOptionalEnv("BRAVE_API_KEY"),
    },
  };
}

/**
 * Load and validate configuration on import
 * This ensures environment variables are available immediately
 */
let envConfig: EnvConfig;

try {
  envConfig = loadEnvConfig();
} catch (error) {
  console.error("❌ Environment configuration error:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

/**
 * Export validated configuration
 */
export const env = envConfig;

/**
 * Export individual environment variables for convenience
 */
export const LANGFUSE_SECRET_KEY = env.langfuse.secretKey;
export const LANGFUSE_PUBLIC_KEY = env.langfuse.publicKey;
export const LANGFUSE_BASE_URL = env.langfuse.baseUrl;
export const OPENAI_API_KEY = env.llm.openaiApiKey;
export const DEEPSEEK_API_KEY = env.llm.deepseekApiKey;

/**
 * Ensure environment is loaded (call this at the start of scripts)
 */
export function ensureEnvLoaded(): void {
  if (!envConfig) {
    throw new Error("Environment configuration not loaded");
  }
  console.log("✅ Environment configuration loaded successfully");
}

// Export default for easy import
export default env;
