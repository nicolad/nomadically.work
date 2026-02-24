/**
 * Re-export Resend official types for centralized access
 * @see https://resend.com/docs/api-reference/emails/send-email#body-parameters
 */
export type { Attachment } from "resend";

export type {
  ReceivedEmail,
  ReceivedEmailAttachment,
  ListReceivingEmail,
  ListReceivedEmailsResponse,
} from "./types";

export type {
  SendEmailParams,
  SendEmailResult,
  CancelEmailResult,
} from "./resend-adapter";

export { ResendEmailAdapter, resend, createResendAdapter } from "./resend-adapter";
