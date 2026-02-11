// instrumentation.ts
import { initOtel } from "./src/otel/initOtel";

/**
 * Next.js instrumentation hook.
 * This runs once when the server starts, before any route handlers.
 * Perfect for initializing OpenTelemetry for Langfuse tracing.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await initOtel();
  }
}
