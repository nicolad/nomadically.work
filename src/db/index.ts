import { config } from "dotenv";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import * as schema from "./schema";

// Load .env.local for local development
if (!process.env.CLOUDFLARE_D1_DATABASE_ID && !process.env.TURSO_DB_URL) {
  config({ path: ".env.local" });
}

/**
 * Get D1 database client (for Cloudflare Workers)
 * This requires the D1 binding to be available in the environment
 */
export function getD1Client(env?: any): D1Database {
  if (env?.DB) {
    return env.DB;
  }
  throw new Error(
    "D1 database binding not available. Use in Cloudflare Workers with D1 binding.",
  );
}

/**
 * Get libsql client for local development (fallback to Turso or local sqlite)
 * @throws Error if neither D1 nor Turso credentials are available
 */
export function getLocalClient(): Client {
  const url = process.env.TURSO_DB_URL?.trim();
  const token = process.env.TURSO_DB_AUTH_TOKEN?.trim();

  if (!url) {
    throw new Error(
      "Missing TURSO_DB_URL environment variable for local development",
    );
  }

  return createClient({
    url,
    authToken: token,
  });
}

// Drizzle instance for D1 (Workers)
export function getD1Db(env: any) {
  return drizzleD1(env.DB, { schema });
}

// Drizzle instance for local development
let localDbInstance: ReturnType<typeof drizzleLibsql> | null = null;

export function getLocalDb() {
  if (!localDbInstance) {
    localDbInstance = drizzleLibsql(getLocalClient(), { schema });
  }
  return localDbInstance;
}

// Main db export - tries D1 first, falls back to local
export function getDb(env?: any) {
  // If running in Cloudflare Worker with D1 binding
  if (env?.DB) {
    return getD1Db(env);
  }
  // Otherwise use local client for development
  return getLocalDb();
}

// Lazy getter for backward compatibility - uses local DB
export const db = new Proxy({} as ReturnType<typeof drizzleLibsql>, {
  get(target, prop) {
    return getLocalDb()[prop as keyof ReturnType<typeof drizzleLibsql>];
  },
});

// Legacy exports for backward compatibility
export const getTurso = getLocalClient;
export const getTursoClient = getLocalClient;
export const turso = new Proxy({} as Client, {
  get(target, prop) {
    return getLocalClient()[prop as keyof Client];
  },
});

export type { Client };
