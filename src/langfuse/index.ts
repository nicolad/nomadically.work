// Note: LangfuseClient SDK is Node.js only and not compatible with Edge Runtime.
// We use direct fetch API calls instead for universal compatibility.
// import { LangfuseClient } from "@langfuse/client";

import {
  LANGFUSE_BASE_URL,
  LANGFUSE_PUBLIC_KEY,
  LANGFUSE_SECRET_KEY,
} from "@/config/env";

/**
 * Check if Langfuse is configured
 */
export function isLangfuseConfigured(): boolean {
  return !!(LANGFUSE_BASE_URL && LANGFUSE_PUBLIC_KEY && LANGFUSE_SECRET_KEY);
}

/**
 * Throw error if Langfuse is not configured
 */
function requireLangfuse(): void {
  if (!isLangfuseConfigured()) {
    throw new Error(
      "Langfuse is not configured. " +
      "Set LANGFUSE_BASE_URL, LANGFUSE_PUBLIC_KEY, and LANGFUSE_SECRET_KEY in .env.local to enable observability."
    );
  }
}

// Deprecated: Use fetch-based API calls instead for Edge Runtime compatibility
// let singleton: LangfuseClient | null = null;

/**
 * Deprecated: LangfuseClient is not compatible with Edge Runtime.
 * Use direct fetch API calls instead (fetchLangfusePrompt, createLangfusePrompt, etc.)
 */
/*
export function getLangfuseClient(): LangfuseClient {
  if (!singleton) {
    singleton = new LangfuseClient({
      secretKey: LANGFUSE_SECRET_KEY,
      publicKey: LANGFUSE_PUBLIC_KEY,
      baseUrl: LANGFUSE_BASE_URL,
    });
  }
  return singleton;
}
*/

type PromptFetchOptions = {
  type?: "text" | "chat";
  version?: number;
  label?: string;
  cacheTtlSeconds?: number;
  fallback?: string | Array<{ role: string; content: string }>;
};

export type ChatMessage =
  | { role: string; content: string }
  | { type: "placeholder"; name: string };

export type CompileInput = {
  variables?: Record<string, unknown>;
  placeholders?: Record<string, Array<{ role: string; content: string }>>;
};

// Common DeepSeek-focused prompt config fields. Config is arbitrary JSON, so keep this loose.
export type PromptConfig = {
  model?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  response_format?: unknown;
  tools?: unknown[];
  tool_choice?: unknown;
  stop?: string[];
} & Record<string, unknown>;

export const DEFAULT_DEEPSEEK_MODEL = "deepseek/deepseek-chat";

/**
 * Convert user ID/email to a safe folder-style prompt name.
 * Example: "users/alice-example-com/my-prompt"
 * This gives clean organization in Langfuse UI.
 */
export function toUserPromptName(
  userIdOrEmail: string,
  shortName: string,
): string {
  const safe = userIdOrEmail
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, "-")
    .replace(/@/g, "-at-");
  return `users/${safe}/${shortName}`;
}

/**
 * Assert that the current user has access to this prompt.
 * Throws if access is denied.
 */
export function assertPromptAccess(
  promptName: string,
  userIdOrEmail: string,
  allowedSharedPrefixes: string[] = ["shared/", "public/"],
) {
  const userPrefix = toUserPromptName(userIdOrEmail, "").replace(/\/$/, "");
  const isUserOwned = promptName.startsWith(userPrefix + "/");
  const isShared = allowedSharedPrefixes.some((p) => promptName.startsWith(p));

  if (!isUserOwned && !isShared) {
    throw new Error(`Access denied to prompt: ${promptName}`);
  }
}

/**
 * Compile a prompt with variables and placeholders.
 * Supports both text and chat prompts.
 */
export function compilePrompt(prompt: any, input: CompileInput = {}) {
  const vars = input.variables ?? {};
  const placeholders = input.placeholders;

  // Message placeholders are compiled via compile(vars, placeholders) for chat prompts
  if (placeholders) return prompt.compile(vars, placeholders);
  return prompt.compile(vars);
}

/**
 * Fetch a prompt from Langfuse with caching and fallback support.
 * Uses Langfuse REST API for Edge Runtime compatibility.
 */
export async function fetchLangfusePrompt(
  name: string,
  options: PromptFetchOptions = {},
) {
  const baseUrl = LANGFUSE_BASE_URL.replace(/\/+$/, "");
  const url = new URL(`${baseUrl}/api/public/prompts/${encodeURIComponent(name)}`);

  if (options.version !== undefined) {
    url.searchParams.set("version", String(options.version));
  }
  if (options.label) {
    url.searchParams.set("label", options.label);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${btoa(
        `${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`,
      )}`,
    },
  });

  if (!response.ok) {
    // If fallback is provided and request failed, return fallback
    if (options.fallback !== undefined) {
      return {
        name,
        version: options.version ?? 1,
        type: options.type ?? "text",
        prompt: options.fallback,
        labels: [],
        tags: [],
      };
    }
    throw new Error(`Langfuse API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Default cache TTL: 300s in production, 0 in development for instant updates.
 */
export function defaultCacheTtlSeconds(): number {
  return process.env.NODE_ENV === "production" ? 300 : 0;
}

/**
 * Prewarm prompts on startup for guaranteed availability.
 * Call this in your server bootstrap to cache critical prompts.
 */
export async function prewarmPrompts(names: string[]) {
  await Promise.all(names.map((n) => fetchLangfusePrompt(n)));
}

/**
 * Deterministic A/B routing using labels like "prod-a" / "prod-b".
 * Hash-based routing ensures sticky assignment per user/session.
 * Uses Web Crypto API for Edge Runtime compatibility.
 */
async function hashToUnit(seed: string): Promise<number> {
  const encoder = new TextEncoder();
  const data = encoder.encode(seed);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  // Return value between 0 and 1
  const num = (hashArray[0] << 24) | (hashArray[1] << 16) | (hashArray[2] << 8) | hashArray[3];
  return num / 0xffffffff;
}

export async function pickAbLabel(params: {
  seed: string; // stable userId/sessionId
  labelA: string; // "prod-a"
  labelB: string; // "prod-b"
  splitA?: number; // default 0.5
}): Promise<string> {
  const u = await hashToUnit(params.seed);
  return u < (params.splitA ?? 0.5) ? params.labelA : params.labelB;
}

const isNumber = (value: unknown): value is number => typeof value === "number";
const isDeepseekModel = (model?: string) =>
  !!model && (model.startsWith("deepseek/") || model.startsWith("deepseek-"));

export function extractPromptConfig(config: unknown): PromptConfig {
  if (!config || typeof config !== "object") {
    return { model: DEFAULT_DEEPSEEK_MODEL };
  }

  const cfg = config as Record<string, unknown>;
  const requestedModel = typeof cfg.model === "string" ? cfg.model : undefined;
  const model = isDeepseekModel(requestedModel)
    ? requestedModel
    : DEFAULT_DEEPSEEK_MODEL;

  const promptConfig: PromptConfig = {
    model,
    temperature: isNumber(cfg.temperature) ? cfg.temperature : undefined,
    top_p: isNumber(cfg.top_p) ? cfg.top_p : undefined,
    max_tokens: isNumber(cfg.max_tokens) ? cfg.max_tokens : undefined,
    presence_penalty: isNumber(cfg.presence_penalty)
      ? cfg.presence_penalty
      : undefined,
    frequency_penalty: isNumber(cfg.frequency_penalty)
      ? cfg.frequency_penalty
      : undefined,
    response_format: cfg.response_format,
    tools: Array.isArray(cfg.tools) ? cfg.tools : undefined,
    tool_choice: cfg.tool_choice,
    stop: Array.isArray(cfg.stop) ? (cfg.stop as string[]) : undefined,
  };

  // Preserve any additional custom config keys without altering them
  return { ...cfg, ...promptConfig } as PromptConfig;
}

export async function listLangfusePrompts(userEmail?: string) {
  requireLangfuse();

  const userTag = userEmail ? `user:${userEmail}` : null;
  const url = new URL(`${LANGFUSE_BASE_URL!}/api/public/v2/prompts`);

  if (userTag) {
    url.searchParams.set("tag", userTag);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${btoa(
        `${LANGFUSE_PUBLIC_KEY!}:${LANGFUSE_SECRET_KEY!}`,
      )}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Langfuse API error: ${response.statusText}`);
  }

  return response.json();
}

export async function createLangfusePrompt(promptData: any) {
  requireLangfuse();

  const baseUrl = LANGFUSE_BASE_URL!.replace(/\/+$/, "");
  const url = new URL(`${baseUrl}/api/public/prompts`);

  // Create the prompt
  const createResponse = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(
        `${LANGFUSE_PUBLIC_KEY!}:${LANGFUSE_SECRET_KEY!}`,
      )}`,
    },
    body: JSON.stringify(promptData),
  });

  if (!createResponse.ok) {
    throw new Error(`Langfuse API error: ${createResponse.status} ${createResponse.statusText}`);
  }

  // Fetch the created prompt to get full details with version
  return fetchLangfusePrompt(promptData.name);
}

// Prompt composability: parse references to other prompts
// Format: @@@langfusePrompt:name=PromptName|version=1@@@
// Or with label: @@@langfusePrompt:name=PromptName|label=production@@@
const PROMPT_REFERENCE_REGEX =
  /@@@langfusePrompt:name=([^|@]+)(?:\|version=(\d+))?(?:\|label=([^@]+))?@@@/g;

interface PromptReference {
  fullMatch: string;
  name: string;
  version?: number;
  label?: string;
}

/**
 * Helper function to create a prompt reference string.
 * Use this to compose prompts by referencing other prompts.
 *
 * @example
 * const systemInstructions = composePromptRef("system-instructions", { label: "production" });
 * // Returns: "@@@langfusePrompt:name=system-instructions|label=production@@@"
 */
export function composePromptRef(
  name: string,
  options: { version?: number; label?: string } = {},
): string {
  let ref = `@@@langfusePrompt:name=${name}`;

  if (options.version !== undefined) {
    ref += `|version=${options.version}`;
  }

  if (options.label) {
    ref += `|label=${options.label}`;
  }

  ref += "@@@";
  return ref;
}

function parsePromptReferences(text: string): PromptReference[] {
  const references: PromptReference[] = [];
  let match: RegExpExecArray | null;

  while ((match = PROMPT_REFERENCE_REGEX.exec(text)) !== null) {
    references.push({
      fullMatch: match[0],
      name: match[1],
      version: match[2] ? parseInt(match[2], 10) : undefined,
      label: match[3],
    });
  }

  return references;
}

/**
 * Recursively resolves prompt references in a prompt's content.
 * Handles both text and chat prompts.
 * Prevents infinite recursion by tracking visited prompts.
 */
// ---------------------------------------------------------------------------
// Batch ingestion (traces + generations) — Edge Runtime compatible
// Uses POST /api/public/ingestion with fire-and-forget error handling.
// ---------------------------------------------------------------------------

type LangfuseEvent =
  | { id: string; type: "trace-create"; body: Record<string, unknown> }
  | { id: string; type: "observation-create"; body: Record<string, unknown> }
  | { id: string; type: "observation-update"; body: Record<string, unknown> };

/**
 * Send a batch of trace/observation events to Langfuse.
 * Fire-and-forget: never throws, only warns on failure.
 */
export async function ingestLangfuseEvents(
  events: LangfuseEvent[],
): Promise<void> {
  if (!isLangfuseConfigured()) return;
  const baseUrl = LANGFUSE_BASE_URL.replace(/\/+$/, "");
  try {
    const res = await fetch(`${baseUrl}/api/public/ingestion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`)}`,
      },
      body: JSON.stringify({ batch: events }),
    });
    if (!res.ok) {
      console.warn(`[langfuse] ingestion failed: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.warn("[langfuse] ingestion error:", err);
  }
}

export async function resolveComposedPrompt(
  prompt: any,
  visited: Set<string> = new Set(),
): Promise<any> {
  const promptKey = `${prompt.name}:${prompt.version}`;

  if (visited.has(promptKey)) {
    throw new Error(
      `Circular prompt reference detected: ${promptKey} has already been resolved`,
    );
  }

  visited.add(promptKey);

  if (prompt.type === "text") {
    // For text prompts, resolve references in the prompt string
    const text = prompt.prompt || "";
    const references = parsePromptReferences(text);

    if (references.length === 0) {
      return prompt;
    }

    let resolvedText = text;

    for (const ref of references) {
      const referencedPrompt = await fetchLangfusePrompt(ref.name, {
        version: ref.version,
        label: ref.label,
      });

      // Recursively resolve the referenced prompt
      const resolvedRef = await resolveComposedPrompt(
        referencedPrompt,
        visited,
      );

      // Replace the reference with the resolved content
      if (resolvedRef.type === "text") {
        resolvedText = resolvedText.replace(ref.fullMatch, resolvedRef.prompt);
      } else {
        // If referenced prompt is chat, stringify it as a fallback
        resolvedText = resolvedText.replace(
          ref.fullMatch,
          JSON.stringify(resolvedRef.prompt),
        );
      }
    }

    return {
      ...prompt,
      prompt: resolvedText,
    };
  } else if (prompt.type === "chat") {
    // For chat prompts, resolve references in each message content
    const messages = prompt.prompt || [];
    const resolvedMessages = await Promise.all(
      messages.map(async (msg: any) => {
        if (typeof msg.content !== "string") {
          return msg;
        }

        const references = parsePromptReferences(msg.content);

        if (references.length === 0) {
          return msg;
        }

        let resolvedContent = msg.content;

        for (const ref of references) {
          const referencedPrompt = await fetchLangfusePrompt(ref.name, {
            version: ref.version,
            label: ref.label,
          });

          const resolvedRef = await resolveComposedPrompt(
            referencedPrompt,
            visited,
          );

          if (resolvedRef.type === "text") {
            resolvedContent = resolvedContent.replace(
              ref.fullMatch,
              resolvedRef.prompt,
            );
          } else {
            // If referenced prompt is chat, stringify it as a fallback
            resolvedContent = resolvedContent.replace(
              ref.fullMatch,
              JSON.stringify(resolvedRef.prompt),
            );
          }
        }

        return {
          ...msg,
          content: resolvedContent,
        };
      }),
    );

    return {
      ...prompt,
      prompt: resolvedMessages,
    };
  }

  return prompt;
}
