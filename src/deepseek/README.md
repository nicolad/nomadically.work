# DeepSeek API Client

Direct API implementation for DeepSeek without SDK dependencies. Uses OpenAI-compatible API format with native `fetch`.

## Features

- ✅ **Direct API calls** - No SDK dependencies, pure `fetch`
- ✅ **OpenAI-compatible** - Works with existing OpenAI-style code
- ✅ **Streaming support** - Async generators for real-time responses
- ✅ **TypeScript** - Full type safety
- ✅ **Automatic retries** - Handles rate limits and transient errors
- ✅ **Tool calling** - Function calling support
- ✅ **JSON mode** - Structured output
- ✅ **Context caching** - Token usage optimization
- ✅ **Beta features** - Chat prefix completion & FIM (Fill In the Middle)

## Quick Start

```typescript
import { createDeepSeekClient, DEEPSEEK_MODELS } from "@/deepseek";

const client = createDeepSeekClient({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// Simple completion
const response = await client.chatCompletion("What is 2+2?");
console.log(response); // "4"

// Full chat API
const completion = await client.chat({
  model: DEEPSEEK_MODELS.CHAT,
  messages: [
    { role: "system", content: "You are a math tutor." },
    { role: "user", content: "Explain calculus in simple terms." },
  ],
  temperature: 0.7,
  max_tokens: 500,
});

console.log(completion.choices[0].message.content);
```

## Streaming

```typescript
for await (const chunk of client.chatStream({
  model: DEEPSEEK_MODELS.CHAT,
  messages: [{ role: "user", content: "Tell me a story." }],
})) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

## Models

- **`deepseek-chat`** - DeepSeek-V3.2 non-thinking mode (128K context)
- **`deepseek-reasoner`** - DeepSeek-V3.2 thinking mode with chain-of-thought

## Configuration

```typescript
const client = createDeepSeekClient({
  apiKey: "sk-...", // Required (or set DEEPSEEK_API_KEY)
  baseURL: "https://api.deepseek.com", // Optional
  maxRetries: 3, // Optional (default: 3)
  timeout: 60000, // Optional (default: 60s)
  defaultModel: "deepseek-chat", // Optional
});
```

## Advanced Usage

### Tool Calling

```typescript
const response = await client.chat({
  model: DEEPSEEK_MODELS.CHAT,
  messages: [{ role: "user", content: "What is the weather in Paris?" }],
  tools: [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Get weather for a location",
        parameters: {
          type: "object",
          properties: {
            location: { type: "string" },
          },
          required: ["location"],
        },
      },
    },
  ],
});

const toolCall = response.choices[0].message.tool_calls?.[0];
console.log(toolCall?.function.name); // "get_weather"
console.log(toolCall?.function.arguments); // '{"location":"Paris"}'
```

### JSON Mode

```typescript
const response = await client.chat({
  model: DEEPSEEK_MODELS.CHAT,
  messages: [{ role: "user", content: "List 3 colors in JSON format" }],
  response_format: { type: "json_object" },
});

const json = JSON.parse(response.choices[0].message.content);
console.log(json); // { colors: ["red", "blue", "green"] }
```

### Reasoning Mode

```typescript
const response = await client.chat({
  model: DEEPSEEK_MODELS.REASONER,
  messages: [
    {
      role: "user",
      content:
        "Solve: If a train travels at 60mph for 2.5 hours, how far does it go?",
    },
  ],
});

// DeepSeek-R1 will show its reasoning process
console.log(response.choices[0].message.content);
```

## Beta Features

Beta features require setting `useBeta: true` in the client config or using `baseURL: 'https://api.deepseek.com/beta'`.

### Chat Prefix Completion (Beta)

Force the model to complete a message starting with a specific prefix. Useful for constraining output format.

````typescript
// Enable beta features
const client = createDeepSeekClient({
  useBeta: true,
});

// Force Python code output
const response = await client.chat({
  model: DEEPSEEK_MODELS.CHAT,
  messages: [
    { role: "user", content: "Please write quick sort code" },
    { role: "assistant", content: "```python\n", prefix: true },
  ],
  stop: ["```"],
});

console.log(response.choices[0].message.content);
// Output will be Python code without markdown wrapper
````

### FIM Completion (Fill In the Middle) (Beta)

Complete code or text between a prefix and suffix. Perfect for code completion, autocomplete features.

```typescript
const client = createDeepSeekClient({
  useBeta: true,
});

// Complete a Fibonacci function
const response = await client.fimCompletion({
  model: DEEPSEEK_MODELS.CHAT,
  prompt: "def fib(a):",
  suffix: "    return fib(a-1) + fib(a-2)",
  max_tokens: 128,
});

console.log(response.choices[0].text);
// Output: middle part of the function (base case, etc.)
```

**FIM Streaming:**

```typescript
for await (const chunk of client.fimCompletionStream({
  prompt: "function calculateTotal(",
  suffix: ") { return total; }",
  max_tokens: 128,
})) {
  const text = chunk.choices[0]?.text;
  if (text) {
    process.stdout.write(text);
  }
}
```

**Note:** FIM completion has a max_tokens limit of 4K.

## API Reference

### `createDeepSeekClient(config?)`

Creates a new DeepSeek client instance.

**Config options:**

- `apiKey?: string` - API key (or set DEEPSEEK_API_KEY env var)
- `baseURL?: string` - Custom base URL
- `useBeta?: boolean` - Enable beta features (uses https://api.deepseek.com/beta)
- `maxRetries?: number` - Max retry attempts (default: 3)
- `timeout?: number` - Request timeout in ms (default: 60000)
- `defaultModel?: string` - Default model to use

### `client.chat(request)`

Create a chat completion. Returns `Promise<ChatCompletionResponse>`.

### `client.chatStream(request)`

Create a streaming chat completion. Returns `AsyncGenerator<ChatCompletionStreamChunk>`.

### `client.chatCompletion(message, options?)`

Helper for simple single-message completions. Returns `Promise<string>`.

### `client.fimCompletion(request)` (Beta)

Fill-in-the-middle completion. Returns `Promise<FIMCompletionResponse>`.

Requires `useBeta: true` or `baseURL: 'https://api.deepseek.com/beta'`.

### `client.fimCompletionStream(request)` (Beta)

Streaming FIM completion. Returns `AsyncGenerator<FIMCompletionStreamChunk>`.

Requires `useBeta: true` or `baseURL: 'https://api.deepseek.com/beta'`.

## Error Handling

```typescript
try {
  const response = await client.chat({
    model: DEEPSEEK_MODELS.CHAT,
    messages: [{ role: "user", content: "Hello" }],
  });
} catch (error) {
  if (error instanceof Error) {
    console.error("DeepSeek API error:", error.message);
  }
}
```

## Rate Limits

The client automatically retries on rate limit errors (429) with exponential backoff.

## Pricing

- **deepseek-chat**: $0.14/M input tokens, $0.28/M output tokens
- **deepseek-reasoner**: $0.28/M input tokens, $1.12/M output tokens

Check current pricing: https://api-docs.deepseek.com/quick_start/pricing

## Documentation

- API Docs: https://api-docs.deepseek.com/
- Models: https://api-docs.deepseek.com/guides/model_list
- Tool Calling: https://api-docs.deepseek.com/guides/function_calling
