# CLAUDE.md — nomadically.work

Remote EU job board aggregator. Next.js 16 frontend + GraphQL API backed by Cloudflare D1 (SQLite), with an AI/ML pipeline for job classification, skill extraction, and resume matching.

---

## Repository layout

```
src/
  app/              # Next.js App Router — pages + API routes
    api/
      graphql/      # Apollo Server GraphQL endpoint
      inngest/      # Inngest webhook handler
      text-to-sql/  # Natural language → SQL endpoint
      enhance-greenhouse-jobs/  # Greenhouse enhancement endpoint
      companies/
        bulk-import/ # Bulk company import
        enhance/     # Company enhancement
    jobs/           # Job listing + detail pages
    companies/      # Company listing + detail pages
    applications/   # Application tracking page
    chats/          # Chats page
    prompts/        # Prompt management (Langfuse/LangSmith)
    query/          # SQL query builder page
    resume/         # Resume page
    settings/       # User settings page
    sign-in/        # Clerk sign-in
    sign-up/        # Clerk sign-up
  apollo/           # Apollo Server 5 — schema, resolvers, context, client
    resolvers/
      job/          # Job queries + mutations (jobs-query, enhance-job, process-all-jobs)
  db/               # Drizzle ORM schema, D1 HTTP client, D1 Gateway client
  graphql/          # GraphQL query/mutation/fragment documents (.graphql files)
  __generated__/    # GraphQL codegen output (types, hooks, resolvers-types)
  components/       # React components (providers, lists, search bars, admin)
  agents/           # AI agents (job classifier, SQL agent, admin assistant)
  anthropic/        # Anthropic Claude integration (client, MCP, sub-agents, architect)
  brave/            # Brave Search API integration (job discovery, search agent)
  deepseek/         # DeepSeek LLM client + utilities
  google/           # Google Search + GenAI agent
  openrouter/       # OpenRouter LLM provider
  llm/              # Shared LLM utilities
  ingestion/        # ATS fetchers — Greenhouse, Lever, Ashby
  evals/            # Vitest-based classifier eval regression tests
  promptfoo/        # Promptfoo evaluation config, providers, assertions, schemas
  tools/            # Agent tool definitions (DB introspection, SQL execution/generation)
  trigger/          # Trigger.dev background functions
  inngest/          # Inngest background functions (mostly stubs)
  mastra/           # Mastra agent/workflow setup
  workflows/        # Mastra workflows (mostly stubs)
  memory/           # Personalization/preference agents (stubs)
  workspace/        # Workspace management — evidence bundles, ops skills
  browser-rendering/ # Company data extraction via headless browser
  observability/    # Langfuse exporter — currently disabled (Edge Runtime zlib issue)
  langfuse/         # Langfuse fetch-based client + scoring
  langsmith/        # LangSmith integration
  otel/             # OpenTelemetry initialization
  lib/              # Shared utilities
    skills/         # Skills subsystem — taxonomy, filtering, extraction, vector ops
  config/           # Environment variable loading
  constants/        # App-wide constants (admin email, ATS configs)

workers/
  ashby-crawler/          # Rust/WASM CF Worker — Common Crawl → D1 board discovery
    src/lib.rs             # Main entry: rig_compat module + route handlers
    Cargo.toml             # cdylib crate, worker = "0.4" (no tokio/reqwest — WASM)
    wrangler.toml
    migrations/0001_init/up.sql
  resume-rag/             # Python CF Worker — resume RAG with Vectorize + Workers AI
    src/entry.py           # Main RAG entrypoint
    wrangler.jsonc
  process-jobs/           # Python/LangGraph CF Worker — DeepSeek job classification
    src/entry.py
    wrangler.jsonc
  cron.ts                 # Daily job discovery via Brave Search (still uses Turso)
  d1-gateway.ts           # D1 database access gateway
  insert-jobs.ts          # Job insertion + queue (still uses Turso)
  promptfoo-eval.ts       # Promptfoo evaluation worker

schema/
  base/             # Root Query/Mutation + scalars + user-settings
  jobs/             # Job types, queries, mutations
  companies/        # Company types + CRUD
  applications/     # Application tracking
  prompts/          # Langfuse/LangSmith prompt management
  langsmith/        # LangSmith queries

scripts/            # One-off CLI tools (ingestion, enhancement, evals, DB ops)
migrations/         # Drizzle migration files + meta snapshots
.github/
  instructions/     # Copilot/AI instructions for Trigger.dev tasks
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
| AI/ML | Vercel AI SDK, Anthropic Claude (+ Agent SDK), DeepSeek, Google ADK, Mastra, OpenRouter |
| Background jobs | Trigger.dev, Inngest, Cloudflare Workers (cron + queues) |
| Observability | Langfuse, LangSmith, OpenTelemetry (partially active) |
| Evaluation | Promptfoo, Vitest, Mastra Evals |
| Deployment | Vercel (app), Cloudflare Workers (workers) |
| Package manager | pnpm 10.10 |
| UI | Radix UI (Themes + Icons) |

---

## Common commands

```bash
# Dev
pnpm dev                          # Start Next.js dev server (localhost:3000)
pnpm build                        # Production build
pnpm lint                         # ESLint (next lint)

# GraphQL codegen
pnpm codegen                      # Regenerate types from schema/**/*.graphql

# Database
pnpm db:generate                  # Generate Drizzle migration files
pnpm db:migrate                   # Apply locally with Drizzle Kit
pnpm db:push                      # Apply migrations to remote D1
pnpm db:studio                    # Drizzle Studio

# Workers
wrangler deploy --config wrangler.d1-gateway.toml   # Deploy D1 gateway
wrangler tail --config wrangler.d1-gateway.toml     # Stream gateway logs
wrangler deploy --config wrangler.promptfoo.toml    # Deploy Promptfoo eval worker

# Background jobs
pnpm trigger:dev                  # Trigger.dev local dev
pnpm inngest:dev                  # Inngest local dev

# Scripts
pnpm jobs:ingest                  # Ingest jobs from ATS platforms
pnpm jobs:enhance                 # Enhance all jobs with ATS data
pnpm jobs:status                  # Check ingestion status
pnpm jobs:extract-skills          # Extract skills during ingestion
pnpm skills:extract               # Extract skills from jobs
pnpm skills:seed                  # Seed skill taxonomy
pnpm boards:discover              # Discover Ashby boards
pnpm cron:trigger                 # Manually trigger cron job

# Evals
pnpm test:eval                    # Run Vitest evals once
pnpm test:eval:watch              # Watch mode
pnpm eval:promptfoo               # Run Promptfoo evaluation suite
pnpm eval:promptfoo:setup         # Setup Langfuse prompts for eval

# Deployment
pnpm deploy                       # Run deploy script
pnpm deploy:promptfoo             # Deploy Promptfoo worker
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

The D1 Gateway Worker (`workers/d1-gateway.ts`) supports batched queries. Prefer batching for multi-query operations. The gateway is authenticated via `API_KEY` secret.

Database schema is defined in `src/db/schema.ts` using Drizzle ORM. Migrations output to `migrations/`. The D1 database ID is `632b9c57-8262-40bd-86c2-bc08beab713b`.

---

## Data flow

```
1. Discovery:      Brave Search API --[Cron Worker]--> Job URLs
2. Board Crawl:    Common Crawl CDX --[ashby-crawler (Rust)]--> Ashby boards → D1
3. Ingestion:      ATS APIs (Greenhouse/Lever/Ashby) --[Insert Worker]--> D1
4. Enhancement:    Job IDs --[Trigger.dev / GraphQL Mutation]--> ATS API --> D1
5. Classification: Unprocessed jobs --[process-jobs (Python) / DeepSeek]--> is_remote_eu --> D1
6. Skill Extract:  Job descriptions --[LLM pipeline]--> Skills → D1
7. Resume Match:   Resumes --[resume-rag (Python) / Vectorize]--> Vector search
8. Serving:        Browser --[Apollo Client]--> /api/graphql --[D1 HTTP]--> Gateway --> D1
9. Evaluation:     Promptfoo / Vitest --[LLM calls]--> Accuracy scores
```

---

## API routes

| Route | Purpose |
|---|---|
| `/api/graphql` | Apollo Server GraphQL endpoint (main API) |
| `/api/inngest` | Inngest webhook handler |
| `/api/text-to-sql` | Natural language → SQL query |
| `/api/enhance-greenhouse-jobs` | Trigger Greenhouse job enhancement |
| `/api/companies/bulk-import` | Bulk import companies |
| `/api/companies/enhance` | Enhance company data |

GraphQL Playground: `http://localhost:3000/api/graphql`

Key query pattern:
```graphql
query GetJobs {
  jobs(limit: 20, status: "active") {
    jobs { id title company_key location url }
    totalCount
  }
}
```

Vercel API routes have a 60-second max duration (`vercel.json`).

---

## Workers

| Worker | Schedule | Config | Runtime | Key Bindings |
|---|---|---|---|---|
| `cron` | Daily midnight UTC | `wrangler.toml` | TypeScript | D1, Brave API |
| `d1-gateway` | On-demand HTTP | `wrangler.d1-gateway.toml` | TypeScript | D1 |
| `insert-jobs` | On-demand + Queue | `wrangler.insert-jobs.toml` | TypeScript | D1, Queue |
| `process-jobs` | Every 6 hours + Queue | `workers/process-jobs/wrangler.jsonc` | Python/LangGraph | D1, Workers AI, Queue |
| `promptfoo-eval` | On-demand | `wrangler.promptfoo.toml` | TypeScript | — |
| `ashby-crawler` | On-demand HTTP | `workers/ashby-crawler/wrangler.toml` | **Rust/WASM** | D1 |
| `resume-rag` | On-demand HTTP | `workers/resume-rag/wrangler.jsonc` | **Python** | Vectorize, Workers AI |

### ashby-crawler (Rust/WASM)

Crawls Common Crawl CDX API to discover Ashby job boards and persists them to D1. Implements Rig framework patterns natively for WASM (rig-core doesn't compile to `wasm32-unknown-unknown` due to tokio/reqwest).

**Build & deploy:**
```bash
cargo install worker-build                    # Install WASM build tool (once)
cd workers/ashby-crawler && wrangler dev      # Local dev
wrangler deploy --config workers/ashby-crawler/wrangler.toml  # Deploy

# Apply migrations to remote D1
wrangler d1 execute nomadically-work-db --remote \
  --file workers/ashby-crawler/migrations/0001_init/up.sql
```

**Endpoints:**

| Endpoint | Description |
|---|---|
| `GET /crawl?crawl_id=CC-MAIN-2025-05&pages_per_run=3` | Paginated CC crawl → D1 (resumable) |
| `GET /boards?limit=&offset=&search=` | List/search boards from D1 |
| `GET /search?q=fintech&top_n=10` | TF-IDF vector search |
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

### resume-rag (Python)

RAG worker for resume parsing and semantic search using Cloudflare Vectorize and Workers AI. Uses Python Workers runtime.

**Bindings:** Vectorize (`resume-rag-index`), Workers AI

### process-jobs (Python/LangGraph)

Job classification worker using DeepSeek via LangGraph. Runs on a 6-hour cron schedule, also supports queue-based processing with a dead letter queue.

**Bindings:** D1, Workers AI, Queue (`process-jobs-queue`)

---

## GraphQL codegen

Configuration in `codegen.ts`. Generates four outputs from `schema/**/*.graphql`:

| Output | Content |
|---|---|
| `src/__generated__/` (client preset) | Typed `gql` function, fragment masking |
| `src/__generated__/hooks.tsx` | React Apollo hooks |
| `src/__generated__/types.ts` | TypeScript types (strict scalars) |
| `src/__generated__/resolvers-types.ts` | Resolver types with `GraphQLContext` |

Custom scalar mappings: `DateTime` → `string`, `URL` → `string`, `EmailAddress` → `string`, `Upload` → `File`, `JSON` → `any`.

Run `pnpm codegen` after modifying any `.graphql` schema file.

---

## Key known issues

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
- `@typescript-eslint/no-explicit-any: off` in `.eslintrc.json` — disables any-type warnings.
- 283+ `any` types in resolvers — use generated types from `src/__generated__/resolvers-types.ts`.

### Dead code / incomplete
- `workers/cron.ts` and `workers/insert-jobs.ts` still reference Turso (libsql) instead of D1.
- `src/inngest/`, `src/workflows/`, `src/memory/` — mostly TODO stubs.
- `src/observability/` — Langfuse exporter disabled (Edge Runtime zlib incompatibility).
- 39 TODO/FIXME/HACK comments across 17 files.

### Dependencies
- `@ai-sdk/anthropic` and `@mastra/core` pinned to `"latest"` — should be pinned to specific versions.
- `@apollo/server` should be `>=5.4.0` (fixes DoS CVE GHSA-mp6q-xf9x-fwf7).
- `@libsql/client` and `pg` are likely unused after D1 migration — candidates for removal.

---

## Coding conventions

- **Files:** kebab-case (`jobs-query.ts`, `enhance-job.ts`)
- **React components:** PascalCase (`JobsSearchBar.tsx`)
- **DB columns:** snake_case; **GraphQL fields:** camelCase
- **Variables:** camelCase
- **Path alias:** `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- **Module type:** ES Modules (`"type": "module"` in `package.json`)
- Use **Drizzle ORM** for all DB queries — parameterized automatically, no raw SQL strings.
- Resolvers must always include admin check (`isAdminEmail` from `src/lib/admin.ts`) for mutations that mutate production data.
- Avoid `any` — prefer generated resolver types from `src/__generated__/resolvers-types.ts`.
- GraphQL schema files live in `schema/`, query documents in `src/graphql/`.
- React providers follow the pattern: `*-provider.tsx` in `src/components/`.

---

## Environment variables

Copy `.env.example` to `.env.local`. Required variables:

```bash
# D1 Gateway (production — recommended)
D1_GATEWAY_URL=https://d1-gateway.<subdomain>.workers.dev
D1_GATEWAY_KEY=<api-key>

# Or Cloudflare REST API (dev only — rate limited)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_D1_DATABASE_ID=632b9c57-8262-40bd-86c2-bc08beab713b
CLOUDFLARE_API_TOKEN=

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# AI providers
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=               # Google ADK
BRAVE_API_KEY=                # Brave Search (job discovery)

# Observability (optional)
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASE_URL=
LANGSMITH_API_KEY=

# Admin
ADMIN_EMAIL=admin@example.com

# Background jobs
INNGEST_EVENT_KEY=
CLASSIFY_JOBS_WORKER_URL=     # Python process-jobs worker URL

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Testing

- `pnpm test:eval` — runs `src/evals/remote-eu-eval.test.ts` (only existing test file)
- `pnpm eval:promptfoo` — LLM evaluation via Promptfoo (configures Langfuse prompts first)
- Vitest config: `vitest.config.ts` — Node environment, globals enabled, `@` path alias
- No component, resolver, or E2E tests yet
- Promptfoo assertions in `src/promptfoo/assertions/` validate URL quality, aggregator detection, binary classification

---

## Deployment

```bash
# App (Vercel)
vercel deploy
# or: pnpm deploy (runs scripts/deploy.ts)

# D1 Gateway Worker
wrangler deploy --config wrangler.d1-gateway.toml

# Database migrations
wrangler d1 migrations apply nomadically-work-db --remote
# or: pnpm db:push

# Promptfoo evaluation worker
pnpm deploy:promptfoo

# Ashby crawler (Rust/WASM)
wrangler deploy --config workers/ashby-crawler/wrangler.toml

# Process-jobs (Python)
cd workers/process-jobs && npm run deploy

# Resume RAG (Python)
cd workers/resume-rag && wrangler deploy
```

---

## Key source modules

### AI/LLM integrations

| Module | Purpose | Key files |
|---|---|---|
| `src/anthropic/` | Claude API client, MCP, sub-agents, architect agent | `client.ts`, `mcp.ts`, `subagents.ts`, `agents/architect.ts` |
| `src/brave/` | Brave Search for job discovery, LLM context extraction | `search-agent.ts`, `job-search-runner.ts`, `llm-context.ts` |
| `src/deepseek/` | DeepSeek LLM client for classification | `client.ts` |
| `src/google/` | Google Search + GenAI agent | `search-agent.ts` |
| `src/openrouter/` | OpenRouter multi-provider LLM access | `provider.ts`, `agents.ts` |
| `src/agents/` | Legacy agents — SQL generation, admin assistant | `sql-generation-agent.ts`, `admin-assistant.ts` |
| `src/tools/database/` | Agent tools for DB introspection + SQL execution | `database-introspection-tool.ts`, `sql-execution-tool.ts` |

### Data pipeline

| Module | Purpose |
|---|---|
| `src/ingestion/` | ATS platform fetchers (Greenhouse, Lever, Ashby) |
| `src/lib/skills/` | Skill taxonomy, extraction workflow, vector ops, filtering |
| `src/evals/` | Remote EU job classifier evaluation tests |
| `src/promptfoo/` | LLM output evaluation suite with custom assertions |

### Infrastructure

| Module | Purpose |
|---|---|
| `src/db/` | Drizzle schema (`schema.ts`), D1 HTTP client (`d1-http.ts`), Gateway client (`gateway-client.ts`) |
| `src/apollo/` | GraphQL server setup, resolvers, context with Clerk auth |
| `src/mastra/` | Mastra framework — actions, workflows, Inngest integration, storage |
| `src/trigger/` | Trigger.dev function definitions |

---

## AI Agent Skills & Subagents

See **[SKILLS-REMOTE-WORK-EU.md](./SKILLS-REMOTE-WORK-EU.md)** for curated Claude Agent Skills and Subagents tailored to nomadically.work with a focus on **remote work in EU**.

This document maps:
- **Frontend & UI/UX Skills**: Next.js optimization, React design patterns, performance
- **Backend & GraphQL Skills**: API architecture, database optimization, D1 Gateway
- **AI/LLM Skills**: Job classification prompts, bias detection, skill extraction
- **Data Engineering Skills**: ATS ingestion pipelines, ETL workflows, skill taxonomy
- **Infrastructure Skills**: Cloudflare Workers (D1, Vectorize, Queues), Vercel deployment, DevOps
- **QA/Testing Skills**: Classifier evaluation, regression tests, accessibility compliance
- **Business/Product Skills**: Product management, SEO, content marketing for EU remote jobs
- **Security/Compliance Skills**: GDPR compliance, security audits, PII protection
- **EU-specific focus**: Remote work signals, timezone compliance, regional variations across EU markets

Integration roadmap: Foundation → AI Pipeline → ML Evaluation → Deployment & Scale → Product & Growth
