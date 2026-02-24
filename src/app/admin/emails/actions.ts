"use server";

import { resend } from "@/lib/resend";
import { checkIsAdmin } from "@/lib/admin";

const EMAILS_USER = "contact@vadim.blog";

export async function getSentEmails(limit = 100) {
  const { isAdmin, userEmail } = await checkIsAdmin();

  if (!isAdmin || userEmail?.toLowerCase() !== EMAILS_USER) {
    return { emails: [], error: "Forbidden" };
  }

  try {
    const data = await resend.instance.listEmails({ limit });
    const all = data?.data ?? [];
    const emails = all.filter(
      (email: { to?: string[]; from?: string }) =>
        email.to?.some((addr) => addr.toLowerCase() === "contact@vadim.blog") ||
        email.from?.toLowerCase().includes("contact@vadim.blog"),
    );
    return { emails, error: null };
  } catch (err) {
    return {
      emails: [],
      error: err instanceof Error ? err.message : "Failed to fetch sent emails",
    };
  }
}

export async function getReceivedEmails(limit = 100) {
  const { isAdmin, userEmail } = await checkIsAdmin();

  if (!isAdmin || userEmail?.toLowerCase() !== EMAILS_USER) {
    return { emails: [], error: "Forbidden" };
  }

  try {
    const data = await resend.instance.listReceived({ limit });
    const all = data?.data ?? [];
    const emails = all.filter((email: { to?: string[] }) =>
      email.to?.some((addr) => addr.toLowerCase() === "contact@vadim.blog"),
    );
    return { emails, error: null };
  } catch (err) {
    return {
      emails: [],
      error:
        err instanceof Error ? err.message : "Failed to fetch received emails",
    };
  }
}
