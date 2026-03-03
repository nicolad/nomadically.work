import { z } from 'zod';
import { generateObject } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { GOAL_CONTEXT_LINE } from '@/constants/goal';
import { aiTelemetry } from '@/lib/telemetry';

// Define the schema for SQL generation output
const sqlGenerationSchema = z.object({
  sql: z.string().describe('The generated SQL query'),
  explanation: z.string().describe('Explanation of what the query does'),
  confidence: z.number().min(0).max(1).describe('Confidence level in the generated query (0-1)'),
  assumptions: z.array(z.string()).describe('Any assumptions made while generating the query'),
  tables_used: z.array(z.string()).describe('List of tables used in the query'),
});

const inputSchema = z.object({
  naturalLanguageQuery: z.string().describe('Natural language query from the user'),
  databaseSchema: z.object({
    tables: z.array(
      z.object({
        schema_name: z.string(),
        table_name: z.string(),
        table_owner: z.string(),
      }),
    ),
    columns: z.array(
      z.object({
        table_schema: z.string(),
        table_name: z.string(),
        column_name: z.string(),
        data_type: z.string(),
        character_maximum_length: z.number().nullable(),
        numeric_precision: z.number().nullable(),
        numeric_scale: z.number().nullable(),
        is_nullable: z.string(),
        column_default: z.string().nullable(),
        is_primary_key: z.boolean(),
      }),
    ),
    relationships: z.array(
      z.object({
        table_schema: z.string(),
        table_name: z.string(),
        column_name: z.string(),
        foreign_table_schema: z.string(),
        foreign_table_name: z.string(),
        foreign_column_name: z.string(),
        constraint_name: z.string(),
      }),
    ),
    indexes: z.array(
      z.object({
        schema_name: z.string(),
        table_name: z.string(),
        index_name: z.string(),
        index_definition: z.string(),
      }),
    ),
    rowCounts: z.array(
      z.object({
        schema_name: z.string(),
        table_name: z.string(),
        row_count: z.number(),
        error: z.string().optional(),
      }),
    ),
  }),
});

/**
 * Generates SQL queries from natural language descriptions using database schema information.
 */
export async function generateSqlFromNaturalLanguage(
  input: z.infer<typeof inputSchema>,
) {
  const { naturalLanguageQuery, databaseSchema } = input;

  // Build schema description
  let schemaDescription = '';
  databaseSchema.tables.forEach((table) => {
    const tableKey = `${table.schema_name}.${table.table_name}`;
    const columns = databaseSchema.columns.filter(
      (c) => c.table_schema === table.schema_name && c.table_name === table.table_name,
    );
    const rowCount = databaseSchema.rowCounts.find(
      (rc) => rc.schema_name === table.schema_name && rc.table_name === table.table_name,
    );

    schemaDescription += `\nTable: ${tableKey}`;
    if (rowCount) schemaDescription += ` (${rowCount.row_count} rows)`;
    schemaDescription += '\nColumns:\n';
    columns.forEach((col) => {
      schemaDescription += `  - ${col.column_name}: ${col.data_type}`;
      if (col.is_primary_key) schemaDescription += ' [PK]';
      if (col.is_nullable === 'NO') schemaDescription += ' [NOT NULL]';
      schemaDescription += '\n';
    });
  });

  const result = await generateObject({
    model: deepseek('deepseek-chat'),
    system: `${GOAL_CONTEXT_LINE}

You are an expert SQL query generator. Generate SQL queries from natural language.

DATABASE SCHEMA:
${schemaDescription}

Only generate SELECT queries. Use proper formatting.`,
    prompt: `Generate a SQL query for: "${naturalLanguageQuery}"

Provide the SQL query, explanation, confidence level (0-1), assumptions, and tables used.`,
    schema: sqlGenerationSchema,
    temperature: 0.1,
    experimental_telemetry: aiTelemetry("sql-generation-tool"),
  });

  return result.object;
}

// Backwards-compatible tool-like export
export const sqlGenerationTool = {
  id: 'sql-generation',
  description: 'Generates SQL queries from natural language descriptions using database schema information',
  execute: generateSqlFromNaturalLanguage,
};
