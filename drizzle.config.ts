import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration for Cloudflare D1 (Remote Production)
 * 
 * Database: nomadically-work-db (632b9c57-8262-40bd-86c2-bc08beab713b)
 * 
 * Workflow:
 * 1. Update schema in ./src/db/schema.ts
 * 2. Generate migration: pnpm db:generate
 * 3. Apply to remote D1: pnpm db:push
 * 
 * Migrations are applied via wrangler CLI to the remote D1 database.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
});
