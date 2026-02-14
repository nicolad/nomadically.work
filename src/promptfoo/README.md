# Promptfoo Cloudflare Integration

Integration with Cloudflare Workers AI and AI Gateway for LLM evaluation and testing.

## Features

- **Cloudflare Workers AI**: Run AI models on Cloudflare's edge infrastructure
- **AI Gateway**: Route requests through Cloudflare for caching, rate limiting, and analytics
- **OpenAI-Compatible**: Uses standard OpenAI API format
- **TypeScript**: Fully typed for better developer experience

## Installation

```bash
# From your project root
npm install
```

## Environment Variables

### Cloudflare Workers AI

```bash
export CLOUDFLARE_ACCOUNT_ID=your_account_id
export CLOUDFLARE_API_KEY=your_api_key
```

### AI Gateway (Additional)

```bash
export CLOUDFLARE_GATEWAY_ID=your_gateway_id
export CF_AIG_TOKEN=your_gateway_token  # Optional, for authenticated gateways
```

### Provider API Keys (for AI Gateway)

```bash
export OPENAI_API_KEY=your_openai_key
export ANTHROPIC_API_KEY=your_anthropic_key
export GROQ_API_KEY=your_groq_key
```

## Usage

### Cloudflare Workers AI

#### Basic Chat

```typescript
import { chatWithCloudflareAI, CLOUDFLARE_AI_MODELS } from "@/promptfoo";

const response = await chatWithCloudflareAI(
  CLOUDFLARE_AI_MODELS.LLAMA_3_1_8B,
  "What is quantum computing?",
  {
    systemPrompt: "You are a helpful AI assistant.",
    temperature: 0.7,
    max_tokens: 500,
  },
);

console.log(response);
```

#### Advanced Usage with Provider Instance

```typescript
import {
  createCloudflareWorkersAIProvider,
  CLOUDFLARE_AI_MODELS,
} from "@/promptfoo";

const provider = createCloudflareWorkersAIProvider({
  model: CLOUDFLARE_AI_MODELS.LLAMA_4_SCOUT_17B,
  temperature: 0.8,
  max_tokens: 1000,
});

const response = await provider.chat(
  "Explain machine learning",
  "You are an expert in AI and ML.",
);
```

#### Chat Completion with Multiple Messages

```typescript
const provider = createCloudflareWorkersAIProvider({
  model: CLOUDFLARE_AI_MODELS.OPENAI_GPT_OSS_120B,
});

const response = await provider.chatCompletion([
  { role: "system", content: "You are a coding assistant." },
  { role: "user", content: "Write a function to reverse a string." },
]);

console.log(response.choices[0].message.content);
```

#### Embeddings

```typescript
import {
  createCloudflareWorkersAIProvider,
  CLOUDFLARE_AI_MODELS,
} from "@/promptfoo";

const provider = createCloudflareWorkersAIProvider({
  model: CLOUDFLARE_AI_MODELS.EMBEDDING_GEMMA_300M,
  type: "embedding",
});

const embeddings = await provider.embeddings([
  "quantum computing",
  "machine learning",
]);

console.log(embeddings.data);
```

### AI Gateway

#### Basic Chat Through Gateway

```typescript
import { chatThroughGateway, AI_GATEWAY_PROVIDERS } from "@/promptfoo";

const response = await chatThroughGateway(
  AI_GATEWAY_PROVIDERS.OPENAI,
  "gpt-4",
  "What is the weather today?",
  {
    systemPrompt: "You are a weather assistant.",
    temperature: 0.7,
  },
);

console.log(response);
```

#### Advanced Gateway Usage

```typescript
import {
  createCloudflareAIGatewayProvider,
  AI_GATEWAY_PROVIDERS,
} from "@/promptfoo";

const provider = createCloudflareAIGatewayProvider({
  provider: AI_GATEWAY_PROVIDERS.ANTHROPIC,
  model: "claude-3-5-sonnet-20241022",
  temperature: 0.8,
  max_tokens: 1000,
});

const response = await provider.chat(
  "Explain blockchain technology",
  "You are a blockchain expert.",
);
```

#### Multiple Providers Comparison

```typescript
import {
  createCloudflareAIGatewayProvider,
  AI_GATEWAY_PROVIDERS,
} from "@/promptfoo";

const providers = [
  createCloudflareAIGatewayProvider({
    provider: AI_GATEWAY_PROVIDERS.OPENAI,
    model: "gpt-4",
  }),
  createCloudflareAIGatewayProvider({
    provider: AI_GATEWAY_PROVIDERS.ANTHROPIC,
    model: "claude-3-5-sonnet-20241022",
  }),
  createCloudflareAIGatewayProvider({
    provider: AI_GATEWAY_PROVIDERS.GROQ,
    model: "llama-3.1-70b-versatile",
  }),
];

const question = "What is the capital of France?";

const responses = await Promise.all(providers.map((p) => p.chat(question)));

responses.forEach((response, i) => {
  console.log(`Provider ${i + 1}:`, response);
});
```

## Available Models

### Latest Flagship Models (2025)

```typescript
import { CLOUDFLARE_AI_MODELS } from "@/promptfoo";

// OpenAI Models
CLOUDFLARE_AI_MODELS.OPENAI_GPT_OSS_120B;
CLOUDFLARE_AI_MODELS.OPENAI_GPT_OSS_20B;

// Meta Llama Models
CLOUDFLARE_AI_MODELS.LLAMA_4_SCOUT_17B;
CLOUDFLARE_AI_MODELS.LLAMA_3_3_70B_FAST;
CLOUDFLARE_AI_MODELS.LLAMA_3_2_11B_VISION;
CLOUDFLARE_AI_MODELS.LLAMA_3_1_8B;

// DeepSeek Models
CLOUDFLARE_AI_MODELS.DEEPSEEK_R1_DISTILL_QWEN_32B;

// Qwen Models
CLOUDFLARE_AI_MODELS.QWEN_QWQ_32B;
CLOUDFLARE_AI_MODELS.QWEN_2_5_CODER_32B;

// Mistral Models
CLOUDFLARE_AI_MODELS.MISTRAL_SMALL_3_1_24B;

// Google Models
CLOUDFLARE_AI_MODELS.GEMMA_3_12B;
CLOUDFLARE_AI_MODELS.EMBEDDING_GEMMA_300M;
```

## Supported AI Gateway Providers

```typescript
import { AI_GATEWAY_PROVIDERS } from "@/promptfoo";

AI_GATEWAY_PROVIDERS.OPENAI;
AI_GATEWAY_PROVIDERS.ANTHROPIC;
AI_GATEWAY_PROVIDERS.GROQ;
AI_GATEWAY_PROVIDERS.PERPLEXITY;
AI_GATEWAY_PROVIDERS.GOOGLE_AI_STUDIO;
AI_GATEWAY_PROVIDERS.MISTRAL;
AI_GATEWAY_PROVIDERS.COHERE;
AI_GATEWAY_PROVIDERS.AZURE_OPENAI;
AI_GATEWAY_PROVIDERS.WORKERS_AI;
AI_GATEWAY_PROVIDERS.HUGGINGFACE;
AI_GATEWAY_PROVIDERS.REPLICATE;
AI_GATEWAY_PROVIDERS.GROK;
```

## Configuration Options

### Workers AI Config

```typescript
interface CloudflareWorkersAIConfig {
  model: string; // Model name (e.g., "@cf/meta/llama-3.1-8b-instruct")
  type?: "chat" | "completion" | "embedding";
  accountId?: string; // Or use CLOUDFLARE_ACCOUNT_ID env var
  apiKey?: string; // Or use CLOUDFLARE_API_KEY env var
  temperature?: number; // 0-2, default 0.7
  max_tokens?: number; // Default 1000
  top_p?: number; // 0-1, default 1.0
  frequency_penalty?: number; // -2 to 2, default 0
  presence_penalty?: number; // -2 to 2, default 0
  stop?: string | string[]; // Stop sequences
  seed?: number; // For deterministic outputs
}
```

### AI Gateway Config

```typescript
interface CloudflareAIGatewayConfig {
  provider: string; // e.g., 'openai', 'anthropic', 'groq'
  model: string; // Provider-specific model name
  accountId?: string; // Or use CLOUDFLARE_ACCOUNT_ID env var
  gatewayId?: string; // Or use CLOUDFLARE_GATEWAY_ID env var
  cfAigToken?: string; // For authenticated gateways
  providerApiKey?: string; // Provider's API key (or use BYOK)
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];

  // Azure-specific
  resourceName?: string; // Azure resource name
  deploymentName?: string; // Azure deployment name
  apiVersion?: string; // Default: "2024-12-01-preview"
}
```

## Benefits

### Cost Reduction

- AI Gateway caches identical requests
- Reduces API costs during development and testing

### Unified Analytics

- View usage across all providers in Cloudflare dashboard
- Track costs and usage patterns

### Rate Limit Protection

- Gateway manages rate limits via request queuing
- Prevents evaluation failures due to quota issues

### Edge Performance

- Workers AI runs on Cloudflare's global edge network
- Low-latency responses for users worldwide

## Error Handling

```typescript
import { createCloudflareWorkersAIProvider } from "@/promptfoo";

try {
  const provider = createCloudflareWorkersAIProvider({
    model: "@cf/meta/llama-3.1-8b-instruct",
  });

  const response = await provider.chat("Hello!");
  console.log(response);
} catch (error) {
  if (error instanceof Error) {
    console.error("Error:", error.message);
  }
}
```

## References

- [Cloudflare Workers AI Documentation](https://developers.cloudflare.com/workers-ai/)
- [Cloudflare AI Gateway Documentation](https://developers.cloudflare.com/ai-gateway/)
- [OpenAI API Compatibility](https://developers.cloudflare.com/workers-ai/openai-compatibility/)
- [Promptfoo Documentation](https://www.promptfoo.dev/)

## License

MIT
