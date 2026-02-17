# Process Jobs — Cloudflare Python Worker

A Python-based Cloudflare Worker that enhances, role-tags, and classifies job postings,
following the [langchain-cloudflare](../../langchain-cloudflare/) Python Worker pattern.

## Packages Used

- **langchain-cloudflare** (PyPI) — `ChatCloudflareWorkersAI` for Workers AI role tagging & EU-remote classification via the `AI` binding
- **langgraph-checkpoint-cloudflare-d1** (PyPI) — `CloudflareD1Saver` for persisting pipeline run checkpoints to D1
- **DeepSeek API** — fallback LLM classifier when Workers AI is uncertain or unavailable

## Pipeline

```
new → enhanced → role-match ──→ eu-remote
              └→ role-nomatch   non-eu
```

1. **Phase 1 — ATS Enhancement**: Fetches rich data from Greenhouse / Lever / Ashby APIs
   and saves directly to the D1 database. (`new` → `enhanced`)
2. **Phase 2 — Role Tagging**: Three-tier detection of target roles (Frontend/React, AI Engineer):
   - **Tier 1**: Keyword heuristic (free, instant)
   - **Tier 2**: Workers AI via `ChatCloudflareWorkersAI` (free, Cloudflare quota)
   - **Tier 3**: DeepSeek API (paid, fallback only)
   - Non-target roles are marked terminal (`role-nomatch`) and skip Phase 3.
   - (`enhanced` → `role-match` | `role-nomatch`)
3. **Phase 3 — EU Remote Classification**: Workers AI primary, DeepSeek fallback.
   Only runs on `role-match` jobs — irrelevant roles never reach this phase.
   (`role-match` → `eu-remote` | `non-eu`)
4. **Checkpoint**: Saves run stats to D1 via `CloudflareD1Saver`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | D1 binding + bindings health check |
| `POST` | `/` | Enqueue (async via CF Queue, returns immediately) |
| `POST` | `/enhance` | Phase 1 only — ATS enhancement |
| `POST` | `/tag` | Phase 2 only — role tagging |
| `POST` | `/classify` | Phase 3 only — EU-remote classification |
| `POST` | `/process-sync` | Full pipeline (sync, for debugging) |

All POST endpoints accept `{"limit": N}` in the body (default: 50).

## D1 Migration

Run once before deploying the three-phase pipeline:

```sql
ALTER TABLE jobs ADD COLUMN role_frontend_react INTEGER;
ALTER TABLE jobs ADD COLUMN role_ai_engineer    INTEGER;
ALTER TABLE jobs ADD COLUMN role_confidence     TEXT;
ALTER TABLE jobs ADD COLUMN role_reason         TEXT;
ALTER TABLE jobs ADD COLUMN role_source         TEXT;
```

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
