import { auth, clerkClient } from "@clerk/nextjs/server";
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
    const { userId } = await auth();

    if (!userId) {
      return { isAdmin: false, userId: null, userEmail: null };
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userEmail = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId
    )?.emailAddress;

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
