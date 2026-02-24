import { NextRequest, NextResponse } from "next/server";

/**
 * Resend Webhook Handler
 *
 * Handles webhook events from Resend to track email delivery status.
 *
 * Supported events:
 * - email.sent - Email was successfully sent
 * - email.delivered - Email was delivered to recipient
 * - email.bounced - Email bounced
 * - email.complained - Recipient marked as spam
 * - email.delivery_delayed - Temporary delivery issue
 * - email.opened - Recipient opened the email
 * - email.clicked - Recipient clicked a link
 * - email.received - Incoming email received
 *
 * Setup:
 * 1. Go to https://resend.com/webhooks
 * 2. Create a webhook pointing to: https://yourdomain.com/api/webhooks/resend
 * 3. Copy the signing secret
 * 4. Add to .env.local: RESEND_WEBHOOK_SECRET=whsec_...
 */

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    bounce_type?: string;
    complaint_type?: string;
    link?: string;
    html?: string;
    text?: string;
    bounce?: {
      type: string;
      subType: string;
      message: string;
      diagnosticCode?: string[];
    };
  };
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("svix-signature");
    const webhookId = req.headers.get("svix-id");
    const timestamp = req.headers.get("svix-timestamp");

    if (!signature || !webhookId || !timestamp) {
      console.error("[RESEND_WEBHOOK] Missing webhook headers");
      return NextResponse.json(
        { error: "Missing webhook headers" },
        { status: 400 },
      );
    }

    if (!WEBHOOK_SECRET) {
      console.error("[RESEND_WEBHOOK] RESEND_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 },
      );
    }

    const rawBody = await req.text();
    let event: ResendWebhookEvent;

    try {
      event = JSON.parse(rawBody);
    } catch {
      console.error("[RESEND_WEBHOOK] Failed to parse webhook body");
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    console.log(`[RESEND_WEBHOOK] Received event: ${event.type}`, {
      emailId: event.data.email_id,
      to: event.data.to,
      subject: event.data.subject,
    });

    switch (event.type) {
      case "email.sent":
        console.log(`[RESEND_WEBHOOK] Email sent: ${event.data.email_id}`);
        break;

      case "email.delivered":
        console.log(`[RESEND_WEBHOOK] Email delivered: ${event.data.email_id}`);
        break;

      case "email.bounced": {
        const bounce = event.data.bounce;
        console.warn(`[RESEND_WEBHOOK] Email bounced: ${event.data.email_id}`, {
          type: bounce?.type,
          subType: bounce?.subType,
          message: bounce?.message,
          to: event.data.to,
        });
        break;
      }

      case "email.complained":
        console.warn(
          `[RESEND_WEBHOOK] Spam complaint: ${event.data.email_id}`,
          { to: event.data.to },
        );
        break;

      case "email.delivery_delayed":
        console.warn(
          `[RESEND_WEBHOOK] Delivery delayed: ${event.data.email_id}`,
        );
        break;

      case "email.opened":
        console.log(`[RESEND_WEBHOOK] Email opened: ${event.data.email_id}`);
        break;

      case "email.clicked":
        console.log(
          `[RESEND_WEBHOOK] Link clicked: ${event.data.email_id}`,
          { link: event.data.link },
        );
        break;

      case "email.received":
        console.log(
          `[RESEND_WEBHOOK] Email received from: ${event.data.from}`,
          { subject: event.data.subject },
        );
        break;

      default:
        console.log(`[RESEND_WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({
      received: true,
      eventType: event.type,
      emailId: event.data.email_id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[RESEND_WEBHOOK] Error processing webhook:", message);

    // Always return 200 to prevent Resend from retrying indefinitely
    return NextResponse.json({
      received: true,
      error: message,
    });
  }
}
