import { MastraAuthBetterAuth } from "@mastra/auth-better-auth";
import { auth } from "@/lib/auth";

/**
 * Mastra Better Auth Integration
 *
 * Wraps the Better Auth instance for use with Mastra server.
 * This provides authentication and authorization for Mastra API routes.
 *
 * Features:
 * - Automatic session validation for protected routes
 * - Custom authorization logic via authorizeUser
 * - Public/protected route configuration
 *
 * @see https://mastra.ai/docs/integrations/auth/better-auth
 * @see https://www.better-auth.com/docs
 */
export const mastraAuth = new MastraAuthBetterAuth({
  auth,
  name: "better-auth",

  /**
   * Custom authorization logic
   * By default, any authenticated user is authorized.
   * Uncomment to add role-based or verification-based checks.
   */
  // async authorizeUser(session) {
  //   // Example: require email verification
  //   return session?.user?.emailVerified === true;
  //
  //   // Example: require admin role
  //   // const user = session?.user as any;
  //   // return user?.role === 'admin';
  // },

  /**
   * Public routes that don't require authentication
   */
  public: [
    "/health",
    "/api/auth/*", // Better Auth endpoints
  ],

  /**
   * Protected routes that require authentication
   * Leave empty to protect all routes by default
   */
  // protected: ["/api/inngest"],
});
