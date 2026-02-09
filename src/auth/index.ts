import { betterAuth } from "./instance";

export { betterAuth };
export type Session = typeof betterAuth.$Infer.Session;
export type User = typeof betterAuth.$Infer.User;

// Export server-side auth function
export {
  auth,
  isAuthenticated,
  requireAuth,
  getAuthenticatedUser,
  isAdmin,
  requireAdmin,
  type AuthResult,
} from "./server";
