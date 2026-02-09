import { headers } from "next/headers";
import { betterAuth } from "./instance";
import type { User, Session } from "./types";

/**
 * Server-side authentication function
 *
 * Provides server-side auth utilities for Better Auth
 * Usage: const { userId } = await auth();
 */

export interface AuthResult {
  userId: string | null;
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
}

/**
 * Get current user session and auth context
 * This is a server-only function that must be called from server components or API routes
 *
 * @returns Auth context with userId, user, session, and isAuthenticated
 *
 * @example
 * // In a server component
 * const { userId } = await auth();
 * if (!userId) {
 *   redirect('/sign-in');
 * }
 *
 * @example
 * // In an API route
 * export async function GET(request: Request) {
 *   const { userId, user } = await auth();
 *   if (!userId) {
 *     return new Response('Unauthorized', { status: 401 });
 *   }
 *   return new Response(JSON.stringify({ user }));
 * }
 */
export async function auth(): Promise<AuthResult> {
  try {
    const headersList = await headers();

    const session = await betterAuth.api.getSession({
      headers: headersList,
    });

    return {
      userId: session?.user?.id || null,
      user: session?.user || null,
      session: session?.session || null,
      isAuthenticated: !!session?.user?.id,
    };
  } catch (error) {
    return {
      userId: null,
      user: null,
      session: null,
      isAuthenticated: false,
    };
  }
}

/**
 * Check if current user is authenticated
 *
 * @returns true if user is authenticated, false otherwise
 *
 * @example
 * if (!await isAuthenticated()) {
 *   redirect('/sign-in');
 * }
 */
export async function isAuthenticated(): Promise<boolean> {
  const { userId } = await auth();
  return !!userId;
}

/**
 * Assert that user is authenticated
 * Throws an error if user is not authenticated
 *
 * @throws Error if user is not authenticated
 *
 * @example
 * const { userId } = await requireAuth();
 * // userId is guaranteed to be a string here
 */
export async function requireAuth(): Promise<AuthResult> {
  const authResult = await auth();
  if (!authResult.userId) {
    throw new Error("Unauthorized: User must be authenticated");
  }
  return authResult as Required<AuthResult>;
}

/**
 * Get current user, or throw error if not authenticated
 *
 * @returns The authenticated user
 * @throws Error if user is not authenticated
 *
 * @example
 * const user = await getAuthenticatedUser();
 * console.log(user.email);
 */
export async function getAuthenticatedUser(): Promise<User> {
  const { user } = await requireAuth();
  return user as Required<User>;
}

/**
 * Check if current user is admin
 *
 * @returns true if user is admin, false otherwise
 *
 * @example
 * if (!await isAdmin()) {
 *   return new Response('Forbidden', { status: 403 });
 * }
 */
export async function isAdmin(): Promise<boolean> {
  const { user } = await auth();
  return (user as any)?.role === "admin";
}

/**
 * Assert that user is admin
 * Throws an error if user is not admin
 *
 * @throws Error if user is not admin
 *
 * @example
 * await requireAdmin();
 * // User is guaranteed to be admin here
 */
export async function requireAdmin(): Promise<AuthResult> {
  const authResult = await auth();
  if (!authResult.userId || (authResult.user as any)?.role !== "admin") {
    throw new Error("Forbidden: Admin access required");
  }
  return authResult;
}
