/**
 * Brave LLM Context API Client
 *
 * Pre-extracted web content optimized for AI agents, LLM grounding, and RAG pipelines.
 *
 * @see https://api.search.brave.com/app/documentation/llm-context
 */

import {
  BRAVE_API_ENDPOINTS,
  ERROR_MESSAGES,
  HTTP_HEADERS,
  LLM_CONTEXT_DEFAULTS,
  COMPREHENSIVE_LLM_LIMITS,
  LOCATION_HEADERS,
} from './constants';

export interface BraveLLMContextParams {
  /** The user's search query term (1-400 chars, max 50 words) */
  q: string;

  /** Country code (ISO 3166-1 alpha-2) */
  country?: string;

  /** Search language (ISO 639-1 or longer) */
  search_lang?: string;

  /** Max search results to consider (1-50, default 20) */
  count?: number;

  /** Max different URLs in context (1-50) */
  maximum_number_of_urls?: number;

  /** Approx max tokens (1024-32768, default 8192) */
  maximum_number_of_tokens?: number;

  /** Max snippets/chunks (1-100, default 50) */
  maximum_number_of_snippets?: number;

  /** Threshold mode for including content */
  context_threshold_mode?: "disabled" | "strict" | "lenient" | "balanced";

  /** Max tokens per URL (512-8192, default 4096) */
  maximum_number_of_tokens_per_url?: number;

  /** Max snippets per URL (1-100, default 50) */
  maximum_number_of_snippets_per_url?: number;

  /** Goggle URL or definition for reranking */
  goggles?: string;

  /** Enable local recall (auto-detect if not set) */
  enable_local?: boolean;
}

export interface BraveLLMContextHeaders {
  /** Client latitude (-90 to 90) */
  "x-loc-lat"?: number;

  /** Client longitude (-180 to 180) */
  "x-loc-long"?: number;

  /** Client city name */
  "x-loc-city"?: string;

  /** Client state/region code (up to 3 chars) */
  "x-loc-state"?: string;

  /** Client state/region name */
  "x-loc-state-name"?: string;

  /** Client country code (ISO 3166-1 alpha-2) */
  "x-loc-country"?: string;

  /** Client postal code */
  "x-loc-postal-code"?: string;
}

export interface BraveLLMGroundingSnippet {
  /** The original query URL */
  name: string;

  /** The canonical/redirect URL */
  url: string;

  /** Page title */
  title: string;

  /** Array of text snippets from the page */
  snippets: string[];
}

export interface BraveLLMGrounding {
  /** Generic grounding snippets */
  generic: BraveLLMGroundingSnippet[];

  /** Point of interest grounding (if applicable) */
  poi?: BraveLLMGroundingSnippet;

  /** Map grounding (if applicable) */
  map: BraveLLMGroundingSnippet[];
}

export interface BraveLLMSource {
  /** Original query URL */
  name: string;

  /** Canonical/redirect URL */
  url: string;

  /** Page title */
  title: string;

  /** Full page text content */
  page_text?: string;

  /** Page metadata */
  meta?: {
    description?: string;
    keywords?: string[];
    author?: string;
    published_date?: string;
  };
}

export interface BraveLLMContextResponse {
  /** LLM context content by type */
  grounding: BraveLLMGrounding;

  /** Metadata for all referenced URLs, keyed by URL */
  sources: Record<string, BraveLLMSource>;
}

/**
 * Get LLM-optimized context for a search query
 * Perfect for RAG pipelines, AI agents, and LLM grounding
 */
export async function getLLMContext(
  params: BraveLLMContextParams,
  headers?: BraveLLMContextHeaders,
  apiKey?: string,
): Promise<BraveLLMContextResponse> {
  const key = apiKey || process.env.BRAVE_API_KEY;

  if (!key) {
    throw new Error(ERROR_MESSAGES.NO_API_KEY);
  }

  const url = new URL(BRAVE_API_ENDPOINTS.LLM_CONTEXT);

  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  const requestHeaders: Record<string, string> = {
    Accept: HTTP_HEADERS.ACCEPT_JSON,
    "Accept-Encoding": HTTP_HEADERS.ACCEPT_ENCODING,
    [HTTP_HEADERS.SUBSCRIPTION_TOKEN]: key,
  };

  // Add location headers if provided
  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        requestHeaders[key] = String(value);
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: requestHeaders,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Brave LLM Context API error: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  return response.json();
}

/**
 * Get comprehensive LLM context with maximum detail
 * Uses all available options for richest context
 */
export async function getComprehensiveLLMContext(
  query: string,
  options?: {
    country?: string;
    search_lang?: string;
    location?: BraveLLMContextHeaders;
    apiKey?: string;
  },
): Promise<BraveLLMContextResponse> {
  return getLLMContext(
    {
      q: query,
      country: options?.country,
      search_lang: options?.search_lang,
      count: COMPREHENSIVE_LLM_LIMITS.COUNT,
      maximum_number_of_urls: COMPREHENSIVE_LLM_LIMITS.MAX_URLS,
      maximum_number_of_tokens: COMPREHENSIVE_LLM_LIMITS.MAX_TOKENS,
      maximum_number_of_snippets: COMPREHENSIVE_LLM_LIMITS.MAX_SNIPPETS,
      context_threshold_mode: COMPREHENSIVE_LLM_LIMITS.CONTEXT_THRESHOLD_MODE,
      maximum_number_of_tokens_per_url: COMPREHENSIVE_LLM_LIMITS.MAX_TOKENS_PER_URL,
      maximum_number_of_snippets_per_url: COMPREHENSIVE_LLM_LIMITS.MAX_SNIPPETS_PER_URL,
      enable_local: COMPREHENSIVE_LLM_LIMITS.ENABLE_LOCAL,
    },
    options?.location,
    options?.apiKey,
  );
}

/**
 * Get balanced LLM context optimized for typical use cases
 * Good default for most RAG/grounding scenarios
 */
export async function getBalancedLLMContext(
  query: string,
  options?: {
    country?: string;
    search_lang?: string;
    apiKey?: string;
  },
): Promise<BraveLLMContextResponse> {
  return getLLMContext(
    {
      q: query,
      country: options?.country,
      search_lang: options?.search_lang,
      count: LLM_CONTEXT_DEFAULTS.COUNT,
      maximum_number_of_tokens: LLM_CONTEXT_DEFAULTS.MAX_TOKENS,
      maximum_number_of_snippets: LLM_CONTEXT_DEFAULTS.MAX_SNIPPETS,
      context_threshold_mode: LLM_CONTEXT_DEFAULTS.CONTEXT_THRESHOLD_MODE,
      maximum_number_of_tokens_per_url: LLM_CONTEXT_DEFAULTS.MAX_TOKENS_PER_URL,
      maximum_number_of_snippets_per_url: LLM_CONTEXT_DEFAULTS.MAX_SNIPPETS_PER_URL,
    },
    undefined,
    options?.apiKey,
  );
}
