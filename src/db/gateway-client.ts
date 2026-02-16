/**
 * D1 Gateway Client
 * 
 * High-performance client for the D1 Gateway Worker.
 * Provides batching, caching, and optimized query methods.
 * 
 * Use this instead of direct D1HttpClient for production workloads.
 */

interface GatewayConfig {
  url: string;
  apiKey: string;
}

interface JobsBatchParams {
  status?: string;
  company_key?: string;
  limit?: number;
}

interface JobsBatchResponse {
  total: number;
  jobs: any[];
  company_total?: number;
}

/**
 * Create a D1 Gateway client with batching support
 */
export function createGatewayClient(config?: GatewayConfig) {
  const url = config?.url || process.env.D1_GATEWAY_URL;
  const apiKey = config?.apiKey || process.env.D1_GATEWAY_KEY;

  if (!url || !apiKey) {
    throw new Error(
      "Missing D1 Gateway configuration. Required: D1_GATEWAY_URL + D1_GATEWAY_KEY\n" +
      "See DEPLOY_D1_GATEWAY.md for setup instructions."
    );
  }

  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  return {
    /**
     * Batch jobs query - get jobs + total count in ONE request
     * 
     * @example
     * const { total, jobs } = await gateway.jobs.batch({ 
     *   status: 'active', 
     *   limit: 20 
     * });
     */
    jobs: {
      async batch(params: JobsBatchParams = {}): Promise<JobsBatchResponse> {
        const response = await fetch(`${url}/jobs/batch`, {
          method: "POST",
          headers,
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          throw new Error(`Gateway error: ${response.status} ${await response.text()}`);
        }

        return response.json();
      },

      async list(params: { limit?: number; offset?: number; status?: string } = {}) {
        const qs = new URLSearchParams({
          limit: String(params.limit ?? 20),
          offset: String(params.offset ?? 0),
          status: params.status ?? "active",
        });

        const response = await fetch(`${url}/jobs?${qs}`, { headers });

        if (!response.ok) {
          throw new Error(`Gateway error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json() as { rows: any[] };
        return data.rows || [];
      },

      async get(id: string) {
        const response = await fetch(`${url}/jobs/${id}`, { headers });

        if (!response.ok) {
          if (response.status === 404) return null;
          throw new Error(`Gateway error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json() as { job: any };
        return data.job || null;
      },
    },

    /**
     * User settings operations
     */
    userSettings: {
      async get(userId: string) {
        const response = await fetch(`${url}/user-settings/${userId}`, { headers });

        if (!response.ok) {
          throw new Error(`Gateway error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json() as { settings: any };
        return data.settings || null;
      },

      async update(userId: string, settings: Record<string, any>) {
        const response = await fetch(`${url}/user-settings`, {
          method: "POST",
          headers,
          body: JSON.stringify({ user_id: userId, ...settings }),
        });

        if (!response.ok) {
          throw new Error(`Gateway error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json() as { settings: any };
        return data.settings;
      },
    },

    /**
     * Companies operations
     */
    companies: {
      async list(params: { limit?: number; offset?: number } = {}) {
        const qs = new URLSearchParams({
          limit: String(params.limit ?? 20),
          offset: String(params.offset ?? 0),
        });

        const response = await fetch(`${url}/companies?${qs}`, { headers });

        if (!response.ok) {
          throw new Error(`Gateway error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json() as { rows: any[] };
        return data.rows || [];
      },
    },

    /**
     * Health check
     */
    async health() {
      const response = await fetch(`${url}/health`, { headers });

      if (!response.ok) {
        throw new Error(`Gateway error: ${response.status} ${await response.text()}`);
      }

      return response.json();
    },
  };
}

/**
 * Singleton gateway client
 */
let gatewayClient: ReturnType<typeof createGatewayClient> | null = null;

export function getGatewayClient(): ReturnType<typeof createGatewayClient> {
  if (!gatewayClient) {
    gatewayClient = createGatewayClient();
  }
  return gatewayClient;
}
