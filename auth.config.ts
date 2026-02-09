import { config } from "dotenv";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

// Load .env.local for CLI
config({ path: ".env.local" });

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.PG_KEY || "postgresql://localhost/better_auth",
  }),
  emailAndPassword: { enabled: true },
  plugins: [admin(), nextCookies()],
});

export default auth;
