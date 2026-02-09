import { betterAuth as createBetterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { pgPool } from "./db";

/**
 * Better Auth Instance Configuration
 *
 * This file contains only the Better Auth configuration.
 * Separated to avoid circular dependencies.
 *
 * Uses PostgreSQL database from pgPool (see ./db.ts)
 * Reference: https://www.better-auth.com/docs/integrations/next-js
 */

export const betterAuth = createBetterAuth({
  database: pgPool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  plugins: [
    admin(),
    nextCookies(), // Handle cookies in server actions (must be last)
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"],
});
