"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { resend } from "@/lib/resend";
import { checkIsAdmin } from "@/lib/admin";
import { createD1HttpClient } from "@/db/d1-http";
import { userSettings } from "@/db/schema";

export async function getSentEmails(limit = 100) {
  const { isAdmin } = await checkIsAdmin();

  if (!isAdmin) {
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
  const { isAdmin } = await checkIsAdmin();

  if (!isAdmin) {
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

export interface EmailSubscriber {
  email: string;
  name: string;
}

/**
 * Return all users who have email_notifications enabled.
 * Looks up Clerk user emails by user_id from the userSettings table.
 */
export async function getEmailSubscribers(): Promise<EmailSubscriber[]> {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = drizzle(createD1HttpClient() as any);

  const rows = await db
    .select({ user_id: userSettings.user_id })
    .from(userSettings)
    .where(eq(userSettings.email_notifications, true));

  if (rows.length === 0) return [];

  const clerk = await clerkClient();

  const subscribers = await Promise.allSettled(
    rows.map(async (row): Promise<EmailSubscriber> => {
      const user = await clerk.users.getUser(row.user_id);
      const email = user.emailAddresses[0]?.emailAddress ?? "";
      const firstName = user.firstName ?? "";
      const lastName = user.lastName ?? "";
      const name =
        [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0] || row.user_id;
      return { email, name };
    }),
  );

  return subscribers
    .filter(
      (r): r is PromiseFulfilledResult<EmailSubscriber> =>
        r.status === "fulfilled" && r.value.email !== "",
    )
    .map((r) => r.value);
}
