"use server";

import { resend } from "@/lib/resend";
import { checkIsAdmin } from "@/lib/admin";

export async function getSentEmails(limit = 100) {
  const { isAdmin, userEmail } = await checkIsAdmin();

  if (!isAdmin || !userEmail) {
    return { emails: [], error: "Forbidden" };
  }

  try {
    const data = await resend.instance.listEmails({ limit });
    const all = data?.data ?? [];
    const lowerEmail = userEmail.toLowerCase();
    const filtered = all.filter(
      (email: { to?: string[]; from?: string }) =>
        email.to?.some((addr) => addr.toLowerCase() === lowerEmail) ||
        email.from?.toLowerCase() === lowerEmail,
    );
    return { emails: filtered, error: null };
  } catch (err) {
    return {
      emails: [],
      error: err instanceof Error ? err.message : "Failed to fetch sent emails",
    };
  }
}

export async function getReceivedEmails(limit = 100) {
  const { isAdmin, userEmail } = await checkIsAdmin();

  if (!isAdmin || !userEmail) {
    return { emails: [], error: "Forbidden" };
  }

  try {
    const data = await resend.instance.listReceived({ limit });
    const all = data?.data ?? [];
    const lowerEmail = userEmail.toLowerCase();
    const filtered = all.filter((email: { to?: string[] }) =>
      email.to?.some((addr) => addr.toLowerCase() === lowerEmail),
    );
    return { emails: filtered, error: null };
  } catch (err) {
    return {
      emails: [],
      error:
        err instanceof Error ? err.message : "Failed to fetch received emails",
    };
  }
}
