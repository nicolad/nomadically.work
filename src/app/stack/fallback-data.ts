import type { StackGroup } from "./types";

export const FALLBACK: StackGroup[] = [
  {
    label: "Frontend",
    color: "violet",
    entries: [
      {
        name: "Next.js 16",
        role: "App Router, SSR/RSC, API routes",
        url: "https://nextjs.org",
        details:
          "All pages use the App Router with React Server Components where possible. API routes under /api/ handle GraphQL (/api/graphql), job enhancement (/api/enhance-greenhouse-jobs), company import (/api/companies/bulk-import), and text-to-SQL (/api/text-to-sql). Route max duration is set to 60s in vercel.json to accommodate slow ATS API calls.",
        why_chosen:
          "Next.js 16 was chosen for its mature App Router with RSC support, enabling server-side data fetching without client bundles, plus built-in API routes that consolidate the GraphQL endpoint and webhook handlers into one deployable.",
        pros: [
          "App Router with RSC reduces client-side JavaScript — job listings render server-side",
          "API routes colocate the GraphQL server with the frontend, simplifying deployment",
          "Vercel deployment is zero-config with automatic preview deploys per PR",
          "Middleware supports edge auth checks via Clerk before route handlers run",
        ],
        cons: [
          "60s Vercel function timeout constrains long-running ATS API calls",
          "RSC mental model adds complexity — 'use client' boundary decisions are non-trivial",
          "Bundle analysis tooling lags behind Pages Router maturity",
        ],
        alternatives_considered: [
          { name: "Remix", reason_not_chosen: "Loader/action model is great but Vercel deployment story was less mature at project start; Next.js App Router offered equivalent RSC capabilities with tighter Vercel integration" },
          { name: "Astro", reason_not_chosen: "Excellent for content sites but this is a data-heavy SPA with real-time filters, modals, and GraphQL subscriptions — Astro's island architecture adds friction for highly interactive pages" },
          { name: "SvelteKit", reason_not_chosen: "Smaller ecosystem for enterprise-grade auth (Clerk), GraphQL tooling (Apollo), and AI SDK integrations that this project relies on" },
        ],
        trade_offs: [
          "Accepted Vercel vendor lock-in for deployment simplicity — the 60s timeout is a real constraint for enhancement mutations",
          "Chose App Router over Pages Router despite less mature docs — betting on the future of RSC",
        ],
        patterns_used: [
          "Provider wrapping pattern (*-provider.tsx) for client-side context (auth, sidebar, theme)",
          "Route groups for layout segmentation",
          "Server Components for data-fetching pages, Client Components only for interactive UI",
        ],
        interview_points: [
          "We use RSC to render job listings server-side — the initial page load sends zero JS for the job cards, then hydrates only the search/filter bar as a client component",
          "API routes host an Apollo Server 5 instance at /api/graphql — this lets us colocate the GraphQL layer without a separate backend service",
          "The 60s Vercel timeout is a real constraint — for bulk ATS enhancement we had to move to Trigger.dev background tasks instead of blocking the API route",
          "We wrap providers (Clerk, Apollo, theme) in dedicated *-provider.tsx files to keep the root layout clean and make testing easier",
        ],
      },
      {
        name: "React 19",
        role: "UI rendering, Server Components",
        url: "https://react.dev",
        details:
          "Client components are marked with 'use client' and handle interactive state (search, filters, modals). Server Components fetch data directly or via Apollo. Providers (auth, sidebar, theme) are wrapped in *-provider.tsx files under src/components/.",
        why_chosen:
          "React 19 was a natural choice given Next.js 16 — it brings native RSC support, improved Suspense, and the new use() hook for cleaner async patterns.",
        pros: [
          "Largest ecosystem — every library (Radix, Apollo, Clerk) has first-class React support",
          "RSC support eliminates the need for useEffect-based data fetching in most pages",
          "Concurrent features (Suspense, transitions) enable smooth filter/search UX",
        ],
        cons: [
          "RSC boundary decisions ('use client') add cognitive overhead",
          "Bundle size for interactive components is non-trivial compared to Svelte/Solid",
        ],
        alternatives_considered: [
          { name: "Svelte 5", reason_not_chosen: "Smaller ecosystem; Clerk, Apollo Client, and Radix UI don't have Svelte equivalents at the same maturity level" },
          { name: "Solid.js", reason_not_chosen: "Fine-grained reactivity is appealing but framework is too young for production job board with auth, GraphQL, and AI integrations" },
        ],
        trade_offs: [
          "Accepted React's larger bundle for interactive pages in exchange for ecosystem breadth",
          "RSC requires careful 'use client' boundary management but eliminates most client-side data fetching",
        ],
        patterns_used: [
          "Provider composition pattern — nested providers in root layout for auth, theme, data",
          "Controlled components for search/filter state",
          "Suspense boundaries around async data-fetching sections",
        ],
        interview_points: [
          "React 19's RSC lets us fetch job data at the component level without waterfalls — each section fetches its own data server-side",
          "We use the provider composition pattern — Clerk, Apollo, sidebar state are separate *-provider.tsx files composed in the root layout",
          "The 'use client' boundary is deliberate: job cards are RSC (no JS), but the search bar and filter panel are client components for interactivity",
        ],
      },
      {
        name: "Radix UI",
        role: "Themes + Icons — accessible primitives",
        url: "https://radix-ui.com",
        details:
          "Radix Themes provides the design system: Container, Card, Flex, Grid, Heading, Text, Badge, Button, Dialog, Select, TextField. Radix Icons is the icon set throughout the sidebar and pages.",
        why_chosen:
          "Radix provides unstyled, accessible primitives with a theming layer — we get WAI-ARIA compliance without building a design system from scratch.",
        pros: [
          "Accessibility baked in — Dialog, Select, DropdownMenu all handle focus trapping and keyboard nav",
          "Radix Themes gives a cohesive design system with consistent spacing, colors, and typography",
          "Composable — primitives like Dialog.Root/Trigger/Content follow compound component pattern",
        ],
        cons: [
          "Radix Themes is opinionated about styling — customizing beyond the theme is harder than with headless-only Radix",
          "Bundle includes all theme CSS even if only using a subset of components",
        ],
        alternatives_considered: [
          { name: "shadcn/ui", reason_not_chosen: "shadcn copies component source into your repo — great for customization but adds maintenance burden; Radix Themes gives a maintained design system out of the box" },
          { name: "Chakra UI", reason_not_chosen: "Heavier runtime CSS-in-JS (Emotion) conflicts with RSC; Radix Themes uses CSS custom properties" },
          { name: "Tailwind + Headless UI", reason_not_chosen: "Headless UI has fewer primitives than Radix; would need to compose multiple libraries for the same coverage" },
        ],
        trade_offs: [
          "Accepted less styling flexibility for faster development with a cohesive theme",
          "Using both Radix Themes (full design system) and Radix Icons keeps the dependency surface in one ecosystem",
        ],
        patterns_used: [
          "Compound component pattern (Dialog.Root → Dialog.Trigger → Dialog.Content)",
          "Theme token system — colors referenced via semantic tokens (color='violet') not raw hex",
        ],
        interview_points: [
          "We chose Radix over shadcn/ui because we wanted a maintained design system, not copied source files — the trade-off is less customization but zero maintenance burden",
          "Every modal and dropdown in the app is WAI-ARIA compliant out of the box because Radix handles focus trapping, keyboard navigation, and screen reader announcements",
          "Radix Themes works well with RSC because it uses CSS custom properties instead of runtime CSS-in-JS",
        ],
      },
      {
        name: "Clerk",
        role: "Authentication and user management",
        url: "https://clerk.com",
        details:
          "Clerk handles sign-in, sign-up, and session management. The current user's email is checked against ADMIN_EMAIL (src/lib/admin.ts) to gate admin mutations.",
        why_chosen:
          "Clerk provides drop-in auth with React/Next.js integration, eliminating the need to build session management, OAuth flows, or user management UI.",
        pros: [
          "Pre-built sign-in/sign-up components with multiple OAuth providers",
          "Middleware-based auth — protect routes at the edge before handlers run",
          "User metadata accessible in both server and client components",
        ],
        cons: [
          "Vendor lock-in — migrating away means rebuilding auth flows",
          "Pricing scales with MAU — can get expensive at scale",
          "Admin role is manually checked via email comparison, not Clerk's RBAC",
        ],
        alternatives_considered: [
          { name: "NextAuth.js", reason_not_chosen: "Requires building your own UI and session storage; Clerk provides both out of the box with better DX" },
          { name: "Supabase Auth", reason_not_chosen: "Would couple auth to Supabase's ecosystem; we use D1 for data — adding Supabase just for auth adds unnecessary infrastructure" },
          { name: "Auth0", reason_not_chosen: "More enterprise-focused, heavier integration; Clerk's React-native components are simpler for a Next.js app" },
        ],
        trade_offs: [
          "Accepted vendor lock-in for development speed — building auth from scratch would have added weeks",
          "Admin check is a simple email comparison (isAdminEmail) rather than Clerk RBAC — sufficient for single-admin use case",
        ],
        patterns_used: [
          "Middleware-based route protection — auth check runs at the edge before page renders",
          "Email-based admin guard pattern — simple but effective for single-admin apps",
        ],
        interview_points: [
          "We use Clerk's middleware to protect admin routes at the edge — unauthorized requests never reach the API handlers",
          "Admin access uses a simple isAdminEmail() check against an env var rather than Clerk's RBAC — for a single-admin app this is pragmatic over over-engineered",
          "Clerk gives us the user's email in the GraphQL context, which the resolver layer uses for mutation guards",
        ],
      },
    ],
  },
  {
    label: "API",
    color: "blue",
    entries: [
      {
        name: "Apollo Server 5",
        role: "GraphQL endpoint at /api/graphql",
        url: "https://www.apollographql.com/docs/apollo-server",
        details:
          "The main API layer. Schema is split by domain under schema/ (jobs, companies, applications, prompts). Resolvers live in src/apollo/resolvers/. The GraphQL context injects the D1 HTTP client, Drizzle ORM instance, DataLoaders, and Clerk auth info.",
        why_chosen:
          "Apollo Server 5 provides a production-grade GraphQL runtime with excellent TypeScript codegen support, DataLoader integration for N+1 prevention, and the ability to run inside Next.js API routes.",
        pros: [
          "Schema-first development — GraphQL schema is the contract between frontend and backend",
          "Codegen pipeline generates typed hooks, resolver types, and fragment masking automatically",
          "DataLoaders batch and cache database queries per request, solving N+1",
          "Runs inside Next.js API routes — no separate server process needed",
          "GraphQL Playground available at /api/graphql in development",
        ],
        cons: [
          "No query complexity or depth limiting — vulnerable to expensive queries",
          "Apollo Client bundle adds ~40KB gzipped to the frontend",
          "Schema-first requires running codegen after every .graphql change",
        ],
        alternatives_considered: [
          { name: "tRPC", reason_not_chosen: "tRPC is excellent for full-stack TypeScript apps but doesn't give us a schema document — we want the GraphQL schema as a formal API contract that tools (codegen, playground) can consume" },
          { name: "GraphQL Yoga", reason_not_chosen: "Lighter weight but less mature codegen ecosystem; Apollo's client preset with fragment masking is a significant DX advantage" },
          { name: "REST API", reason_not_chosen: "Job listings need flexible field selection (different views need different fields) — GraphQL's field selection eliminates over-fetching across 10+ views" },
        ],
        trade_offs: [
          "Schema-first adds a codegen step but ensures types never drift between schema, resolvers, and client",
          "Apollo Client is heavier than urql but its cache normalization and DevTools are valuable for this data-heavy app",
          "Running inside API routes means sharing the 60s Vercel timeout — acceptable since most queries return in <2s",
        ],
        patterns_used: [
          "Schema-first development with domain-split .graphql files",
          "DataLoader pattern for batched, per-request DB access",
          "Context factory injecting db, loaders, and auth per request",
          "Codegen pipeline: schema → types → hooks → resolver types",
        ],
        interview_points: [
          "We use schema-first GraphQL with codegen generating typed hooks, resolver types, and fragment masking — a schema change automatically updates types across the entire stack",
          "DataLoaders solve the N+1 problem for skills, company, and ATS board sub-fields — each loader batches and caches within a single request lifecycle",
          "The GraphQL context factory injects a Drizzle ORM instance, DataLoaders, and Clerk auth info — resolvers never instantiate their own DB connections",
          "We split the schema by domain (jobs/, companies/, applications/, prompts/) so teams can own their schema slice without merge conflicts",
          "No query complexity limiting yet — it's a known gap. For a job board with trusted clients, we've deferred this in favor of shipping features, but it's on the roadmap",
        ],
      },
      {
        name: "Vercel",
        role: "Hosting, edge network, 60s max route duration",
        url: "https://vercel.com",
        details:
          "Hosts the Next.js app. Deployment is triggered via pnpm deploy (scripts/deploy.ts). The 60-second function timeout is critical for long-running GraphQL mutations that call external ATS APIs.",
        why_chosen:
          "Vercel is the canonical host for Next.js — zero-config deployments, automatic preview URLs per PR, and edge network for static assets.",
        pros: [
          "Zero-config Next.js deployment with automatic optimizations",
          "Preview deploys per PR enable quick testing of changes",
          "Edge network serves static assets and RSC payloads from nearest PoP",
        ],
        cons: [
          "60s function timeout limits long-running operations",
          "Vendor lock-in with Next.js-specific optimizations",
          "Cold starts on serverless functions can add latency to first requests",
        ],
        alternatives_considered: [
          { name: "Cloudflare Pages", reason_not_chosen: "Next.js support via @cloudflare/next-on-pages is experimental; too risky for production. We already use CF Workers for background jobs, so keeping the app on Vercel gives clear separation" },
          { name: "Railway / Fly.io", reason_not_chosen: "Container-based hosting removes the function timeout constraint but adds operational overhead (Dockerfiles, health checks, scaling config) that Vercel handles automatically" },
        ],
        trade_offs: [
          "Accepted vendor lock-in and function timeout for deployment simplicity",
          "Moved long-running operations to Trigger.dev and CF Workers instead of fighting the 60s limit",
        ],
        patterns_used: [
          "CI/CD via custom deploy script (scripts/deploy.ts) wrapping Vercel CLI",
          "vercel.json for route-level timeout configuration",
        ],
        interview_points: [
          "We deploy via a custom script that wraps the Vercel CLI — this lets us run codegen, type checks, and strategy enforcement before deploying",
          "The 60s Vercel timeout is a real architectural constraint — we had to offload ATS enhancement to Trigger.dev background tasks and job classification to CF Workers",
          "Preview deploys per PR are invaluable — every PR gets a live URL that can test the full GraphQL + D1 stack",
        ],
      },
    ],
  },
  {
    label: "Database",
    color: "cyan",
    entries: [
      {
        name: "Cloudflare D1",
        role: "SQLite-compatible edge database",
        url: "https://developers.cloudflare.com/d1",
        details:
          "Primary datastore for jobs, companies, applications, skills, contacts, and ATS sources. Schema defined in src/db/schema.ts using Drizzle SQLite core. Migrations live in migrations/ and are applied with pnpm db:push.",
        why_chosen:
          "D1 was chosen after migrating from Turso/libSQL — it offers native Cloudflare Worker bindings, eliminating the need for connection pooling, and its SQLite foundation means simple, predictable query performance at the edge.",
        pros: [
          "Native Worker bindings — CF Workers access D1 directly without HTTP overhead",
          "SQLite semantics — no connection pooling, no cold start connection delays",
          "Read replicas at the edge for low-latency reads globally",
          "Free tier is generous for a job board workload (100K reads/day, 5GB storage)",
          "Migrations are just SQL files — simple, reviewable, version-controlled",
        ],
        cons: [
          "No native access from outside Cloudflare — requires the D1 Gateway Worker as HTTP proxy",
          "SQLite limitations: no native JSON operators (use text columns + JSON.parse), limited concurrency for writes",
          "D1 is still technically in beta — less battle-tested than Postgres or PlanetScale",
          "Boolean columns return 0/1 integers, not true/false — requires manual coercion in resolvers",
        ],
        alternatives_considered: [
          { name: "Turso (libSQL)", reason_not_chosen: "Was the original database — migrated away because D1 offers native Worker bindings (no HTTP client needed in Workers), simpler auth (binding vs API key), and better alignment with the CF Workers ecosystem" },
          { name: "Neon (Postgres)", reason_not_chosen: "Serverless Postgres is excellent but adds a TCP connection layer; D1's HTTP binding model is simpler for the Worker → DB access pattern used throughout this project" },
          { name: "PlanetScale", reason_not_chosen: "MySQL-compatible, requires Vitess query planner understanding; SQLite's simplicity is a better fit for a job board that doesn't need distributed writes" },
          { name: "Supabase (Postgres)", reason_not_chosen: "Full Postgres would work but adds connection pooling complexity (PgBouncer); D1's binding model eliminates connection management entirely" },
        ],
        trade_offs: [
          "Migrated from Turso to D1 mid-project — required rewriting the data access layer but eliminated connection pooling entirely",
          "D1 requires a gateway worker for non-CF access (Vercel → D1) — adds a hop but keeps the architecture Worker-native",
          "SQLite's single-writer model is fine for a job board's write volume — ingestion is batched, not concurrent",
        ],
        patterns_used: [
          "Gateway Worker pattern — HTTP proxy in front of D1 for external access",
          "Batch query support — multiple queries in one HTTP round-trip",
          "Migration-as-SQL-files — no ORM migration runner, just SQL scripts applied via Wrangler",
        ],
        interview_points: [
          "We migrated from Turso to Cloudflare D1 mid-project — the key driver was native Worker bindings. Our Workers can access D1 directly via a binding instead of making HTTP calls to an external database service",
          "D1 can't be accessed from outside Cloudflare, so we built a gateway worker (workers/d1-gateway.ts) that exposes D1 over HTTP with API key auth. The Next.js app on Vercel calls this gateway — it adds one hop but keeps the Worker-native architecture intact",
          "The gateway supports batched queries — our resolver layer can send multiple independent queries in a single HTTP request, reducing round-trip latency between Vercel and Cloudflare",
          "SQLite's boolean representation (0/1 integers) requires explicit coercion in resolvers — Drizzle's { mode: 'boolean' } handles most cases, but some fields need manual (parent.is_remote_eu as unknown) === 1 checks",
          "We chose SQLite (D1) over Postgres because a job board's write pattern is batch ingestion, not concurrent writes — SQLite's single-writer model is actually a feature, not a limitation, for this workload",
        ],
      },
      {
        name: "Drizzle ORM",
        role: "Type-safe query builder + migrations",
        url: "https://orm.drizzle.team",
        details:
          "All application queries use Drizzle's typed builder — never raw SQL strings. Types are derived from schema inference (typeof jobs.$inferSelect). Pagination uses the hasMore trick (limit + 1) to avoid extra COUNT queries.",
        why_chosen:
          "Drizzle was chosen over Prisma because Prisma's query engine binary cannot run on Cloudflare Workers — Drizzle is a pure TypeScript query builder with native D1/SQLite support and zero runtime overhead.",
        pros: [
          "Pure TypeScript — no binary engine, runs everywhere (Node, Workers, edge runtimes)",
          "Schema-as-code in TypeScript — types are inferred from schema, not generated",
          "SQL-like API — if you know SQL, you know Drizzle. No query engine abstraction layer",
          "Native D1 driver — drizzle-orm/d1 works with Worker bindings directly",
          "Lightweight — adds ~50KB to the bundle vs Prisma's multi-MB query engine",
        ],
        cons: [
          "Less mature ecosystem than Prisma — fewer tutorials, fewer community plugins",
          "Migration tooling is simpler than Prisma Migrate — no auto-generated migration names or rollback",
          "Relational queries API is newer and less documented than Prisma's include/select",
        ],
        alternatives_considered: [
          { name: "Prisma", reason_not_chosen: "Prisma's query engine is a Rust binary that cannot run on Cloudflare Workers or edge runtimes — this was the dealbreaker. Drizzle's pure TypeScript approach works everywhere" },
          { name: "Kysely", reason_not_chosen: "Excellent type-safe query builder but lacks migration tooling and schema-as-code — would need a separate migration tool on top" },
          { name: "Raw SQL", reason_not_chosen: "No type safety, no schema inference, no migration tooling — too error-prone for a project with 10+ tables and complex joins" },
        ],
        trade_offs: [
          "Drizzle's SQL-like API has a learning curve for developers used to Prisma's object-oriented queries",
          "Schema-as-code means the schema file is the source of truth — no Prisma-style introspection from existing DB",
          "Migration files are raw SQL — more transparent but less automated than Prisma Migrate",
        ],
        patterns_used: [
          "Schema inference — typeof table.$inferSelect / $inferInsert for type derivation",
          "hasMore pagination — fetch limit+1 rows, check length to determine if more pages exist, avoiding COUNT queries",
          "Subquery composition — inArray() with nested select for skill filtering",
          "Lazy DB initialization — factory function instead of module-level client",
        ],
        interview_points: [
          "We chose Drizzle over Prisma specifically because Prisma's query engine binary can't run on Cloudflare Workers — Drizzle is pure TypeScript, so it works on Node, Workers, and edge runtimes without any binary dependency",
          "Our pagination uses the hasMore trick: fetch limit+1 rows, if we get more than limit back, there are more pages. This avoids a separate COUNT(*) query on every page request — a real performance win on SQLite",
          "Types are inferred directly from the Drizzle schema — we never hand-write database types. typeof jobs.$inferSelect gives us the Job type automatically",
          "We use subquery composition for skill filtering: inArray(jobs.id, db.select(jobSkillTags.job_id).from(jobSkillTags).where(...)) — this compiles to a clean SQL IN (SELECT ...) subquery",
        ],
      },
      {
        name: "D1 Gateway Worker",
        role: "HTTP proxy with D1 binding, supports batch queries",
        url: "https://developers.cloudflare.com/workers",
        details:
          "workers/d1-gateway.ts runs as a Cloudflare Worker with a direct D1 binding. The Next.js app calls it over HTTP (authenticated via API_KEY secret). Supports batched queries to reduce round trips.",
        why_chosen:
          "The gateway worker exists because D1 has no native external access — Cloudflare Workers access D1 via bindings, but the Next.js app on Vercel needs an HTTP bridge. The gateway also adds batch query support and centralized auth.",
        pros: [
          "Enables Vercel → D1 access without Cloudflare REST API rate limits",
          "Batch query support — multiple queries in one request, reducing latency",
          "Centralized API key auth — one secret gates all external DB access",
          "Can add logging, rate limiting, or query validation at the gateway level",
        ],
        cons: [
          "CORS is currently set to * — needs tightening for production",
          "Adds an extra network hop between Vercel and D1",
          "Single point of failure for all external DB access",
        ],
        alternatives_considered: [
          { name: "Cloudflare REST API", reason_not_chosen: "Was the original dev fallback — works but has rate limits and doesn't support batch queries. The gateway worker provides higher throughput and lower latency" },
          { name: "Direct D1 HTTP API", reason_not_chosen: "D1 doesn't expose a direct HTTP API for external access — bindings only. The gateway worker is the recommended pattern" },
        ],
        trade_offs: [
          "Extra infrastructure to maintain (a Worker) but eliminates REST API rate limit concerns",
          "CORS * is a known security gap traded for development convenience — tightening is on the roadmap",
        ],
        patterns_used: [
          "Gateway/proxy pattern — HTTP facade over a binding-only service",
          "API key authentication via CF Worker secrets",
          "Batch query protocol — array of SQL statements in request body, array of results in response",
        ],
        interview_points: [
          "The D1 Gateway Worker is a pattern born from necessity — D1 only supports Worker bindings, not external HTTP access. Our Next.js app on Vercel calls this gateway, which uses its D1 binding to execute queries",
          "We built batch query support into the gateway — the resolver layer sends multiple independent queries in a single HTTP request, which cuts latency by avoiding serial round-trips between Vercel and Cloudflare",
          "Auth is a simple API_KEY secret check — sufficient for a gateway that only the Next.js app calls, and simpler than JWT or OAuth for internal service-to-service communication",
        ],
      },
    ],
  },
  {
    label: "AI / ML",
    color: "orange",
    entries: [
      {
        name: "DeepSeek",
        role: "Remote EU job classification (process-jobs worker)",
        url: "https://www.deepseek.com",
        details:
          "The process-jobs Python worker runs on a 6-hour cron + queue trigger. Feeds unprocessed job descriptions to DeepSeek to determine whether a job is genuinely remote and EU-eligible, setting is_remote_eu = 1 in D1.",
        why_chosen:
          "DeepSeek was chosen as the classification model because it offers GPT-4-class reasoning at ~10x lower cost — critical for classifying thousands of jobs where each requires a detailed analysis of location requirements, visa sponsorship, and timezone constraints.",
        pros: [
          "10x cheaper than GPT-4 for equivalent classification accuracy",
          "Strong instruction-following for structured output (JSON schema compliance)",
          "Fast inference — classification decisions in 2-3 seconds per job",
          "API-compatible with OpenAI format — easy to swap models for A/B testing",
        ],
        cons: [
          "Less established than OpenAI — occasional API instability",
          "Model updates can change classification behavior without notice",
          "No function-calling support in some model variants",
        ],
        alternatives_considered: [
          { name: "GPT-4o", reason_not_chosen: "10x more expensive per token — at thousands of jobs per week, the cost difference is material. DeepSeek achieves comparable accuracy for this classification task" },
          { name: "Claude 3.5 Sonnet", reason_not_chosen: "Excellent reasoning but Anthropic's pricing is similar to GPT-4 for batch classification. DeepSeek's cost advantage wins for high-volume, relatively straightforward classification" },
          { name: "Workers AI (Llama)", reason_not_chosen: "Free on Cloudflare but accuracy on nuanced remote-EU classification (timezone requirements, visa sponsorship, 'remote but must be in X') was significantly lower — below our 80% accuracy bar" },
        ],
        trade_offs: [
          "Chose cost efficiency over brand trust — DeepSeek is less established but the eval-first approach catches any accuracy regression",
          "Running classification in a Python Worker (not TypeScript) adds operational complexity but gives access to LangGraph for the classification state machine",
        ],
        patterns_used: [
          "Eval-first development — every prompt change tested against ≥80% accuracy bar before shipping",
          "Schema-constrained output — LLM must return JSON matching a strict schema, parsed and validated",
          "Cron + queue hybrid — scheduled runs every 6h plus on-demand queue triggers for new ingestion",
        ],
        interview_points: [
          "We use DeepSeek for job classification because it's ~10x cheaper than GPT-4 with comparable accuracy for our task — when you're classifying thousands of jobs per week, cost per token matters enormously",
          "Every prompt or model change goes through our eval pipeline first — we have a Langfuse dataset of labeled jobs and require ≥80% accuracy before any change ships to production",
          "The classifier determines if a job is genuinely remote-EU-eligible, which is surprisingly nuanced: 'remote' often means 'remote within the US' or 'remote but must be in Pacific timezone' — the model needs to parse these subtleties from unstructured job descriptions",
          "Classification runs in a Python Worker using LangGraph for the state machine — this lets us add retry logic, confidence scoring, and escalation paths without spaghetti code",
          "We considered Workers AI (free Llama models on Cloudflare) but they fell below our 80% accuracy bar on nuanced cases like timezone requirements and visa sponsorship analysis",
        ],
      },
      {
        name: "Anthropic Claude",
        role: "Agent SDK, sub-agents, architect, MCP tools",
        url: "https://www.anthropic.com",
        details:
          "Powers the SQL agent (src/agents/), strategy enforcer (src/agents/strategy-enforcer.ts), and architect sub-agents (src/anthropic/). MCP tool definitions are in src/anthropic/mcp/.",
        why_chosen:
          "Claude is used for agent-style tasks that require complex reasoning, tool use, and multi-step planning — its MCP (Model Context Protocol) support and Agent SDK enable building structured agent workflows with database introspection.",
        pros: [
          "MCP support — agents can use typed tools (DB introspection, SQL execution) with schema validation",
          "Agent SDK enables multi-step workflows with planning, execution, and self-correction",
          "Strong instruction following for strategy enforcement and code review tasks",
          "Long context window handles full file contents for architecture analysis",
        ],
        cons: [
          "More expensive than DeepSeek for high-volume tasks",
          "Agent SDK is newer — fewer community examples and patterns",
          "MCP tool ecosystem is still emerging",
        ],
        alternatives_considered: [
          { name: "OpenAI Assistants API", reason_not_chosen: "Assistants API is stateful and opaque — we wanted transparent, code-defined agent workflows. Claude's MCP tools give us typed tool definitions in code" },
          { name: "LangChain agents", reason_not_chosen: "LangChain's agent abstraction adds a heavy framework layer; Claude's Agent SDK is lighter and gives direct control over the planning-execution loop" },
        ],
        trade_offs: [
          "Claude for agents, DeepSeek for classification — multi-model routing adds complexity but optimizes cost vs capability",
          "MCP tools require schema definitions for each tool — upfront work that pays off in type safety and validation",
        ],
        patterns_used: [
          "MCP tool pattern — typed tool definitions with JSON Schema for parameters and return types",
          "Sub-agent delegation — architect agent spawns specialized sub-agents for focused tasks",
          "Strategy enforcement — agent validates code changes against optimization strategy rules",
          "Database introspection tools — agents can query schema metadata to understand table structures",
        ],
        interview_points: [
          "We use Claude for agent-style tasks (SQL generation, strategy enforcement, architecture analysis) because these need complex reasoning and tool use — DeepSeek handles the high-volume classification where cost matters more",
          "MCP tools let our agents introspect the database schema and execute queries with typed tool definitions — the agent knows what tables exist, what columns they have, and can compose valid SQL",
          "The strategy enforcer is an agent that reviews code changes against our optimization strategy — it catches things like missing eval coverage or schema constraint violations before they reach production",
          "Multi-model routing is a deliberate architecture: Claude for agents (reasoning-heavy), DeepSeek for classification (cost-sensitive), Workers AI for embeddings (free on CF)",
        ],
      },
      {
        name: "Vercel AI SDK",
        role: "Streaming, tool use, multi-model routing",
        url: "https://sdk.vercel.ai",
        details:
          "Provides a unified interface for calling Claude, DeepSeek, and other models. Used in src/agents/ for streaming responses, tool invocation, and structured output generation.",
        why_chosen:
          "The AI SDK provides a single interface for multiple model providers — switching between Claude, DeepSeek, and GPT-4 requires changing one line, not rewriting the integration.",
        pros: [
          "Provider-agnostic — same code works with Anthropic, OpenAI, Google, DeepSeek",
          "Built-in streaming support for real-time responses",
          "Structured output with Zod schema validation",
          "Tool use abstraction — define tools once, works across providers",
        ],
        cons: [
          "Abstraction can hide provider-specific capabilities",
          "Adds a dependency layer between your code and model APIs",
        ],
        alternatives_considered: [
          { name: "Direct API clients", reason_not_chosen: "Would require separate integration code for each provider — the AI SDK's unified interface saves significant development time when testing across 4+ providers" },
          { name: "LangChain.js", reason_not_chosen: "Heavier framework with more abstractions than needed; AI SDK is lighter and more composable for our agent patterns" },
        ],
        trade_offs: [
          "Accepted an abstraction layer for multi-provider flexibility — worth it when A/B testing models across providers",
        ],
        patterns_used: [
          "Multi-model routing — cheap model first, escalate to expensive model on low confidence",
          "Structured output — Zod schemas enforce type-safe LLM responses",
          "Streaming — real-time token delivery for interactive agent UIs",
        ],
        interview_points: [
          "The AI SDK lets us swap between Claude, DeepSeek, and GPT-4 by changing a single provider parameter — this is essential for our multi-model routing strategy where we test different models against the same eval dataset",
          "Structured output with Zod validation means our LLM responses are type-safe at runtime — if the model returns malformed JSON, we catch it immediately instead of propagating bad data",
          "We use the AI SDK's tool abstraction to define database tools once and reuse them across Claude and GPT-4 agents — the tool definitions are provider-agnostic",
        ],
      },
      {
        name: "OpenRouter",
        role: "Model gateway for multi-provider routing",
        url: "https://openrouter.ai",
        details:
          "Acts as a fallback and comparison gateway when testing multiple models against the same prompt.",
        why_chosen:
          "OpenRouter provides a single API key for 100+ models — useful for rapid model comparison and as a fallback when primary providers have outages.",
        pros: [
          "Single API key for 100+ models across providers",
          "Useful for A/B testing and model comparison",
          "Fallback routing when primary provider is down",
        ],
        cons: [
          "Adds latency (extra hop through their proxy)",
          "Pricing markup over direct provider APIs",
        ],
        alternatives_considered: [
          { name: "Direct provider APIs only", reason_not_chosen: "Would need separate API keys and integration for each provider we want to test — OpenRouter simplifies multi-model experimentation" },
        ],
        trade_offs: [
          "Pay a small markup for the convenience of one-API-key access to all models",
        ],
        patterns_used: [
          "Gateway pattern — single entry point for multiple backend services",
        ],
        interview_points: [
          "OpenRouter is our experimentation layer — when evaluating a new model for classification, we can test it through OpenRouter without setting up a new provider integration",
          "It also serves as a fallback route — if DeepSeek has an outage, we can route classification through OpenRouter to an alternative model without code changes",
        ],
      },
      {
        name: "Google ADK",
        role: "Agent Development Kit integration",
        url: "https://google.com",
        details:
          "Google Agent Development Kit is integrated for exploring multi-agent orchestration patterns alongside the Anthropic Agent SDK.",
        why_chosen:
          "ADK is being evaluated for multi-agent orchestration patterns — comparing Google's approach with Anthropic's Agent SDK to find the best patterns for complex workflows.",
        pros: [
          "Google's take on multi-agent orchestration",
          "Integration with Gemini models",
          "Complementary patterns to Anthropic's Agent SDK",
        ],
        cons: [
          "Newer and less proven than established agent frameworks",
          "Adds another SDK to maintain",
        ],
        alternatives_considered: [
          { name: "CrewAI", reason_not_chosen: "Python-only, doesn't integrate with our TypeScript agent codebase" },
          { name: "AutoGen", reason_not_chosen: "Microsoft's framework is Python-focused and more research-oriented than production-ready" },
        ],
        trade_offs: [
          "Exploring multiple agent frameworks adds cognitive overhead but helps identify the best patterns before committing to one approach",
        ],
        patterns_used: [
          "Multi-agent orchestration — comparing different framework approaches",
        ],
        interview_points: [
          "We're evaluating both Anthropic's Agent SDK and Google's ADK to understand different multi-agent orchestration approaches — the goal is to find patterns that compose well for our specific use cases (DB introspection, strategy enforcement, code review)",
        ],
      },
    ],
  },
  {
    label: "Observability",
    color: "green",
    entries: [
      {
        name: "Langfuse",
        role: "LLM tracing, prompt versioning, scoring",
        url: "https://langfuse.com",
        details:
          "Central observability layer for all LLM calls. Prompt versions managed and fetched at runtime. Session scoring from stop_hook.py writes accuracy scores back for trend tracking.",
        why_chosen:
          "Langfuse was chosen because it's purpose-built for LLM observability — it provides tracing, prompt versioning, and evaluation scoring in one platform, which is essential for our eval-first development approach.",
        pros: [
          "Purpose-built for LLM observability — traces show full prompt/completion/token usage",
          "Prompt versioning — prompts are managed in Langfuse, fetched at runtime, enabling A/B testing without deploys",
          "Scoring API — eval scripts write accuracy scores back, enabling trend tracking over time",
          "Dataset management — labeled examples for classification eval are stored and versioned",
          "Open source — can self-host if needed",
        ],
        cons: [
          "Adds latency to LLM calls for trace reporting (async mitigates this)",
          "Learning curve for the scoring and dataset APIs",
          "Cloud pricing scales with trace volume",
        ],
        alternatives_considered: [
          { name: "LangSmith", reason_not_chosen: "Used alongside Langfuse for LangChain-specific pipelines, but Langfuse is the primary because it's provider-agnostic and its scoring API is more flexible" },
          { name: "Weights & Biases", reason_not_chosen: "More ML-experiment-focused than LLM-observability-focused — Langfuse's trace/prompt/score model maps better to our eval-first workflow" },
          { name: "Helicone", reason_not_chosen: "Good proxy-based approach but less mature prompt versioning and scoring capabilities" },
        ],
        trade_offs: [
          "Using both Langfuse (primary) and LangSmith (LangChain pipelines) adds tool sprawl but each excels at its niche",
          "Runtime prompt fetching adds a network call but enables prompt changes without code deploys",
        ],
        patterns_used: [
          "Observability-driven development — every LLM call is traced, scored, and trackable",
          "Runtime prompt versioning — prompts fetched from Langfuse at call time, not hardcoded",
          "Session scoring pipeline — stop_hook.py scores sessions and reports to Langfuse",
          "Eval datasets — labeled examples stored in Langfuse for automated accuracy testing",
        ],
        interview_points: [
          "Langfuse is central to our eval-first approach — every classification prompt change is tested against a labeled dataset in Langfuse, and we require ≥80% accuracy before shipping",
          "Prompts are versioned in Langfuse and fetched at runtime — this means we can update classification prompts without code deploys, and A/B test prompt variants by routing traffic between versions",
          "Our stop_hook.py scores each Claude Code session and reports to Langfuse — over time this builds a trend of session quality that helps us identify when our prompts or workflows are degrading",
          "We use both Langfuse (primary, provider-agnostic) and LangSmith (LangChain pipelines) — Langfuse for our custom AI SDK calls, LangSmith for the Python LangGraph workers. It's tool sprawl we'd like to consolidate, but each tool excels in its niche",
        ],
      },
      {
        name: "LangSmith",
        role: "Trace logging for LangChain-based pipelines",
        url: "https://smith.langchain.com",
        details:
          "Used alongside Langfuse for pipelines that use LangChain/LangGraph primitives (resume-rag, process-jobs). Provides dataset management for running evals against captured production traces.",
        why_chosen:
          "LangSmith is the native observability tool for LangChain/LangGraph — our Python workers use LangGraph, making LangSmith the path of least resistance for tracing those pipelines.",
        pros: [
          "Native LangChain/LangGraph integration — zero-config tracing",
          "Dataset management for eval runs",
          "Production trace capture for debugging",
        ],
        cons: [
          "LangChain-ecosystem-specific — doesn't trace non-LangChain calls",
          "Adds a second observability tool alongside Langfuse",
        ],
        alternatives_considered: [
          { name: "Langfuse only", reason_not_chosen: "Langfuse can trace LangChain via its integration, but LangSmith's native support captures more granular LangGraph state transitions and node-level traces" },
        ],
        trade_offs: [
          "Two observability tools (Langfuse + LangSmith) vs one — accepted for better coverage of both TypeScript and Python pipelines",
        ],
        patterns_used: [
          "Auto-instrumentation — LangSmith traces LangGraph pipelines with zero code changes",
        ],
        interview_points: [
          "LangSmith traces our Python LangGraph workers natively — we get node-level visibility into the classification state machine without adding tracing code",
          "We'd like to consolidate to one observability tool eventually, but LangSmith's LangGraph integration captures state transitions that Langfuse's LangChain integration misses",
        ],
      },
    ],
  },
  {
    label: "Workers",
    color: "amber",
    entries: [
      {
        name: "janitor",
        role: "Daily cron — triggers ATS ingestion",
        details:
          "Runs at midnight UTC daily. Scans all active ATS sources in D1 and enqueues ingestion jobs for Greenhouse, Lever, and Ashby boards.",
        why_chosen:
          "A cron-triggered worker is the simplest way to schedule daily ingestion — no external scheduler needed, runs on Cloudflare's infrastructure with zero operational overhead.",
        pros: [
          "Zero operational overhead — Cloudflare manages scheduling",
          "Direct D1 binding — reads ATS sources without HTTP gateway",
          "Enqueues work to other workers via CF Queues — clean separation of concerns",
        ],
        cons: [
          "Cron triggers have no retry mechanism — if the worker fails, you wait 24h",
          "Limited observability — CF Worker logs aren't as rich as dedicated job runners",
        ],
        alternatives_considered: [
          { name: "Trigger.dev scheduled task", reason_not_chosen: "Would work but adds a dependency on Trigger.dev's scheduler; CF cron triggers are free and built into the Workers platform" },
          { name: "GitHub Actions cron", reason_not_chosen: "GHA cron has ~5min jitter and no direct D1 access — would need to call the API" },
        ],
        trade_offs: [
          "Simple cron trigger vs more sophisticated scheduler — simplicity wins for a daily-cadence job",
        ],
        patterns_used: [
          "Cron-triggered worker — scheduled execution without external schedulers",
          "Queue producer — enqueues messages for downstream workers to process",
        ],
        interview_points: [
          "The janitor runs at midnight UTC daily via CF cron trigger — it reads all active ATS sources from D1 and enqueues ingestion jobs. No external scheduler, no infra to manage",
          "It's a producer-only worker: it doesn't fetch or process jobs itself, it just enqueues work for the insert-jobs worker — clean separation of scheduling from execution",
        ],
      },
      {
        name: "insert-jobs",
        role: "Queue-based job insertion from ATS APIs",
        details:
          "Processes messages from the ingestion queue. Fetches job listings from ATS APIs, deduplicates by external_id, and upserts into D1.",
        why_chosen:
          "Queue-based processing decouples ingestion from scheduling — the janitor enqueues, insert-jobs processes at its own pace with built-in retry and backpressure.",
        pros: [
          "Queue-based — automatic retry, backpressure, and dead-letter handling",
          "Deduplication by external_id prevents duplicate job entries",
          "Can process multiple ATS types (Greenhouse, Lever, Ashby) with type-specific fetchers",
        ],
        cons: [
          "Still uses Turso references in some code paths (legacy from migration)",
          "No rate limiting per ATS API — could trigger API throttling",
        ],
        alternatives_considered: [
          { name: "Direct insertion in janitor", reason_not_chosen: "Would make the janitor a monolithic worker handling both scheduling and insertion — queue-based separation is cleaner" },
        ],
        trade_offs: [
          "Queue-based architecture adds a message hop but gives retry semantics and backpressure for free",
        ],
        patterns_used: [
          "Queue consumer pattern — processes messages with built-in retry",
          "Upsert pattern — INSERT ON CONFLICT UPDATE for deduplication",
          "Type-specific fetchers — each ATS platform has its own fetch/parse logic",
        ],
        interview_points: [
          "The insert-jobs worker consumes from a CF Queue — it fetches job listings from ATS APIs (Greenhouse, Lever, Ashby) and upserts into D1 using external_id as the dedup key",
          "Queue-based processing gives us automatic retry and backpressure — if an ATS API is down, messages stay in the queue and retry without any custom logic",
        ],
      },
      {
        name: "process-jobs",
        role: "Python/LangGraph — DeepSeek classification every 6h",
        details:
          "Python Worker using LangGraph for the classification state machine. Runs every 6 hours and on queue trigger. Sets is_remote_eu on each classified job.",
        why_chosen:
          "Python was chosen for this worker because LangGraph (the classification state machine framework) is Python-first, and the NLP preprocessing benefits from Python's text processing ecosystem.",
        pros: [
          "LangGraph provides a clean state machine for the classification pipeline",
          "Python's text processing ecosystem (spaCy, regex) for preprocessing",
          "Dual trigger — cron every 6h plus queue for on-demand classification",
        ],
        cons: [
          "Python Worker adds a different runtime to maintain alongside TypeScript",
          "CF Python Workers are newer and less documented than TypeScript Workers",
        ],
        alternatives_considered: [
          { name: "TypeScript Worker with AI SDK", reason_not_chosen: "Would keep the runtime uniform but LangGraph's state machine abstraction for the classification pipeline has no TypeScript equivalent at the same maturity" },
        ],
        trade_offs: [
          "Mixed runtime (TypeScript + Python) adds operational complexity but each language is used where it excels",
        ],
        patterns_used: [
          "LangGraph state machine — nodes for preprocessing, classification, validation, persistence",
          "Dual-trigger pattern — cron for regular sweeps, queue for on-demand processing",
        ],
        interview_points: [
          "This worker uses Python because LangGraph's state machine abstraction lets us model the classification pipeline as discrete nodes: preprocess → classify → validate → persist. Each node is independently testable",
          "It runs on a dual trigger — every 6 hours via cron to catch accumulated unclassified jobs, plus a queue trigger for immediate classification when new jobs are ingested",
        ],
      },
      {
        name: "ashby-crawler",
        role: "Rust/WASM — Common Crawl → Ashby boards → D1",
        details:
          "Written in Rust compiled to WASM via worker-build. Crawls Common Crawl CDX index to discover Ashby job boards and runs TF-IDF vector search.",
        why_chosen:
          "Rust was chosen for this worker because Common Crawl processing is CPU-intensive (parsing millions of CDX records) and Rust compiled to WASM gives near-native performance within Cloudflare Workers' CPU time limits.",
        pros: [
          "Near-native performance — Rust/WASM handles CPU-intensive CDX parsing within Worker CPU limits",
          "Memory safety — Rust's ownership model prevents the memory leaks that would crash a long-running crawler",
          "BM25/TF-IDF search — custom vector search implementation without external dependencies",
          "rig_compat module — abstraction layer ready to swap to rig-core when it ships WASM support",
        ],
        cons: [
          "Rust + WASM adds compilation complexity (worker-build toolchain)",
          "Smaller contributor pool — not everyone on a team knows Rust",
          "rig_compat is a custom abstraction until rig-core ships WASM — maintenance burden",
        ],
        alternatives_considered: [
          { name: "TypeScript Worker", reason_not_chosen: "CDX parsing with millions of records would exceed Worker CPU time limits in TypeScript — Rust/WASM is 10-50x faster for this compute-bound task" },
          { name: "Python Worker", reason_not_chosen: "Even slower than TypeScript for CPU-bound parsing; Python Workers are designed for I/O-bound LLM tasks" },
          { name: "Standalone Rust service", reason_not_chosen: "Would require separate hosting infrastructure; compiling to WASM keeps everything in the CF Workers ecosystem" },
        ],
        trade_offs: [
          "Rust adds compilation overhead and a steeper learning curve but is the only language that can handle CDX processing within Worker CPU limits",
          "Custom rig_compat module is technical debt — will be replaced when rig-core ships wasm32 support",
          "BM25 search is simpler than neural embeddings but runs entirely on-worker without external API calls",
        ],
        patterns_used: [
          "rig_compat abstraction — VectorStore, Pipeline, Tool traits compatible with rig-core's API",
          "BM25/TF-IDF search — classical information retrieval for board discovery",
          "Paginated CDX crawl — processes Common Crawl data in pages to stay within memory limits",
          "Enrichment pipeline — discovered boards are enriched with company metadata",
        ],
        interview_points: [
          "The ashby-crawler is written in Rust compiled to WASM because it processes Common Crawl CDX data — millions of records need parsing, and TypeScript would exceed the Worker CPU time limit. Rust/WASM gives us near-native performance within the same Worker runtime",
          "We implemented a custom rig_compat module that mirrors the rig-core VectorStore and Pipeline traits — this lets us use rig's patterns now while the library doesn't yet support wasm32, and swap to the real crate when it does",
          "The search uses BM25/TF-IDF instead of neural embeddings — it runs entirely on-worker without calling an embedding API, which is important for a Worker that needs to respond quickly. Classical IR is sufficient for matching company names against known Ashby board patterns",
          "This is a real example of choosing the right tool for the job: Rust for CPU-bound CDX parsing, Python for LLM-heavy classification, TypeScript for I/O-bound API calls",
        ],
      },
      {
        name: "resume-rag",
        role: "Python — Vectorize + Workers AI resume matching",
        details:
          "Uses Cloudflare Vectorize for resume embeddings and Workers AI for generating them. Performs vector similarity search to rank job matches.",
        why_chosen:
          "Python Worker with Cloudflare Vectorize enables vector similarity search entirely within the CF ecosystem — no external vector DB needed, and Workers AI generates embeddings for free.",
        pros: [
          "Cloudflare Vectorize — managed vector DB within the CF ecosystem",
          "Workers AI embeddings are free — no per-token embedding costs",
          "Python for NLP preprocessing of resumes",
        ],
        cons: [
          "Vectorize is in beta — less mature than Pinecone or Weaviate",
          "Workers AI embedding quality may be lower than OpenAI's ada-002",
        ],
        alternatives_considered: [
          { name: "Pinecone", reason_not_chosen: "External service adds latency and cost; Vectorize runs within CF's network" },
          { name: "OpenAI embeddings + Supabase pgvector", reason_not_chosen: "Would work but adds two external services; CF Vectorize + Workers AI keeps everything in one ecosystem" },
        ],
        trade_offs: [
          "Free embeddings and managed vector DB vs potentially lower quality embeddings — acceptable for job matching where approximate similarity is sufficient",
        ],
        patterns_used: [
          "RAG pattern — retrieve relevant jobs by vector similarity, then rank/filter",
          "Embedding pipeline — resume text → Workers AI → vector → Vectorize → similarity search",
        ],
        interview_points: [
          "Resume-RAG uses Cloudflare Vectorize for vector search and Workers AI for embeddings — both are free tier, keeping the entire resume matching pipeline at zero marginal cost",
          "We chose to keep everything in the CF ecosystem (Vectorize instead of Pinecone, Workers AI instead of OpenAI embeddings) to minimize network hops and external dependencies — the trade-off is potentially lower embedding quality, but for job matching approximate similarity is sufficient",
        ],
      },
    ],
  },
  {
    label: "Background Jobs",
    color: "indigo",
    entries: [
      {
        name: "Trigger.dev",
        role: "Managed task queues for job enhancement",
        url: "https://trigger.dev",
        details:
          "Tasks live in src/trigger/ and are registered in trigger.config.ts. Used primarily for job enhancement — fetching full job details from ATS APIs after initial ingestion.",
        why_chosen:
          "Trigger.dev was chosen for long-running background tasks that exceed Vercel's 60s timeout — it provides managed task execution with retry, concurrency control, and a dashboard without self-hosting a queue worker.",
        pros: [
          "Managed infrastructure — no queues, workers, or Redis to operate",
          "Built-in retry with exponential backoff and configurable max attempts",
          "Concurrency limiting — prevents overwhelming ATS APIs",
          "Dashboard with real-time task status, logs, and error tracking",
          "TypeScript-native — tasks are just exported functions",
        ],
        cons: [
          "External dependency — another service to monitor and pay for",
          "SDK version coupling — v3 has breaking changes from v2",
          "Tasks must be registered in trigger.config.ts — easy to forget",
        ],
        alternatives_considered: [
          { name: "BullMQ + Redis", reason_not_chosen: "Would require self-hosting Redis and a worker process — significant operational overhead for what amounts to ~10 background tasks" },
          { name: "Cloudflare Queues only", reason_not_chosen: "CF Queues handle simple message processing but lack the retry configuration, concurrency limits, and dashboard that Trigger.dev provides. We use CF Queues for simple fire-and-forget, Trigger.dev for tasks needing visibility" },
          { name: "Inngest", reason_not_chosen: "Similar managed approach but Trigger.dev's TypeScript SDK feels more natural — functions-as-tasks vs event-driven step functions. Marginal difference" },
        ],
        trade_offs: [
          "Paying for managed infrastructure vs self-hosting — worth it for the dashboard visibility and operational simplicity",
          "Using both Trigger.dev (complex tasks with retry/dashboard) and CF Queues (simple fire-and-forget) adds tool sprawl but each is used where it excels",
        ],
        patterns_used: [
          "Task-as-function — each task is a typed, exported async function",
          "Lazy DB initialization — DB client created inside run(), not at module level",
          "handleError pattern — terminal errors (404) skip retry, transient errors allow retry",
          "Concurrency limiting — queue config limits parallel API calls to prevent throttling",
        ],
        interview_points: [
          "We use Trigger.dev for job enhancement because these tasks call ATS APIs that can take 30-60 seconds per job — Vercel's 60s timeout kills these requests, but Trigger.dev tasks can run for up to 5 minutes with retry",
          "Each task uses lazy DB initialization — the Drizzle client is created inside the run() function, not at module level, because Trigger.dev may reuse the module across runs and we want fresh connections",
          "The handleError pattern lets us skip retries for terminal errors (404 = job was deleted) while allowing retries for transient failures (network timeout). This prevents wasting retry budget on unfixable errors",
          "We use both Trigger.dev and CF Queues: Trigger.dev for complex tasks needing visibility (enhancement, skill extraction), CF Queues for simple fire-and-forget (ingestion message passing). Each tool where it excels",
        ],
      },
    ],
  },
  {
    label: "Evaluation",
    color: "crimson",
    entries: [
      {
        name: "Langfuse Evals",
        role: "LLM evaluation with tracing and scoring",
        url: "https://langfuse.com",
        details:
          "Langfuse-native evaluation script (scripts/eval-remote-eu-langfuse.ts) runs classification evals with full tracing, prompt versioning, and accuracy scoring. The optimization strategy requires >= 80% accuracy before any prompt or model change ships.",
        why_chosen:
          "Langfuse evals integrate tracing, prompt versioning, and scoring into one workflow — every eval run produces a traceable, scored result that we can compare across prompt versions and models.",
        pros: [
          "Eval results are traced — every classification decision is auditable",
          "Prompt version comparison — run the same dataset against different prompt versions",
          "Accuracy scores feed back into Langfuse for trend tracking",
          "Dataset management — labeled examples are versioned and managed in Langfuse",
        ],
        cons: [
          "Eval runs cost real API calls — running against large datasets is expensive",
          "Manual dataset curation — no automated label generation",
        ],
        alternatives_considered: [
          { name: "Promptfoo", reason_not_chosen: "Excellent standalone eval tool but doesn't integrate with our Langfuse tracing/scoring pipeline — we'd lose the traceability connection between evals and production" },
          { name: "Custom eval harness", reason_not_chosen: "Would require building dataset management, scoring, and comparison from scratch — Langfuse provides all three" },
        ],
        trade_offs: [
          "Using Langfuse for both observability and evaluation consolidates tooling but means eval quality depends on Langfuse's scoring API",
        ],
        patterns_used: [
          "Eval-first development — no prompt or model change ships without passing the accuracy bar",
          "Golden dataset pattern — curated labeled examples used as ground truth",
          "Version comparison — same dataset, different prompt versions, scored side-by-side",
        ],
        interview_points: [
          "Our eval-first policy is enforced technically, not just culturally — the strategy enforcer agent blocks prompt changes that haven't been tested against the eval dataset. No eval run, no merge",
          "Eval scripts run classification against a curated dataset of labeled jobs — some are 'obvious remote EU' and some are tricky edge cases like 'remote but Pacific timezone only'. The accuracy bar is ≥80% across the full dataset",
          "Every eval run produces a Langfuse trace — we can see exactly which jobs were misclassified, what the model's reasoning was, and compare across prompt versions. This traceability is key for improving the classifier iteratively",
        ],
      },
      {
        name: "Vitest",
        role: "Unit and eval tests (src/evals/)",
        url: "https://vitest.dev",
        details:
          "src/evals/ contains eval test files for the classification pipeline, skill extraction quality, and worker correctness.",
        why_chosen:
          "Vitest is the standard test runner for the Next.js/TypeScript ecosystem — fast, native ESM support, and compatible with the project's module system.",
        pros: [
          "Native ESM support — no transform issues with the project's ES Module setup",
          "Fast — uses Vite's transform pipeline for near-instant test startup",
          "Compatible with Jest's API — easy to adopt for developers familiar with Jest",
        ],
        cons: [
          "Eval tests are slower than unit tests (they make real API calls)",
          "Configuration needed for path aliases (@/*) resolution",
        ],
        alternatives_considered: [
          { name: "Jest", reason_not_chosen: "ESM support in Jest is experimental and requires complex transforms; Vitest handles ESM natively" },
          { name: "Node.js test runner", reason_not_chosen: "Built-in but lacks the DX features (watch mode, UI, coverage) that Vitest provides" },
        ],
        trade_offs: [
          "Vitest adds a dev dependency but its native ESM support eliminates the transform headaches that Jest causes with ES Modules",
        ],
        patterns_used: [
          "Eval-as-test — LLM evaluation logic wrapped in Vitest test cases for CI integration",
          "Test-driven eval — write the test expectation first, then iterate on the prompt until it passes",
        ],
        interview_points: [
          "We chose Vitest over Jest specifically for native ESM support — this project uses 'type: module' and Jest's experimental ESM support was too fragile with our path aliases and TypeScript configuration",
          "Eval tests in src/evals/ wrap LLM evaluation logic in Vitest test cases — this means our CI pipeline can gate deploys on classification accuracy, just like it gates on unit test failures",
        ],
      },
    ],
  },
];
