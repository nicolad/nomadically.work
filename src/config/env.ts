/**
 * Environment Configuration Module
 *
 * Loads and validates environment variables for scripts and applications.
 *
 * Environment variables required:
 * - LANGFUSE_SECRET_KEY
 * - LANGFUSE_PUBLIC_KEY
 * - LANGFUSE_BASE_URL
 * - OPENAI_API_KEY (or other LLM provider)
 *
 * Note: Next.js automatically loads .env files at build time.
 * For standalone scripts, load dotenv before importing this module:
 *   require('dotenv').config({ path: '.env.local' });
 */

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

  // Turso Database Configuration
  turso: {
    url: string;
    authToken?: string; // Optional for local development
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
  const value = process.env[key]?.trim();
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
  return process.env[key]?.trim();
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

    d1:
      process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.CLOUDFLARE_D1_DATABASE_ID &&
      process.env.CLOUDFLARE_API_TOKEN
        ? {
            accountId: getRequiredEnv("CLOUDFLARE_ACCOUNT_ID"),
            databaseId: getRequiredEnv("CLOUDFLARE_D1_DATABASE_ID"),
            apiToken: getRequiredEnv("CLOUDFLARE_API_TOKEN"),
          }
        : undefined,

    turso: {
      url: getRequiredEnv("TURSO_DB_URL"),
      authToken: process.env.TURSO_DB_AUTH_TOKEN, // Optional for local dev
    },

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
  // Re-throw the error to prevent app from starting with invalid config
  // Note: process.exit() is not available in Edge Runtime
  throw error;
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
export const OPENAI_API_KEY = env.llm.openaiApiKey?.trim();
export const DEEPSEEK_API_KEY = env.llm.deepseekApiKey?.trim();

// Cloudflare configuration
export const CLOUDFLARE_ACCOUNT_ID = env.d1?.accountId?.trim();
export const CLOUDFLARE_API_TOKEN = env.d1?.apiToken?.trim();
export const CLOUDFLARE_D1_DATABASE_ID = env.d1?.databaseId?.trim();
export const CLOUDFLARE_WORKERS_AI_KEY = getOptionalEnv(
  "CLOUDFLARE_WORKERS_AI_KEY",
);

// Turso database configuration
export const TURSO_DB_URL = env.turso.url?.trim();
export const TURSO_DB_AUTH_TOKEN = env.turso.authToken?.trim();

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
