import { config } from "dotenv";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// Load .env.local if TURSO_DB_URL is not set (for scripts)
if (!process.env.TURSO_DB_URL) {
  config({ path: ".env.local" });
}

const turso = createClient({
  url: process.env.TURSO_DB_URL!,
  authToken: process.env.TURSO_DB_AUTH_TOKEN,
});

export const db = drizzle(turso, { schema });
export { turso };
