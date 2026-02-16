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

  if (!isLoaded) {
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
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName || user.username,
        emailVerified: user.primaryEmailAddress?.verification.status === "verified",
      }
    : null;

  return {
    user: mappedUser,
    session: mappedUser ? { user: mappedUser } : null,
    isAuthenticated: isSignedIn,
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
