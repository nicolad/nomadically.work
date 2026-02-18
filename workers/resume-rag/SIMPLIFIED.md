# Simplified Resume RAG Setup

## Quick Start

1. **Worker is already created** at `/workers/resume-rag/`

2. **Update wrangler config** to use simple entry point:

```jsonc
{
  "name": "nomadically-work-resume-rag",
  "main": "src/entry_simple.py",  // ← Use simplified version
  "compatibility_date": "2025-11-02",
  "compatibility_flags": ["python_workers"],
  "vectorize": [{
    "binding": "VECTORIZE",
    "index_name": "resume-rag-index"
  }],
  "ai": {
    "binding": "AI"
  }
}
```

1. **Deploy**:

```bash
cd workers/resume-rag
export PATH="$HOME/.local/bin:$PATH"
npm run sync  # Sync Python dependencies
npx wrangler deploy --config wrangler.jsonc
```

1. **Test**:

```bash
# Health check
curl https://nomadically-work-resume-rag.workers.dev/health

# Upload resume
curl -X POST https://nomadically-work-resume-rag.workers.dev/store-resume \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "user_id": "user_001",
    "name": "John Doe",
    "summary": "Senior software engineer with 10 years experience",
    "experience": "Led teams at Google and Amazon...",
    "skills": ["Python", "React", "AWS"]
  }'

# Ask about resume
curl -X POST https://nomadically-work-resume-rag.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "message": "What is my Python experience?"
  }'
```

## Python Client

```bash
cd workers/resume-rag/examples

# Upload resume
python resume_client.py \
  --email user@example.com \
  --action upload \
  --resume-file resume.txt

# Ask question
python resume_client.py \
  --email user@example.com \
  --action ask \
  --question "What are my key skills?"
```

## Key Features

- ✅ **Email-based user identification** (no complex user IDs)
- ✅ **Automatic resume chunking** (~420 tokens per chunk)
- ✅ **Native Vectorize binding** (no external API calls needed)
- ✅ **Workers AI for embeddings** (bge-base-en-v1.5, 768 dimensions)
- ✅ **RAG-powered Q&A** (Llama 3.3 70B)

## Schema

User settings simplified to:

- `email` (primary identifier)
- `preferred_locations`
- `preferred_skills`
- `excluded_companies`

All resume operations use email as the key:

- `uploadResume(email, resumeText)`
- `askAboutResume(email, question)`
- `search` resumes(email, query)`

## Files Created

- `schema/base/user-settings.graphql` - Simplified GraphQL schema
- `src/graphql/GetUserSettings.graphql` - Email-based query
- `src/graphql/UpdateUserSettings.graphql` - Email-based mutation  
- `src/graphql/resume.graphql` - Resume operations
- `workers/resume-rag/src/entry_simple.py` - Simplified worker
- `workers/resume-rag/examples/resume_client.py` - Python client

Everything is email-based. No complex user ID management needed.
