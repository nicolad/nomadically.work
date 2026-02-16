# Process Jobs — Cloudflare Python Worker

A Python-based Cloudflare Worker that enhances and classifies job postings,
following the [langchain-cloudflare](../../langchain-cloudflare/) Python Worker pattern.

## Packages Used

- **langchain-cloudflare** (PyPI) — `ChatCloudflareWorkersAI` for Workers AI pre-screen classification via the `AI` binding
- **langgraph-checkpoint-cloudflare-d1** (PyPI) — `CloudflareD1Saver` for persisting pipeline run checkpoints to D1
- **DeepSeek API** — primary OpenAI-compatible classifier for remote-EU eligibility

## Pipeline

1. **Phase 1 — ATS Enhancement**: Fetches rich data from Greenhouse / Lever / Ashby APIs
   and saves directly to the D1 database.
2. **Phase 2 — Classification**:
   - **Step A**: Quick Workers AI pre-screen via `ChatCloudflareWorkersAI` (free, fast) — high-confidence negatives skip DeepSeek
   - **Step B**: DeepSeek API full classification for remaining jobs
3. **Checkpoint**: Saves run stats to D1 via `CloudflareD1Saver`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | D1 binding health check |
| `POST` | `/` | Full pipeline (enhance + classify + checkpoint) |
| `POST` | `/enhance` | Phase 1 only — ATS enhancement |
| `POST` | `/classify` | Phase 2 only — classification |

All POST endpoints accept `{"limit": N}` in the body (default: 50).

## Authentication

Set `CRON_SECRET` via `wrangler secret put CRON_SECRET`. Pass it as `Authorization: Bearer <secret>`.

## Secrets

```bash
# Required for DeepSeek classification
npx wrangler secret put DEEPSEEK_API_KEY

# Optional authentication
npx wrangler secret put CRON_SECRET

# Optional — for langgraph-checkpoint-cloudflare-d1 checkpointing
npx wrangler secret put CF_ACCOUNT_ID
npx wrangler secret put CF_D1_DATABASE_ID
npx wrangler secret put CF_D1_API_TOKEN
```

## Development

```bash
cd workers/process-jobs

# Install deps
npm install
uv sync

# Dev (uses remote D1 + AI)
npm run dev

# Deploy
npm run deploy
```
