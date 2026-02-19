import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sqlAgent } from "@/agents/sql";

// Schema-constrained output for SQL generation (Grounding-First)
const textToSqlOutputSchema = z.object({
  sql: z.string().describe("The generated SQL query"),
  explanation: z.string().describe("Explanation of what the query does and why"),
});

/**
 * Text-to-SQL API endpoint
 *
 * Accepts a natural language question and returns a structured SQL query.
 * Uses structuredOutput to guarantee schema-constrained LLM responses.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'question' field" },
        { status: 400 }
      );
    }

    // Use the agent to generate a structured SQL output
    const result = await sqlAgent.generate(question, {
      maxSteps: 3,
      structuredOutput: { schema: textToSqlOutputSchema },
    });

    const { sql, explanation } = result.object;

    return NextResponse.json({
      sql,
      explanation,
      columns: [] as string[],
      rows: [] as Array<Array<string | number | boolean | null>>,
      drilldownSearchQuery: undefined,
    });
  } catch (error) {
    console.error("Text-to-SQL error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process SQL query",
        details: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    );
  }
}
