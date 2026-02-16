import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * Cloudflare D1 Remote Database (Production Only)
 *
 * Database: nomadically-work-db (632b9c57-8262-40bd-86c2-bc08beab713b)
 *
 * D1 Access Methods:
 *
 * 1. In Cloudflare Workers/Pages (deployed):
 *    const db = getDb(env.DB);
 *
 * 2. In Next.js API Routes (Edge Runtime):
 *    import { getRequestContext } from '@cloudflare/next-on-pages';
 *    const db = getDb(getRequestContext().env.DB);
 *
 * 3. For scripts/local development:
 *    Use wrangler CLI:
 *    npx wrangler d1 execute nomadically-work-db --remote --command="SELECT * FROM jobs LIMIT 10"
 *
 *    Or use wrangler with @cloudflare/d1 package in scripts.
 *
 * Note: D1 does not support HTTP API access outside of Workers.
 */

export type D1Database = import("@cloudflare/workers-types").D1Database;
export type DbInstance = DrizzleD1Database<typeof schema>;

/**
 * Create Drizzle instance for D1
 * @param d1 - D1Database binding from Cloudflare Workers environment
 */
export function getDb(d1: D1Database): DbInstance {
  return drizzle(d1, { schema });
}

/**
 * Lazy proxy for backward compatibility
 * Note: Will throw error if used outside Workers context
 */
export const db = new Proxy({} as DbInstance, {
  get() {
    throw new Error(
      "Cannot access D1 database outside Cloudflare Workers.\n" +
        "\nFor Workers/Pages: Use getDb(env.DB)" +
        "\nFor Next.js Edge Routes: Use getDb(getRequestContext().env.DB)" +
        "\nFor scripts: Use wrangler CLI: npx wrangler d1 execute nomadically-work-db --remote",
    );
  },
});

// Re-export schema
export * from "./schema";
