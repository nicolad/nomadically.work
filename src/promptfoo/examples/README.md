# Promptfoo Cloudflare Examples

Example configurations for using Cloudflare Workers AI and AI Gateway with promptfoo.

## Prerequisites

1. Cloudflare account with Workers AI enabled
2. Environment variables configured (see main README.md)

## Examples

### 1. Workers AI Chat (`workers-ai-chat.yaml`)

Compares flagship chat models on Cloudflare Workers AI:

- OpenAI GPT-OSS 120B
- Meta Llama 4 Scout
- Llama 3.3 70B Fast

**Run:**

```bash
npx promptfoo eval -c src/promptfoo/examples/workers-ai-chat.yaml
```

### 2. AI Gateway Comparison (`ai-gateway-comparison.yaml`)

Routes requests through Cloudflare AI Gateway to:

- OpenAI GPT-4o Mini
- Anthropic Claude 3.5 Haiku
- Groq Llama 3.1 8B

**Run:**

```bash
export CLOUDFLARE_GATEWAY_ID=your_gateway_id
export OPENAI_API_KEY=your_openai_key
export ANTHROPIC_API_KEY=your_anthropic_key
export GROQ_API_KEY=your_groq_key

npx promptfoo eval -c src/promptfoo/examples/ai-gateway-comparison.yaml
```

### 3. Embedding Example (`embedding-example.yaml`)

Tests embedding generation and similarity with:

- EmbeddingGemma 300M for embeddings
- Llama 3.3 70B for chat context

**Run:**

```bash
npx promptfoo eval -c src/promptfoo/examples/embedding-example.yaml
```

## Custom Configuration

### Basic Structure

```yaml
description: "Your evaluation description"

prompts:
  - "Your prompt template with {{variables}}"

providers:
  - id: cloudflare-ai:chat:@cf/model-name
    label: "Friendly Name"
    config:
      temperature: 0.7
      max_tokens: 500

tests:
  - vars:
      variable: "value"
    assert:
      - type: contains
        value: "expected text"
```

### Supported Provider IDs

**Workers AI:**

- `cloudflare-ai:chat:@cf/model-name` - Chat completion
- `cloudflare-ai:completion:@cf/model-name` - Text completion
- `cloudflare-ai:embedding:@cf/model-name` - Embeddings

**AI Gateway:**

- `cloudflare-gateway:openai:model-name`
- `cloudflare-gateway:anthropic:model-name`
- `cloudflare-gateway:groq:model-name`
- `cloudflare-gateway:workers-ai:@cf/model-name`

### Common Assertions

```yaml
assert:
  # Contains text
  - type: contains
    value: "keyword"

  # Case-insensitive contains
  - type: icontains
    value: "KEYWORD"

  # Contains any of these
  - type: contains-any
    value:
      - "option1"
      - "option2"

  # Does not contain
  - type: not-contains
    value: "unwanted"

  # JavaScript expression
  - type: javascript
    value: "output.length > 100"

  # Similarity (for embeddings)
  - type: similarity
    threshold: 0.8
    value: "reference text"
```

## Tips

1. **Start Simple**: Begin with a single model and one test case
2. **Use Variables**: Make prompts reusable with `{{variables}}`
3. **Incremental Complexity**: Add more models and tests gradually
4. **Monitor Costs**: Use AI Gateway analytics to track usage
5. **Cache Benefits**: Identical requests through AI Gateway are cached

## Viewing Results

After running an evaluation:

```bash
# View in browser
npx promptfoo view

# Generate report
npx promptfoo eval -c config.yaml --output report.json
```

## Troubleshooting

### Missing API Keys

```
Error: Cloudflare API key is required
```

**Solution:** Set the required environment variables:

```bash
export CLOUDFLARE_ACCOUNT_ID=your_account_id
export CLOUDFLARE_API_KEY=your_api_key
```

### Invalid Model Name

```
Error: Invalid model name. Must start with @ or @hf/
```

**Solution:** Use the full model identifier:

```yaml
- id: cloudflare-ai:chat:@cf/meta/llama-3.1-8b-instruct
```

### Gateway 404 Error

```
Error: 404 - Gateway not found
```

**Solution:** Verify your gateway ID is correct:

```bash
echo $CLOUDFLARE_GATEWAY_ID
```

## Next Steps

- Create custom evaluations for your use case
- Combine multiple providers for A/B testing
- Use advanced assertions for quality checks
- Set up CI/CD integration for continuous evaluation

## Resources

- [Main README](../README.md)
- [Promptfoo Documentation](https://www.promptfoo.dev/)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/)
