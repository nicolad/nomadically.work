/**
 * Structured logging utility for Cloudflare Workers
 *
 * Outputs JSON logs that are automatically indexed by CF Workers Logs
 * Query Builder, enabling filtering by worker, action, level, jobId, traceId, etc.
 *
 * @see https://developers.cloudflare.com/workers/observability/logs/workers-logs/
 */

export interface WorkerLog {
  worker: string;
  action: string;
  level: "info" | "warn" | "error";
  jobId?: number;
  traceId?: string;
  sourceId?: number;
  duration_ms?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export function log(entry: WorkerLog): void {
  const output = { ...entry, timestamp: new Date().toISOString() };
  if (entry.level === "error") {
    console.error(JSON.stringify(output));
  } else {
    console.log(JSON.stringify(output));
  }
}

export function generateTraceId(): string {
  return crypto.randomUUID();
}
