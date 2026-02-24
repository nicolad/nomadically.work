import { Resend } from "resend";
import type { Attachment } from "resend";
import _ from "lodash";
import type { ReceivedEmail, ListReceivedEmailsResponse } from "./types";

const DEFAULT_FROM = "Nomadically <noreply@nomadically.work>";
const DEFAULT_REPLY_TO = "contact@nomadically.work";

/**
 * Email sending parameters
 * Uses Resend's official Attachment type for attachments
 */
export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  scheduledAt?: string;
  from?: string;
  /**
   * Email attachments (uses Resend's official Attachment type)
   * @see https://resend.com/docs/api-reference/emails/send-email#body-parameters
   */
  attachments?: Attachment[];
}

/**
 * Email send result
 */
export interface SendEmailResult {
  id: string;
  error?: string;
}

/**
 * Email cancel result
 */
export interface CancelEmailResult {
  success: boolean;
  error?: string;
}

/**
 * Resend email service adapter
 * Centralizes all Resend API interactions
 */
export class ResendEmailAdapter {
  private resend: Resend;
  private defaultFrom: string;
  private defaultReplyTo: string;

  constructor(apiKey?: string, defaultFrom?: string, defaultReplyTo?: string) {
    this.resend = new Resend(apiKey || process.env.RESEND_API_KEY);
    this.defaultFrom = defaultFrom || DEFAULT_FROM;
    this.defaultReplyTo = defaultReplyTo || DEFAULT_REPLY_TO;
  }

  /**
   * Send an email
   */
  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const { to, subject, html, text, replyTo, scheduledAt, from, attachments } =
      params;

    try {
      // CRITICAL: Validate Resend's 30-day scheduling limit
      if (scheduledAt) {
        const scheduledDate = new Date(scheduledAt);
        const now = new Date();
        const daysDiff = Math.ceil(
          (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysDiff > 30) {
          const error = `Scheduled date ${scheduledAt} exceeds Resend's 30-day limit (${daysDiff} days from now). Cannot schedule email.`;
          console.error(`[ResendAdapter] ${error}`);
          return { id: "", error };
        }
      }

      const emailPayload = {
        from: from || this.defaultFrom,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        replyTo: replyTo || this.defaultReplyTo,
        ...(scheduledAt && { scheduledAt }),
        ...(attachments && { attachments }),
      };

      console.log(`[ResendAdapter] Sending email to ${to}:`, {
        scheduledAt: emailPayload.scheduledAt,
        subject: emailPayload.subject,
        hasScheduledAt: !!scheduledAt,
      });

      const { data, error } = await this.resend.emails.send(emailPayload);

      if (error) {
        console.error(`[ResendAdapter] Error from Resend:`, error);
        return { id: "", error: error.message };
      }

      if (data?.id) {
        console.log(
          `[ResendAdapter] ✓ Resend accepted email ID: ${data.id}${scheduledAt ? ` (scheduled for ${scheduledAt})` : ""}`,
        );
      }

      return { id: data?.id || "" };
    } catch (err) {
      return {
        id: "",
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Cancel a scheduled email
   */
  async cancel(emailId: string): Promise<CancelEmailResult> {
    try {
      await this.resend.emails.cancel(emailId);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Update a scheduled email
   */
  async update(
    emailId: string,
    scheduledAt: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.resend.emails.update({
        id: emailId,
        scheduledAt,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * List sent emails
   * @see https://resend.com/docs/api-reference/emails/list-emails
   * @param options - Pagination options
   * @param options.limit - Number of emails to retrieve (default: 100, will automatically paginate if > 100)
   * @param options.after - The ID after which to retrieve emails (for pagination)
   * @param options.before - The ID before which to retrieve emails (for pagination)
   */
  async listEmails(options?: {
    limit?: number;
    after?: string;
    before?: string;
  }) {
    try {
      const requestedLimit = options?.limit || 100;
      const maxPerRequest = 100;

      // If requested limit is within max, make single request
      if (requestedLimit <= maxPerRequest) {
        const params: any = { limit: requestedLimit };
        if (options?.after) params.after = options.after;
        if (options?.before) params.before = options.before;

        const { data, error } = await this.resend.emails.list(params);
        if (error) {
          throw new Error(error.message);
        }
        return data;
      }

      // For limits > 100, paginate through results
      let allEmails: any[] = [];
      let after = options?.after;
      let remaining = requestedLimit;
      let requestCount = 0;

      while (remaining > 0) {
        const batchLimit = Math.min(remaining, maxPerRequest);
        const params: any = { limit: batchLimit };
        if (after) params.after = after;
        if (options?.before) params.before = options.before;

        // Rate limiting: wait 150ms between requests (max 6.67 requests/sec, well under 10/sec limit)
        if (requestCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
        requestCount++;

        const { data, error } = await this.resend.emails.list(params);
        if (error) {
          throw new Error(error.message);
        }

        if (!data || !data.data || data.data.length === 0) {
          break;
        }

        allEmails = allEmails.concat(data.data);
        remaining -= data.data.length;

        if (data.has_more && data.data.length > 0) {
          after = data.data[data.data.length - 1].id;
        } else {
          break;
        }
      }

      return {
        object: "list",
        data: allEmails,
        has_more: false,
      };
    } catch (err) {
      throw err;
    }
  }

  /**
   * List received emails
   * @see https://resend.com/docs/api-reference/emails/list-received-emails
   * @param options - Pagination options
   * @param options.limit - Number of emails to retrieve (max: 100)
   * @param options.after - The ID after which to retrieve emails (for pagination)
   * @param options.before - The ID before which to retrieve emails (for pagination)
   */
  async listReceived(options?: {
    limit?: number;
    after?: string;
    before?: string;
  }): Promise<ListReceivedEmailsResponse | null> {
    try {
      const params: any = {};

      if (!_.isUndefined(options?.limit)) {
        params.limit = _.clamp(options.limit, 1, 100);
      }

      if (options?.after) params.after = options.after;
      if (options?.before) params.before = options.before;

      const { data, error } = await this.resend.emails.receiving.list(params);
      if (error) {
        throw new Error(error.message);
      }
      return data;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get a sent email by ID
   * @see https://resend.com/docs/api-reference/emails/get-email
   */
  async getEmail(emailId: string): Promise<any | null> {
    try {
      const { data, error } = await this.resend.emails.get(emailId);
      if (error) {
        throw new Error(error.message);
      }
      return data;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Get a received email by ID
   */
  async getReceivedEmail(emailId: string): Promise<ReceivedEmail | null> {
    try {
      const { data, error } = await this.resend.emails.receiving.get(emailId);
      if (error) {
        throw new Error(error.message);
      }
      return data;
    } catch (err) {
      throw err;
    }
  }

  getDefaultFrom(): string {
    return this.defaultFrom;
  }

  setDefaultFrom(from: string): void {
    this.defaultFrom = from;
  }

  getDefaultReplyTo(): string {
    return this.defaultReplyTo;
  }

  setDefaultReplyTo(replyTo: string): void {
    this.defaultReplyTo = replyTo;
  }

  /**
   * Send batch emails (up to 100 at once)
   * Note: attachments and scheduledAt are NOT supported in batch endpoint
   * @see https://resend.com/docs/api-reference/emails/send-batch-emails
   */
  async sendBatch(
    emails: Array<{
      to: string | string[];
      subject: string;
      html?: string;
      text?: string;
      bcc?: string | string[];
      cc?: string | string[];
      replyTo?: string;
      from?: string;
      tags?: Array<{ name: string; value: string }>;
      headers?: Record<string, string>;
    }>,
  ): Promise<{ data: Array<{ id: string }> | null; error?: string }> {
    if (emails.length === 0) {
      return { data: [] };
    }

    if (emails.length > 100) {
      return { data: null, error: "Batch limit is 100 emails per request" };
    }

    try {
      const batchPayload = emails.map((email) => {
        const payload: any = {
          from: email.from || this.defaultFrom,
          to: Array.isArray(email.to) ? email.to : [email.to],
          subject: email.subject,
          replyTo: email.replyTo || this.defaultReplyTo,
        };

        if (email.html) payload.html = email.html;
        if (email.text) payload.text = email.text;
        if (email.bcc)
          payload.bcc = Array.isArray(email.bcc) ? email.bcc : [email.bcc];
        if (email.cc)
          payload.cc = Array.isArray(email.cc) ? email.cc : [email.cc];
        if (email.tags) payload.tags = email.tags;
        if (email.headers) payload.headers = email.headers;

        return payload;
      });

      const { data, error } = await this.resend.batch.send(batchPayload);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data?.data || [] };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}

/**
 * Singleton instance (lazy-loaded)
 */
let _resendInstance: ResendEmailAdapter | null = null;

export const resend: {
  readonly instance: ResendEmailAdapter;
} = {
  get instance(): ResendEmailAdapter {
    if (!_resendInstance) {
      _resendInstance = new ResendEmailAdapter();
    }
    return _resendInstance;
  },
};

/**
 * Create a new adapter instance with custom configuration
 */
export function createResendAdapter(
  apiKey?: string,
  defaultFrom?: string,
  defaultReplyTo?: string,
): ResendEmailAdapter {
  return new ResendEmailAdapter(apiKey, defaultFrom, defaultReplyTo);
}
