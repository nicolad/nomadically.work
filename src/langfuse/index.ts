import { Langfuse } from "langfuse";
import { LangfuseClient } from "@langfuse/client";

import {
  LANGFUSE_BASE_URL,
  LANGFUSE_PUBLIC_KEY,
  LANGFUSE_SECRET_KEY,
} from "@/config/env";

const langfuse = new Langfuse({
  secretKey: LANGFUSE_SECRET_KEY,
  publicKey: LANGFUSE_PUBLIC_KEY,
  baseUrl: LANGFUSE_BASE_URL,
});

const langfuseClient = new LangfuseClient({
  secretKey: LANGFUSE_SECRET_KEY,
  publicKey: LANGFUSE_PUBLIC_KEY,
  baseUrl: LANGFUSE_BASE_URL,
});

type PromptFetchOptions = {
  version?: number;
  label?: string;
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

export async function fetchLangfusePrompt(
  name: string,
  options: PromptFetchOptions = {},
) {
  const { version, label } = options;

  if (label) {
    return langfuse.getPrompt(name, undefined, { label });
  }

  if (version) {
    return langfuse.getPrompt(name, version);
  }

  return langfuse.getPrompt(name);
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
  const userTag = userEmail ? `user:${userEmail}` : null;
  const url = new URL(`${LANGFUSE_BASE_URL}/api/public/v2/prompts`);

  if (userTag) {
    url.searchParams.set("tag", userTag);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`,
      ).toString("base64")}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Langfuse API error: ${response.statusText}`);
  }

  return response.json();
}

export async function createLangfusePrompt(promptData: any) {
  await langfuseClient.prompt.create(promptData);

  return langfuse.getPrompt(promptData.name);
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
