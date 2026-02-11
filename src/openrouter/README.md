# OpenRouter Integration

This module provides OpenRouter integration for accessing DeepSeek models through a unified API.

## Setup

1. Get your OpenRouter API key from [openrouter.ai/keys](https://openrouter.ai/keys)

2. Add to your `.env.development` or `.env` file:

```bash
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
```

## Usage

### Quick Start with Agent Templates

```typescript
import { agentTemplates } from "@/openrouter";

// Create a general assistant
const assistant = agentTemplates.assistant();

// Create a reasoning assistant
const reasoner = agentTemplates.reasoning();

// Create a coding assistant
const coder = agentTemplates.coder();

// Use the agent
const response = await assistant.generate([
  { role: "user", content: "What are the benefits of remote work?" },
]);
```

### Custom Agent Configuration

```typescript
import { createChatAgent } from "@/openrouter";

const customAgent = createChatAgent({
  id: "job-classifier",
  name: "Job Classifier",
  instructions: "You are an expert at classifying job postings.",
  model: "chat", // or 'r1', 'coder', etc.
});
```

### Using Specific DeepSeek Models

```typescript
import { deepseekModels } from "@/openrouter";
import { Agent } from "@mastra/core/agent";

// Use DeepSeek Chat
const chatAgent = new Agent({
  model: deepseekModels.chat(),
  name: "Chat Assistant",
  instructions: "You are helpful.",
});

// Use DeepSeek R1 (reasoning model)
const reasoningAgent = new Agent({
  model: deepseekModels.r1(),
  name: "Reasoning Assistant",
  instructions: "Think step by step.",
});

// Use DeepSeek Coder
const codingAgent = new Agent({
  model: deepseekModels.coder(),
  name: "Code Assistant",
  instructions: "You are an expert programmer.",
});
```

### Direct Provider Usage

```typescript
import { openrouter, DEEPSEEK_MODELS } from "@/openrouter";

// Use with any DeepSeek model
const model = openrouter(DEEPSEEK_MODELS.CHAT);

// Or create a custom provider instance
import { createOpenRouter } from "@/openrouter";

const customProvider = createOpenRouter({
  reasoning: { max_tokens: 5000 },
  headers: { "X-Title": "My App" },
});
```

## Available DeepSeek Models

| Model                             | ID                                       | Best For                   |
| --------------------------------- | ---------------------------------------- | -------------------------- |
| **DeepSeek Chat**                 | `deepseek/deepseek-chat`                 | General conversations, Q&A |
| **DeepSeek R1**                   | `deepseek/deepseek-r1`                   | Complex reasoning tasks    |
| **DeepSeek R1 Distill Qwen 32B**  | `deepseek/deepseek-r1-distill-qwen-32b`  | Faster reasoning           |
| **DeepSeek R1 Distill Llama 70B** | `deepseek/deepseek-r1-distill-llama-70b` | Advanced reasoning         |
| **DeepSeek Coder**                | `deepseek/deepseek-coder`                | Code generation, debugging |

## Advanced Configuration

### Custom Reasoning Tokens

```typescript
import { createOpenRouter, DEEPSEEK_MODELS } from "@/openrouter";

const provider = createOpenRouter({
  reasoning: {
    max_tokens: 15000, // Increase for complex reasoning
  },
});

const model = provider(DEEPSEEK_MODELS.R1);
```

### Custom Headers

```typescript
import { createOpenRouter } from "@/openrouter";

const provider = createOpenRouter({
  headers: {
    "HTTP-Referer": "https://nomadically.work",
    "X-Title": "Nomadically Job Platform",
  },
});
```

## Integration with Existing Agents

To migrate existing agents to use OpenRouter with DeepSeek:

### Before (Direct DeepSeek)

```typescript
import { deepseek } from "@ai-sdk/deepseek";
import { Agent } from "@mastra/core/agent";

const agent = new Agent({
  model: deepseek("deepseek-chat"),
  name: "My Agent",
  instructions: "You are helpful.",
});
```

### After (OpenRouter)

```typescript
import { deepseekModels } from "@/openrouter";
import { Agent } from "@mastra/core/agent";

const agent = new Agent({
  model: deepseekModels.chat(),
  name: "My Agent",
  instructions: "You are helpful.",
});
```

## Benefits of Using OpenRouter

1. **Unified Billing**: Single API key and billing for all models
2. **Automatic Fallbacks**: Built-in redundancy and failover
3. **Rate Limiting**: Better rate limit management across providers
4. **Cost Optimization**: Automatically route to most cost-effective models
5. **Model Availability**: Access to multiple providers without managing separate accounts

## Environment Variables

| Variable             | Required | Description             |
| -------------------- | -------- | ----------------------- |
| `OPENROUTER_API_KEY` | Yes      | Your OpenRouter API key |

## Resources

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [DeepSeek Models](https://openrouter.ai/models?q=deepseek)
- [Mastra Documentation](https://mastra.ai/docs)
