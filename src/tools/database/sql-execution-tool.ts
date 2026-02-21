import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const sqlExecutionTool = createTool({
  id: 'sql-execution',
  inputSchema: z.object({
    connectionString: z.string().describe('PostgreSQL connection string'),
    query: z.string().describe('SQL query to execute'),
  }),
  description: 'Executes SQL queries against a PostgreSQL database',
  execute: async (_inputData) => {
    throw new Error('PostgreSQL client (pg) is not available. This project uses Cloudflare D1.');
  },
});
