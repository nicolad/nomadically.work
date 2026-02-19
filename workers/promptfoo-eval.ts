/**
 * Promptfoo Evaluation Worker
 *
 * Cloudflare Worker for running LLM evaluations using Workers AI and AI Gateway.
 * Supports both native Workers AI binding (when deployed to Cloudflare) and
 * HTTP API fallback (for local dev with wrangler or external calls).
 *
 * Endpoints:
 * - POST /eval - Run an evaluation
 * - GET /health - Health check
 * - GET /models - List available models
 */

import {
  CloudflareWorkersAIProvider,
  CloudflareAIGatewayProvider,
  CLOUDFLARE_AI_MODELS,
  AI_GATEWAY_PROVIDERS,
  type ChatMessage,
} from '../src/promptfoo';

// ============================================================================
// TYPES
// ============================================================================

interface EvalRequest {
  prompt: string;
  provider: {
    type: 'workers-ai' | 'ai-gateway';
    model: string;
    gatewayProvider?: string; // For AI Gateway only
  };
  messages?: ChatMessage[];
  systemPrompt?: string;
  temperature?: number;
  max_tokens?: number;
}

interface EvalResponse {
  output: string;
  model: string;
  provider: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms: number;
  native_binding?: boolean; // Whether native Workers AI binding was used
}

interface Env {
  // Native Workers AI binding — automatically available when deployed to Cloudflare
  // Set via [ai] binding in wrangler.promptfoo.toml; no API key needed at edge
  AI?: Ai;

  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_KEY: string;
  CLOUDFLARE_GATEWAY_ID?: string;
  CF_AIG_TOKEN?: string;

  // Provider API keys for AI Gateway
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GROQ_API_KEY?: string;
}

// ============================================================================
// NATIVE AI BINDING
// ============================================================================

/**
 * Run a chat completion using the native Workers AI binding (env.AI).
 * This is more efficient than HTTP API calls — no auth headers, no network hop.
 * Available only when the worker is deployed to Cloudflare with [ai] binding.
 */
async function runWithNativeBinding(
  ai: Ai,
  model: string,
  messages: ChatMessage[],
  temperature?: number,
  max_tokens?: number,
): Promise<{ output: string; usage?: EvalResponse['usage'] }> {
  const result = await ai.run(model as Parameters<Ai['run']>[0], {
    messages,
    temperature: temperature ?? 0.7,
    max_tokens: max_tokens ?? 1000,
  } as AiTextGenerationInput);

  // Native binding returns { response: string } (non-streaming)
  const output = (result as AiTextGenerationOutput).response ?? '';
  return { output };
}

// ============================================================================
// HELPERS
// ============================================================================

function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function jsonResponse(data: unknown, status = 200, origin?: string) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

function errorResponse(message: string, status = 400, origin?: string) {
  return jsonResponse({ error: message }, status, origin);
}

// ============================================================================
// HANDLERS
// ============================================================================

async function handleEval(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin') || undefined;

  try {
    const body: EvalRequest = await request.json();

    if (!body.prompt && !body.messages) {
      return errorResponse('Either prompt or messages is required', 400, origin);
    }

    if (!body.provider || !body.provider.type || !body.provider.model) {
      return errorResponse('Provider type and model are required', 400, origin);
    }

    const startTime = Date.now();
    let output: string;
    let usage: EvalResponse['usage'] | undefined;
    let nativeBinding = false;

    if (body.provider.type === 'workers-ai') {
      // Build the message list
      const messages: ChatMessage[] = body.messages ?? [];
      if (!body.messages) {
        if (body.systemPrompt) {
          messages.push({ role: 'system', content: body.systemPrompt });
        }
        messages.push({ role: 'user', content: body.prompt });
      }

      if (env.AI) {
        // Prefer native Workers AI binding — fastest path, no API key required
        const result = await runWithNativeBinding(
          env.AI,
          body.provider.model,
          messages,
          body.temperature,
          body.max_tokens,
        );
        output = result.output;
        usage = result.usage;
        nativeBinding = true;
      } else {
        // Fallback: HTTP API (local dev or missing binding)
        if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_KEY) {
          return errorResponse(
            'Workers AI requires either the [ai] native binding or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_KEY secrets',
            500,
            origin,
          );
        }

        const provider = new CloudflareWorkersAIProvider({
          model: body.provider.model,
          accountId: env.CLOUDFLARE_ACCOUNT_ID,
          apiKey: env.CLOUDFLARE_API_KEY,
          temperature: body.temperature,
          max_tokens: body.max_tokens,
        });

        if (body.messages) {
          const response = await provider.chatCompletion(body.messages);
          output = response.choices[0].message.content;
          usage = response.usage;
        } else {
          output = await provider.chat(body.prompt, body.systemPrompt);
        }
      }
    } else if (body.provider.type === 'ai-gateway') {
      // Use AI Gateway
      if (!body.provider.gatewayProvider) {
        return errorResponse('gatewayProvider is required for AI Gateway', 400, origin);
      }

      if (!env.CLOUDFLARE_GATEWAY_ID) {
        return errorResponse('CLOUDFLARE_GATEWAY_ID environment variable is not set', 500, origin);
      }

      if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_KEY) {
        return errorResponse(
          'AI Gateway requires CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_KEY secrets',
          500,
          origin,
        );
      }

      const provider = new CloudflareAIGatewayProvider({
        provider: body.provider.gatewayProvider,
        model: body.provider.model,
        accountId: env.CLOUDFLARE_ACCOUNT_ID,
        gatewayId: env.CLOUDFLARE_GATEWAY_ID,
        cfAigToken: env.CF_AIG_TOKEN,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
      });

      if (body.messages) {
        const response = await provider.chatCompletion(body.messages);
        output = response.choices[0].message.content;
        usage = response.usage;
      } else {
        output = await provider.chat(body.prompt, body.systemPrompt);
      }
    } else {
      return errorResponse('Invalid provider type. Must be "workers-ai" or "ai-gateway"', 400, origin);
    }

    const latency = Date.now() - startTime;

    const result: EvalResponse = {
      output,
      model: body.provider.model,
      provider: body.provider.type === 'workers-ai'
        ? 'Cloudflare Workers AI'
        : `AI Gateway (${body.provider.gatewayProvider})`,
      usage: usage ? {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
      } : undefined,
      latency_ms: latency,
      native_binding: nativeBinding,
    };

    return jsonResponse(result, 200, origin);
  } catch (error) {
    console.error('Evaluation error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500,
      origin,
    );
  }
}

function handleModels(request: Request): Response {
  const origin = request.headers.get('Origin') || undefined;

  const models = {
    'workers-ai': {
      chat: Object.entries(CLOUDFLARE_AI_MODELS)
        .filter(([, model]) => !model.includes('embedding') && !model.includes('bge'))
        .map(([name, model]) => ({ name, model })),
      embedding: Object.entries(CLOUDFLARE_AI_MODELS)
        .filter(([, model]) => model.includes('embedding') || model.includes('bge'))
        .map(([name, model]) => ({ name, model })),
    },
    'ai-gateway': {
      providers: Object.entries(AI_GATEWAY_PROVIDERS).map(([name, value]) => ({
        name,
        id: value,
      })),
    },
  };

  return jsonResponse(models, 200, origin);
}

function handleHealth(): Response {
  return jsonResponse({
    status: 'healthy',
    service: 'promptfoo-eval',
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// MAIN WORKER
// ============================================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || undefined;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(origin),
      });
    }

    // Route requests
    if (url.pathname === '/health' && request.method === 'GET') {
      return handleHealth();
    }

    if (url.pathname === '/models' && request.method === 'GET') {
      return handleModels(request);
    }

    if (url.pathname === '/eval' && request.method === 'POST') {
      return handleEval(request, env);
    }

    return errorResponse('Not found', 404, origin);
  },
};
