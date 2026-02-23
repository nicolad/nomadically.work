/**
 * Tail Worker — Centralized Error Logging
 *
 * Attached to all producer workers via [[tail_consumers]] in their wrangler configs.
 * Receives every log event and exception from all workers, filters for errors,
 * and re-emits them as structured logs visible in Workers Logs / `wrangler tail`.
 *
 * @see https://developers.cloudflare.com/workers/observability/logs/tail-workers/
 */

interface TailEvent {
  readonly scriptName: string;
  readonly outcome: string;
  readonly eventTimestamp: number;
  readonly event:
    | { readonly request?: { readonly url: string; readonly method: string } }
    | { readonly cron?: string; readonly scheduledTime?: number }
    | Record<string, unknown>;
  readonly logs: ReadonlyArray<{
    readonly message: readonly unknown[];
    readonly level: string;
    readonly timestamp: number;
  }>;
  readonly exceptions: ReadonlyArray<{
    readonly name: string;
    readonly message: string;
    readonly timestamp: number;
  }>;
}

interface ErrorEntry {
  worker: string;
  error: string;
  timestamp: number;
  context?: string;
}

function parseStructuredLog(message: readonly unknown[]): {
  level?: string;
  error?: string;
  worker?: string;
  action?: string;
  traceId?: string;
} | null {
  if (message.length === 0) return null;
  const first = message[0];
  if (typeof first !== "string") return null;

  try {
    const parsed = JSON.parse(first);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
  } catch {
    // Not JSON — unstructured log
  }
  return null;
}

export default {
  async tail(events: TailEvent[]): Promise<void> {
    for (const event of events) {
      const errors: ErrorEntry[] = [];

      // Collect uncaught exceptions
      for (const ex of event.exceptions) {
        errors.push({
          worker: event.scriptName,
          error: `${ex.name}: ${ex.message}`,
          timestamp: ex.timestamp,
        });
      }

      // Collect error-level logs
      for (const logEntry of event.logs) {
        if (logEntry.level !== "error") continue;

        const structured = parseStructuredLog(logEntry.message);
        if (structured?.error) {
          errors.push({
            worker: structured.worker || event.scriptName,
            error: structured.error,
            timestamp: logEntry.timestamp,
            context: structured.action
              ? `${structured.action}${structured.traceId ? ` trace:${structured.traceId.slice(0, 8)}` : ""}`
              : undefined,
          });
        } else {
          const msg = logEntry.message.map(String).join(" ");
          errors.push({
            worker: event.scriptName,
            error: msg.slice(0, 500),
            timestamp: logEntry.timestamp,
          });
        }
      }

      // Flag failed outcomes without explicit error logs
      if (event.outcome === "exception" && errors.length === 0) {
        errors.push({
          worker: event.scriptName,
          error: `Worker exited with outcome: ${event.outcome}`,
          timestamp: event.eventTimestamp,
        });
      }

      // Re-emit as structured error logs — visible in `wrangler tail observability-tail`
      // and in Workers Logs dashboard with full query/filter support
      if (errors.length > 0) {
        console.error(
          JSON.stringify({
            worker: "observability-tail",
            action: "error-aggregate",
            level: "error",
            source: event.scriptName,
            outcome: event.outcome,
            errorCount: errors.length,
            errors: errors.slice(0, 10),
            timestamp: new Date().toISOString(),
          })
        );
      }
    }
  },
};
