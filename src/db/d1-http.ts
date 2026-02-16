/**
 * D1 HTTP API Client
 * 
 * Uses Cloudflare's D1 REST API to query the database from anywhere,
 * including local development. This bypasses the need for Workers bindings.
 * 
 * @see https://developers.cloudflare.com/api/operations/d1-database-query-d1-database
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
  private accountId: string;
  private databaseId: string;
  private apiToken: string;
  private baseUrl = "https://api.cloudflare.com/client/v4";

  constructor(accountId: string, databaseId: string, apiToken: string) {
    this.accountId = accountId;
    this.databaseId = databaseId;
    this.apiToken = apiToken;
  }

  /**
   * Execute a SQL query using the D1 HTTP API
   */
  async exec(query: string): Promise<D1QueryResult> {
    const url = `${this.baseUrl}/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql: query }),
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
   * Prepare a statement (returns a mock for compatibility)
   */
  prepare(query: string) {
    return {
      bind: (...params: any[]) => {
        // Replace ? placeholders with actual values
        let boundQuery = query;
        params.forEach((param) => {
          const value = typeof param === "string" ? `'${param.replace(/'/g, "''")}'` : param;
          boundQuery = boundQuery.replace("?", String(value));
        });
        return {
          all: async () => {
            const result = await this.exec(boundQuery);
            return { results: result.results, success: result.success, meta: result.meta };
          },
          run: async () => {
            const result = await this.exec(boundQuery);
            return { 
              success: result.success,
              meta: {
                changes: result.meta.changes,
                last_row_id: result.meta.last_row_id,
                duration: result.meta.duration,
              }
            };
          },
          first: async () => {
            const result = await this.exec(boundQuery);
            return result.results[0] || null;
          },
        };
      },
      all: async () => {
        const result = await this.exec(query);
        return { results: result.results, success: result.success, meta: result.meta };
      },
      run: async () => {
        const result = await this.exec(query);
        return {
          success: result.success,
          meta: {
            changes: result.meta.changes,
            last_row_id: result.meta.last_row_id,
            duration: result.meta.duration,
          }
        };
      },
      first: async () => {
        const result = await this.exec(query);
        return result.results[0] || null;
      },
    };
  }

  /**
   * Batch execute multiple queries
   */
  async batch(queries: string[]) {
    const url = `${this.baseUrl}/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(queries.map(sql => ({ sql }))),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`D1 API batch error: ${response.status} ${error}`);
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
 */
export function createD1HttpClient(): D1HttpClient {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !databaseId || !apiToken) {
    throw new Error(
      "Missing D1 HTTP API credentials. Required: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN"
    );
  }

  return new D1HttpClient(accountId, databaseId, apiToken);
}
