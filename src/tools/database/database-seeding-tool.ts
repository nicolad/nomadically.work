import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// requireApproval: true — this tool performs bulk database operations
// (drops all tables and re-seeds with fresh data) and requires explicit
// human approval before execution in production environments.
export const databaseSeedingTool = createTool({
  id: 'database-seeding',
  inputSchema: z.object({
    connectionString: z.string().describe('PostgreSQL connection string'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    recordCount: z.number(),
    tablesCreated: z.array(z.string()),
    summary: z.object({
      companies: z.number(),
      locations: z.number(),
      departments: z.number(),
      jobTitles: z.number(),
      skills: z.number(),
      employees: z.string(),
      projects: z.string(),
      relationships: z.string(),
    }),
  }),
  description:
    'Seeds the database with comprehensive business data including companies, employees, projects, skills, and their relationships',
  execute: async (_inputData) => {
    throw new Error('PostgreSQL client (pg) is not available. This project uses Cloudflare D1.');
  },
});
