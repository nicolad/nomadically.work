/**
 * Brave Search LLM Context API Integration
 *
 * Provides pre-extracted web content optimized for LLM grounding and RAG pipelines.
 * Unlike traditional web search APIs, this returns actual page content ready for LLM consumption.
 */

import {
  BRAVE_API_ENDPOINTS,
  ERROR_MESSAGES,
  HTTP_HEADERS,
  LLM_CONTEXT_DEFAULTS,
  LOCATION_HEADERS,
} from './constants';

export interface BraveSearchOptions {
  // Query Parameters
  q: string; // Search query (required, 1-400 chars, max 50 words)
  country?: string; // Country code (default: 'us')
  search_lang?: string; // Language code (default: 'en')
  count?: number; // Max search results to consider (1-50, default: 20)

  // Context Size Parameters
  maximum_number_of_urls?: number; // Max URLs in response (1-50, default: 20)
  maximum_number_of_tokens?: number; // Approx max tokens (1024-32768, default: 8192)
  maximum_number_of_snippets?: number; // Max snippets across all URLs (1-100, default: 50)
  maximum_number_of_tokens_per_url?: number; // Max tokens per URL (512-8192, default: 4096)
  maximum_number_of_snippets_per_url?: number; // Max snippets per URL (1-100, default: 50)

  // Filtering Parameters
  context_threshold_mode?: "strict" | "balanced" | "lenient" | "disabled"; // Relevance filtering (default: 'balanced')
  enable_local?: boolean | null; // Enable local recall (null = auto-detect, default: null)
  goggles?: string | string[]; // Goggle URL or inline definition for custom ranking

  // Location Parameters (headers)
  location?: {
    lat?: number; // Latitude (-90.0 to 90.0)
    long?: number; // Longitude (-180.0 to 180.0)
    city?: string; // City name
    state?: string; // State/region code (ISO 3166-2)
    stateName?: string; // State/region name
    country?: string; // 2-letter country code
    postalCode?: string; // Postal code
  };
}

export interface BraveGroundingItem {
  url: string;
  title: string;
  snippets: string[];
}

export interface BravePOI {
  name: string;
  url: string;
  title: string;
  snippets: string[];
}

export interface BraveSourceMetadata {
  title: string;
  hostname: string;
  age: [string, string, string] | null; // [formatted_date, iso_date, relative_time]
}

export interface BraveSearchResponse {
  grounding: {
    generic: BraveGroundingItem[];
    poi?: BravePOI | null;
    map?: BraveGroundingItem[];
  };
  sources: {
    [url: string]: BraveSourceMetadata;
  };
}

/**
 * Brave Search LLM Context Agent
 * Retrieves pre-extracted web content optimized for LLM consumption
 */
export class BraveSearchAgent {
  private apiKey: string;
  private baseUrl = BRAVE_API_ENDPOINTS.LLM_CONTEXT;

  constructor(apiKey?: string) {
    this.apiKey =
      apiKey ||
      process.env.BRAVE_SEARCH_API_KEY ||
      process.env.BRAVE_API_KEY ||
      "";
    if (!this.apiKey) {
      throw new Error(ERROR_MESSAGES.SEARCH_CLIENT_NO_API_KEY);
    }
  }

  /**
   * Search using GET request
   */
  async searchGet(options: BraveSearchOptions): Promise<BraveSearchResponse> {
    const url = new URL(this.baseUrl);

    // Add query parameters
    url.searchParams.append("q", options.q);
    if (options.country) url.searchParams.append("country", options.country);
    if (options.search_lang)
      url.searchParams.append("search_lang", options.search_lang);
    if (options.count)
      url.searchParams.append("count", options.count.toString());

    // Context size parameters
    if (options.maximum_number_of_urls) {
      url.searchParams.append(
        "maximum_number_of_urls",
        options.maximum_number_of_urls.toString(),
      );
    }
    if (options.maximum_number_of_tokens) {
      url.searchParams.append(
        "maximum_number_of_tokens",
        options.maximum_number_of_tokens.toString(),
      );
    }
    if (options.maximum_number_of_snippets) {
      url.searchParams.append(
        "maximum_number_of_snippets",
        options.maximum_number_of_snippets.toString(),
      );
    }
    if (options.maximum_number_of_tokens_per_url) {
      url.searchParams.append(
        "maximum_number_of_tokens_per_url",
        options.maximum_number_of_tokens_per_url.toString(),
      );
    }
    if (options.maximum_number_of_snippets_per_url) {
      url.searchParams.append(
        "maximum_number_of_snippets_per_url",
        options.maximum_number_of_snippets_per_url.toString(),
      );
    }

    // Filtering parameters
    if (options.context_threshold_mode) {
      url.searchParams.append(
        "context_threshold_mode",
        options.context_threshold_mode,
      );
    }
    if (options.enable_local !== undefined && options.enable_local !== null) {
      url.searchParams.append("enable_local", options.enable_local.toString());
    }
    if (options.goggles) {
      const gogglesValue = Array.isArray(options.goggles)
        ? options.goggles.join(",")
        : options.goggles;
      url.searchParams.append("goggles", gogglesValue);
    }

    // Build headers
    const headers: HeadersInit = {
      [HTTP_HEADERS.SUBSCRIPTION_TOKEN]: this.apiKey,
      Accept: HTTP_HEADERS.ACCEPT_JSON,
      "Accept-Encoding": HTTP_HEADERS.ACCEPT_ENCODING,
    };

    // Add location headers if provided
    if (options.location) {
      if (options.location.lat !== undefined) {
        headers[LOCATION_HEADERS.LATITUDE] = options.location.lat.toString();
      }
      if (options.location.long !== undefined) {
        headers[LOCATION_HEADERS.LONGITUDE] = options.location.long.toString();
      }
      if (options.location.city) headers[LOCATION_HEADERS.CITY] = options.location.city;
      if (options.location.state)
        headers[LOCATION_HEADERS.STATE] = options.location.state;
      if (options.location.stateName)
        headers[LOCATION_HEADERS.STATE_NAME] = options.location.stateName;
      if (options.location.country)
        headers[LOCATION_HEADERS.COUNTRY] = options.location.country;
      if (options.location.postalCode)
        headers[LOCATION_HEADERS.POSTAL_CODE] = options.location.postalCode;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Brave Search API error: ${response.status} ${response.statusText}\n` +
          `Response: ${errorBody}`,
      );
    }

    return response.json();
  }

  /**
   * Search using POST request
   * Better for complex queries or when parameters exceed URL length limits
   */
  async searchPost(options: BraveSearchOptions): Promise<BraveSearchResponse> {
    // Build request body (same structure as query params)
    const body: any = {
      q: options.q,
    };

    if (options.country) body.country = options.country;
    if (options.search_lang) body.search_lang = options.search_lang;
    if (options.count) body.count = options.count;
    if (options.maximum_number_of_urls)
      body.maximum_number_of_urls = options.maximum_number_of_urls;
    if (options.maximum_number_of_tokens)
      body.maximum_number_of_tokens = options.maximum_number_of_tokens;
    if (options.maximum_number_of_snippets)
      body.maximum_number_of_snippets = options.maximum_number_of_snippets;
    if (options.maximum_number_of_tokens_per_url)
      body.maximum_number_of_tokens_per_url =
        options.maximum_number_of_tokens_per_url;
    if (options.maximum_number_of_snippets_per_url)
      body.maximum_number_of_snippets_per_url =
        options.maximum_number_of_snippets_per_url;
    if (options.context_threshold_mode)
      body.context_threshold_mode = options.context_threshold_mode;
    if (options.enable_local !== undefined && options.enable_local !== null)
      body.enable_local = options.enable_local;
    if (options.goggles) body.goggles = options.goggles;

    // Build headers
    const headers: HeadersInit = {
      [HTTP_HEADERS.SUBSCRIPTION_TOKEN]: this.apiKey,
      "Content-Type": HTTP_HEADERS.CONTENT_TYPE_JSON,
      Accept: HTTP_HEADERS.ACCEPT_JSON,
      "Accept-Encoding": HTTP_HEADERS.ACCEPT_ENCODING,
    };

    // Add location headers if provided
    if (options.location) {
      if (options.location.lat !== undefined)
        headers[LOCATION_HEADERS.LATITUDE] = options.location.lat.toString();
      if (options.location.long !== undefined)
        headers[LOCATION_HEADERS.LONGITUDE] = options.location.long.toString();
      if (options.location.city) headers[LOCATION_HEADERS.CITY] = options.location.city;
      if (options.location.state)
        headers[LOCATION_HEADERS.STATE] = options.location.state;
      if (options.location.stateName)
        headers[LOCATION_HEADERS.STATE_NAME] = options.location.stateName;
      if (options.location.country)
        headers[LOCATION_HEADERS.COUNTRY] = options.location.country;
      if (options.location.postalCode)
        headers[LOCATION_HEADERS.POSTAL_CODE] = options.location.postalCode;
    }

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Brave Search API error: ${response.status} ${response.statusText}\n` +
          `Response: ${errorBody}`,
      );
    }

    return response.json();
  }

  /**
   * Auto-select GET or POST based on query complexity
   * Uses POST for queries over 200 chars or with many parameters
   */
  async search(options: BraveSearchOptions): Promise<BraveSearchResponse> {
    const shouldUsePost =
      options.q.length > 200 ||
      (options.goggles &&
        typeof options.goggles === "string" &&
        options.goggles.length > 100) ||
      (Array.isArray(options.goggles) && options.goggles.length > 3);

    return shouldUsePost ? this.searchPost(options) : this.searchGet(options);
  }
}

/**
 * Preset configurations for common use cases
 */
export const BraveSearchPresets = {
  /**
   * Simple factual queries - fast, minimal context
   */
  factual: (q: string): BraveSearchOptions => ({
    q,
    count: 5,
    maximum_number_of_tokens: 2048,
    maximum_number_of_urls: 5,
    context_threshold_mode: "strict",
  }),

  /**
   * Standard queries - balanced coverage and relevance
   */
  standard: (q: string): BraveSearchOptions => ({
    q,
    count: LLM_CONTEXT_DEFAULTS.COUNT,
    maximum_number_of_tokens: LLM_CONTEXT_DEFAULTS.MAX_TOKENS,
    maximum_number_of_urls: LLM_CONTEXT_DEFAULTS.MAX_URLS,
    context_threshold_mode: LLM_CONTEXT_DEFAULTS.CONTEXT_THRESHOLD_MODE,
  }),

  /**
   * Complex research - comprehensive context
   */
  research: (q: string): BraveSearchOptions => ({
    q,
    count: 50,
    maximum_number_of_tokens: 16384,
    maximum_number_of_urls: 50,
    context_threshold_mode: "lenient",
  }),

  /**
   * Local/POI queries with location awareness
   */
  local: (
    q: string,
    location: BraveSearchOptions["location"],
  ): BraveSearchOptions => ({
    q,
    count: 20,
    maximum_number_of_tokens: 8192,
    enable_local: true,
    location,
  }),

  /**
   * Job search optimized for remote AI roles
   */
  jobSearch: (q: string): BraveSearchOptions => ({
    q,
    count: 30,
    maximum_number_of_tokens: 12288,
    maximum_number_of_urls: 30,
    maximum_number_of_snippets: 75,
    context_threshold_mode: "balanced",
    search_lang: "en",
  }),
};
