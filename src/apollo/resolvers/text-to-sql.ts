import { z } from "zod";
import { sqlAgent } from "@/agents/sql";
import type { GraphQLContext } from "../context";

// Schema-constrained output for SQL generation (Grounding-First)
const textToSqlOutputSchema = z.object({
  sql: z.string().describe("The generated SQL query"),
  explanation: z.string().describe("Explanation of what the query does and why"),
});

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

        // Use the agent to generate a structured SQL output
        const result = await sqlAgent.generate(question, {
          maxSteps: 3,
          structuredOutput: { schema: textToSqlOutputSchema },
        });

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
