/**
 * Cloudflare D1 Database Client
 * Fetches jobs table from Cloudflare D1 database
 */

interface CloudflareD1Config {
  accountId: string;
  databaseId: string;
  apiToken: string;
}

interface D1QueryResult {
  success: boolean;
  result?: Array<{
    results: any[];
    success: boolean;
    meta: {
      duration: number;
      changes: number;
      rows_read: number;
      rows_written: number;
    };
  }>;
  errors?: Array<{ code: string; message: string }>;
}

export class CloudflareD1Client {
  private config: CloudflareD1Config;
  private baseUrl: string;

  constructor(config: CloudflareD1Config) {
    this.config = config;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;
  }

  /**
   * Execute a SQL query on the D1 database
   */
  async query(sql: string, params: any[] = []): Promise<any[]> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql,
        params,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`D1 API Error: ${response.status} ${errorText}`);
    }

    const data: D1QueryResult = await response.json();

    if (!data.success) {
      throw new Error(`D1 Query Error: ${JSON.stringify(data.errors)}`);
    }

    return data.result?.[0]?.results || [];
  }

  /**
   * Get all jobs from the jobs table
   */
  async getJobs() {
    return this.query("SELECT * FROM jobs");
  }

  /**
   * Get jobs with optional filters
   */
  async getJobsFiltered(filters: {
    limit?: number;
    offset?: number;
    status?: string;
  }) {
    let sql = "SELECT * FROM jobs";
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY created_at DESC";

    if (filters.limit) {
      sql += " LIMIT ?";
      params.push(filters.limit);
    }

    if (filters.offset) {
      sql += " OFFSET ?";
      params.push(filters.offset);
    }

    return this.query(sql, params);
  }

  /**
   * Get job by ID
   */
  async getJobById(id: string | number) {
    const results = await this.query("SELECT * FROM jobs WHERE id = ?", [id]);
    return results[0] || null;
  }

  /**
   * Get table schema
   */
  async getTableSchema(tableName: string = "jobs") {
    return this.query(`PRAGMA table_info(${tableName})`);
  }

  /**
   * Get all table names in the database
   */
  async getTables() {
    return this.query(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
  }
}

// Singleton instance
let d1Client: CloudflareD1Client | null = null;

/**
 * Get the D1 client instance
 */
export function getD1Client(): CloudflareD1Client {
  if (!d1Client) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !databaseId || !apiToken) {
      throw new Error(
        "Missing Cloudflare D1 configuration. Please set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, and CLOUDFLARE_API_TOKEN environment variables.",
      );
    }

    d1Client = new CloudflareD1Client({
      accountId,
      databaseId,
      apiToken,
    });
  }

  return d1Client;
}
