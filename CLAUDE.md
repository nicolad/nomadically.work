# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Remote EU job board aggregator. Next.js 16 frontend + GraphQL API backed by Cloudflare D1 (SQLite), with an AI/ML pipeline for job classification, skill extraction, and resume matching.

---

## Common commands

```bash
# Dev
pnpm dev                          # Start Next.js dev server (localhost:3000)
pnpm build                        # Production build
pnpm lint                         # ESLint (next lint)

# GraphQL codegen — run after modifying any schema/**/*.graphql file
pnpm codegen

# Database
pnpm db:generate                  # Generate Drizzle migration files
pnpm db:migrate                   # Apply locally with Drizzle Kit
pnpm db:push                      # Apply migrations to remote D1
pnpm db:studio                    # Drizzle Studio

# Testing
pnpm test:eval                    # Run Vitest evals once (src/evals/remote-eu-eval.test.ts)
pnpm test:eval:watch              # Watch mode
pnpm eval:promptfoo               # Run Promptfoo evaluation suite (sets up Langfuse prompts first)

# Strategy enforcement
pnpm strategy:check               # Validate staged changes against optimization strategy
pnpm strategy:check:all           # Validate all tracked files

# Scripts
pnpm jobs:ingest                  # Ingest jobs from ATS platforms
pnpm jobs:enhance                 # Enhance all jobs with ATS data
pnpm jobs:status                  # Check ingestion status
pnpm jobs:extract-skills          # Extract skills during ingestion
pnpm skills:extract               # Extract skills from jobs
pnpm skills:seed                  # Seed skill taxonomy
pnpm boards:discover              # Discover Ashby boards
pnpm cron:trigger                 # Manually trigger cron job

# Workers
wrangler deploy --config wrangler.d1-gateway.toml   # Deploy D1 gateway
wrangler tail --config wrangler.d1-gateway.toml     # Stream gateway logs
cd workers/ashby-crawler && wrangler dev             # Ashby crawler local dev

# Deployment
pnpm deploy                       # Vercel deploy (runs scripts/deploy.ts)
pnpm deploy:promptfoo             # Deploy Promptfoo worker
wrangler deploy --config workers/ashby-crawler/wrangler.toml  # Ashby crawler
```

---

## Architecture

### Database access

**Production:** `Next.js (Vercel) → D1 Gateway Worker (CF) → D1 Database (binding)`
**Dev fallback:** `Next.js → Cloudflare REST API → D1 Database`

The D1 Gateway Worker (`workers/d1-gateway.ts`) supports batched queries — prefer batching for multi-query operations. Authenticated via `API_KEY` secret. Database schema is in `src/db/schema.ts` (Drizzle ORM), migrations in `migrations/`.

### Data flow

```
1. Discovery:      ATS Sources (D1) --[Cron Worker]--> Trigger Ingestion
2. Board Crawl:    Common Crawl CDX --[ashby-crawler (Rust)]--> Ashby boards → D1
3. Ingestion:      ATS APIs (Greenhouse/Lever/Ashby) --[Insert Worker]--> D1
4. Enhancement:    Job IDs --[Trigger.dev / GraphQL Mutation]--> ATS API --> D1
5. Classification: Unprocessed jobs --[process-jobs (Python) / DeepSeek]--> is_remote_eu --> D1
6. Skill Extract:  Job descriptions --[LLM pipeline]--> Skills → D1
7. Resume Match:   Resumes --[resume-rag (Python) / Vectorize]--> Vector search
8. Serving:        Browser --[Apollo Client]--> /api/graphql --[D1 HTTP]--> Gateway --> D1
9. Evaluation:     Promptfoo / Vitest --[LLM calls]--> Accuracy scores
```

### GraphQL codegen

Configuration in `codegen.ts`. Generates from `schema/**/*.graphql` into `src/__generated__/`:
- Client preset (typed `gql` function, fragment masking)
- `hooks.tsx` — React Apollo hooks
- `types.ts` — TypeScript types (strict scalars)
- `resolvers-types.ts` — Resolver types with `GraphQLContext`

Custom scalars: `DateTime`/`URL`/`EmailAddress` → `string`, `Upload` → `File`, `JSON` → `any`.

### Workers

| Worker | Config | Runtime | Key details |
|---|---|---|---|
| `cron` | `wrangler.toml` | TypeScript | Daily midnight UTC, triggers ATS ingestion |
| `d1-gateway` | `wrangler.d1-gateway.toml` | TypeScript | On-demand HTTP, D1 binding |
| `insert-jobs` | `wrangler.insert-jobs.toml` | TypeScript | Queue-based, still uses Turso (legacy) |
| `process-jobs` | `workers/process-jobs/wrangler.jsonc` | Python/LangGraph | Every 6h + queue, DeepSeek classification |
| `ashby-crawler` | `workers/ashby-crawler/wrangler.toml` | **Rust/WASM** | Common Crawl → D1, rig_compat module |
| `resume-rag` | `workers/resume-rag/wrangler.jsonc` | **Python** | Vectorize + Workers AI |
| `promptfoo-eval` | `wrangler.promptfoo.toml` | TypeScript | On-demand |

### API routes

| Route | Purpose |
|---|---|
| `/api/graphql` | Apollo Server GraphQL endpoint (main API) |
| `/api/inngest` | Inngest webhook handler |
| `/api/text-to-sql` | Natural language → SQL query |
| `/api/enhance-greenhouse-jobs` | Trigger Greenhouse job enhancement |
| `/api/companies/bulk-import` | Bulk import companies |
| `/api/companies/enhance` | Enhance company data |

GraphQL Playground: `http://localhost:3000/api/graphql`. Vercel routes have 60s max duration (`vercel.json`).

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

## Key structural patterns

- **GraphQL schema** lives in `schema/` (by domain: `base/`, `jobs/`, `companies/`, `applications/`, `prompts/`). Query/mutation/fragment documents are in `src/graphql/`.
- **Resolvers** are in `src/apollo/resolvers/` — job resolvers in `src/apollo/resolvers/job/`.
- **ATS ingestion** fetchers: `src/ingestion/{greenhouse,lever,ashby}.ts` — primary job discovery channel.
- **Skills subsystem**: `src/lib/skills/` — taxonomy, extraction, vector ops, filtering.
- **AI agents**: `src/agents/` (legacy SQL/admin), `src/anthropic/` (Claude client, MCP, sub-agents, architect).
- **Database tools for agents**: `src/tools/database/` (introspection + SQL execution).
- **Rust worker**: `workers/ashby-crawler/src/lib.rs` — `rig_compat` module implements VectorStore, Pipeline, Tool patterns for WASM (swap to `rig::*` when rig-core ships wasm32 support).

---

## Optimization Strategy (Two-Layer Model)

See **[OPTIMIZATION-STRATEGY.md](./OPTIMIZATION-STRATEGY.md)** for the full strategy document. Key constraints:

| Meta Approach | Status | What It Guarantees |
|---|---|---|
| **Eval-First** | PRIMARY | Every prompt/model change tested against >= 80% accuracy bar |
| **Grounding-First** | PRIMARY | LLM outputs schema-constrained; skills validated against taxonomy |
| **Multi-Model Routing** | SECONDARY | Cheap model first (Workers AI), escalate on low confidence only |
| **Spec-Driven** | CROSS-CUTTING | GraphQL + Drizzle + Zod schemas as formal contracts |
| **Observability** | EMERGING | Langfuse scoring active; production tracing partial |

The strategy enforcer agent (`src/agents/strategy-enforcer.ts`) is available as a Mastra tool.

---

## Coding conventions

- **Files:** kebab-case (`jobs-query.ts`). **Components:** PascalCase (`JobsSearchBar.tsx`).
- **DB columns:** snake_case. **GraphQL fields:** camelCase. **Variables:** camelCase.
- **Path alias:** `@/*` maps to `./src/*` (tsconfig.json).
- **Module type:** ES Modules (`"type": "module"`).
- Use **Drizzle ORM** for all DB queries — no raw SQL strings.
- Mutations that modify production data must include `isAdminEmail()` guard (from `src/lib/admin.ts`).
- Prefer generated types from `src/__generated__/resolvers-types.ts` over `any`.
- React providers: `*-provider.tsx` in `src/components/`.

---

## Environment variables

Copy `.env.example` to `.env.local`. Key groups: D1 Gateway (or Cloudflare REST API for dev), Clerk auth, AI provider keys (Anthropic, DeepSeek, OpenAI, Gemini), Langfuse/LangSmith observability, admin email, Inngest, app URL. See `.env.example` for full list.

---

## Known issues

### Performance
- **Fetch-all-then-filter** in `src/apollo/resolvers/job/jobs-query.ts` — loads entire `jobs` table before paginating. Fix: push WHERE/LIMIT/OFFSET to SQL.
- **Full table scan** in `src/apollo/resolvers/job/enhance-job.ts` — fetches all jobs to find one by `external_id`.
- **N+1 queries** for skills, company, and ATS board sub-fields — no DataLoader.

### Security
- `enhanceJobFromATS` mutation has no auth check.
- CORS on D1 Gateway is `*`.
- No GraphQL query complexity/depth limiting.

### Type safety
- `ignoreBuildErrors: true` in `next.config.ts` masks TS errors in builds.
- 283+ `any` types in resolvers.

### Dead code
- `workers/cron.ts` and `workers/insert-jobs.ts` still reference Turso (libsql) instead of D1.
- `src/inngest/`, `src/workflows/`, `src/memory/` — mostly TODO stubs.
- `src/observability/` — Langfuse exporter disabled (Edge Runtime zlib issue).

### Dependencies
- `@ai-sdk/anthropic` and `@mastra/core` pinned to `"latest"` — should use specific versions.
- `@libsql/client` and `pg` are likely unused after D1 migration.

---

## ashby-crawler (Rust/WASM) reference

```bash
cargo install worker-build                    # Install WASM build tool (once)
cd workers/ashby-crawler && wrangler dev      # Local dev
wrangler deploy --config workers/ashby-crawler/wrangler.toml  # Deploy
wrangler d1 execute nomadically-work-db --remote \
  --file workers/ashby-crawler/migrations/0001_init/up.sql    # Apply migrations
```

Key endpoints: `/crawl` (paginated CC crawl), `/boards` (list/search), `/search` (TF-IDF vector search), `/enrich` / `/enrich-all` (enrichment pipeline), `/tools` (OpenAI function-calling schemas), `/indexes`, `/progress`, `/stats`.

---

## Additional resources

- **[SKILLS-REMOTE-WORK-EU.md](./SKILLS-REMOTE-WORK-EU.md)** — Curated agent skills and subagents for remote EU job market focus.
- **[OPTIMIZATION-STRATEGY.md](./OPTIMIZATION-STRATEGY.md)** — Full Two-Layer Model strategy document.
