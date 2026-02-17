# Architecture Review Report: nomadically.work

**Date:** 2026-02-17
**Reviewer:** Claude Opus 4.6 (Automated Architecture Review)
**Repository:** `nomadically.work`
**Commit Range:** Feb 2 2026 - Feb 17 2026 (277 commits)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Repo Overview](#2-repo-overview)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Code Quality](#4-code-quality)
5. [Security](#5-security)
6. [Performance](#6-performance)
7. [Reliability](#7-reliability)
8. [DX & Maintainability](#8-dx--maintainability)
9. [Recommendations](#9-recommendations)
10. [Prioritised Roadmap](#10-prioritised-roadmap)
11. [Appendix](#appendix)

---

## 1. Executive Summary

### Overview

**Nomadically.work** is a remote EU job board aggregator that ingests job postings from multiple ATS platforms (Greenhouse, Lever, Ashby), classifies them for EU-remote eligibility using AI (DeepSeek), and serves them through a Next.js 16 frontend backed by a GraphQL API and Cloudflare D1 (SQLite) database. It integrates with an extensive AI/ML toolchain (Mastra, LangGraph, Promptfoo, Langfuse, LangSmith) for job classification, skill extraction, and evaluation.

The project demonstrates ambitious scope and solid architectural thinking, but critical security gaps, near-zero test coverage, several major performance anti-patterns, and a sole contributor bus factor severely limit production readiness.

## 2. Repo Overview

### Languages & Stack

| Component       | Technology                                      | Version            |
| --------------- | ----------------------------------------------- | ------------------ |
| Frontend        | Next.js (App Router)                            | 16.1.6             |
| Runtime         | React                                           | 19.1.1             |
| Language        | TypeScript                                      | 5.9.3              |
| Database        | Cloudflare D1 (SQLite)                          | -                  |
| ORM             | Drizzle ORM                                     | 0.45.1             |
| API             | Apollo Server (GraphQL)                         | 5.3.0              |
| Auth            | Clerk                                           | 6.37.4             |
| AI/ML           | Mastra, AI SDK, DeepSeek, LangGraph (Python)    | Various            |
| Background Jobs | Trigger.dev, Inngest, Cloudflare Workers (Cron) | Various            |
| Observability   | Langfuse, LangSmith                             | Partially disabled |
| Evaluation      | Promptfoo, Vitest, Mastra Evals                 | Various            |
| Deployment      | Vercel (app), Cloudflare Workers (workers)      | -                  |
| Package Manager | pnpm                                            | 10.10.0            |

### Lines of Code (excluding generated/vendored)

| Area                     | Files         | LOC         |
| ------------------------ | ------------- | ----------- |
| `src/` (application)     | ~150          | ~36,000     |
| `workers/` (CF workers)  | 5 TS + Python | ~1,375      |
| `scripts/` (tooling)     | 19            | ~2,372      |
| `schema/` (GraphQL SDL)  | 6             | ~886        |
| **Total (hand-written)** | **~180**      | **~40,633** |

### Dependencies

- **Production:** 37 direct dependencies
- **Dev:** 15 dev dependencies
- **Vulnerabilities:** 9 (3 high, 3 moderate, 3 low)
- **Pinning concerns:** `@ai-sdk/anthropic` and `@mastra/core` are set to `"latest"` - highly unstable for production

### Bus Factor

| Contributor   | Commits    |
| ------------- | ---------- |
| Vadim Nicolai | 277 (100%) |

**Bus Factor: 1** - Single contributor; no code review process evident; no CODEOWNERS file.

---

## 3. High-Level Architecture

### Architectural Style

**Multi-runtime serverless monolith** - The application is structured as a single Next.js app (deployed to Vercel) with satellite Cloudflare Workers for background processing and database access.

### Layer Diagram

```
                    +-------------------+
                    |    Clerk Auth     |
                    +--------+----------+
                             |
   +-------------------------v--------------------------+
   |              Next.js 16 (Vercel)                   |
   |                                                    |
   |  +----------+  +------------+  +---------------+  |
   |  |  React   |  |  Apollo    |  |  API Routes   |  |
   |  |  Pages   |  |  GraphQL   |  |  (REST)       |  |
   |  |  (SSR)   |  |  Server    |  |               |  |
   |  +----+-----+  +-----+------+  +-------+-------+  |
   |       |               |                |           |
   |       +-------+-------+--------+-------+           |
   |               |                                    |
   +---------------v------------------------------------+
                   |
      +------------v--------------+
      |   D1 HTTP Client /        |
      |   Gateway Client          |
      +------------+--------------+
                   |
      +------------v--------------+     +-----------------+
      |  D1 Gateway Worker (CF)   |<--->| Cloudflare D1   |
      +---------------------------+     | (SQLite)        |
                                        +-----------------+
                                              ^
      +---------------------------+           |
      | Cron Worker (CF)          |-----------+
      | - Brave Search discovery  |
      +---------------------------+

      +---------------------------+
      | Insert-Jobs Worker (CF)   |----> Queue ---> Webhook
      +---------------------------+

      +---------------------------+
      | Process-Jobs Worker (CF)  |
      | - Python/LangGraph        |
      | - DeepSeek classification |
      +---------------------------+

      +---------------------------+
      | Trigger.dev               |
      | - Greenhouse enhancement  |
      +---------------------------+

      +---------------------------+
      | Inngest                   |
      | - Custom functions        |
      +---------------------------+
```

### Component Map

| Component                | Purpose                                                  | Status                              |
| ------------------------ | -------------------------------------------------------- | ----------------------------------- |
| `src/app/`               | Next.js pages (jobs, companies, settings, prompts, etc.) | Active                              |
| `src/apollo/`            | GraphQL server, resolvers, context                       | Active                              |
| `src/db/`                | Drizzle schema, D1 HTTP/Gateway clients                  | Active                              |
| `src/agents/`            | AI agents (job classifier, SQL, admin assistant)         | Active                              |
| `src/ingestion/`         | ATS data fetchers (Greenhouse, Lever, Ashby)             | Active                              |
| `src/evals/`             | Evaluation framework for classifier accuracy             | Partial                             |
| `src/promptfoo/`         | Promptfoo evaluation suite for LLM outputs               | Active                              |
| `src/observability/`     | Langfuse/Mastra observability                            | **Disabled** (Edge incompatibility) |
| `src/inngest/`           | Inngest custom functions                                 | **Stale** (most TODOs)              |
| `src/workflows/`         | Mastra workflows (scheduled, extract, flow-control)      | **Stale** (most TODOs)              |
| `src/memory/`            | Personalization/preference agents                        | **Stale** (all TODOs)               |
| `workers/cron.ts`        | Daily job discovery via Brave Search                     | Active (still uses Turso)           |
| `workers/d1-gateway.ts`  | D1 database access gateway                               | Active                              |
| `workers/insert-jobs.ts` | Job insertion + queue                                    | Active (still uses Turso)           |
| `workers/process-jobs/`  | Python worker for LangGraph classification               | Active                              |

### Data Flow

```
1. Discovery:    Brave Search API --[Cron Worker]--> Job URLs
2. Ingestion:    ATS APIs (Greenhouse/Lever/Ashby) --[Insert Worker]--> D1 Database
3. Enhancement:  Job IDs --[Trigger.dev / GraphQL Mutation]--> ATS API --> D1
4. Classification: Unprocessed jobs --[Classify Worker / DeepSeek]--> is_remote_eu --> D1
5. Serving:      Browser --[Apollo Client]--> /api/graphql --[D1 HTTP]--> Gateway --> D1
6. Evaluation:   Promptfoo / Vitest --[LLM calls]--> Accuracy scores
```

---

## 4. Code Quality

### Naming Conventions

- **Files:** Kebab-case (`jobs-query.ts`, `enhance-job.ts`) - consistent
- **Components:** PascalCase (`UnifiedJobsProvider`, `SearchQueryBar`) - consistent
- **Schema:** snake_case for DB columns, camelCase for GraphQL fields - mostly consistent
- **Variables:** camelCase - consistent

### Type Safety

**Rating: Poor**

- `ignoreBuildErrors: true` in `next.config.ts` masks all TypeScript compilation errors in production builds
- **283 occurrences of `any`** in resolver files alone - nearly every resolver argument, parent, and return type is `any`
- GraphQL context properly typed but resolvers bypass it with `any` casts
- Multiple `as any` casts for Drizzle query builder workarounds (e.g., `query.where(...) as any`)
- Generated types exist (`src/__generated__/`) but are not used by resolvers

### Dead Code

| File/Area                           | Issue                                                     |
| ----------------------------------- | --------------------------------------------------------- |
| `src/apollo/resolvers.ts`           | `textToSqlResolvers`, `executeSqlResolvers` commented out |
| `src/observability/index.ts`        | Entire Langfuse exporter disabled                         |
| `src/memory/preferences.ts`         | Full class with 5+ TODO stubs, no working implementation  |
| `src/inngest/custom-functions.ts`   | 6+ TODO stubs, all functions non-functional               |
| `src/workflows/scheduled.ts`        | 7+ TODO stubs, entire module non-functional               |
| `src/workspace/ops-skills.ts`       | Non-functional with TODO stubs                            |
| `src/workspace/evidence-bundles.ts` | Non-functional with TODO stubs                            |
| `workers/cron.ts`                   | References Turso (old DB), not D1                         |
| `workers/insert-jobs.ts`            | References Turso/libsql, not D1                           |
| `src/agents/sql.ts`                 | TODO stub only                                            |
| `src/lib/skills/filtering.ts`       | TODO stub only                                            |

### Duplication

- **JSON.parse pattern** repeated 31+ times across resolvers with identical try/catch logic - should be extracted to a utility
- **Admin authorization check** (`if (!context.userId) throw "Unauthorized"; if (!isAdminEmail(...)) throw "Forbidden"`) duplicated in every admin mutation (~10+ times)
- **Category validation** (valid categories array + toUpperCase check) duplicated 3 times in company resolver
- **Evidence field mapping** duplicated identically in `CompanyFact`, `CompanySnapshot`, and `ATSBoard` resolvers

### Test Coverage

**Rating: Minimal (effectively 0%)**

| Test Suite   | Files                        | Description                                |
| ------------ | ---------------------------- | ------------------------------------------ |
| Vitest       | 1 (`remote-eu-eval.test.ts`) | Eval regression tests with mock classifier |
| Promptfoo    | Config files only            | LLM evaluation config, not unit tests      |
| Mastra Evals | Config only                  | Agent scorer config                        |

No unit tests, integration tests, or E2E tests for:

- GraphQL resolvers (0 tests)
- React components (0 tests)
- Database operations (0 tests)
- API routes (0 tests)
- Workers (0 tests)

### TODO/FIXME Count

**35+ TODO comments** found across the codebase, most indicating incomplete D1 database migration from the original Turso backend.

---

## 5. Security

### Authentication & Authorization

| Aspect         | Implementation                           | Assessment                          |
| -------------- | ---------------------------------------- | ----------------------------------- |
| Auth Provider  | Clerk                                    | Good - managed service              |
| GraphQL Auth   | Clerk `auth()` in context                | Good pattern                        |
| Admin Check    | Single email hardcoded in `constants.ts` | Poor - not scalable, no role system |
| Admin Gate     | `isAdminEmail()` check in each mutation  | Adequate but duplicated             |
| Public Queries | Jobs/companies queryable without auth    | By design (job board)               |
| API Routes     | Mixed auth (some protected, some public) | Needs audit                         |
| Worker Auth    | Bearer token (`CRON_SECRET`, `API_KEY`)  | Adequate                            |

### Secrets Management

**CRITICAL FINDING:**

| Issue                                              | Severity   | Detail                                                                                                                                             |
| -------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env` file on disk with production secrets        | CRITICAL   | Contains live Clerk (pk_live, sk_live), DeepSeek, OpenRouter, Cloudflare, Turso, Neon PostgreSQL, Langfuse, LangSmith, Brave, and Trigger.dev keys |
| `.env.local` file on disk with development secrets | HIGH       | Contains Anthropic API key, Gemini key, Cloudflare Workers AI key, Browser Rendering key, and more                                                 |
| Both files in `.gitignore`                         | Mitigating | Not currently tracked by git                                                                                                                       |
| `trigger.config.ts` hardcodes project ID           | LOW        | `proj_gmqcwyqsqcnkjnlqcmxf` in source                                                                                                              |
| `drizzle.config.ts` hardcodes D1 database ID       | LOW        | `632b9c57-8262-40bd-86c2-bc08beab713b` in source                                                                                                   |
| `wrangler.*.toml` files hardcode database IDs      | LOW        | Same database ID exposed                                                                                                                           |
| Hardcoded admin email                              | LOW        | `nicolai.vadim@gmail.com` in constants.ts                                                                                                          |

**Immediate Action Required:** Rotate ALL secrets in `.env` and `.env.local` regardless of git tracking status. Any developer, backup system, or file sync tool that touches this directory has access to production credentials.

### CVEs / Audit

**9 vulnerabilities found (via `pnpm audit`):**

| Severity | Package                                                      | CVE/Advisory                                                                                               | Status                     |
| -------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------- |
| HIGH     | `@apollo/server` >=5.0.0 <5.4.0                              | DoS via `startStandaloneServer` ([GHSA-mp6q-xf9x-fwf7](https://github.com/advisories/GHSA-mp6q-xf9x-fwf7)) | **Upgrade to >=5.4.0**     |
| HIGH     | `@modelcontextprotocol/sdk` (via @google/adk, @google/genai) | Cross-client data leak ([GHSA-345p-7cg4-v4c7](https://github.com/advisories/GHSA-345p-7cg4-v4c7))          | **Upgrade transitive dep** |
| HIGH     | (see above - counted twice)                                  | Same                                                                                                       |                            |
| MODERATE | `esbuild` (via drizzle-kit, @cloudflare/next-on-pages)       | Dev server vulnerability ([GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99))        | Upgrade                    |
| MODERATE | `undici` (via @cloudflare/next-on-pages)                     | Unbounded decompression ([GHSA-g9mf-h72j-4rw9](https://github.com/advisories/GHSA-g9mf-h72j-4rw9))         | Upgrade                    |
| LOW      | `cookie` (via @trigger.dev, @cloudflare/next-on-pages)       | OOB character acceptance ([GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x))        | Upgrade                    |
| LOW      | `qs` (via @google/adk-devtools)                              | arrayLimit bypass DoS ([GHSA-w7fw-mjwx-w883](https://github.com/advisories/GHSA-w7fw-mjwx-w883))           | Upgrade                    |

### OWASP Top 10 Assessment

| OWASP Category                 | Risk   | Notes                                                                              |
| ------------------------------ | ------ | ---------------------------------------------------------------------------------- |
| A01: Broken Access Control     | MEDIUM | Admin check is email-only, no RBAC; `enhanceJobFromATS` mutation has no auth check |
| A02: Cryptographic Failures    | LOW    | Uses HTTPS, Clerk handles crypto                                                   |
| A03: Injection                 | LOW    | Drizzle ORM parameterizes queries; D1HttpClient uses parameterized queries         |
| A04: Insecure Design           | MEDIUM | Fetch-all-then-filter pattern exposes full datasets to memory                      |
| A05: Security Misconfiguration | HIGH   | `ignoreBuildErrors: true`, CORS `*` on gateway, secrets on disk                    |
| A06: Vulnerable Components     | HIGH   | 3 high-severity dependency vulnerabilities                                         |
| A07: Auth Failures             | LOW    | Clerk manages session security                                                     |
| A08: Software/Data Integrity   | MEDIUM | No code signing, `latest` dep versions                                             |
| A09: Logging Failures          | MEDIUM | 61 console.log/error/warn in resolvers, no structured logging                      |
| A10: SSRF                      | MEDIUM | `enhanceJobFromATS` constructs URLs from user input (company/jobId args)           |

---

## 6. Performance

### Critical Bottlenecks

#### 1. Fetch-All-Then-Filter Anti-Pattern (CRITICAL)

**File:** `src/apollo/resolvers/job/jobs-query.ts`

```typescript
// Line 47: Get ALL results first
const allResults = await query;

// Lines 50-74: Then filter in JavaScript
let filteredJobs = allResults || [];
filteredJobs = filteredJobs.filter(...);  // excluded companies
filteredJobs = filteredJobs.filter(...);  // excluded locations
filteredJobs = filteredJobs.filter(...);  // excluded countries
const totalCount = filteredJobs.length;
const paginatedJobs = filteredJobs.slice(offset, offset + limit);
```

**Impact:** Every jobs list request loads the ENTIRE `jobs` table into Node.js memory, applies 3 filter passes, then slices for pagination. With thousands of jobs, this causes:

- Excessive memory usage per request
- O(n) response time instead of O(1) with proper SQL WHERE/LIMIT
- Database reads all rows even when only 20 are needed

#### 2. Full Table Scan for Single Job Lookup (HIGH)

**File:** `src/apollo/resolvers/job/enhance-job.ts`

```typescript
// Line 51: Fetches ALL jobs to find one
const allJobs = await context.db.select().from(jobs);
const job = allJobs.find((job) => {
  const jobIdFromUrl = last(split(job.external_id, "/"));
  return jobIdFromUrl === args.jobId;
});
```

**Impact:** To enhance a single job, the resolver loads every row in the jobs table.

#### 3. Companies Query Same Pattern (HIGH)

**File:** `src/apollo/resolvers/company.ts`

```typescript
// Lines 277-307: Fetch all companies, post-filter in JS
let allResults = await query;
if (args.filter?.has_ats_boards) { ... }
if (args.filter?.service_taxonomy_any) { ... }
const totalCount = allResults.length;
const paginatedCompanies = allResults.slice(offset, offset + limit);
```

### N+1 Query Issues

- **Job.skills resolver:** Individual query per job for skill tags (N+1 when listing jobs)
- **Job.company resolver:** Individual query per job for company data (N+1 when listing jobs)
- **Company.ats_boards resolver:** Individual query per company (N+1 when listing companies)
- **Company.facts / Company.snapshots:** Same pattern

**Mitigation:** Apollo's built-in batching partially helps, but DataLoader is not implemented.

### Caching

| Layer                         | Status                                                   |
| ----------------------------- | -------------------------------------------------------- |
| D1 Gateway `s-maxage` headers | Configured in D1 gateway worker (5-30 sec)               |
| Apollo Client `InMemoryCache` | Configured with key fields and merge policies            |
| Server-side caching           | None - every GraphQL request hits the database           |
| CDN / Edge caching            | Vercel ISR not configured; `force-dynamic` on API routes |

### Scalability Concerns

1. **Single D1 database** - 10GB SQLite limit, no read replicas
2. **Serverless cold starts** - Node.js runtime on Vercel with 60-second max duration
3. **No connection pooling** - Each request creates new D1 HTTP client (mitigated by singleton pattern)
4. **No rate limiting** on GraphQL endpoint
5. **No query complexity/depth limiting** on GraphQL

---

## 7. Reliability

### Error Handling

**Pattern:** Consistent try/catch in resolvers returning empty arrays/null on failure.

**Concerns:**

- Errors are caught but only logged to console - no alerting, no error tracking service
- `enhanceJobFromATS` has good error differentiation (404, 403, 429, 500) but swallows errors as success responses
- `processAllJobs` returns `success: false` instead of throwing - Apollo can't distinguish errors from empty results for clients
- No global error boundary in the Apollo Server setup
- No retry logic in D1 HTTP client for transient failures

### Logging

| Aspect             | Status                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------- |
| Structured logging | Not implemented - all `console.log/error/warn` (61+ instances in resolvers alone)             |
| Log aggregation    | None configured for Next.js; Cloudflare Workers have observability enabled in wrangler config |
| Request tracing    | No correlation IDs between requests                                                           |
| Langfuse tracing   | **Disabled** due to Edge Runtime zlib dependency                                              |
| LangSmith tracing  | Configured but usage unclear                                                                  |

### Tracing & Observability

- **Mastra Observability:** Instantiated but disabled (empty `configs` object)
- **Langfuse:** Secret/public keys configured but exporter commented out
- **LangSmith:** API key configured, resolver exists for runs/datasets
- **Cloudflare Workers:** Have `[observability]` enabled with invocation logs
- **No APM** (no Datadog, New Relic, Sentry, etc.)

### Resilience Patterns

| Pattern              | Status                                               |
| -------------------- | ---------------------------------------------------- |
| Circuit breaker      | Not implemented                                      |
| Retry with backoff   | Only in Trigger.dev config (3 attempts, exponential) |
| Timeout handling     | Vercel 60-second function limit only                 |
| Dead letter queue    | Not implemented                                      |
| Health checks        | D1 Gateway has `/health` endpoint                    |
| Graceful degradation | GraphQL resolvers return empty arrays on error       |

---

## 8. DX & Maintainability

### Onboarding

| Aspect            | Rating  | Notes                                                          |
| ----------------- | ------- | -------------------------------------------------------------- |
| README            | Good    | Clear Quick Start, architecture section, troubleshooting       |
| `.env.example`    | Good    | Comprehensive with comments explaining each variable           |
| Setup scripts     | Partial | No `setup.sh` or `init` script; multiple manual steps required |
| Required services | Complex | Needs Cloudflare account, Clerk account, multiple AI API keys  |

### Documentation

| Doc                     | Status                                                             |
| ----------------------- | ------------------------------------------------------------------ |
| README.md               | Good overview                                                      |
| DEPLOY_D1_GATEWAY.md    | Referenced but not verified                                        |
| `.github/instructions/` | 4 Trigger.dev instruction files                                    |
| Inline JSDoc            | Good in some files (agents, workers), absent in resolvers          |
| API documentation       | GraphQL SDL serves as documentation with descriptions on mutations |

### CI/CD

| Aspect               | Status                                       |
| -------------------- | -------------------------------------------- |
| GitHub Actions       | **None** - no `.github/workflows/` directory |
| Pre-commit hooks     | **None**                                     |
| Lint on push         | **None**                                     |
| Automated tests      | **None**                                     |
| Automated deployment | Vercel auto-deploy (implicit)                |

**Impact:** No automated quality gate. Any push to main can deploy broken code directly to production (Vercel auto-deploys). The `ignoreBuildErrors: true` setting ensures even TypeScript errors won't block deployment.

### Dependency Hygiene

| Issue                    | Count        | Examples                                                                                                                       |
| ------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `"latest"` version pins  | 2            | `@ai-sdk/anthropic`, `@mastra/core`                                                                                            |
| Wide semver ranges (`^`) | 35           | Most dependencies                                                                                                              |
| Lock file present        | Yes          | `pnpm-lock.yaml` (794KB)                                                                                                       |
| Outdated dependencies    | 9 vulnerable | See CVEs section                                                                                                               |
| Unused/dead dependencies | ~3-5         | `@libsql/client` (Turso migration complete), `pg` (Neon PG unused in D1 world), `better-sqlite3` (dev only, questionable need) |

---

## 9. Recommendations

| #   | Finding                                                  | Impact   | Effort  | Action                                                                                                     | References                                                                                                     |
| --- | -------------------------------------------------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | Live production secrets in `.env` / `.env.local` on disk | CRITICAL | Low     | Rotate all API keys immediately; add `.env*` check to git hooks; use a secrets manager (Doppler/Infisical) | [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) |
| 2   | Fetch-all-then-filter in jobs/companies resolvers        | HIGH     | Medium  | Push WHERE clauses for excluded locations/companies to SQL; use SQL COUNT for totalCount; add DB indexes   | Drizzle ORM docs                                                                                               |
| 3   | `ignoreBuildErrors: true` in next.config                 | HIGH     | Medium  | Remove flag, fix all TS errors, add strict checks                                                          | [Next.js TypeScript](https://nextjs.org/docs/app/building-your-application/configuring/typescript)             |
| 4   | No CI/CD pipeline                                        | HIGH     | Medium  | Add GitHub Actions: lint, typecheck, test, audit, deploy preview                                           | [GitHub Actions](https://docs.github.com/en/actions)                                                           |
| 5   | 9 dependency vulnerabilities (3 HIGH)                    | HIGH     | Low     | `pnpm update @apollo/server@^5.4.0`; update transitive deps; run `pnpm audit fix`                          | See CVEs section                                                                                               |
| 6   | Near-zero test coverage                                  | HIGH     | High    | Start with resolver unit tests, then component tests, then E2E (Playwright)                                | [Vitest](https://vitest.dev/)                                                                                  |
| 7   | 283+ `any` types in resolvers                            | MEDIUM   | Medium  | Use generated resolver types from codegen; replace `parent: any` with proper types                         | GraphQL Codegen `resolvers-types.ts`                                                                           |
| 8   | N+1 queries (skills, company per job)                    | MEDIUM   | Medium  | Implement DataLoader for batched DB lookups                                                                | [graphql/dataloader](https://github.com/graphql/dataloader)                                                    |
| 9   | No GraphQL rate limiting / complexity analysis           | MEDIUM   | Low     | Add `graphql-rate-limit` or Apollo's built-in persisted queries                                            | [Apollo Security](https://www.apollographql.com/docs/apollo-server/security/)                                  |
| 10  | `enhanceJobFromATS` mutation has no auth check           | MEDIUM   | Low     | Add `isAdminEmail` guard like other mutations                                                              | Existing pattern                                                                                               |
| 11  | 35+ TODO stubs (incomplete D1 migration)                 | MEDIUM   | Medium  | Remove or implement; dead code confuses maintenance                                                        | -                                                                                                              |
| 12  | `"latest"` version pinning                               | MEDIUM   | Low     | Pin `@ai-sdk/anthropic` and `@mastra/core` to specific versions                                            | [Renovate](https://docs.renovatebot.com/)                                                                      |
| 13  | Console-only logging (61+ calls)                         | MEDIUM   | Medium  | Adopt structured logger (Pino/Winston); add log levels; integrate with Vercel Log Drain                    | [Pino](https://getpino.io/)                                                                                    |
| 14  | Observability disabled                                   | MEDIUM   | Medium  | Switch to fetch-based Langfuse SDK (already partially done in `src/langfuse/`); or use Sentry              | [Langfuse](https://langfuse.com/)                                                                              |
| 15  | Workers still reference Turso (old DB)                   | LOW      | Medium  | Migrate `cron.ts` and `insert-jobs.ts` to D1 bindings                                                      | Workers already have D1 bindings in wrangler.toml                                                              |
| 16  | No CORS restriction on D1 Gateway                        | LOW      | Low     | Replace `access-control-allow-origin: *` with specific origins                                             | [CORS MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)                                             |
| 17  | Duplicated JSON.parse/admin-auth patterns                | LOW      | Low     | Extract `safeJsonParse()` utility; create `requireAdmin()` middleware                                      | -                                                                                                              |
| 18  | Bus factor of 1                                          | LOW      | Ongoing | Document architecture decisions; enable PR reviews; add CODEOWNERS                                         | -                                                                                                              |

---

## 10. Prioritised Roadmap

### Quick Wins (1-3 days)

| #    | Action                                                          | Impact                              |
| ---- | --------------------------------------------------------------- | ----------------------------------- |
| QW-1 | Rotate all secrets in `.env` / `.env.local`                     | Eliminates credential exposure risk |
| QW-2 | Pin `@ai-sdk/anthropic` and `@mastra/core` to specific versions | Prevents surprise breaking changes  |
| QW-3 | Upgrade `@apollo/server` to `>=5.4.0`                           | Fixes HIGH DoS vulnerability        |
| QW-4 | Add auth check to `enhanceJobFromATS` mutation                  | Closes authorization gap            |
| QW-5 | Restrict CORS origins on D1 Gateway Worker                      | Reduces attack surface              |
| QW-6 | Run `pnpm audit fix` for remaining vulnerabilities              | Addresses moderate/low CVEs         |

### Strategic (1-4 weeks)

| #   | Action                                                          | Impact                                         |
| --- | --------------------------------------------------------------- | ---------------------------------------------- |
| S-1 | Refactor jobs-query to use SQL WHERE + LIMIT/OFFSET             | Eliminates biggest performance bottleneck      |
| S-2 | Remove `ignoreBuildErrors: true` and fix TypeScript errors      | Restores type safety                           |
| S-3 | Set up GitHub Actions CI (lint + typecheck + test + audit)      | Prevents regressions                           |
| S-4 | Add DataLoader for N+1 query resolution                         | Major performance improvement for list queries |
| S-5 | Write resolver unit tests (target 50% coverage)                 | Establishes quality baseline                   |
| S-6 | Migrate `cron.ts` and `insert-jobs.ts` workers from Turso to D1 | Completes database migration                   |
| S-7 | Replace 283+ `any` types with generated resolver types          | Catches bugs at compile time                   |
| S-8 | Implement structured logging with Pino                          | Enables debugging and monitoring               |

### Nice-to-Have (1-3 months)

| #   | Action                                                         | Impact                        |
| --- | -------------------------------------------------------------- | ----------------------------- |
| N-1 | Add GraphQL query complexity/depth limiting                    | Prevents abuse                |
| N-2 | Implement E2E tests with Playwright                            | Catches integration issues    |
| N-3 | Re-enable observability with Edge-compatible Langfuse          | Restores tracing              |
| N-4 | Add Renovate/Dependabot for automated dependency updates       | Keeps dependencies current    |
| N-5 | Extract admin authorization middleware                         | Reduces code duplication      |
| N-6 | Add RBAC (role-based access control) beyond single admin email | Scales admin access           |
| N-7 | Implement secrets manager (Doppler/Infisical/Vault)            | Centralizes secret management |
| N-8 | Clean up 35+ TODO stubs and dead code modules                  | Reduces maintenance confusion |

### Defer

| #   | Action                                   | Rationale                                          |
| --- | ---------------------------------------- | -------------------------------------------------- |
| D-1 | Migrate from D1 (SQLite) to a full RDBMS | D1 works for current scale; premature optimization |
| D-2 | Implement full GraphQL subscriptions     | No current use case for real-time updates          |
| D-3 | Multi-tenancy / workspace isolation      | Single-user product currently                      |
| D-4 | Microservices extraction                 | Monolith is appropriate at this scale              |

---

## Appendix

### A. Dependency Versions (production)

| Package                          | Version    | Notes                                      |
| -------------------------------- | ---------- | ------------------------------------------ |
| `@ai-sdk/anthropic`              | `latest`   | **Pin immediately**                        |
| `@ai-sdk/deepseek`               | `^2.0.17`  |                                            |
| `@ai-sdk/openai`                 | `^3.0.26`  |                                            |
| `@anthropic-ai/claude-agent-sdk` | `^0.2.44`  |                                            |
| `@apollo/client`                 | `^3.14.0`  |                                            |
| `@apollo/server`                 | `^5.3.0`   | **Upgrade to >=5.4.0** (CVE)               |
| `@clerk/nextjs`                  | `^6.37.4`  |                                            |
| `@cloudflare/next-on-pages`      | `^1.13.16` |                                            |
| `@google/adk`                    | `^0.3.0`   | Transitive MCP SDK vuln                    |
| `@google/genai`                  | `^1.41.0`  | Transitive MCP SDK vuln                    |
| `@inngest/realtime`              | `^0.4.5`   |                                            |
| `@libsql/client`                 | `^0.17.0`  | **Possibly unused** (Turso migration done) |
| `@mastra/core`                   | `latest`   | **Pin immediately**                        |
| `@mastra/evals`                  | `^1.1.1`   |                                            |
| `@mastra/inngest`                | `^1.0.2`   |                                            |
| `@mastra/memory`                 | `^1.1.0`   |                                            |
| `@mastra/observability`          | `^1.2.0`   |                                            |
| `@mastra/rag`                    | `^2.1.0`   |                                            |
| `@trigger.dev/sdk`               | `4.3.3`    | Exact pin                                  |
| `ai`                             | `^6.0.77`  | Vercel AI SDK                              |
| `cloudflare`                     | `^5.2.0`   |                                            |
| `drizzle-orm`                    | `^0.45.1`  |                                            |
| `graphql`                        | `^16.12.0` |                                            |
| `inngest`                        | `^3.51.0`  |                                            |
| `langsmith`                      | `^0.5.2`   |                                            |
| `next`                           | `^16.1.6`  |                                            |
| `openai`                         | `^6.21.0`  |                                            |
| `pg`                             | `^8.18.0`  | **Possibly unused** (D1 is primary DB)     |
| `react`                          | `19.1.1`   | Exact pin                                  |
| `zod`                            | `^3.25.76` |                                            |

### B. Raw Audit Output

```
9 vulnerabilities found
Severity: 3 low | 3 moderate | 3 high

HIGH   @apollo/server >=5.0.0 <5.4.0  - DoS startStandaloneServer (GHSA-mp6q-xf9x-fwf7)
HIGH   @modelcontextprotocol/sdk >=1.10.0 <=1.25.3 - Cross-client data leak (GHSA-345p-7cg4-v4c7)
       via @google/adk, @google/genai
MOD    esbuild <=0.24.2 - Dev server access (GHSA-67mh-4wv8-2f99)
       via drizzle-kit, @cloudflare/next-on-pages
MOD    undici <6.23.0 - Decompression DoS (GHSA-g9mf-h72j-4rw9)
       via @cloudflare/next-on-pages > miniflare
LOW    cookie <0.7.0 - OOB character (GHSA-pxg6-pf52-xh8x)
       via @trigger.dev/build, @cloudflare/next-on-pages
LOW    qs >=6.7.0 <=6.14.1 - arrayLimit bypass (GHSA-w7fw-mjwx-w883)
       via @google/adk-devtools > express
```

### C. GraphQL Schema Files

| File                                 | Purpose                                                                |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `schema/base/schema.graphql`         | Base scalars (JSON, DateTime, URL, etc.) and root Query/Mutation types |
| `schema/jobs/schema.graphql`         | Job types, enums, queries, mutations (330 lines)                       |
| `schema/companies/schema.graphql`    | Company, Facts, Snapshots, ATS Board types and CRUD                    |
| `schema/applications/schema.graphql` | Application tracking types                                             |
| `schema/prompts/schema.graphql`      | Prompt management (Langfuse/LangSmith)                                 |
| `schema/langsmith/schema.graphql`    | LangSmith integration queries                                          |

### D. Database Tables

| Table               | Purpose                            | Row Estimate |
| ------------------- | ---------------------------------- | ------------ |
| `companies`         | Company profiles with scoring      | Medium       |
| `jobs`              | Job postings (30+ columns per ATS) | Large        |
| `job_skill_tags`    | Extracted skills per job           | Large        |
| `skill_aliases`     | Skill name normalization           | Small        |
| `ashby_boards`      | Ashby ATS board discovery          | Small        |
| `user_settings`     | User preferences                   | Small        |
| `user_preferences`  | Evidence-based preferences         | Small        |
| `company_facts`     | MDM evidence records               | Medium       |
| `company_snapshots` | Crawl data snapshots               | Medium       |
| `ats_boards`        | ATS board discovery per company    | Small        |
| `applications`      | Job applications                   | Small        |

### E. Worker Configuration

| Worker           | Schedule                         | Config File                   | Runtime               |
| ---------------- | -------------------------------- | ----------------------------- | --------------------- |
| `cron`           | `0 0 * * *` (daily midnight UTC) | `wrangler.toml`               | TypeScript/CF Workers |
| `classify-jobs`  | `0 */6 * * *` (every 6 hours)    | `wrangler.classify-jobs.toml` | TypeScript/CF Workers |
| `insert-jobs`    | On-demand (HTTP)                 | `wrangler.insert-jobs.toml`   | TypeScript/CF Workers |
| `d1-gateway`     | On-demand (HTTP)                 | `wrangler.d1-gateway.toml`    | TypeScript/CF Workers |
| `process-jobs`   | On-demand (HTTP)                 | Separate Python config        | Python/LangGraph      |
| `promptfoo-eval` | On-demand                        | `wrangler.promptfoo.toml`     | TypeScript/CF Workers |

---

_Report generated by Claude Opus 4.6 on 2026-02-17. This analysis is based on static code review and does not include runtime profiling or load testing._
