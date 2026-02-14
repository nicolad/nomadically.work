# Deploying Promptfoo on Cloudflare

This guide shows how to deploy the Promptfoo evaluation service as a Cloudflare Worker.

## Overview

The Promptfoo Worker provides an HTTP API for running LLM evaluations using:

- **Cloudflare Workers AI** - Edge-deployed AI models
- **Cloudflare AI Gateway** - Route to any provider (OpenAI, Anthropic, Groq, etc.)

## Prerequisites

1. Cloudflare account
2. Wrangler CLI installed: `npm install -g wrangler`
3. Authenticated with Wrangler: `wrangler login`

## Setup

### 1. Configure Secrets

Set required secrets:

```bash
# Required for Workers AI
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --config wrangler.promptfoo.toml
npx wrangler secret put CLOUDFLARE_API_KEY --config wrangler.promptfoo.toml

# Optional for AI Gateway
npx wrangler secret put CLOUDFLARE_GATEWAY_ID --config wrangler.promptfoo.toml
npx wrangler secret put CF_AIG_TOKEN --config wrangler.promptfoo.toml

# Optional provider API keys (for AI Gateway)
npx wrangler secret put OPENAI_API_KEY --config wrangler.promptfoo.toml
npx wrangler secret put ANTHROPIC_API_KEY --config wrangler.promptfoo.toml
npx wrangler secret put GROQ_API_KEY --config wrangler.promptfoo.toml
```

### 2. Deploy

```bash
npx wrangler deploy --config wrangler.promptfoo.toml
```

Your worker will be deployed to: `https://nomadically-promptfoo-eval.<your-subdomain>.workers.dev`

## API Endpoints

### POST /eval

Run an evaluation.

**Request Body:**

```json
{
  "prompt": "What is quantum computing?",
  "systemPrompt": "You are a helpful AI assistant.",
  "provider": {
    "type": "workers-ai",
    "model": "@cf/meta/llama-3.1-8b-instruct"
  },
  "temperature": 0.7,
  "max_tokens": 500
}
```

**Or with messages:**

```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful AI assistant." },
    { "role": "user", "content": "What is quantum computing?" }
  ],
  "provider": {
    "type": "workers-ai",
    "model": "@cf/meta/llama-3.1-8b-instruct"
  }
}
```

**For AI Gateway:**

```json
{
  "prompt": "Explain machine learning",
  "provider": {
    "type": "ai-gateway",
    "gatewayProvider": "openai",
    "model": "gpt-4"
  },
  "temperature": 0.8
}
```

**Response:**

```json
{
  "output": "Quantum computing is...",
  "model": "@cf/meta/llama-3.1-8b-instruct",
  "provider": "Cloudflare Workers AI",
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 120,
    "total_tokens": 135
  },
  "latency_ms": 1234
}
```

### GET /models

List available models.

**Response:**

```json
{
  "workers-ai": {
    "chat": [
      { "name": "LLAMA_3_1_8B", "model": "@cf/meta/llama-3.1-8b-instruct" },
      ...
    ],
    "embedding": [
      { "name": "EMBEDDING_GEMMA_300M", "model": "@cf/google/embeddinggemma-300m" }
    ]
  },
  "ai-gateway": {
    "providers": [
      { "name": "OPENAI", "id": "openai" },
      { "name": "ANTHROPIC", "id": "anthropic" },
      ...
    ]
  }
}
```

### GET /health

Health check.

**Response:**

```json
{
  "status": "healthy",
  "service": "promptfoo-eval",
  "timestamp": "2026-02-14T12:00:00.000Z"
}
```

## Usage Examples

### cURL - Workers AI

```bash
curl -X POST https://your-worker.workers.dev/eval \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is edge computing?",
    "provider": {
      "type": "workers-ai",
      "model": "@cf/meta/llama-3.1-8b-instruct"
    },
    "temperature": 0.7,
    "max_tokens": 500
  }'
```

### cURL - AI Gateway

```bash
curl -X POST https://your-worker.workers.dev/eval \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain blockchain",
    "provider": {
      "type": "ai-gateway",
      "gatewayProvider": "openai",
      "model": "gpt-4"
    }
  }'
```

### JavaScript/TypeScript

```typescript
async function runEval(prompt: string) {
  const response = await fetch("https://your-worker.workers.dev/eval", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      provider: {
        type: "workers-ai",
        model: "@cf/meta/llama-3.1-8b-instruct",
      },
      temperature: 0.7,
    }),
  });

  const result = await response.json();
  console.log(result.output);
  console.log(`Latency: ${result.latency_ms}ms`);
}

runEval("What is artificial intelligence?");
```

### Python

```python
import requests

def run_eval(prompt: str):
    response = requests.post(
        'https://your-worker.workers.dev/eval',
        json={
            'prompt': prompt,
            'provider': {
                'type': 'workers-ai',
                'model': '@cf/meta/llama-3.1-8b-instruct'
            },
            'temperature': 0.7
        }
    )

    result = response.json()
    print(result['output'])
    print(f"Latency: {result['latency_ms']}ms")

run_eval('What is machine learning?')
```

## Development

### Local Development

```bash
npx wrangler dev --config wrangler.promptfoo.toml
```

Access at: `http://localhost:8787`

### Run Tests

```bash
# Test health endpoint
curl http://localhost:8787/health

# Test models endpoint
curl http://localhost:8787/models

# Test evaluation
curl -X POST http://localhost:8787/eval \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello","provider":{"type":"workers-ai","model":"@cf/meta/llama-3.1-8b-instruct"}}'
```

## Monitoring

View logs in Cloudflare dashboard:

1. Go to Workers & Pages
2. Select your worker
3. Click "Logs" tab

Or use Wrangler:

```bash
npx wrangler tail --config wrangler.promptfoo.toml
```

## Custom Domain

To use a custom domain:

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your worker
3. Go to Settings → Triggers
4. Add a custom domain

## Cost Optimization

1. **Use Workers AI** for cost-effective evaluations on Cloudflare's edge
2. **Enable AI Gateway caching** to reduce duplicate API calls
3. **Set max_tokens limits** to control response sizes
4. **Monitor usage** in Cloudflare Analytics

## Security

1. **Never commit secrets** - Use `wrangler secret put`
2. **Restrict CORS** - Modify `corsHeaders()` in worker to allow specific origins only
3. **Add authentication** - Implement API key validation if needed
4. **Rate limiting** - Use Cloudflare's rate limiting features

## Troubleshooting

### "Account ID required" error

Make sure `CLOUDFLARE_ACCOUNT_ID` is set:

```bash
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --config wrangler.promptfoo.toml
```

### "Gateway not found" error

Verify `CLOUDFLARE_GATEWAY_ID` is correct and the gateway exists in your account.

### Timeout errors

Increase CPU time limit in `wrangler.promptfoo.toml`:

```toml
[limits]
cpu_ms = 100000  # 100 seconds
```

## Next Steps

- Set up monitoring and alerts
- Implement caching layer
- Add batch evaluation endpoints
- Create a web UI for the API
- Integrate with CI/CD pipelines

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Workers AI Documentation](https://developers.cloudflare.com/workers-ai/)
- [AI Gateway Documentation](https://developers.cloudflare.com/ai-gateway/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
