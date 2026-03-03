import { deepseek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { z } from "zod";
import { GOAL_PROMPT_FRAGMENT } from "@/constants/goal";
import { aiTelemetry } from "@/lib/telemetry";

// TODO: Re-implement with D1 database access

const SQL_INSTRUCTIONS = `${GOAL_PROMPT_FRAGMENT}

You are a SQL (SQLite/LibSQL) expert for the nomadically.work database. Generate queries that answer user questions about jobs, companies, and related data. When the user asks general questions, prioritise queries that surface fully-remote AI/React engineering roles in the EU or worldwide.

QUERY GUIDELINES (SQLite/LibSQL):
- Only retrieval queries are allowed (SELECT, PRAGMA table_info, WITH)
- Booleans are stored as INTEGER (0 = false, 1 = true)
- JSON fields are stored as TEXT - use json_extract() or json_each() to query
- Date fields are TEXT in ISO 8601 format

Provide a SQL query and an explanation.`;

const textToSqlOutputSchema = z.object({
  sql: z.string().describe("The generated SQL query"),
  explanation: z.string().describe("Explanation of what the query does and why"),
});

export const sqlAgent = {
  async generate(
    question: string,
    _opts?: { maxSteps?: number; structuredOutput?: { schema: z.ZodType } },
  ) {
    const result = await generateObject({
      model: deepseek("deepseek-chat"),
      system: SQL_INSTRUCTIONS,
      prompt: question,
      schema: textToSqlOutputSchema,
      experimental_telemetry: aiTelemetry("text-to-sql"),
    });

    return { object: result.object };
  },
};
