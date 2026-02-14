/**
 * Brave Answers API Client
 *
 * Direct AI-generated answers using OpenAI-compatible endpoint
 * Perfect for chat interfaces and conversational AI
 *
 * @see https://api.search.brave.com/app/documentation/answers
 */

import { BRAVE_API_ENDPOINTS, ERROR_MESSAGES, HTTP_HEADERS, ANSWERS_DEFAULTS, STREAMING } from './constants';

export interface BraveAnswersMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface BraveAnswersParams {
  /** Conversation messages (OpenAI format) */
  messages: BraveAnswersMessage[];

  /** Model selection */
  model?: "brave-search-fallback" | "brave-search";

  /** Temperature (0-2, default 0.7) */
  temperature?: number;

  /** Max tokens in response */
  max_tokens?: number;

  /** Enable streaming responses */
  stream?: boolean;

  /** Top-p sampling */
  top_p?: number;

  /** Stop sequences */
  stop?: string | string[];
}

export interface BraveAnswersResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string;
    };
    finish_reason: "stop" | "length";
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface BraveAnswersStreamChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
      role?: "assistant";
    };
    finish_reason?: "stop" | "length";
  }>;
}

/**
 * Get AI-generated answers (non-streaming)
 */
export async function getAnswers(
  params: BraveAnswersParams,
  apiKey?: string,
): Promise<BraveAnswersResponse> {
  const key = apiKey || process.env.BRAVE_API_KEY;

  if (!key) {
    throw new Error("Brave API key required");
  }

  const response = await fetch(
    BRAVE_API_ENDPOINTS.ANSWERS,
    {
      method: "POST",
      headers: {
        Accept: HTTP_HEADERS.ACCEPT_JSON,
        "Content-Type": HTTP_HEADERS.CONTENT_TYPE_JSON,
        [HTTP_HEADERS.SUBSCRIPTION_TOKEN]: key,
      },
      body: JSON.stringify({
        model: params.model || ANSWERS_DEFAULTS.MODEL,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
        stop: params.stop,
        stream: false,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Brave Answers API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Get streaming AI-generated answers
 */
export async function* getAnswersStream(
  params: BraveAnswersParams,
  apiKey?: string,
): AsyncGenerator<BraveAnswersStreamChunk> {
  const key = apiKey || process.env.BRAVE_API_KEY;

  if (!key) {
    throw new Error("Brave API key required");
  }

  const response = await fetch(
    BRAVE_API_ENDPOINTS.ANSWERS,
    {
      method: "POST",
      headers: {
        Accept: HTTP_HEADERS.ACCEPT_STREAM,
        "Content-Type": HTTP_HEADERS.CONTENT_TYPE_JSON,
        [HTTP_HEADERS.SUBSCRIPTION_TOKEN]: key,
      },
      body: JSON.stringify({
        model: params.model || ANSWERS_DEFAULTS.MODEL,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
        stop: params.stop,
        stream: true,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Brave Answers API error: ${response.status} - ${error}`);
  }

  if (!response.body) {
    throw new Error(ERROR_MESSAGES.NO_RESPONSE_BODY);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith(STREAMING.DATA_PREFIX)) {
        const data = line.slice(STREAMING.DATA_PREFIX.length);

        if (data === STREAMING.DONE_MESSAGE) {
          return;
        }

        try {
          const chunk: BraveAnswersStreamChunk = JSON.parse(data);
          yield chunk;
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
}

/**
 * Simple question-answering helper
 */
export async function askQuestion(
  question: string,
  context?: { systemPrompt?: string; previousMessages?: BraveAnswersMessage[] },
  apiKey?: string,
): Promise<string> {
  const messages: BraveAnswersMessage[] = [];

  if (context?.systemPrompt) {
    messages.push({
      role: "system",
      content: context.systemPrompt,
    });
  }

  if (context?.previousMessages) {
    messages.push(...context.previousMessages);
  }

  messages.push({
    role: "user",
    content: question,
  });

  const response = await getAnswers({ messages }, apiKey);

  return response.choices[0].message.content;
}
