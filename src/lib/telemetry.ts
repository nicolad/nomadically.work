/**
 * Shared telemetry configuration for Vercel AI SDK calls.
 *
 * Pass the return value as `experimental_telemetry` to generateText/generateObject
 * so every LLM call is automatically traced in Langfuse via the OTel span processor
 * registered in instrumentation.ts.
 */

type TelemetryConfig = {
  isEnabled: true;
  functionId: string;
  metadata: Record<string, string>;
};

/**
 * Build an `experimental_telemetry` config object for a Vercel AI SDK call.
 *
 * @param functionId - stable identifier for this call site (e.g. "classify-remote-eu")
 * @param extra - optional extra metadata to attach to the trace
 */
export function aiTelemetry(
  functionId: string,
  extra?: Record<string, string>,
): TelemetryConfig {
  return {
    isEnabled: true,
    functionId,
    metadata: {
      environment: process.env.NODE_ENV ?? "development",
      ...extra,
    },
  };
}
