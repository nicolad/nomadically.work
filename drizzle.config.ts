import { config } from "dotenv";
import type { Config } from "drizzle-kit";

// Load from .env.local
config({ path: ".env.local" });

export default {
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DB_URL!,
    authToken: process.env.TURSO_DB_AUTH_TOKEN,
  },
} satisfies Config;
