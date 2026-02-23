/**
 * Dead Letter Queue Consumer — Failed Message Logging
 *
 * Consumes messages from both DLQs (jobs-pipeline-dlq, process-jobs-dlq)
 * that exhausted their retry limits. Logs the failures with full context
 * so they appear in Workers Logs and `wrangler tail`.
 *
 * Without this worker, DLQ messages silently expire after 4 days.
 *
 * @see https://developers.cloudflare.com/queues/configuration/dead-letter-queues/
 */

import { log } from "./lib/logger";

const WORKER = "dlq-consumer";

interface DLQMessageBody {
  jobId?: number;
  traceId?: string;
  action?: string;
  limit?: number;
  [key: string]: unknown;
}

type Message<T = unknown> = {
  readonly body: T;
  readonly timestamp: Date;
  readonly id: string;
  readonly attempts: number;
  ack(): void;
  retry(): void;
};

type MessageBatch<T = unknown> = {
  readonly queue: string;
  readonly messages: Message<T>[];
};

export default {
  async queue(batch: MessageBatch<DLQMessageBody>): Promise<void> {
    for (const msg of batch.messages) {
      log({
        worker: WORKER,
        action: "dlq-message",
        level: "error",
        jobId: msg.body.jobId,
        traceId: msg.body.traceId,
        error: `Message exhausted retries in queue "${batch.queue}"`,
        metadata: {
          queue: batch.queue,
          messageId: msg.id,
          attempts: msg.attempts,
          action: msg.body.action,
          body: msg.body,
        },
      });

      msg.ack();
    }
  },
};
