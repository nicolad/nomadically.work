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

        // Use the agent to generate and execute the SQL query
        const result = await sqlAgent.generate(question, {
          maxSteps: 3,
        });

        // Extract the response text
        const response = result.text || "";

        // Parse the markdown response to extract SQL and results
        const sqlMatch = response.match(/```sql\n([\s\S]*?)\n```/);
        const sql = sqlMatch ? sqlMatch[1].trim() : "";

        // Extract explanation
        const explanationMatch = response.match(
          /### Explanation\n([\s\S]*?)(?=\n###|\n\n|$)/,
        );
        const explanation = explanationMatch
          ? explanationMatch[1].trim()
          : "";

        // Extract results table (simplified - assumes markdown table format)
        const resultsMatch = response.match(/### Results\n([\s\S]*?)(?=\n###|$)/);
        const resultsText = resultsMatch ? resultsMatch[1].trim() : "";

        // Parse markdown table into structured data
        let columns: string[] = [];
        let rows: Array<Array<string | number | boolean | null>> = [];

        if (resultsText) {
          const lines = resultsText.split("\n").filter((l: string) => l.trim());

          // First line is header
          if (lines.length > 0) {
            columns = lines[0]
              .split("|")
              .map((c: string) => c.trim())
              .filter((c: string) => c);
          }

          // Skip separator line (second line with dashes)
          // Data starts from third line
          if (lines.length > 2) {
            rows = lines.slice(2).map((line: string) =>
              line
                .split("|")
                .map((cell: string) => cell.trim())
                .filter(
                  (cell: string, idx: number) =>
                    idx > 0 && idx <= columns.length,
                )
                .map((cell: string) => {
                  if (cell === "NULL" || cell === "") return null;
                  const num = Number(cell);
                  if (!isNaN(num) && cell !== "") return num;
                  if (cell === "true") return true;
                  if (cell === "false") return false;
                  return cell;
                }),
            );
          }
        }

        // If we couldn't parse results from markdown, provide a fallback
        if (columns.length === 0) {
          columns = ["Result"];
          rows = [[response]];
        }

        return {
          sql,
          explanation,
          columns,
          rows,
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
