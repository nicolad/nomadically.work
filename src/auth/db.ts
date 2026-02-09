import { Pool } from "pg";

/**
 * PostgreSQL connection pool for Better Auth
 * Uses PG_KEY environment variable for connection string
 *
 * Reference: https://www.better-auth.com/docs/concepts/databases/postgres
 */

// Get connection string, allowing CLI to proceed without it
const connectionString = process.env.PG_KEY || process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === "production") {
  throw new Error(
    "Missing PG_KEY environment variable. Please set it to a PostgreSQL connection string.",
  );
}

// Create pool with connection string (Pool will defer connection until first use)
export const pgPool = new Pool({
  connectionString: connectionString || "postgresql://localhost/better_auth",
  // Add connection timeout for CLI operations
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

// Handle connection errors
pgPool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});
