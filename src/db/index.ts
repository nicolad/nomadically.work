import { config } from "dotenv";
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import * as schema from "./schema";

// Load .env.local if TURSO_DB_URL is not set (for scripts)
if (!process.env.TURSO_DB_URL) {
  config({ path: ".env.local" });
}

/**
 * Get Turso database client with credentials from environment
 * @throws Error if TURSO_DB_URL or TURSO_DB_AUTH_TOKEN are not set
 */
export function getTursoClient(): Client {
  const url = process.env.TURSO_DB_URL?.trim();
  const token = process.env.TURSO_DB_AUTH_TOKEN?.trim();

  if (!url) {
    throw new Error("Missing TURSO_DB_URL environment variable");
  }

  if (!token) {
    throw new Error("Missing TURSO_DB_AUTH_TOKEN environment variable");
  }

  return createClient({
    url,
    authToken: token,
  });
}

// Lazy-load turso client to defer error until first use
let tursoInstance: Client | null = null;

export function getTurso(): Client {
  if (!tursoInstance) {
    tursoInstance = getTursoClient();
  }
  return tursoInstance;
}

// Only create drizzle instance if we're in a server environment
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getTurso(), { schema });
  }
  return dbInstance;
}

// Lazy getters for backward compatibility - avoid eager initialization during build
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  },
});

export const turso = new Proxy({} as Client, {
  get(target, prop) {
    return getTurso()[prop as keyof Client];
  },
});

export type { Client };
