# Quick Start Guide - Resume RAG Worker

Get your Resume RAG Worker running in 5 minutes!

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
- [uv](https://docs.astral.sh/uv/) or Python 3.12+ installed

## Step 1: Setup Cloudflare

```bash
# Login to Cloudflare
npx wrangler login

# Get your account ID
npx wrangler whoami
```

Save your Account ID for the next steps.

## Step 2: Create Vectorize Index

```bash
# Create the vector index (768 dimensions for bge-base-en-v1.5)
npx wrangler vectorize create resume-rag-index \
  --dimensions=768 \
  --metric=cosine

# Verify it was created
npx wrangler vectorize list
```

## Step 3: Configure Secrets

```bash
cd workers/resume-rag

# Set your Cloudflare Account ID
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --config wrangler.jsonc
# Enter your account ID when prompted

# Set Vectorize API Token (use your Cloudflare API token)
npx wrangler secret put VECTORIZE_API_TOKEN --config wrangler.jsonc
# Enter your API token when prompted

# Set Workers AI Token (same as your Cloudflare API token)
npx wrangler secret put WORKERS_AI_TOKEN --config wrangler.jsonc
# Enter your API token when prompted
```

> **Note**: For the API tokens, you can create one at:
> <https://dash.cloudflare.com/profile/api-tokens>
>
> Required permissions:
>
> - Workers AI:Edit
> - Vectorize:Edit
> - Workers Scripts:Edit

## Step 4: Install Dependencies

```bash
# Install Python dependencies using uv
uv sync

# Or using pip
pip install -r pyproject.toml
```

## Step 5: Test Locally (Optional)

```bash
# Start local development server
npm run dev

# In another terminal, run tests
./test/test.sh http://localhost:8788
```

## Step 6: Deploy to Cloudflare

```bash
# Deploy the worker
npm run deploy

# Or from the root directory
npx wrangler deploy -c workers/resume-rag/wrangler.jsonc
```

Your worker will be available at:

```
https://nomadically-work-resume-rag.<your-subdomain>.workers.dev
```

## Step 7: Test Your Deployment

```bash
# Get your worker URL
WORKER_URL="https://nomadically-work-resume-rag.<your-subdomain>.workers.dev"

# Health check
curl "$WORKER_URL/health" | jq '.'

# Store a sample resume
curl -X POST "$WORKER_URL/store-resume" \
  -H "Content-Type: application/json" \
  -d @test/sample-resume.json | jq '.'

# Search for candidates
curl -X POST "$WORKER_URL/search-resumes" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "React developer with AWS experience",
    "limit": 5
  }' | jq '.'

# Chat with RAG
curl -X POST "$WORKER_URL/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Find me React engineers",
    "user_id": "recruiter123"
  }' | jq '.response'
```

## Troubleshooting

### Error: "Index not found"

Make sure you created the Vectorize index (Step 2):

```bash
npx wrangler vectorize list
```

### Error: "Unauthorized"

Check that your secrets are set correctly:

```bash
npx wrangler secret list --config workers/resume-rag/wrangler.jsonc
```

### Error: "Module not found"

Run `uv sync` to install Python dependencies:

```bash
cd workers/resume-rag
uv sync
```

### Worker not responding

Check the logs:

```bash
npm run tail
# or
npx wrangler tail --config workers/resume-rag/wrangler.jsonc
```

## Next Steps

- Read the [full README](README.md) for detailed API documentation
- Check out the [LangGraph agent example](examples/langgraph_agent.py)
- Customize the worker for your use case
- Add more resume data and test semantic search

## Cost Estimate

With Cloudflare's free tier:

- ✅ First 100k requests/day: **FREE**
- ✅ Workers AI: **FREE** (with limits)
- ✅ Vectorize: **FREE** tier available
- 💰 Beyond free tier: ~$0.50/million requests

## Support

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Vectorize Docs](https://developers.cloudflare.com/vectorize/)
- [Python Workers Docs](https://developers.cloudflare.com/workers/languages/python/)
- [langmem-cloudflare-vectorize](https://pypi.org/project/langmem-cloudflare-vectorize/)

## Useful Commands

```bash
# Development
npm run dev              # Start local dev server
npm run deploy           # Deploy to Cloudflare
npm run tail             # View live logs

# Vectorize management
npm run vectorize:list   # List all indexes
npm run vectorize:info   # Get index details

# Testing
./test/test.sh          # Run quick tests
python test/test_worker.py  # Run detailed tests

# Cleanup
npm run clean           # Remove build artifacts
```

---

**🎉 You're all set!** Your Resume RAG Worker is now running on Cloudflare's edge network.
