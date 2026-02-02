/**
 * Turso (libSQL) client for Next.js
 * Uses @libsql/client for Node.js environment
 */

import { createClient, type Client } from "@libsql/client";

let tursoClient: Client | null = null;

export function getTursoClient(): Client {
  if (tursoClient) return tursoClient;

  const url = process.env.TURSO_DB_URL?.trim();
  if (!url) {
    throw new Error("TURSO_DB_URL is not defined. Set it in .env.local");
  }

  const authToken = process.env.TURSO_DB_AUTH_TOKEN?.trim();
  if (!authToken) {
    throw new Error("TURSO_DB_AUTH_TOKEN is not defined. Set it in .env.local");
  }

  tursoClient = createClient({ url, authToken });
  return tursoClient;
}

/**
 * Query jobs from Turso with optional filters
 */
export async function getJobsFiltered(options: {
  limit?: number;
  offset?: number;
  status?: string;
}) {
  const client = getTursoClient();

  let sql = "SELECT * FROM jobs";
  const params: any[] = [];
  const conditions: string[] = [];

  if (options.status) {
    conditions.push("status = ?");
    params.push(options.status);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY created_at DESC";

  if (options.limit) {
    sql += " LIMIT ?";
    params.push(options.limit);
  }

  if (options.offset) {
    sql += " OFFSET ?";
    params.push(options.offset);
  }

  const result = await client.execute({ sql, args: params });
  return result.rows || [];
}

/**
 * Get job by ID
 */
export async function getJobById(id: string | number) {
  const client = getTursoClient();
  const result = await client.execute({
    sql: "SELECT * FROM jobs WHERE id = ?",
    args: [id],
  });

  return result.rows?.[0] || null;
}

/**
 * Get all jobs
 */
export async function getJobs() {
  const client = getTursoClient();
  const result = await client.execute("SELECT * FROM jobs");
  return result.rows || [];
}

/**
 * Get table schema
 */
export async function getTableSchema(tableName: string = "jobs") {
  const client = getTursoClient();
  const result = await client.execute({
    sql: `PRAGMA table_info(${tableName})`,
    args: [],
  });
  return result.rows || [];
}

/**
 * Get all table names
 */
export async function getTables() {
  const client = getTursoClient();
  const result = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
  );
  return result.rows || [];
}
