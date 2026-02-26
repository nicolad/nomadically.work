import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admin";
import { resend } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_LIMIT = 100;

const VERIFIED_FROM = "Vadim Nicolai <contact@vadim.blog>";

interface Recipient {
  email: string;
  name: string;
}

interface BatchEmailRequestBody {
  recipients: Recipient[];
  subject: string;
  body: string;
  scheduledAt?: string;
}

interface SendResult {
  email: string;
  status: "sent" | "failed";
}

interface FailedResult {
  email: string;
  error: string;
}

interface BatchEmailResponse {
  success: boolean;
  message: string;
  sent: SendResult[];
  failed: FailedResult[];
}

/**
 * Convert plain text to HTML.
 * Paragraphs are separated by double newlines and wrapped in <p> tags.
 * Single newlines within a paragraph become <br> tags.
 */
function textToHtml(text: string): string {
  const paragraphs = text
    .split(/\n\n+/)
    .map((para) => {
      const lines = para
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join("<br>");
      return lines ? `<p>${lines}</p>` : "";
    })
    .filter((p) => p.length > 0);

  return paragraphs.join("\n");
}

/**
 * Personalize the body for a single recipient.
 * Replaces {{name}} with the recipient's first name.
 * Prepends "Hi [firstName]," if no greeting is present.
 */
function personalizeBody(body: string, name: string): string {
  const firstName = name.split(" ")[0] || name;
  let personalized = body.replace(/\{\{name\}\}/g, firstName);

  const hasGreeting = /^(hi|hey|hello|dear)\b/i.test(personalized.trim());
  if (!hasGreeting) {
    personalized = `Hi ${firstName},\n\n${personalized}`;
  }

  return personalized;
}

/**
 * Validate that scheduledAt is a future date within Resend's 30-day limit.
 */
function validateScheduledAt(scheduledAt: string): string | null {
  const scheduledDate = new Date(scheduledAt);

  if (isNaN(scheduledDate.getTime())) {
    return "scheduledAt is not a valid date string";
  }

  const now = new Date();
  if (scheduledDate <= now) {
    return "scheduledAt must be a future date";
  }

  const daysDiff = Math.ceil(
    (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysDiff > 30) {
    return `scheduledAt exceeds Resend's 30-day scheduling limit (${daysDiff} days from now)`;
  }

  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse<BatchEmailResponse>> {
  // Auth check
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, message: "Unauthorized", sent: [], failed: [] },
      { status: 401 },
    );
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const userEmail = user.emailAddresses[0]?.emailAddress ?? null;

  if (!isAdminEmail(userEmail)) {
    return NextResponse.json(
      { success: false, message: "Forbidden", sent: [], failed: [] },
      { status: 403 },
    );
  }

  // Parse + validate body
  let body: BatchEmailRequestBody;
  try {
    body = (await request.json()) as BatchEmailRequestBody;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body", sent: [], failed: [] },
      { status: 400 },
    );
  }

  const { recipients, subject, body: emailBody, scheduledAt } = body;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json(
      { success: false, message: "recipients array is required and must not be empty", sent: [], failed: [] },
      { status: 400 },
    );
  }

  if (!subject || typeof subject !== "string" || subject.trim() === "") {
    return NextResponse.json(
      { success: false, message: "subject is required", sent: [], failed: [] },
      { status: 400 },
    );
  }

  if (!emailBody || typeof emailBody !== "string" || emailBody.trim() === "") {
    return NextResponse.json(
      { success: false, message: "body is required", sent: [], failed: [] },
      { status: 400 },
    );
  }

  if (recipients.length > BATCH_LIMIT) {
    return NextResponse.json(
      {
        success: false,
        message: `Batch limit is ${BATCH_LIMIT} recipients per request (got ${recipients.length})`,
        sent: [],
        failed: [],
      },
      { status: 400 },
    );
  }

  // Default to 10 minutes from now when no scheduledAt is provided.
  // Only validate when the caller explicitly passed a value — the default is always valid.
  const effectiveScheduledAt: string =
    scheduledAt ?? new Date(Date.now() + 10 * 60 * 1000).toISOString();

  if (scheduledAt !== undefined) {
    const scheduleError = validateScheduledAt(effectiveScheduledAt);
    if (scheduleError) {
      return NextResponse.json(
        { success: false, message: scheduleError, sent: [], failed: [] },
        { status: 400 },
      );
    }
  }

  // Validate each recipient has email + name
  for (const recipient of recipients) {
    if (!recipient.email || typeof recipient.email !== "string") {
      return NextResponse.json(
        { success: false, message: "Each recipient must have a valid email field", sent: [], failed: [] },
        { status: 400 },
      );
    }
    if (!recipient.name || typeof recipient.name !== "string") {
      return NextResponse.json(
        { success: false, message: "Each recipient must have a name field", sent: [], failed: [] },
        { status: 400 },
      );
    }
  }

  const sent: SendResult[] = [];
  const failed: FailedResult[] = [];

  // Always schedule — sequential send() so scheduledAt is supported for every recipient.
  for (const recipient of recipients) {
    const personalized = personalizeBody(emailBody, recipient.name);
    const html = textToHtml(personalized);

    const result = await resend.instance.send({
      from: VERIFIED_FROM,
      to: recipient.email,
      subject: subject.trim(),
      html,
      scheduledAt: effectiveScheduledAt,
    });

    if (result.error) {
      failed.push({ email: recipient.email, error: String(result.error) });
    } else {
      sent.push({ email: recipient.email, status: "sent" });
    }
  }

  const allSucceeded = failed.length === 0;
  const scheduledTime = new Date(effectiveScheduledAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  const message = allSucceeded
    ? `Scheduled ${sent.length} email${sent.length === 1 ? "" : "s"} for ${scheduledTime} UTC`
    : `Scheduled ${sent.length}, failed ${failed.length}`;

  return NextResponse.json(
    { success: allSucceeded, message, sent, failed },
    { status: allSucceeded ? 200 : 207 },
  );
}
