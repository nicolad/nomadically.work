# Langfuse Integration with Promptfoo

This directory contains Promptfoo evaluation configurations integrated with Langfuse for prompt management.

## Setup

### 1. Environment Variables

Ensure these are set in your `.env` file:

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

### 2. Create/Update Langfuse Prompts

Run the setup script to create or update prompts in Langfuse:

```bash
pnpm eval:promptfoo:setup
```

This creates the `remote-ai-jobs-eval` prompt with the `production` label.

### 3. Run Evaluations

```bash
pnpm eval:promptfoo
```

## Langfuse Prompt Configuration

The evaluation uses a Langfuse-managed prompt: `langfuse://remote-ai-jobs-eval@production`

### Benefits

- **Update prompts without redeploying**: Change prompts in Langfuse UI
- **Version control**: Track and revert to previous prompt versions
- **A/B testing**: Test different prompt versions with labels
- **Monitor performance**: Track prompt performance in Langfuse

### Prompt Labels

- `production` - Current production version (used by default)
- `staging` - Testing before production
- `latest` - Most recently created version

## Managing Prompts

### Via Langfuse UI

1. Go to [Langfuse](https://cloud.langfuse.com)
2. Navigate to Prompts → `remote-ai-jobs-eval`
3. Edit, version, or label prompts

### Via Script

Modify `src/promptfoo/setup-langfuse-prompt.ts` and run:

```bash
pnpm eval:promptfoo:setup
```

### Via API

```typescript
import { Langfuse } from "langfuse";

const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL,
});

await langfuse.createPrompt({
  name: "remote-ai-jobs-eval",
  type: "text",
  prompt: "RUN_REMOTE_JOBS_PIPELINE",
  labels: ["production"],
  config: {
    description: "Remote AI jobs pipeline evaluation",
    workflow: "direct-deepseek-client",
  },
});
```

## Workflow

1. **Development**: Create/test prompts with `staging` label
2. **Production**: Promote prompts to `production` label in Langfuse
3. **Rollback**: Change label assignment in Langfuse (no code changes needed)
4. **Monitor**: View prompt performance and traces in Langfuse dashboard

## References

- [Langfuse Promptfoo Integration](https://langfuse.com/docs/integrations/promptfoo)
- [Promptfoo Langfuse Docs](https://www.promptfoo.dev/docs/integrations/langfuse/)
- [Langfuse Prompt Management](https://langfuse.com/docs/prompts)
