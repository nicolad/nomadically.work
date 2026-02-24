"use server";

import { resend } from "@/lib/resend";

export async function getSentEmails(limit = 100) {
  try {
    const data = await resend.instance.listEmails({ limit });
    return { emails: data?.data ?? [], error: null };
  } catch (err) {
    return {
      emails: [],
      error: err instanceof Error ? err.message : "Failed to fetch sent emails",
    };
  }
}

export async function getReceivedEmails(limit = 100) {
  try {
    const data = await resend.instance.listReceived({ limit });
    return { emails: data?.data ?? [], error: null };
  } catch (err) {
    return {
      emails: [],
      error:
        err instanceof Error ? err.message : "Failed to fetch received emails",
    };
  }
}
