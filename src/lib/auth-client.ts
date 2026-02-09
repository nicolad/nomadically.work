import { createAuthClient } from "better-auth/react";

/**
 * Client-side Better Auth instance
 *
 * Used for client-side authentication operations in React components.
 * The base URL is optional if using the same domain.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

// Export commonly used methods for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  useAuthState,
  listSessions,
  revokeSessions,
  changePassword,
  forgetPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  getTwoFactorMethods,
  disableTwoFactor,
  createTwoFactorChallenge,
  verifyTwoFactorChallenge,
} = authClient;
