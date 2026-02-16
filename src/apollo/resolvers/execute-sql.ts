// import { getTursoClient } from "@/db"; // Removed - migrated to D1
import type { GraphQLContext } from "../context";

// TODO: Re-implement with D1 database access
// This resolver is currently disabled pending D1 integration

export const executeSqlResolvers = {
  Query: {
    async executeSql(
      _parent: any,
      args: { sql: string },
      _context: GraphQLContext,
    ) {
      // Temporarily return empty results until D1 integration is complete
      return {
        sql: args.sql,
        explanation:
          "SQL execution temporarily disabled - D1 migration in progress",
        columns: [],
        rows: [],
        drilldownSearchQuery: null,
      };

      /* D1 Implementation needed:
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

        // Execute the raw SQL query using D1
        // const db = getDb(getRequestContext().env.DB);
        // const result = await db.execute(sql);

        return {
          sql,
          explanation: null,
          columns: [],
          rows: [],
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
      */
    },
  },
};
