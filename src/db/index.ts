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
  const url = process.env.TURSO_DB_URL;
  const token = process.env.TURSO_DB_AUTH_TOKEN;

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

const turso = getTursoClient();

export const db = drizzle(turso, { schema });
export { turso, type Client };
