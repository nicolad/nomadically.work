import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { Session, User } from "./types";

/**
 * Client-side hooks for Better Auth
 *
 * These hooks wrap the authClient to provide React hooks for authentication.
 */

/**
 * Hook to get current session and user
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        // Use the authClient's built-in session retrieval
        const response = await fetch("/api/auth/get-session");
        if (!response.ok) throw new Error("Failed to fetch session");

        const data = await response.json();
        setSession(data.session || null);
        setUser(data.user || null);
      } catch (err) {
        // Session not available is not an error
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  return { session, user, loading, error };
}

/**
 * Hook to handle sign out
 */
export function useSignOut() {
  const [loading, setLoading] = useState(false);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await authClient.signOut();
      // Redirect to home page after sign out
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { signOut, loading };
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
  const { user, loading } = useAuth();
  return { isAuthenticated: !!user, loading };
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin() {
  const { user, loading } = useAuth();
  return {
    isAdmin: (user as any)?.role === "admin",
    loading,
  };
}
