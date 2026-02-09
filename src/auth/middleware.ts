import { betterAuth } from "./instance";
import { authConfig, isAdmin } from "./config";
import type { AuthContext, AuthenticatedRequest } from "./types";

/**
 * Authentication Middleware
 *
 * Handles session validation and authorization for routes
 */

export async function getSession(request: Request): Promise<AuthContext> {
  try {
    const session = await betterAuth.api.getSession({
      headers: request.headers,
    });

    const adminStatus = session?.user ? await isAdmin(session) : false;

    return {
      user: session?.user || null,
      session: session?.session || null,
      isAuthenticated: !!session?.user,
      isAdmin: adminStatus,
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      isAuthenticated: false,
      isAdmin: false,
    };
  }
}

/**
 * Check if route is public
 */
function isPublicRoute(pathname: string): boolean {
  return authConfig.public.some((pattern) => {
    const regex = new RegExp(`^${pattern.replace("*", ".*")}$`);
    return regex.test(pathname);
  });
}

/**
 * Check if route is admin-only
 */
function isAdminRoute(pathname: string): boolean {
  return authConfig.adminOnly.some((pattern) => {
    const regex = new RegExp(`^${pattern.replace("*", ".*")}$`);
    return regex.test(pathname);
  });
}

/**
 * Protect route based on authentication status
 */
export async function protectRoute(
  request: Request,
  pathname: string,
): Promise<{ authorized: boolean; error?: string }> {
  // Public routes don't need protection
  if (isPublicRoute(pathname)) {
    return { authorized: true };
  }

  const authContext = await getSession(request);

  if (!authContext.isAuthenticated) {
    return {
      authorized: false,
      error: "Unauthorized: Please sign in",
    };
  }

  // Admin routes require admin role
  if (isAdminRoute(pathname) && !authContext.isAdmin) {
    return {
      authorized: false,
      error: "Forbidden: Admin access required",
    };
  }

  return { authorized: true };
}

/**
 * Middleware function for Next.js
 *
 * Usage in middleware.ts:
 * export async function middleware(request: NextRequest) {
 *   const authContext = await getSession(request);
 *   // Use authContext for authorization logic
 * }
 */
export async function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<Response>,
) {
  return async (request: AuthenticatedRequest): Promise<Response> => {
    const pathname = new URL(request.url).pathname;
    const protection = await protectRoute(request, pathname);

    if (!protection.authorized) {
      return new Response(JSON.stringify({ error: protection.error }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Attach auth context to request
    const authContext = await getSession(request);
    request.auth = authContext;
    request.user = authContext.user || undefined;
    request.session = authContext.session || undefined;

    return handler(request);
  };
}
