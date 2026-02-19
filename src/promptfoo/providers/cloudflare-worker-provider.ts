// src/promptfoo/providers/cloudflare-worker-provider.ts
//
// Promptfoo provider that routes LLM calls through the deployed
// promptfoo-eval Cloudflare Worker (workers/promptfoo-eval.ts).
//
// This lets you run evals using any Cloudflare Workers AI model without
// needing a Cloudflare API key locally — the worker handles auth at the edge.
//
// Usage in promptfooconfig.yaml:
//   providers:
//     - id: file://./providers/cloudflare-worker-provider.ts
//       label: cf-llama-3.3-70b
//
// Required env vars:
//   PROMPTFOO_WORKER_URL - URL of the deployed promptfoo-eval worker
//                          e.g. https://nomadically-promptfoo-eval.<sub>.workers.dev
//
// Optional test vars (override per test):
//   cf_model     - Workers AI model name  (default: @cf/meta/llama-3.3-70b-instruct-fp8-fast)
//   cf_type      - "workers-ai" | "ai-gateway"  (default: workers-ai)
//   temperature  - float 0-1  (default: 0.1)
//   max_tokens   - int  (default: 8000)

import "dotenv/config";
import { CLOUDFLARE_AI_MODELS } from "../constants";

interface WorkerEvalRequest {
  prompt: string;
  provider: {
    type: "workers-ai" | "ai-gateway";
    model: string;
    gatewayProvider?: string;
  };
  temperature?: number;
  max_tokens?: number;
}

interface WorkerEvalResponse {
  output: string;
  model: string;
  provider: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms: number;
  native_binding?: boolean;
}

class CloudflareWorkerProvider {
  id() {
    return "cloudflare-worker";
  }

  async callApi(
    prompt: string,
    context: { vars?: Record<string, unknown> },
  ): Promise<{ output: string; tokenUsage?: { prompt: number; completion: number; total: number } }> {
    const vars = context?.vars ?? {};

    const workerUrl = process.env.PROMPTFOO_WORKER_URL;
    if (!workerUrl) {
      throw new Error(
        "PROMPTFOO_WORKER_URL is not set. " +
          "Deploy the promptfoo-eval worker (pnpm deploy:promptfoo) and set the URL.",
      );
    }

    const model = String(
      vars.cf_model ?? CLOUDFLARE_AI_MODELS.LLAMA_3_3_70B_FAST,
    );
    const providerType = (vars.cf_type ?? "workers-ai") as
      | "workers-ai"
      | "ai-gateway";
    const temperature = Number(vars.temperature ?? 0.1);
    const max_tokens = Number(vars.max_tokens ?? 8000);

    const body: WorkerEvalRequest = {
      prompt,
      provider: { type: providerType, model },
      temperature,
      max_tokens,
    };

    console.log(
      `☁️  CloudflareWorkerProvider → ${workerUrl}/eval  model=${model}`,
    );

    const response = await fetch(`${workerUrl}/eval`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      throw new Error(
        `Cloudflare Worker eval failed: ${response.status} ${errText}`,
      );
    }

    const result: WorkerEvalResponse = await response.json();

    console.log(
      `✅ CloudflareWorkerProvider: ${result.latency_ms}ms` +
        (result.native_binding ? " (native binding)" : " (HTTP API)"),
    );

    return {
      output: result.output,
      tokenUsage: result.usage
        ? {
            prompt: result.usage.prompt_tokens,
            completion: result.usage.completion_tokens,
            total: result.usage.total_tokens,
          }
        : undefined,
    };
  }
}

export default CloudflareWorkerProvider;
