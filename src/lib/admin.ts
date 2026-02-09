import { auth } from "@/auth";
import { ADMIN_EMAIL } from "@/lib/constants";

/**
 * Check if the current user is an admin
 * @returns Object with isAdmin boolean and user info
 */
export async function checkIsAdmin(): Promise<{
  isAdmin: boolean;
  userId: string | null;
  userEmail: string | null;
}> {
  try {
    const { userId, user } = await auth();

    if (!userId || !user) {
      return { isAdmin: false, userId: null, userEmail: null };
    }

    const userEmail = user.email || null;

    return {
      isAdmin: userEmail === ADMIN_EMAIL,
      userId,
      userEmail: userEmail || null,
    };
  } catch (error) {
    console.error("Error checking admin status:", error);
    return { isAdmin: false, userId: null, userEmail: null };
  }
}

/**
 * Check if a specific email is an admin email
 * @param email - Email to check
 * @returns true if email is admin
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}
