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

---

## Domain-specific patterns

> An MCPDoc MCP server is configured in `.claude/settings.json` with docs for Drizzle, Next.js, Vercel AI SDK, Trigger.dev, Mastra, Cloudflare Workers, and Inngest. Call `list_doc_sources` to see available sources, then `fetch_docs` on specific URLs when you need deeper detail on any API.

---

### Drizzle ORM + D1

**Setup** — always cast `D1HttpClient` as `any` (it implements a subset of the CF binding interface):

```ts
import { drizzle } from "drizzle-orm/d1";
import { createD1HttpClient } from "@/db/d1-http";

const db = drizzle(createD1HttpClient() as any);
```

**Querying** — use Drizzle expressions, never raw SQL template literals:

```ts
import { eq, and, or, like, inArray, desc, count, sql } from "drizzle-orm";
import { jobs, jobSkillTags } from "@/db/schema";

// Paginate with hasMore trick (avoids extra COUNT on first page)
const rows = await db.select().from(jobs).where(eq(jobs.is_remote_eu, true))
  .orderBy(desc(jobs.posted_at)).limit(limit + 1).offset(offset);
const hasMore = rows.length > limit;

// Subquery
const skillFilter = inArray(
  jobs.id,
  db.select({ job_id: jobSkillTags.job_id }).from(jobSkillTags)
    .where(inArray(jobSkillTags.tag, skills))
    .groupBy(jobSkillTags.job_id)
    .having(sql`count(distinct ${jobSkillTags.tag}) = ${skills.length}`)
);
```

**Types** — always derive from schema, never hand-write:

```ts
import type { Job, NewJob, Company } from "@/db/schema";
// typeof jobs.$inferSelect  →  Job
// typeof jobs.$inferInsert  →  NewJob
```

**Migration workflow** — schema change → generate → apply:

```bash
pnpm db:generate   # creates migration file in migrations/
pnpm db:migrate    # applies locally
pnpm db:push       # applies to remote D1
```

**Anti-patterns:**
- Never write raw SQL strings in resolvers — use Drizzle ORM methods.
- Never use `db.execute(sql\`...\`)` for application queries — use typed builder.
- Never import from `drizzle-orm/pg-core` or `drizzle-orm/mysql-core` — use `drizzle-orm/sqlite-core`.

> Docs: fetch_docs on `https://orm.drizzle.team/docs/overview`

---

### Apollo Server 5 resolver patterns

**Context** — always type `context` as `GraphQLContext`:

```ts
import type { GraphQLContext } from "../../context";
import type { QueryJobsArgs, JobResolvers } from "@/__generated__/resolvers-types";

// Query resolver
async function jobsQuery(_parent: unknown, args: QueryJobsArgs, context: GraphQLContext) {
  return context.db.select().from(jobs)...;
}

// Field resolver — parent type is the raw Drizzle row (Job)
const Job: JobResolvers<GraphQLContext, Job> = {
  async skills(parent, _args, context) {
    return context.loaders.jobSkills.load(parent.id); // always use DataLoaders
  },
  async company(parent, _args, context) {
    if (!parent.company_id) return null;
    return context.loaders.company.load(parent.company_id);
  },
};
```

**JSON column pattern** — D1 stores JSON as text; always parse in field resolvers:

```ts
departments(parent) {
  if (!parent.departments) return [];
  try { return JSON.parse(parent.departments); }
  catch { return []; }
},
```

**Boolean columns** — D1 returns `0`/`1` for SQLite integers. Fields defined with `{ mode: "boolean" }` in schema are auto-coerced by Drizzle. Fields without it need manual coercion in resolvers:

```ts
is_remote_eu(parent) {
  return (parent.is_remote_eu as unknown) === 1 || parent.is_remote_eu === true;
},
```

**Admin guard** — any mutation that modifies production data must check:

```ts
import { isAdminEmail } from "@/lib/admin";

if (!context.userId || !isAdminEmail(context.userEmail)) {
  throw new Error("Forbidden");
}
```

**Anti-patterns:**
- Never query the DB directly inside field resolvers — always go through `context.loaders.*` DataLoaders to avoid N+1.
- Never use `any` for context — use the generated `GraphQLContext` type.
- Never edit files in `src/__generated__/` — they are overwritten by `pnpm codegen`.
- Prefer generated types from `@/__generated__/resolvers-types.ts` over `any` in resolver signatures.

---

### GraphQL codegen

Run `pnpm codegen` after **any** change to `schema/**/*.graphql`. Generates into `src/__generated__/`:

| File | Contents |
|---|---|
| `types.ts` | TS types for schema (strict scalars) |
| `resolvers-types.ts` | Resolver types with `GraphQLContext` |
| `hooks.tsx` | React Apollo hooks |
| `typeDefs.ts` | Merged type definitions |

Custom scalar mappings (in `codegen.ts`): `DateTime`/`URL`/`EmailAddress` → `string`, `JSON` → `any`, `Upload` → `File`.

**Anti-patterns:**
- Never skip codegen after schema changes — stale types cause silent runtime mismatches.
- Never manually edit `src/__generated__/` files.

---

### Trigger.dev tasks

Tasks live in `src/trigger/` and must be registered. Pattern:

```ts
import { task, logger } from "@trigger.dev/sdk/v3";
import { drizzle } from "drizzle-orm/d1";
import { createD1HttpClient } from "../db/d1-http";

// Lazy DB init — don't create at module level
function getDb() {
  return drizzle(createD1HttpClient() as any);
}

export const myTask = task({
  id: "my-task",           // unique kebab-case, matches trigger.config.ts registration
  maxDuration: 120,        // seconds
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  queue: { concurrencyLimit: 5 },

  run: async (payload: MyPayload) => {
    logger.info("Starting task", { ...payload });  // use logger, not console
    const db = getDb();
    // ... do work
    return { success: true };
  },

  handleError: async (payload, error) => {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("404")) {
      logger.info("Resource not found, skipping retry");
      return { skipRetrying: true };  // prevents retry for known terminal errors
    }
    logger.error("Task failed", { error: msg });
    // return nothing = allow retry
  },
});
```

**Anti-patterns:**
- Never import from `@trigger.dev/sdk` — use `@trigger.dev/sdk/v3`.
- Never create the DB client at module level — always lazy-init inside `run` or a factory function.
- Never use `console.log` inside tasks — use `logger.*` so logs appear in the Trigger.dev dashboard.
- Never forget to export the task — unregistered tasks silently fail to trigger.

> Docs: fetch_docs on `https://trigger.dev/docs/tasks-overview`

---

### D1 Gateway / batch queries

Prefer batching when making multiple independent queries in one request:

```ts
// Single exec (via Drizzle — preferred for typed queries)
const result = await context.db.select().from(jobs).where(eq(jobs.id, id));

// Raw batch (for admin scripts / multi-statement operations)
const client = createD1HttpClient();
const [jobsResult, companiesResult] = await client.batch([
  "SELECT count(*) FROM jobs",
  "SELECT count(*) FROM companies",
]);
```

The `D1HttpClient` singleton is cached (`_cachedClient`) — do not re-instantiate per request.

**Anti-patterns:**
- Never make N sequential `fetch()` calls to the D1 gateway when a batch would work.
- Never bypass `createD1HttpClient()` by constructing `D1HttpClient` directly — the factory handles env var selection and caching.
