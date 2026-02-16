// src/llm/deepseek.ts
// Note: @langfuse/openai removed due to zlib dependency (Edge Runtime incompatibility)
// This file is only used in Node.js scripts/trigger tasks
import OpenAI from "openai";
// import { observeOpenAI } from "@langfuse/openai";
// OTel removed - not needed without Langfuse tracing
import {
  fetchLangfusePrompt,
  compilePrompt,
  defaultCacheTtlSeconds,
  extractPromptConfig,
  type CompileInput,
} from "@/langfuse";

export type GenerateInput = {
  promptName: string; // full prompt name in Langfuse
  promptType: "text" | "chat";
  label?: string; // "production" or "prod-a"/"prod-b"
  variables?: Record<string, unknown>;
  placeholders?: Record<string, Array<{ role: string; content: string }>>;

  // tracing metadata
  userId: string; // your user identity
  sessionId: string; // conversation/thread id
  tags?: string[]; // e.g. ["feature:prompt-ui", "tenant:x"]

  // DeepSeek-only knobs (can come from prompt.config too)
  model?: string; // default env DEEPSEEK_MODEL
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
};

function getDeepSeekClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY not set. Please add it to your environment variables.",
    );
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
  });
}

/**
 * Generate text using DeepSeek with full Langfuse tracing.
 * This function:
 * - Fetches the prompt from Langfuse (with caching)
 * - Compiles it with variables/placeholders
 * - Calls DeepSeek API via OpenAI SDK
 * - Links the generation to the prompt version in Langfuse
 * - Captures userId, sessionId, tags for filtering
 */
export async function generateDeepSeekWithLangfuse(
  input: GenerateInput,
): Promise<string> {
  // OTel initialization removed - not needed without Langfuse tracing
  // await initOtel();

  // Fetch prompt with caching
  const langfusePrompt = await fetchLangfusePrompt(input.promptName, {
    type: input.promptType,
    label: input.label,
    cacheTtlSeconds: defaultCacheTtlSeconds(),
    // fallback used only if first fetch fails and no cache exists
    fallback:
      input.promptType === "chat"
        ? [{ role: "system", content: "You are a helpful assistant." }]
        : "You are a helpful assistant.\n\nUser: {{input}}\nAssistant:",
  });

  // Compile with variables and placeholders
  const compileInput: CompileInput = {
    variables: input.variables,
    placeholders: input.placeholders,
  };
  const compiled = compilePrompt(langfusePrompt, compileInput);

  // Extract config from prompt (model params, tools, etc.)
  const cfg = extractPromptConfig(langfusePrompt.config);

  const model =
    input.model ?? cfg.model ?? process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
  const max_tokens = input.max_tokens ?? cfg.max_tokens;
  const temperature = input.temperature ?? cfg.temperature;
  const top_p = input.top_p ?? cfg.top_p;

  // Langfuse tracing disabled - @langfuse/openai removed
  // const traced = observeOpenAI(getDeepSeekClient(), {
  //   langfusePrompt, // <-- links generations to prompt version
  //   generationName: "deepseek-chat", // optional: label the generation type
  //   userId: input.userId,
  //   sessionId: input.sessionId,
  //   tags: input.tags,
  // });
  const traced = getDeepSeekClient();

  if (langfusePrompt.type === "chat") {
    const messages = compiled as OpenAI.Chat.CompletionCreateParams["messages"];
    const res = await traced.chat.completions.create({
      model,
      messages,
      max_tokens,
      temperature,
      top_p,
    });
    return res.choices?.[0]?.message?.content ?? "";
  }

  // text prompt → wrap into a single user message
  const text = String(compiled);
  const res = await traced.chat.completions.create({
    model,
    messages: [{ role: "user", content: text }],
    max_tokens,
    temperature,
    top_p,
  });

  return res.choices?.[0]?.message?.content ?? "";
}
