import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const databaseIntrospectionTool = createTool({
  id: 'database-introspection',
  inputSchema: z.object({
    connectionString: z.string().describe('PostgreSQL connection string'),
  }),
  description: 'Introspects a PostgreSQL database to understand its schema, tables, columns, and relationships',
  execute: async (_inputData) => {
    throw new Error('PostgreSQL client (pg) is not available. This project uses Cloudflare D1.');
  },
});
