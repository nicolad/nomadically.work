"use client";

// Local-only page. Run `pnpm stack:discover` to populate discovery.json.
// Not linked from the sidebar in production (see sidebar.tsx IS_DEV guard).

import { Badge, Card, Container, Dialog, Flex, Heading, Text } from "@radix-ui/themes";
import { LayersIcon, ExternalLinkIcon, UpdateIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import discoveryRaw from "./discovery.json";

// ── Types ────────────────────────────────────────────────────────────────────

const GITHUB_BASE = "https://github.com/nicolad/nomadically.work/blob/main";

type SourceLocation = {
  path: string;
  line?: number | null;
  note: string;
};

type StackEntry = {
  name: string;
  version?: string | null;
  role: string;
  url?: string | null;
  details: string;
  facts?: string[];
  source_locations?: SourceLocation[];
};

type StackGroup = {
  label: string;
  color: "violet" | "blue" | "cyan" | "orange" | "green" | "amber" | "crimson" | "indigo";
  entries: StackEntry[];
};

type DiscoveryData = {
  generated_at: string | null;
  root: string | null;
  groups: StackGroup[];
};

// ── Hardcoded fallback (shown when discovery.json has no groups) ──────────────

const FALLBACK: StackGroup[] = [
  {
    label: "Frontend",
    color: "violet",
    entries: [
      { name: "Next.js 16", role: "App Router, SSR/RSC, API routes", url: "https://nextjs.org", details: "All pages use the App Router with React Server Components where possible. API routes under /api/ handle GraphQL (/api/graphql), job enhancement (/api/enhance-greenhouse-jobs), company import (/api/companies/bulk-import), and text-to-SQL (/api/text-to-sql). Route max duration is set to 60s in vercel.json to accommodate slow ATS API calls." },
      { name: "React 19", role: "UI rendering, Server Components", url: "https://react.dev", details: "Client components are marked with 'use client' and handle interactive state (search, filters, modals). Server Components fetch data directly or via Apollo. Providers (auth, sidebar, theme) are wrapped in *-provider.tsx files under src/components/." },
      { name: "Radix UI", role: "Themes + Icons — accessible primitives", url: "https://radix-ui.com", details: "Radix Themes provides the design system: Container, Card, Flex, Grid, Heading, Text, Badge, Button, Dialog, Select, TextField. Radix Icons is the icon set throughout the sidebar and pages." },
      { name: "Clerk", role: "Authentication and user management", url: "https://clerk.com", details: "Clerk handles sign-in, sign-up, and session management. The current user's email is checked against ADMIN_EMAIL (src/lib/admin.ts) to gate admin mutations." },
    ],
  },
  {
    label: "API",
    color: "blue",
    entries: [
      { name: "Apollo Server 5", role: "GraphQL endpoint at /api/graphql", url: "https://www.apollographql.com/docs/apollo-server", details: "The main API layer. Schema is split by domain under schema/ (jobs, companies, applications, prompts). Resolvers live in src/apollo/resolvers/. The GraphQL context injects the D1 HTTP client, Drizzle ORM instance, DataLoaders, and Clerk auth info." },
      { name: "Vercel", role: "Hosting, edge network, 60s max route duration", url: "https://vercel.com", details: "Hosts the Next.js app. Deployment is triggered via pnpm deploy (scripts/deploy.ts). The 60-second function timeout is critical for long-running GraphQL mutations that call external ATS APIs." },
    ],
  },
  {
    label: "Database",
    color: "cyan",
    entries: [
      { name: "Cloudflare D1", role: "SQLite-compatible edge database", url: "https://developers.cloudflare.com/d1", details: "Primary datastore for jobs, companies, applications, skills, contacts, and ATS sources. Schema defined in src/db/schema.ts using Drizzle SQLite core. Migrations live in migrations/ and are applied with pnpm db:push." },
      { name: "Drizzle ORM", role: "Type-safe query builder + migrations", url: "https://orm.drizzle.team", details: "All application queries use Drizzle's typed builder — never raw SQL strings. Types are derived from schema inference (typeof jobs.$inferSelect). Pagination uses the hasMore trick (limit + 1) to avoid extra COUNT queries." },
      { name: "D1 Gateway Worker", role: "HTTP proxy with D1 binding, supports batch queries", url: "https://developers.cloudflare.com/workers", details: "workers/d1-gateway.ts runs as a Cloudflare Worker with a direct D1 binding. The Next.js app calls it over HTTP (authenticated via API_KEY secret). Supports batched queries to reduce round trips." },
    ],
  },
  {
    label: "AI / ML",
    color: "orange",
    entries: [
      { name: "DeepSeek", role: "Remote EU job classification (process-jobs worker)", url: "https://www.deepseek.com", details: "The process-jobs Python worker runs on a 6-hour cron + queue trigger. Feeds unprocessed job descriptions to DeepSeek to determine whether a job is genuinely remote and EU-eligible, setting is_remote_eu = 1 in D1." },
      { name: "Anthropic Claude", role: "Agent SDK, sub-agents, architect, MCP tools", url: "https://www.anthropic.com", details: "Powers the SQL agent (src/agents/), strategy enforcer (src/agents/strategy-enforcer.ts), and architect sub-agents (src/anthropic/). MCP tool definitions are in src/anthropic/mcp/." },
      { name: "Vercel AI SDK", role: "Streaming, tool use, multi-model routing", url: "https://sdk.vercel.ai", details: "Provides a unified interface for calling Claude, DeepSeek, and other models. Used in src/agents/ for streaming responses, tool invocation, and structured output generation." },
      { name: "OpenRouter", role: "Model gateway for multi-provider routing", url: "https://openrouter.ai", details: "Acts as a fallback and comparison gateway when testing multiple models against the same prompt." },
      { name: "Google ADK", role: "Agent Development Kit integration", url: "https://google.com", details: "Google Agent Development Kit is integrated for exploring multi-agent orchestration patterns alongside the Anthropic Agent SDK." },
    ],
  },
  {
    label: "Observability",
    color: "green",
    entries: [
      { name: "Langfuse", role: "LLM tracing, prompt versioning, scoring", url: "https://langfuse.com", details: "Central observability layer for all LLM calls. Prompt versions managed and fetched at runtime. Session scoring from stop_hook.py writes accuracy scores back for trend tracking." },
      { name: "LangSmith", role: "Trace logging for LangChain-based pipelines", url: "https://smith.langchain.com", details: "Used alongside Langfuse for pipelines that use LangChain/LangGraph primitives (resume-rag, process-jobs). Provides dataset management for running evals against captured production traces." },
    ],
  },
  {
    label: "Workers",
    color: "amber",
    entries: [
      { name: "janitor", role: "Daily cron — triggers ATS ingestion", details: "Runs at midnight UTC daily. Scans all active ATS sources in D1 and enqueues ingestion jobs for Greenhouse, Lever, and Ashby boards." },
      { name: "insert-jobs", role: "Queue-based job insertion from ATS APIs", details: "Processes messages from the ingestion queue. Fetches job listings from ATS APIs, deduplicates by external_id, and upserts into D1." },
      { name: "process-jobs", role: "Python/LangGraph — DeepSeek classification every 6h", details: "Python Worker using LangGraph for the classification state machine. Runs every 6 hours and on queue trigger. Sets is_remote_eu on each classified job." },
      { name: "ashby-crawler", role: "Rust/WASM — Common Crawl → Ashby boards → D1", details: "Written in Rust compiled to WASM via worker-build. Crawls Common Crawl CDX index to discover Ashby job boards and runs TF-IDF vector search." },
      { name: "resume-rag", role: "Python — Vectorize + Workers AI resume matching", details: "Uses Cloudflare Vectorize for resume embeddings and Workers AI for generating them. Performs vector similarity search to rank job matches." },
    ],
  },
  {
    label: "Background Jobs",
    color: "indigo",
    entries: [
      { name: "Trigger.dev", role: "Managed task queues for job enhancement", url: "https://trigger.dev", details: "Tasks live in src/trigger/ and are registered in trigger.config.ts. Used primarily for job enhancement — fetching full job details from ATS APIs after initial ingestion." },
    ],
  },
  {
    label: "Evaluation",
    color: "crimson",
    entries: [
      { name: "Langfuse Evals", role: "LLM evaluation with tracing and scoring", url: "https://langfuse.com", details: "Langfuse-native evaluation script (scripts/eval-remote-eu-langfuse.ts) runs classification evals with full tracing, prompt versioning, and accuracy scoring. The optimization strategy requires >= 80% accuracy before any prompt or model change ships." },
      { name: "Vitest", role: "Unit and eval tests (src/evals/)", url: "https://vitest.dev", details: "src/evals/ contains eval test files for the classification pipeline, skill extraction quality, and worker correctness." },
    ],
  },
];

// ── Resolve data source ───────────────────────────────────────────────────────

const discovery = discoveryRaw as unknown as DiscoveryData;
const isDiscovered = Array.isArray(discovery.groups) && discovery.groups.length > 0;
const STACK: StackGroup[] = isDiscovered ? (discovery.groups as StackGroup[]) : FALLBACK;

// ── Components ────────────────────────────────────────────────────────────────

function EntryModal({ entry, color }: { entry: StackEntry; color: StackGroup["color"] }) {
  const hasFacts = Array.isArray(entry.facts) && entry.facts.length > 0;
  const hasLocations = Array.isArray(entry.source_locations) && entry.source_locations.length > 0;

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Card style={{ cursor: "pointer" }}>
          <Flex justify="between" align="center" gap="4">
            <Flex direction="column" gap="1">
              <Flex align="center" gap="2">
                <Text size="2" weight="medium">{entry.name}</Text>
                {entry.version && (
                  <Badge size="1" variant="outline" color={color}>{entry.version}</Badge>
                )}
              </Flex>
              <Text size="1" color="gray">{entry.role}</Text>
            </Flex>
            <Badge color={color} variant="soft" size="1" style={{ flexShrink: 0 }}>
              {hasFacts ? `${entry.facts!.length} facts` : "details"}
            </Badge>
          </Flex>
        </Card>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="560px">
        <Dialog.Title>
          <Flex align="center" gap="2" wrap="wrap">
            {entry.name}
            {entry.version && (
              <Badge size="1" variant="soft" color={color}>{entry.version}</Badge>
            )}
            {entry.url && (
              <a href={entry.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gray-9)", display: "flex" }}>
                <ExternalLinkIcon width={14} height={14} />
              </a>
            )}
          </Flex>
        </Dialog.Title>

        <Dialog.Description>
          <Text size="2" color="gray">{entry.role}</Text>
        </Dialog.Description>

        <Text as="p" size="2" mt="3" style={{ lineHeight: 1.65 }}>
          {entry.details}
        </Text>

        {hasFacts && (
          <Flex direction="column" gap="1" mt="4">
            <Text size="1" weight="medium" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Discovered facts
            </Text>
            <Flex direction="column" gap="1" mt="1">
              {entry.facts!.map((fact, i) => (
                <Flex key={i} align="start" gap="2">
                  <Text size="1" color={color} style={{ flexShrink: 0, marginTop: 2 }}>·</Text>
                  <Text size="2">{fact}</Text>
                </Flex>
              ))}
            </Flex>
          </Flex>
        )}

        {hasLocations && (
          <Flex direction="column" gap="1" mt="4">
            <Text size="1" weight="medium" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Source locations
            </Text>
            <Flex direction="column" gap="1" mt="1">
              {entry.source_locations!.map((loc, i) => {
                const href = `${GITHUB_BASE}/${loc.path}${loc.line ? `#L${loc.line}` : ""}`;
                return (
                  <Flex key={i} align="start" gap="2">
                    <GitHubLogoIcon width={12} height={12} style={{ flexShrink: 0, marginTop: 3, color: "var(--gray-9)" }} />
                    <Flex direction="column" gap="0">
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--accent-9)", fontFamily: "monospace", fontSize: 12 }}
                      >
                        {loc.path}{loc.line ? `:${loc.line}` : ""}
                      </a>
                      <Text size="1" color="gray">{loc.note}</Text>
                    </Flex>
                  </Flex>
                );
              })}
            </Flex>
          </Flex>
        )}

        <Flex justify="end" mt="4">
          <Dialog.Close>
            <Badge color={color} variant="soft" style={{ cursor: "pointer" }}>Close</Badge>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StackPage() {
  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Flex align="center" gap="2" mb="2">
        <LayersIcon width={22} height={22} style={{ color: "var(--violet-9)" }} />
        <Heading size="7">Stack</Heading>
        {isDiscovered && (
          <Badge variant="soft" color="green" size="1" style={{ marginLeft: 4 }}>
            <UpdateIcon width={10} height={10} style={{ marginRight: 3 }} />
            auto-discovered
          </Badge>
        )}
      </Flex>

      <Flex align="center" gap="3" mb="6">
        <Text color="gray" size="2">
          {isDiscovered
            ? `Scanned from ${discovery.root ?? "project root"} · ${discovery.generated_at ?? ""}`
            : "Technologies and services powering this platform. Click any entry for usage details."}
        </Text>
        <a
          href="https://github.com/nicolad/nomadically.work"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--gray-9)", display: "flex", alignItems: "center" }}
        >
          <GitHubLogoIcon width={16} height={16} />
        </a>
      </Flex>

      <Flex direction="column" gap="6">
        {STACK.map((group) => (
          <div key={group.label}>
            <Flex align="center" gap="2" mb="3">
              <Heading size="4">{group.label}</Heading>
              <Badge color={group.color} variant="soft" size="1">{group.entries.length}</Badge>
            </Flex>
            <Flex direction="column" gap="2">
              {group.entries.map((entry) => (
                <EntryModal key={entry.name} entry={entry} color={group.color} />
              ))}
            </Flex>
          </div>
        ))}
      </Flex>

      {!isDiscovered && (
        <Text size="1" color="gray" mt="6" as="p">
          Run{" "}
          <Text size="1" style={{ fontFamily: "monospace" }}>
            cd crates/agentic-search && cargo run -- discover --root ../.. --output ../../src/app/stack/discovery.json
          </Text>{" "}
          to populate this page with live codebase data.
        </Text>
      )}
    </Container>
  );
}
