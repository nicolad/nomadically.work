# CLAUDE.md — nomadically.work

Remote EU job board aggregator. Next.js 16 frontend + GraphQL API backed by Cloudflare D1 (SQLite), with an AI/ML pipeline for job classification and skill extraction.

---

## Repository layout

```
src/
  app/          # Next.js App Router pages (jobs, companies, settings, prompts)
  apollo/       # Apollo Server, GraphQL resolvers, context
  db/           # Drizzle schema, D1 HTTP client, D1 Gateway client
  agents/       # AI agents (job classifier, SQL agent, admin assistant)
  ingestion/    # ATS fetchers — Greenhouse, Lever, Ashby
  evals/        # Vitest-based classifier eval regression tests
  promptfoo/    # Promptfoo evaluation config for LLM outputs
  inngest/      # Inngest background functions (mostly stubs)
  workflows/    # Mastra workflows (mostly stubs)
  memory/       # Personalization/preference agents (all stubs)
  observability/# Langfuse exporter — currently disabled
  langfuse/     # Langfuse fetch-based client
  langsmith/    # LangSmith integration
  mastra/       # Mastra agent/workflow setup
  lib/          # Shared utilities (skills, filtering, etc.)
  components/   # React components
  constants/    # App-wide constants (admin email, etc.)

workers/
  ashby-crawler/      # Rust/WASM CF Worker — Common Crawl → D1 board discovery + Rig-compat vector search
    src/lib.rs        # Main entry: rig_compat module + all route handlers
    Cargo.toml        # cdylib crate, worker = "0.4" only (no tokio/reqwest — WASM constraint)
    wrangler.toml     # Worker config, shares nomadically-work-db D1 binding
    migrations/0001_init/up.sql  # ashby_boards, crawl_progress, board_embeddings tables
  cron.ts             # Daily job discovery via Brave Search (still uses Turso — needs migration)
  d1-gateway.ts       # D1 database access gateway
  insert-jobs.ts      # Job insertion + queue (still uses Turso — needs migration)
  process-jobs/       # Python/LangGraph worker for DeepSeek classification

schema/
  base/         # Scalars + root Query/Mutation
  jobs/         # Job types, queries, mutations
  companies/    # Company types + CRUD
  applications/ # Application tracking
  prompts/      # Langfuse/LangSmith prompt management
  langsmith/    # LangSmith queries

scripts/        # One-off CLI tools (ingestion, enhancement, evals, DB ops)
migrations/     # Drizzle migration files
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, App Router |
| Language | TypeScript 5.9 |
| Database | Cloudflare D1 (SQLite) via D1 Gateway Worker |
| ORM | Drizzle ORM |
| API | Apollo Server 5 (GraphQL) |
| Auth | Clerk |
| AI/ML | Vercel AI SDK, Mastra, DeepSeek, Google ADK |
| Background jobs | Trigger.dev, Inngest, Cloudflare Workers (cron) |
| Observability | Langfuse, LangSmith (partially active) |
| Evaluation | Promptfoo, Vitest, Mastra Evals |
| Deployment | Vercel (app), Cloudflare Workers (workers) |
| Package manager | pnpm 10 |

---

## Common commands

```bash
# Dev
pnpm dev                          # Start Next.js dev server (localhost:3000)
pnpm build                        # Production build
pnpm lint                         # ESLint

# GraphQL codegen
pnpm codegen                      # Regenerate types from schema

# Database
pnpm db:generate                  # Generate Drizzle migration files
pnpm db:migrate                   # Apply locally with Drizzle Kit
pnpm db:push                      # Apply migrations to remote D1
pnpm db:studio                    # Drizzle Studio

# Workers
wrangler deploy --config wrangler.d1-gateway.toml   # Deploy D1 gateway
wrangler tail --config wrangler.d1-gateway.toml     # Stream gateway logs
wrangler dev --config wrangler.classify-jobs.toml   # Local classify-jobs worker

# Background jobs
pnpm trigger:dev                  # Trigger.dev local dev
pnpm inngest:dev                  # Inngest local dev

# Scripts
pnpm jobs:ingest                  # Ingest jobs from ATS platforms
pnpm jobs:enhance                 # Enhance all jobs with ATS data
pnpm skills:extract               # Extract skills from jobs
pnpm boards:discover              # Discover Ashby boards

# Evals
pnpm test:eval                    # Run Vitest evals once
pnpm test:eval:watch              # Watch mode
pnpm eval:promptfoo               # Run Promptfoo evaluation suite
```

---

## Architecture — database access

**Production:**
```
Next.js (Vercel) → D1 Gateway Worker (CF) → D1 Database (binding)
```

**Dev fallback:**
```
Next.js → Cloudflare REST API → D1 Database
```

The D1 Gateway Worker supports batched queries. Prefer batching for multi-query operations.

---

## Data flow

```
1. Discovery:     Brave Search API --[Cron Worker]--> Job URLs
2. Ingestion:     ATS APIs (Greenhouse/Lever/Ashby) --[Insert Worker]--> D1
3. Enhancement:   Job IDs --[Trigger.dev / GraphQL Mutation]--> ATS API --> D1
4. Classification: Unprocessed jobs --[Classify Worker / DeepSeek]--> is_remote_eu --> D1
5. Serving:       Browser --[Apollo Client]--> /api/graphql --[D1 HTTP]--> Gateway --> D1
6. Evaluation:    Promptfoo / Vitest --[LLM calls]--> Accuracy scores
```

---

## Key known issues (from architecture review, 2026-02-17)

### Performance
- **Fetch-all-then-filter anti-pattern** in `src/apollo/resolvers/job/jobs-query.ts` — loads entire `jobs` table into memory before paginating. Fix: push WHERE/LIMIT/OFFSET to SQL.
- **Full table scan** in `src/apollo/resolvers/job/enhance-job.ts` — fetches all jobs to find one by `external_id`. Fix: query by `external_id` in SQL.
- **N+1 queries** for skills, company, and ATS board sub-fields — DataLoader not implemented.

### Security
- `enhanceJobFromATS` mutation has no auth check — add `isAdminEmail()` guard.
- CORS on D1 Gateway is `*` — restrict to specific origins.
- No GraphQL query complexity/depth limiting.

### Type safety
- `ignoreBuildErrors: true` in `next.config.ts` — masks all TS errors in builds.
- 283+ `any` types in resolvers — use generated types from `src/__generated__/`.

### Dead code / incomplete
- `workers/cron.ts` and `workers/insert-jobs.ts` still reference Turso (libsql) instead of D1.
- `src/inngest/`, `src/workflows/`, `src/memory/` — mostly TODO stubs.
- `src/observability/` — Langfuse exporter disabled (Edge Runtime zlib incompatibility).
- 35+ TODO comments across the codebase.

### Dependencies
- `@ai-sdk/anthropic` and `@mastra/core` pinned to `"latest"` — should be pinned to specific versions.
- `@apollo/server` should be `>=5.4.0` (fixes DoS CVE GHSA-mp6q-xf9x-fwf7).
- `@libsql/client` and `pg` are likely unused after D1 migration.

---

## Coding conventions

- Files: kebab-case (`jobs-query.ts`, `enhance-job.ts`)
- React components: PascalCase
- DB columns: snake_case; GraphQL fields: camelCase
- Variables: camelCase
- Use Drizzle ORM for all DB queries — parameterized automatically, no raw SQL strings.
- Resolvers must always include admin check (`isAdminEmail`) for mutations that mutate production data.
- Avoid `any` — prefer generated resolver types from `src/__generated__/resolvers-types.ts`.

---

## Environment variables

Copy `.env.example` to `.env.local`. Required variables:

```bash
# D1 Gateway (production)
D1_GATEWAY_URL=https://d1-gateway.<subdomain>.workers.dev
D1_GATEWAY_KEY=<api-key>

# Or Cloudflare REST API (dev only)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_D1_DATABASE_ID=
CLOUDFLARE_API_TOKEN=

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# AI providers
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=
OPENROUTER_API_KEY=

# Observability
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGSMITH_API_KEY=
```

---

## Workers

| Worker | Schedule | Config | Runtime |
|---|---|---|---|
| `cron` | Daily midnight UTC | `wrangler.toml` | TypeScript |
| `classify-jobs` | Every 6 hours | `wrangler.classify-jobs.toml` | TypeScript |
| `insert-jobs` | On-demand HTTP | `wrangler.insert-jobs.toml` | TypeScript |
| `d1-gateway` | On-demand HTTP | `wrangler.d1-gateway.toml` | TypeScript |
| `process-jobs` | On-demand HTTP | `workers/process-jobs/wrangler.jsonc` | Python/LangGraph |
| `promptfoo-eval` | On-demand | `wrangler.promptfoo.toml` | TypeScript |
| `ashby-crawler` | On-demand HTTP | `workers/ashby-crawler/wrangler.toml` | **Rust/WASM** |

### ashby-crawler (Rust/WASM)

Crawls Common Crawl CDX API to discover Ashby job boards and persists them to D1. Implements Rig framework patterns natively for WASM (rig-core doesn't compile to `wasm32-unknown-unknown` due to tokio/reqwest).

**Build & deploy:**
```bash
# Install the WASM build tool (once)
cargo install worker-build

# Local dev
cd workers/ashby-crawler && wrangler dev

# Deploy
wrangler deploy --config workers/ashby-crawler/wrangler.toml

# Apply migrations to remote D1 (run from project root)
wrangler d1 execute nomadically-work-db --remote \
  --file workers/ashby-crawler/migrations/0001_init/up.sql
```

**Endpoints:**

| Endpoint | Description |
|---|---|
| `GET /crawl?crawl_id=CC-MAIN-2025-05&pages_per_run=3` | Paginated CC crawl → D1 (resumable) |
| `GET /boards?limit=&offset=&search=` | List/search boards from D1 |
| `GET /search?q=fintech&top_n=10` | TF-IDF vector search (rig_compat::InMemoryVectorStore) |
| `GET /enrich?slug=figma` | Run enrichment pipeline on one board |
| `GET /enrich-all?limit=50` | Batch enrich + tag distribution |
| `GET /tools` | OpenAI-compatible function-calling schemas |
| `GET /indexes` | List available Common Crawl indexes |
| `GET /progress` | Crawl progress for all runs |
| `DELETE /progress?crawl_id=` | Reset a crawl to re-run it |
| `GET /stats` | Total boards, by-crawl breakdown, newest 10 |

**rig_compat module** (in `src/lib.rs`):

| Pattern | Type | Notes |
|---|---|---|
| `VectorStore` | `InMemoryVectorStore` | TF-IDF + cosine similarity, no LLM needed |
| `Pipeline` | `Pipeline<I,O>` | Composable `.then()` chain: normalize → extract → score → tag |
| `Tool` | `ToolDefinition` | OpenAI function schema export for future LLM agent wiring |

When rig-core ships `wasm32` support, swap `rig_compat::*` → `rig::*` with minimal changes.

---

## GraphQL API

Playground: `http://localhost:3000/api/graphql`

Key query pattern:
```graphql
query GetJobs {
  jobs(limit: 20, status: "active") {
    jobs { id title company_key location url }
    totalCount
  }
}
```

---

## Testing

- `pnpm test:eval` — runs `src/evals/remote-eu-eval.test.ts` (only existing test file)
- No component, resolver, or E2E tests yet
- `pnpm eval:promptfoo` — LLM evaluation via Promptfoo

---

## Deployment

```bash
# App
vercel deploy

# D1 Gateway Worker
wrangler deploy --config wrangler.d1-gateway.toml

# Database migrations
wrangler d1 migrations apply nomadically-work-db --remote
```
