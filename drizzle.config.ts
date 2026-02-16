import { config } from "dotenv";
import type { Config } from "drizzle-kit";

// Load from .env.local
config({ path: ".env.local" });

export default {
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId:
      process.env.CLOUDFLARE_D1_DATABASE_ID ||
      "632b9c57-8262-40bd-86c2-bc08beab713b",
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
} satisfies Config;
