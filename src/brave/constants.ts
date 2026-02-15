/**
 * Brave API Constants
 *
 * Centralized constants for Brave Search API integration
 */

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const BRAVE_API_ENDPOINTS = {
  /** Brave Answers (AI Chat) endpoint */
  ANSWERS: "https://api.search.brave.com/res/v1/answers/chat/completions",

  /** Brave LLM Context endpoint */
  LLM_CONTEXT: "https://api.search.brave.com/res/v1/llm/context",

  /** Brave Autosuggest endpoint */
  AUTOSUGGEST: "https://api.search.brave.com/res/v1/suggest/search",

  /** Brave Spellcheck endpoint */
  SPELLCHECK: "https://api.search.brave.com/res/v1/spellcheck/search",
} as const;

// ============================================================================
// DEFAULT JOB SEARCH QUERIES
// ============================================================================

/**
 * Default job search queries for remote AI/GenAI consulting roles
 */
export const DEFAULT_JOB_QUERIES: string[] = [
  'fully remote "AI consultant" agency OR consultancy "client-facing" RAG OR LLM OR "generative AI" (last 7 days)',
  'fully remote "generative AI engineer" agency OR consultancy "client delivery" RAG OR LLM OR agents (last 7 days)',
  'fully remote "LLM architect" agency OR consultancy "client engagement" RAG OR agents (last 7 days)',
  'fully remote "AI solutions architect" consultancy OR agency "client facing" (last 7 days)',
  'remote "AI delivery manager" consultancy OR agency LLM OR GenAI (last 7 days)',
  'fully remote "AI specialist" consulting OR agency "client projects" EU (last 7 days)',
];

// ============================================================================
import { ASHBY_JOBS_DOMAIN } from "../constants/ats";

// ============================================================================
// SEARCH PAGINATION DEFAULTS
// ============================================================================

export const SEARCH_DEFAULTS = {
  /** Default results per page for job search */
  RESULTS_PER_PAGE: 20,

  /** Maximum number of pages to fetch */
  MAX_PAGES: 10,

  /** Default maximum results */
  MAX_RESULTS: 100,

  /** Default site for Ashby job searches */
  ASHBY_SITE: ASHBY_JOBS_DOMAIN,
} as const;

// ============================================================================
// LLM CONTEXT DEFAULTS
// ============================================================================

export const LLM_CONTEXT_DEFAULTS = {
  /** Default search results count */
  COUNT: 20,

  /** Default maximum number of URLs */
  MAX_URLS: 20,

  /** Default maximum tokens */
  MAX_TOKENS: 8192,

  /** Default maximum snippets */
  MAX_SNIPPETS: 50,

  /** Default maximum tokens per URL */
  MAX_TOKENS_PER_URL: 4096,

  /** Default maximum snippets per URL */
  MAX_SNIPPETS_PER_URL: 50,

  /** Default context threshold mode */
  CONTEXT_THRESHOLD_MODE: "balanced" as const,
} as const;

// ============================================================================
// COMPREHENSIVE LLM CONTEXT LIMITS
// ============================================================================

export const COMPREHENSIVE_LLM_LIMITS = {
  /** Maximum search results */
  COUNT: 50,

  /** Maximum URLs */
  MAX_URLS: 50,

  /** Maximum tokens */
  MAX_TOKENS: 32768,

  /** Maximum snippets */
  MAX_SNIPPETS: 100,

  /** Maximum tokens per URL */
  MAX_TOKENS_PER_URL: 8192,

  /** Maximum snippets per URL */
  MAX_SNIPPETS_PER_URL: 100,

  /** Context threshold mode */
  CONTEXT_THRESHOLD_MODE: "lenient" as const,

  /** Enable local search */
  ENABLE_LOCAL: true,
} as const;

// ============================================================================
// JOB EXTRACTION DEFAULTS
// ============================================================================

export const JOB_EXTRACTION_DEFAULTS = {
  /** Maximum age of jobs in hours for "last 24h" filter */
  MAX_AGE_HOURS: 24,

  /** Maximum age in milliseconds */
  MAX_AGE_MS: 24 * 60 * 60 * 1000,

  /** Minimum confidence threshold for job extraction */
  MIN_CONFIDENCE: 0.55,

  /** Maximum number of evidence strings per job */
  MAX_EVIDENCE: 6,

  /** Minimum number of evidence strings per job */
  MIN_EVIDENCE: 1,

  /** Maximum snippet text length for extraction */
  MAX_SNIPPET_LENGTH: 6500,

  /** Maximum documents to process */
  MAX_DOCUMENTS: 30,
} as const;

// ============================================================================
// REGION MODES
// ============================================================================

export const REGION_MODES = {
  WORLDWIDE: "worldwide",
  EUROPE: "europe",
} as const;

export type RegionMode = (typeof REGION_MODES)[keyof typeof REGION_MODES];

// ============================================================================
// ANSWERS API DEFAULTS
// ============================================================================

export const ANSWERS_DEFAULTS = {
  /** Default model */
  MODEL: "brave-search",

  /** Fallback model */
  FALLBACK_MODEL: "brave-search-fallback",

  /** Default temperature */
  TEMPERATURE: 0.7,
} as const;

// ============================================================================
// HTTP HEADERS
// ============================================================================

export const HTTP_HEADERS = {
  ACCEPT_JSON: "application/json",
  ACCEPT_STREAM: "text/event-stream",
  ACCEPT_ENCODING: "gzip",
  CONTENT_TYPE_JSON: "application/json",
  SUBSCRIPTION_TOKEN: "X-Subscription-Token",
} as const;

// ============================================================================
// LOCATION HEADER KEYS
// ============================================================================

export const LOCATION_HEADERS = {
  LATITUDE: "x-loc-lat",
  LONGITUDE: "x-loc-long",
  CITY: "x-loc-city",
  STATE: "x-loc-state",
  STATE_NAME: "x-loc-state-name",
  COUNTRY: "x-loc-country",
  POSTAL_CODE: "x-loc-postal-code",
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  NO_API_KEY:
    "Brave API key is required. Set BRAVE_API_KEY environment variable or pass it as a parameter.",
  NO_RESPONSE_BODY: "No response body",
  SEARCH_CLIENT_NO_API_KEY:
    "BRAVE_SEARCH_API_KEY or BRAVE_API_KEY is required. Set it in environment variables.",
} as const;

// ============================================================================
// STREAMING
// ============================================================================

export const STREAMING = {
  DATA_PREFIX: "data: ",
  DONE_MESSAGE: "[DONE]",
} as const;
