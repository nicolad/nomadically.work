/**
 * D1 HTTP API Client
 *
 * Supports two modes:
 * 1. Gateway mode (RECOMMENDED for production): Fast Worker with D1 binding
 * 2. Direct API mode (admin/dev only): Cloudflare REST API
 *
 * Gateway mode provides:
 * - 10-100x better performance (Worker binding vs REST API)
 * - No Cloudflare API rate limits
 * - Batching support for multiple queries in one round trip
 * - Built-in caching with s-maxage
 *
 * @see https://developers.cloudflare.com/d1/tutorials/build-an-api-to-access-d1/
 */

interface D1QueryResult {
  meta: {
    served_by: string;
    duration: number;
    changes: number;
    last_row_id: number;
    changed_db: boolean;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
  results: any[];
  success: boolean;
}

interface D1ApiResponse {
  result: D1QueryResult[];
  success: boolean;
  errors: any[];
  messages: any[];
}

/**
 * D1 HTTP Client that implements a subset of the D1 API
 * compatible with Drizzle ORM's expectations
 */
export class D1HttpClient {
  private gatewayUrl?: string;
  private gatewayKey?: string;
  private accountId?: string;
  private databaseId?: string;
  private apiToken?: string;
  private baseUrl = "https://api.cloudflare.com/client/v4";

  constructor(config: {
    gatewayUrl?: string;
    gatewayKey?: string;
    accountId?: string;
    databaseId?: string;
    apiToken?: string;
  }) {
    this.gatewayUrl = config.gatewayUrl;
    this.gatewayKey = config.gatewayKey;
    this.accountId = config.accountId;
    this.databaseId = config.databaseId;
    this.apiToken = config.apiToken;
  }

  /**
   * Execute a SQL query using the D1 HTTP API or Gateway
   * Uses parameterized queries to prevent SQL injection and syntax errors.
   */
  async exec(query: string, params?: any[]): Promise<D1QueryResult> {
    const body: { sql: string; params?: any[] } = { sql: query };
    if (params && params.length > 0) {
      body.params = params;
    }

    // Use gateway if configured
    if (this.gatewayUrl && this.gatewayKey) {
      const response = await fetch(this.gatewayUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.gatewayKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`D1 Gateway error: ${response.status} ${error}`);
      }

      const data: D1ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(`D1 query failed: ${JSON.stringify(data.errors)}`);
      }

      return data.result[0];
    }

    // Fall back to direct API
    if (!this.accountId || !this.databaseId || !this.apiToken) {
      throw new Error("D1 client not properly configured");
    }

    const url = `${this.baseUrl}/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`D1 API error: ${response.status} ${error}`);
    }

    const data: D1ApiResponse = await response.json();

    if (!data.success) {
      throw new Error(`D1 query failed: ${JSON.stringify(data.errors)}`);
    }

    return data.result[0];
  }

  /**
   * Prepare a statement compatible with D1 binding interface.
   * Uses native parameterized queries instead of string interpolation.
   */
  prepare(query: string) {
    return {
      bind: (...params: any[]) => {
        return {
          all: async () => {
            const result = await this.exec(query, params);
            return {
              results: result.results,
              success: result.success,
              meta: result.meta,
            };
          },
          run: async () => {
            const result = await this.exec(query, params);
            return {
              success: result.success,
              meta: {
                changes: result.meta.changes,
                last_row_id: result.meta.last_row_id,
                duration: result.meta.duration,
              },
            };
          },
          first: async () => {
            const result = await this.exec(query, params);
            return result.results[0] || null;
          },
          raw: async () => {
            const result = await this.exec(query, params);
            if (result.results.length === 0) return [];
            const keys = Object.keys(result.results[0]);
            return result.results.map((row) => keys.map((key) => row[key]));
          },
        };
      },
      all: async () => {
        const result = await this.exec(query);
        return {
          results: result.results,
          success: result.success,
          meta: result.meta,
        };
      },
      run: async () => {
        const result = await this.exec(query);
        return {
          success: result.success,
          meta: {
            changes: result.meta.changes,
            last_row_id: result.meta.last_row_id,
            duration: result.meta.duration,
          },
        };
      },
      first: async () => {
        const result = await this.exec(query);
        return result.results[0] || null;
      },
      raw: async () => {
        const result = await this.exec(query);
        if (result.results.length === 0) return [];
        const keys = Object.keys(result.results[0]);
        return result.results.map((row) => keys.map((key) => row[key]));
      },
    };
  }

  /**
   * Batch execute multiple queries
   */
  async batch(queries: string[]) {
    const url =
      this.gatewayUrl ||
      `${this.baseUrl}/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;
    const authToken = this.gatewayKey || this.apiToken;

    if (!authToken) {
      throw new Error("D1 client not properly configured for batch");
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(queries.map((sql) => ({ sql }))),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`D1 batch error: ${response.status} ${error}`);
    }

    const data: D1ApiResponse = await response.json();

    if (!data.success) {
      throw new Error(`D1 batch query failed: ${JSON.stringify(data.errors)}`);
    }

    return data.result;
  }

  /**
   * Dump the database (for debugging)
   */
  async dump() {
    throw new Error("dump() is not supported via HTTP API");
  }
}

/**
 * Create a D1 HTTP client from environment variables
 *
 * Supports two modes:
 * 1. Gateway mode (recommended): D1_GATEWAY_URL + D1_GATEWAY_KEY
 * 2. Direct API mode: CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_D1_DATABASE_ID + CLOUDFLARE_API_TOKEN
 */
// Cached singleton — avoids re-creating the client (and its log line) on every request
let _cachedClient: D1HttpClient | null = null;

export function createD1HttpClient(): D1HttpClient {
  if (_cachedClient) return _cachedClient;

  // Check for gateway configuration first (simpler)
  const gatewayUrl = process.env.D1_GATEWAY_URL;
  const gatewayKey = process.env.D1_GATEWAY_KEY;

  if (gatewayUrl && gatewayKey) {
    console.log("✓ Using D1 Gateway mode");
    _cachedClient = new D1HttpClient({ gatewayUrl, gatewayKey });
    return _cachedClient;
  }

  // Fall back to direct API mode
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (accountId && databaseId && apiToken) {
    console.log("✓ Using D1 Direct API mode");
    _cachedClient = new D1HttpClient({ accountId, databaseId, apiToken });
    return _cachedClient;
  }

  // Neither mode is configured
  throw new Error(
    "Missing D1 configuration. Choose one:\n" +
      "  Gateway mode: D1_GATEWAY_URL + D1_GATEWAY_KEY\n" +
      "  Direct API mode: CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_D1_DATABASE_ID + CLOUDFLARE_API_TOKEN\n" +
      "See D1_SETUP.md for setup instructions.",
  );
}
