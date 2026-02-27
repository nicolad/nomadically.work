"use client";

import { useUser, useAuth as useClerkAuth } from "@clerk/nextjs";

/**
 * Clerk authentication hooks
 *
 * These hooks provide a consistent interface for authentication across the app
 */

export interface User {
  id: string;
  email?: string;
  name?: string | null;
  emailVerified?: boolean;
}

export interface Session {
  user: User;
}

export interface AuthContext {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get current authentication state
 */
export function useAuth(): AuthContext {
  const { isLoaded, isSignedIn, user } = useUser();

  // Dev bypass: if ADMIN_EMAIL is set in dev, use it immediately (don't wait for Clerk)
  const devEmail =
    process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_ADMIN_EMAIL
      : undefined;

  if (!isLoaded) {
    // In dev with ADMIN_EMAIL, skip the loading state entirely
    if (devEmail) {
      const devUser = { id: "dev-local", email: devEmail, name: "Dev", emailVerified: true };
      return {
        user: devUser,
        session: { user: devUser },
        isAuthenticated: true,
        loading: false,
        error: null,
      };
    }
    return {
      user: null,
      session: null,
      isAuthenticated: false,
      loading: true,
      error: null,
    };
  }

  const mappedUser = user
    ? {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress?.toLowerCase(),
        name: user.fullName || user.username,
        emailVerified:
          user.primaryEmailAddress?.verification.status === "verified",
      }
    : devEmail
      ? { id: "dev-local", email: devEmail, name: "Dev", emailVerified: true }
      : null;

  return {
    user: mappedUser,
    session: mappedUser ? { user: mappedUser } : null,
    isAuthenticated: !!isSignedIn || !!mappedUser,
    loading: false,
    error: null,
  };
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
  const { isLoaded, isSignedIn } = useUser();
  return {
    isAuthenticated: isSignedIn,
    loading: !isLoaded,
  };
}

/**
 * Hook to check if user is admin
 * Note: You'll need to add custom claims or metadata in Clerk dashboard
 * to set admin roles
 */
export function useIsAdmin() {
  const { isLoaded, user } = useUser();
  const { orgRole } = useClerkAuth();
  
  return {
    isAdmin: (user?.publicMetadata as any)?.role === "admin" || orgRole === "admin",
    loading: !isLoaded,
  };
}
