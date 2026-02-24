/**
 * Resend API type definitions
 * Based on official Resend API documentation
 */

/**
 * Received email from Resend receiving API (list endpoint)
 */
export interface ListReceivingEmail {
  id: string;
  to: string[];
  from: string;
  created_at: string;
  subject: string;
}

/**
 * Received email attachment from Resend API
 * Matches Resend's actual API response for received email attachments
 */
export interface ReceivedEmailAttachment {
  id: string;
  filename: string;
  size: number;
  content_type: string;
  content_id: string;
  content_disposition: string;
}

/**
 * Received email from Resend receiving API (get endpoint)
 */
export interface ReceivedEmail {
  object: string;
  id: string;
  to: string[];
  from: string;
  created_at: string;
  subject: string;
  html: string | null;
  text: string | null;
  headers?: Record<string, string>;
  bcc?: string[] | null;
  cc?: string[] | null;
  reply_to?: string[] | null;
  message_id?: string | null;
  attachments?: ReceivedEmailAttachment[];
}

/**
 * Resend list received emails response
 */
export interface ListReceivedEmailsResponse {
  data: ListReceivingEmail[];
  has_more: boolean;
}
