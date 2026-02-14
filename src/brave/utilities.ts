/**
 * Brave Autosuggest & Spellcheck APIs
 */

import { BRAVE_API_ENDPOINTS, HTTP_HEADERS } from './constants';

// ============================================================================
// AUTOSUGGEST
// ============================================================================

export interface BraveAutosuggestParams {
  /** Partial search query */
  q: string;

  /** Country code */
  country?: string;

  /** Search language */
  lang?: string;

  /** Number of suggestions (max 20) */
  count?: number;
}

export interface BraveAutosuggestResponse {
  type: "search";
  query: {
    original: string;
  };
  results: Array<{
    query: string;
    is_entity?: boolean;
  }>;
}

export async function getAutosuggest(
  params: BraveAutosuggestParams,
  apiKey?: string,
): Promise<BraveAutosuggestResponse> {
  const key = apiKey || process.env.BRAVE_API_KEY;

  if (!key) {
    throw new Error("Brave API key required");
  }

  const url = new URL(BRAVE_API_ENDPOINTS.AUTOSUGGEST);

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, String(v));
    }
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: HTTP_HEADERS.ACCEPT_JSON,
      "Accept-Encoding": HTTP_HEADERS.ACCEPT_ENCODING,
      [HTTP_HEADERS.SUBSCRIPTION_TOKEN]: key,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave Autosuggest API error: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// SPELLCHECK
// ============================================================================

export interface BraveSpellcheckParams {
  /** Query to spellcheck */
  q: string;

  /** Country code */
  country?: string;
}

export interface BraveSpellcheckResponse {
  type: "spellcheck";
  query: {
    original: string;
  };
  results: Array<{
    type: "spellcheck_result";
    original_term: string;
    suggestion: string;
    start_index: number;
    end_index: number;
  }>;
}

export async function spellcheck(
  params: BraveSpellcheckParams,
  apiKey?: string,
): Promise<BraveSpellcheckResponse> {
  const key = apiKey || process.env.BRAVE_API_KEY;

  if (!key) {
    throw new Error("Brave API key required");
  }

  const url = new URL(BRAVE_API_ENDPOINTS.SPELLCHECK);

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, String(v));
    }
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: HTTP_HEADERS.ACCEPT_JSON,
      "Accept-Encoding": HTTP_HEADERS.ACCEPT_ENCODING,
      [HTTP_HEADERS.SUBSCRIPTION_TOKEN]: key,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave Spellcheck API error: ${response.status}`);
  }

  return response.json();
}
