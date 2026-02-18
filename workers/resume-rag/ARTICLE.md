# Building a Resume RAG Pipeline on Cloudflare Workers (Python)

This worker powers the **Resume Assistant** feature on Nomadically — upload a PDF resume, parse it with LlamaParse, chunk and embed it into Cloudflare Vectorize, then answer questions about it using Llama 3.3 70B.

## Architecture

```
Browser (Next.js)
  │  base64 PDF
  ▼
GraphQL API (Apollo)
  │  resolver proxies to worker
  ▼
Resume RAG Worker (Python, Pyodide)
  ├─ POST /upload-pdf ──► LlamaParse v2 (async parse)
  │                        returns job_id immediately
  │
  ├─ POST /ingest-parse ─► polls LlamaParse for status
  │                        on COMPLETED: chunk → embed → upsert Vectorize
  │
  ├─ POST /resume-status ─► getByIds on manifest vector
  │                          returns exists, chunk_count, filename, ingested_at
  │
  ├─ POST /chat ──────────► embed query → Vectorize topK → Llama 3.3 70B
  │
  ├─ POST /store-resume ──► structured JSON → chunk → embed → upsert
  └─ POST /search-resumes ► semantic search with namespace filtering
```

## The Upload → Parse → Ingest Pipeline

The pipeline is split into two phases so the browser never blocks on a long-running parse:

### Phase 1: Fire-and-forget upload

```
POST /upload-pdf
{
  "user_id": "user@example.com",
  "pdf_base64": "<base64-encoded PDF>",
  "filename": "resume.pdf"
}
```

The worker decodes the base64 PDF, detects a tier (`fast` or `cost_effective` based on file size and filename heuristics), and submits it to **LlamaParse v2** via multipart form upload. It returns immediately with a `job_id`.

### Phase 2: Poll and ingest

```
POST /ingest-parse
{
  "job_id": "abc-123",
  "user_id": "user@example.com",
  "filename": "resume.pdf"
}
```

The frontend polls this endpoint every 3 seconds (up to 60 times). Each call checks the LlamaParse job status. When `COMPLETED`:

1. Fetches the markdown result from LlamaParse
2. Chunks the text into overlapping segments (800 chars, 200 overlap)
3. Generates a **BGE-base-en-v1.5** embedding (768 dimensions) for each chunk via Workers AI
4. Deletes any existing vectors for that user's namespace
5. Upserts chunk vectors + a **manifest vector** into Vectorize

The manifest vector stores metadata (chunk count, filename, ingestion timestamp) and serves as a quick existence check via `getByIds`.

## Namespace Strategy

All vectors are namespaced per user:

```
resumes:{user_id}:{resume_id}
```

Where `resume_id` defaults to `"latest"`. This means each user has exactly one active resume. Re-uploading replaces the old one (old vectors are deleted first).

Vector IDs follow a predictable pattern:

- Chunks: `resumes:user@example.com:latest:chunk_0000`
- Manifest: `resumes:user@example.com:latest:manifest`

## RAG Chat

```
POST /chat
{
  "user_id": "user@example.com",
  "message": "What are my strongest technical skills?",
  "resume_id": "latest"
}
```

1. Embeds the question with BGE-base-en-v1.5
2. Queries Vectorize for top 5 matching chunks in the user's namespace
3. Constructs a prompt with the retrieved context
4. Calls **Llama 3.3 70B** (via `langchain-cloudflare`) to generate an answer

The system prompt constrains the LLM to answer based solely on resume context.

## Resume Status Check

```
POST /resume-status
{ "user_id": "user@example.com" }
```

Looks up the manifest vector by its deterministic ID. If found, returns metadata from the manifest (chunk count, filename, ingestion date). This lets the frontend skip the upload step when a resume is already ingested.

## Key Design Decisions

### Why LlamaParse instead of raw text extraction?

PDFs are notoriously inconsistent. LlamaParse handles OCR, tables, multi-column layouts, and produces clean markdown. The v2 API is async (fire-and-forget upload, then poll), which fits the two-phase architecture.

### Why overlapping chunks?

An 800-character chunk with 200-character overlap ensures that sentences spanning chunk boundaries remain searchable. For resumes this is especially important — a skill mentioned at the end of one section often relates to context at the start of the next.

### Why a manifest vector?

Vectorize doesn't have a native "list namespaces" or "check if namespace has data" API. Using `getByIds` on a deterministic manifest ID is an O(1) existence check. The manifest also stores aggregate metadata without additional storage.

### Why Python on Workers?

The worker uses `langchain-cloudflare` and `langchain-core` for prompt templating and LLM invocation. Python Workers run on Pyodide (WebAssembly) — some cold start trade-off, but the LangChain ecosystem is significantly more mature in Python.

## Bindings

| Binding               | Type              | Purpose                              |
| --------------------- | ----------------- | ------------------------------------ |
| `AI`                  | Workers AI        | BGE embeddings + Llama 3.3 70B       |
| `VECTORIZE`           | Vectorize index   | `resume-rag-index` (768-dim, cosine) |
| `LLAMA_CLOUD_API_KEY` | Secret            | LlamaParse v2 API authentication     |
| `API_KEY`             | Secret (optional) | Worker-level authentication          |

## Deployment

```bash
npx wrangler deploy -c workers/resume-rag/wrangler.jsonc
```

The worker is deployed at `https://nomadically-work-resume-rag.eeeew.workers.dev`. The GraphQL resolver in the Next.js app proxies all requests to it.

## Cost Profile

- **Vectorize**: ~$0.04/million queries. A typical resume produces 5-15 chunks.
- **Workers AI embeddings**: Free tier generous; each upload generates N+1 embeddings (chunks + manifest).
- **Workers AI LLM**: Each chat question = 1 inference call.
- **LlamaParse**: Per-page pricing; resumes are typically 1-3 pages.
