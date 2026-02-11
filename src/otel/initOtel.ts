// src/otel/initOtel.ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

let started = false;

/**
 * Initialize OpenTelemetry with Langfuse span processor.
 * MUST be called before any Langfuse OpenAI tracing.
 * Safe to call multiple times (will only initialize once).
 */
export async function initOtel() {
  if (started) return;

  const sdk = new NodeSDK({
    spanProcessors: [new LangfuseSpanProcessor()],
  });

  await sdk.start();
  started = true;
}
