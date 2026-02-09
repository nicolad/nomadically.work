/**
 * Better Auth instance
 *
 * This file exports the auth instance for the CLI and other parts of the application.
 * The CLI looks for a named export called "auth" in this file.
 *
 * Reference: https://www.better-auth.com/docs/integrations/next-js
 */

export { betterAuth as auth } from "@/auth/instance";
export type { Session, User } from "@/auth";
