import { sqlAgent } from "@/agents/sql";
import type { GraphQLContext } from "../context";

export const textToSqlResolvers = {
  Query: {
    async textToSql(
      _parent: any,
      args: { question: string },
      _context: GraphQLContext,
    ) {
      try {
        const { question } = args;

        if (!question || typeof question !== "string") {
          throw new Error("Missing or invalid 'question' field");
        }

        const result = await sqlAgent.generate(question);

        const { sql, explanation } = result.object;

        return {
          sql,
          explanation,
          columns: [] as string[],
          rows: [] as Array<Array<string | number | boolean | null>>,
          drilldownSearchQuery: null,
        };
      } catch (error) {
        console.error("Text-to-SQL error:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "Failed to process SQL query",
        );
      }
    },
  },
};
