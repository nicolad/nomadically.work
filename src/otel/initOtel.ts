// src/otel/initOtel.ts
// Note: @langfuse/otel removed due to zlib dependency (Edge Runtime incompatibility)
// This file is only used in Node.js scripts/trigger tasks
import { NodeSDK } from "@opentelemetry/sdk-node";
// import { LangfuseSpanProcessor } from "@langfuse/otel";

let started = false;

/**
 * Initialize OpenTelemetry with Langfuse span processor.
 * MUST be called before any Langfuse OpenAI tracing.
 * Safe to call multiple times (will only initialize once).
 * 
 * Note: Langfuse span processor disabled - @langfuse/otel removed
 */
export async function initOtel() {
  if (started) return;

  // Langfuse span processor disabled
  // const sdk = new NodeSDK({
  //   spanProcessors: [new LangfuseSpanProcessor()],
  // });

  // await sdk.start();
  started = true;
  console.warn('⚠️  OTel initialization disabled - Langfuse packages removed');
}
