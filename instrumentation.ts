import { LangfuseSpanProcessor, type ShouldExportSpan } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

export async function register() {
  // Guard: skip if Langfuse is not configured
  if (
    !process.env.LANGFUSE_PUBLIC_KEY ||
    !process.env.LANGFUSE_SECRET_KEY ||
    !process.env.LANGFUSE_BASE_URL
  ) {
    console.warn(
      "[instrumentation] Langfuse env vars missing — OTel tracing disabled",
    );
    return;
  }

  // Filter out Next.js infrastructure spans — only export AI SDK spans
  const shouldExportSpan: ShouldExportSpan = (span) => {
    return span.otelSpan.instrumentationScope.name !== "next.js";
  };

  const spanProcessor = new LangfuseSpanProcessor({ shouldExportSpan });

  const provider = new NodeTracerProvider({
    spanProcessors: [spanProcessor],
  });

  provider.register();

  // Flush pending spans on shutdown
  process.on("SIGTERM", async () => {
    await provider.shutdown();
  });
}
