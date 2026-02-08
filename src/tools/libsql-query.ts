import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getTursoClient } from "@/lib/turso";

/**
 * Tool for executing read-only SQL queries against the LibSQL database
 */
export const executeSqlQuery = createTool({
  id: "execute_sql_query",
  description:
    "Execute a read-only SQL query against the LibSQL (SQLite) database. Only SELECT queries are allowed for safety. Returns query results as rows.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The SQL SELECT query to execute. Must be a read-only query (SELECT only, no INSERT/UPDATE/DELETE/DROP).",
      ),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    rows: z.array(z.record(z.any())).optional(),
    rowCount: z.number().optional(),
    columns: z.array(z.string()).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ query }) => {
    // Safety check: only allow SELECT queries
    const normalizedQuery = query.trim().toLowerCase();
    if (
      !normalizedQuery.startsWith("select") &&
      !normalizedQuery.startsWith("pragma") &&
      !normalizedQuery.startsWith("with")
    ) {
      return {
        success: false,
        error:
          "Only SELECT, PRAGMA, and WITH (CTE) queries are allowed. No INSERT, UPDATE, DELETE, or DDL operations permitted.",
      };
    }

    // Additional safety: block dangerous keywords
    const dangerousKeywords = [
      "insert",
      "update",
      "delete",
      "drop",
      "create",
      "alter",
      "truncate",
      "replace",
    ];

    for (const keyword of dangerousKeywords) {
      if (normalizedQuery.includes(keyword)) {
        return {
          success: false,
          error: `Query contains forbidden keyword: ${keyword}. Only read-only queries are allowed.`,
        };
      }
    }

    try {
      const client = getTursoClient();
      const result = await client.execute(query);

      // Extract column names from the first row (if any)
      const columns = result.rows.length > 0 ? Object.keys(result.rows[0]) : [];

      return {
        success: true,
        rows: result.rows as any[],
        rowCount: result.rows.length,
        columns,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error executing query",
      };
    }
  },
});
