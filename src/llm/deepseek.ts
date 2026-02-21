// src/llm/deepseek.ts
import OpenAI from "openai";
import {
  fetchLangfusePrompt,
  compilePrompt,
  defaultCacheTtlSeconds,
  extractPromptConfig,
  ingestLangfuseEvents,
  isLangfuseConfigured,
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

  const client = getDeepSeekClient();

  const traceId = crypto.randomUUID();
  const generationId = crypto.randomUUID();
  const startTime = new Date().toISOString();

  const messages: OpenAI.Chat.CompletionCreateParams["messages"] =
    langfusePrompt.type === "chat"
      ? (compiled as OpenAI.Chat.CompletionCreateParams["messages"])
      : [{ role: "user", content: String(compiled) }];

  if (isLangfuseConfigured()) {
    void ingestLangfuseEvents([
      {
        id: crypto.randomUUID(),
        type: "trace-create",
        body: {
          id: traceId,
          name: "deepseek-generation",
          userId: input.userId,
          sessionId: input.sessionId,
          tags: input.tags ?? [],
        },
      },
      {
        id: crypto.randomUUID(),
        type: "observation-create",
        body: {
          id: generationId,
          traceId,
          type: "GENERATION",
          name: "deepseek-chat",
          model,
          input: messages,
          startTime,
          promptName: langfusePrompt.name,
          promptVersion: langfusePrompt.version,
        },
      },
    ]);
  }

  const res = await client.chat.completions.create({
    model,
    messages,
    max_tokens,
    temperature,
    top_p,
  });

  const output = res.choices?.[0]?.message?.content ?? "";

  if (isLangfuseConfigured()) {
    void ingestLangfuseEvents([
      {
        id: crypto.randomUUID(),
        type: "observation-update",
        body: {
          id: generationId,
          traceId,
          type: "GENERATION",
          output,
          endTime: new Date().toISOString(),
          usage: {
            input: res.usage?.prompt_tokens,
            output: res.usage?.completion_tokens,
            total: res.usage?.total_tokens,
            unit: "TOKENS",
          },
        },
      },
    ]);
  }

  return output;
}
