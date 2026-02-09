import { betterAuth } from "./instance";

/**
 * Type definitions for Better Auth
 */

// Session type
export type Session = typeof betterAuth.$Infer.Session;

// User type
export type User = typeof betterAuth.$Infer.User;

/**
 * Extended user type with additional fields
 */
export interface ExtendedUser extends User {
  role?: "user" | "admin" | "moderator";
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
}

/**
 * Authorization context
 */
export interface AuthContext {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

/**
 * API request with auth context
 */
export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
  user?: User;
  session?: Session;
}

/**
 * Error responses for auth operations
 */
export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
