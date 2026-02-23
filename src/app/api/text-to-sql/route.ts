import { NextRequest, NextResponse } from "next/server";
import { sqlAgent } from "@/agents/sql";

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

    const result = await sqlAgent.generate(question);

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
