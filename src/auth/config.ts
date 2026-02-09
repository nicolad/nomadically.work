import { betterAuth } from "./instance";

/**
 * Auth Configuration Options
 *
 * Defines public routes, protected routes, and authorization rules.
 */
export const authConfig = {
  /**
   * Routes that don't require authentication
   */
  public: ["/api/auth/*", "/sign-in", "/sign-up", "/health", "/api/status"],

  /**
   * Routes that require authentication
   */
  protected: [
    "/api/companies/*",
    "/api/jobs/*",
    "/api/users/*",
    "/settings",
    "/dashboard",
  ],

  /**
   * Routes accessible only to admins
   */
  adminOnly: ["/api/admin/*", "/admin"],
};

/**
 * Custom authorization logic
 *
 * You can use this to implement role-based access control
 */
export async function authorizeUser(user: any): Promise<boolean> {
  // Only allow users with verified emails
  if (user?.user?.emailVerified !== true) {
    return false;
  }

  return true;
}

/**
 * Check if user has admin role
 */
export async function isAdmin(user: any): Promise<boolean> {
  // Assuming you have a role field in your user model
  return user?.user?.role === "admin";
}

export { auth };
