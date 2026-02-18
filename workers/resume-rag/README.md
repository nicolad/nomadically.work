# Resume RAG Worker — Cloudflare Python Worker with Vectorize

A Python-based Cloudflare Worker that provides semantic search and RAG (Retrieval-Augmented Generation) capabilities over resume data using Cloudflare Vectorize for vector storage and Workers AI for embeddings and LLM inference.

## Features

- **Resume Storage**: Store resumes with automatic semantic embeddings
- **Semantic Search**: Find relevant resumes using natural language queries
- **RAG Chat Interface**: Ask questions about resumes with context-aware responses
- **Memory Management**: Store and retrieve user preferences and context using LangMem
- **Cloudflare Native**: Leverages Vectorize, Workers AI, and Python Workers

## Packages Used

- **langmem-cloudflare-vectorize** (PyPI) — LangMem store integration with Cloudflare Vectorize
- **langchain-cloudflare** (PyPI) — `ChatCloudflareWorkersAI` for LLM inference
- **langmem** (PyPI) — Memory management tools for LangGraph agents
- **langgraph** (PyPI) — Agent framework for building stateful applications

## Architecture

```
User Request
     ↓
Resume RAG Worker (Python)
     ↓
├─→ Vectorize (Vector Storage)
│   └─→ BGE-base-en-v1.5 (Embeddings)
│
├─→ Workers AI
│   ├─→ @cf/baai/bge-base-en-v1.5 (Embeddings)
│   └─→ @cf/meta/llama-3.3-70b-instruct-fp8-fast (LLM)
│
└─→ LangMem (Memory Management)
```

## Setup

### 1. Create Vectorize Index

Before deploying, create a Vectorize index:

```bash
# Create the index with 768 dimensions (for bge-base-en-v1.5)
npx wrangler vectorize create resume-rag-index \
  --dimensions=768 \
  --metric=cosine
```

### 2. Configure Secrets

Set up required secrets:

```bash
# Cloudflare Account ID
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --config workers/resume-rag/wrangler.jsonc

# Vectorize API Token
npx wrangler secret put VECTORIZE_API_TOKEN --config workers/resume-rag/wrangler.jsonc

# Workers AI Token
npx wrangler secret put WORKERS_AI_TOKEN --config workers/resume-rag/wrangler.jsonc
```

### 3. Install Dependencies

```bash
cd workers/resume-rag
uv sync
```

### 4. Deploy

```bash
# Deploy to Cloudflare
npx wrangler deploy --config workers/resume-rag/wrangler.jsonc

# Or from the root directory
npx wrangler deploy -c workers/resume-rag/wrangler.jsonc
```

## API Endpoints

### Health Check

Check worker status and bindings:

```bash
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-02-17T...",
  "bindings": {
    "vectorize": true,
    "llm": true
  }
}
```

### Store Resume

Store a resume with automatic embedding generation:

```bash
POST /store-resume
Content-Type: application/json

{
  "user_id": "user123",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "summary": "Senior software engineer with 10+ years of experience in Python and React",
  "experience": "Led teams at Google and Amazon, built scalable microservices...",
  "skills": ["Python", "React", "TypeScript", "AWS", "Docker"],
  "education": "BS Computer Science, Stanford University",
  "metadata": {
    "location": "San Francisco, CA",
    "years_experience": 10
  }
}
```

**Response:**

```json
{
  "success": true,
  "resume_id": "resume_user123_1708185600.123",
  "user_id": "user123",
  "timestamp": "2025-02-17T..."
}
```

### Search Resumes

Semantic search across all stored resumes:

```bash
POST /search-resumes
Content-Type: application/json

{
  "query": "Python engineer with React and AWS experience",
  "limit": 5,
  "user_id": "optional_filter"
}
```

**Response:**

```json
{
  "success": true,
  "query": "Python engineer with React and AWS experience",
  "results": [
    {
      "key": "resume_user123_...",
      "content": "Name: Jane Doe\nEmail: jane@example.com\n...",
      "metadata": {
        "user_id": "user123",
        "name": "Jane Doe",
        "skills": "Python,React,TypeScript,AWS,Docker",
        ...
      },
      "score": 0.87
    }
  ],
  "count": 1
}
```

### RAG Chat

Ask questions about resumes with context-aware responses:

```bash
POST /chat
Content-Type: application/json

{
  "message": "Find me candidates with Python and React skills who have worked at top tech companies",
  "user_id": "recruiter123",
  "thread_id": "conv_001"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Find me candidates with Python and React skills...",
  "response": "Based on the resumes I found, I can recommend Jane Doe. She has extensive experience with both Python and React, having worked at Google and Amazon...",
  "context_count": 3,
  "user_id": "recruiter123"
}
```

### Manage Memory

Store user preferences and context:

```bash
POST /manage-memory
Content-Type: application/json

{
  "user_id": "recruiter123",
  "content": "I prefer candidates with startup experience and leadership skills",
  "metadata": {
    "type": "preference",
    "category": "hiring"
  }
}
```

**Response:**

```json
{
  "success": true,
  "memory_id": "memory_recruiter123_...",
  "user_id": "recruiter123"
}
```

### List Memories

Retrieve stored memories for a user:

```bash
GET /memories?user_id=recruiter123
```

**Response:**

```json
{
  "success": true,
  "user_id": "recruiter123",
  "memories": [
    {
      "key": "memory_recruiter123_...",
      "content": "I prefer candidates with startup experience...",
      "metadata": {
        "type": "preference",
        "category": "hiring",
        "timestamp": "2025-02-17T..."
      }
    }
  ],
  "count": 1
}
```

## Usage Examples

### Python

```python
import requests

# Store a resume
response = requests.post(
    "https://nomadically-work-resume-rag.workers.dev/store-resume",
    json={
        "user_id": "user123",
        "name": "John Doe",
        "email": "john@example.com",
        "summary": "Full-stack engineer specializing in React and Node.js",
        "experience": "6 years at various startups, built multiple SaaS products",
        "skills": ["React", "Node.js", "TypeScript", "PostgreSQL"],
        "education": "BS CS, MIT"
    }
)
print(response.json())

# Search resumes
response = requests.post(
    "https://nomadically-work-resume-rag.workers.dev/search-resumes",
    json={
        "query": "React developer with startup experience",
        "limit": 3
    }
)
print(response.json())

# Chat with RAG
response = requests.post(
    "https://nomadically-work-resume-rag.workers.dev/chat",
    json={
        "message": "Who are the best React developers in the database?",
        "user_id": "recruiter456"
    }
)
print(response.json())
```

### cURL

```bash
# Store resume
curl -X POST https://nomadically-work-resume-rag.workers.dev/store-resume \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "name": "John Doe",
    "summary": "Full-stack engineer",
    "experience": "6 years professional experience",
    "skills": ["React", "Node.js"]
  }'

# Search resumes
curl -X POST https://nomadically-work-resume-rag.workers.dev/search-resumes \
  -H "Content-Type: application/json" \
  -d '{
    "query": "React developer",
    "limit": 5
  }'
```

## Development

### Local Development

```bash
cd workers/resume-rag

# Install dependencies
uv sync

# Run locally (requires wrangler and local bindings)
npx wrangler dev --config wrangler.jsonc --port 8788
```

### Testing

```bash
# Test health endpoint
curl http://localhost:8788/health

# Test with sample data
curl -X POST http://localhost:8788/store-resume \
  -H "Content-Type: application/json" \
  -d @test/sample-resume.json
```

## Integration with LangGraph Agent

This worker can be integrated with LangGraph agents for more complex workflows:

```python
from langmem_cloudflare_vectorize import CloudflareVectorizeLangmemStore
from langchain_cloudflare.chat_models import ChatCloudflareWorkersAI
from langmem import create_manage_memory_tool, create_search_memory_tool
from langgraph.prebuilt import create_react_agent

# Create the store
agent_store = CloudflareVectorizeLangmemStore.with_cloudflare_embeddings(
    account_id="your-account-id",
    index_name="resume-rag-index",
    vectorize_api_token="your-token",
    workers_ai_token="your-token",
    embedding_model="@cf/baai/bge-base-en-v1.5",
    dimensions=768
)

# Create LLM
llm = ChatCloudflareWorkersAI(
    cloudflare_account_id="your-account-id",
    cloudflare_api_token="your-token",
    model="@cf/meta/llama-3.3-70b-instruct-fp8-fast"
)

# Create memory tools
manage_memory = create_manage_memory_tool(namespace=("resumes",))
search_memory = create_search_memory_tool(namespace=("resumes",))

# Create agent
agent = create_react_agent(
    llm,
    tools=[manage_memory, search_memory],
    store=agent_store
)

# Use the agent
config = {"configurable": {"thread_id": "session_1"}}
response = agent.invoke(
    {"messages": [{"role": "user", "content": "Remember: I prefer candidates with AI/ML experience"}]},
    config
)
```

## Cost Considerations

- **Vectorize**: ~$0.04 per million queries (stored vectors + dimensions)
- **Workers AI - Embeddings**: Free tier available, then usage-based
- **Workers AI - LLM**: Free tier available, then usage-based
- **Workers Requests**: 100,000 free requests/day

## Limitations

- Maximum vector dimensions: 768 (bge-base-en-v1.5)
- Vectorize index size limits apply
- Python Workers use Pyodide (WebAssembly) — some packages may not be available
- Cold start times may be higher than JavaScript workers

## Troubleshooting

### Import Errors

If you see import errors, ensure all dependencies are Pyodide-compatible. Avoid packages with native binary dependencies.

### Vectorize Index Not Found

Ensure the index is created before deploying:

```bash
npx wrangler vectorize list
```

### Worker Startup Failures

Check logs:

```bash
npx wrangler tail --config workers/resume-rag/wrangler.jsonc
```

## Related Documentation

- [langmem-cloudflare-vectorize](https://pypi.org/project/langmem-cloudflare-vectorize/)
- [langchain-cloudflare](https://github.com/cloudflare/langchain-cloudflare)
- [Cloudflare Vectorize](https://developers.cloudflare.com/vectorize/)
- [Cloudflare Python Workers](https://developers.cloudflare.com/workers/languages/python/)

## License

MIT
