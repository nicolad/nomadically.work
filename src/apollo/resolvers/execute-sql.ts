import { getTursoClient } from "@/lib/turso";
import type { GraphQLContext } from "../context";

export const executeSqlResolvers = {
  Query: {
    async executeSql(
      _parent: any,
      args: { sql: string },
      _context: GraphQLContext,
    ) {
      try {
        const { sql } = args;

        if (!sql || typeof sql !== "string") {
          throw new Error("Missing or invalid 'sql' field");
        }

        // Validate that it's a read-only query (basic check)
        const upperSql = sql.trim().toUpperCase();
        if (
          !upperSql.startsWith("SELECT") &&
          !upperSql.startsWith("PRAGMA") &&
          !upperSql.startsWith("WITH")
        ) {
          throw new Error(
            "Only SELECT queries are allowed for safety. No INSERT, UPDATE, DELETE, or DROP.",
          );
        }

        // Execute the raw SQL query
        const client = getTursoClient();
        const result = await client.execute(sql);

        // Extract columns from result
        let columns: string[] = [];
        let rows: Array<Array<string | number | boolean | null>> = [];

        if (result.rows && result.rows.length > 0) {
          // Get columns from the column info
          if (result.columns && result.columns.length > 0) {
            columns = result.columns;
          } else {
            // Fallback: get columns from the first row
            columns = Object.keys(result.rows[0] as Record<string, any>);
          }

          // Convert rows to array format
          rows = result.rows.map((row: any) =>
            columns.map((col) => {
              const value =
                typeof row === "object" && row !== null
                  ? row[col]
                  : row[columns.indexOf(col)];
              if (value === null || value === undefined) return null;
              return value as string | number | boolean | null;
            }),
          );
        }

        return {
          sql,
          explanation: null,
          columns,
          rows,
          drilldownSearchQuery: null,
        };
      } catch (error) {
        console.error("Execute SQL error:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to execute SQL query",
        );
      }
    },
  },
};
