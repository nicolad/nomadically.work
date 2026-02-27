import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admin";
import { resend } from "@/lib/resend";
import { drizzle } from "drizzle-orm/d1";
import { createD1HttpClient } from "@/db/d1-http";
import { contactEmails } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FROM = "Vadim Nicolai <contact@vadim.blog>";
const RESUME_PATH = join(process.cwd(), "src/data/CV_Vadim_Nicolai.pdf");

interface SendEmailRequest {
  contactId: number;
  to: string;
  name: string;
  subject: string;
  body: string;
  includeResume?: boolean;
}

function textToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((para) => {
      const lines = para
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join("<br>");
      return lines ? `<p>${lines}</p>` : "";
    })
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const userEmail = user.emailAddresses[0]?.emailAddress ?? null;

  if (!isAdminEmail(userEmail)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  let input: SendEmailRequest;
  try {
    input = (await request.json()) as SendEmailRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const { contactId, to, name, subject, body, includeResume } = input;

  if (!to || !subject || !body) {
    return NextResponse.json({ success: false, error: "to, subject, and body are required" }, { status: 400 });
  }

  const firstName = (name || "").split(" ")[0] || name || "";
  const personalized = body.replace(/\{\{name\}\}/g, firstName);
  const html = textToHtml(personalized);

  const attachments = [];
  if (includeResume) {
    try {
      const content = await readFile(RESUME_PATH);
      attachments.push({ filename: "Vadim_Nicolai_CV.pdf", content });
    } catch {
      return NextResponse.json({ success: false, error: "Resume file not found" }, { status: 500 });
    }
  }

  const result = await resend.instance.send({
    from: FROM,
    to,
    subject: subject.trim(),
    html,
    text: personalized,
    ...(attachments.length > 0 && { attachments }),
  });

  if (result.error) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  // Persist to DB if contactId provided
  if (contactId) {
    try {
      const db = drizzle(createD1HttpClient() as any);
      await db.insert(contactEmails).values({
        contact_id: contactId,
        resend_id: result.id,
        from_email: FROM,
        to_emails: JSON.stringify([to]),
        subject: subject.trim(),
        text_content: personalized,
        status: "sent",
        sent_at: new Date().toISOString(),
        recipient_name: name || null,
      });
    } catch (err) {
      // Non-fatal — email was sent, just log the persistence failure
      console.error("[send] Failed to persist contact email:", err);
    }
  }

  return NextResponse.json({ success: true, id: result.id });
}
