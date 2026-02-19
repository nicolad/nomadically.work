#!/usr/bin/env tsx

/**
 * Job Ingestion Script
 *
 * One command to discover and persist jobs from ATS platforms into D1.
 *
 * Pipeline:
 *   Brave Search → ATS public APIs (Ashby / Greenhouse / Lever) → D1
 *
 * Usage:
 *   pnpm jobs:ingest                    # default: AI+frontend remote EU, last 7 days
 *   pnpm jobs:ingest --query "llm"      # custom search query
 *   pnpm jobs:ingest --freshness pd     # last 24h only (pd=day, pw=week, pm=month)
 *   pnpm jobs:ingest --limit 50         # max Brave results per query
 *   pnpm jobs:ingest --dry-run          # discover without writing to DB
 *
 * Requires (in .env.local):
 *   BRAVE_API_KEY or BRAVE_SEARCH_API_KEY
 *   D1_GATEWAY_URL + D1_GATEWAY_KEY
 *   or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_D1_DATABASE_ID + CLOUDFLARE_API_TOKEN
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createD1HttpClient } from "../src/db/d1-http";
import { searchAshbyJobs } from "../src/brave/search-jobs";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const rawArgs = process.argv.slice(2);

function argVal(flag: string, fallback?: string): string | undefined {
  const i = rawArgs.indexOf(flag);
  return i !== -1 ? rawArgs[i + 1] : fallback;
}

const CUSTOM_QUERY = argVal("--query");
const FRESHNESS    = (argVal("--freshness", "pw") as "pd" | "pw" | "pm") ?? "pw";
const LIMIT        = parseInt(argVal("--limit", "100") ?? "100", 10);
const DRY_RUN      = rawArgs.includes("--dry-run");

// ---------------------------------------------------------------------------
// Search queries — AI engineers + frontend React engineers, remote EU focus
// ---------------------------------------------------------------------------

const DEFAULT_QUERIES = [
  '"ai engineer" OR "llm engineer" OR "ml engineer" remote',
  '"generative ai" OR "LLM" engineer remote EU',
  '"frontend engineer" OR "react engineer" remote EU',
  '"full stack" react "ai" remote',
];

const QUERIES = CUSTOM_QUERY ? [CUSTOM_QUERY] : DEFAULT_QUERIES;

// ---------------------------------------------------------------------------
// ATS URL parsers
// ---------------------------------------------------------------------------

function parseAshbyUrl(url: string): { boardName: string; jobId: string } | null {
  const m = url.match(/ashbyhq\.com\/([^/]+)\/([^/?#]+)/);
  if (m) return { boardName: m[1], jobId: m[2] };
  return null;
}

function parseGreenhouseUrl(url: string): { boardToken: string; jobPostId: string } | null {
  const m = url.match(/greenhouse\.io\/([^/]+)\/jobs\/([^/?#]+)/);
  if (m) return { boardToken: m[1], jobPostId: m[2] };
  return null;
}

function parseLeverUrl(url: string): { site: string; postingId: string } | null {
  const m = url.match(/lever\.co\/([^/]+)\/([^/?#]+)/);
  if (m) return { site: m[1], postingId: m[2] };
  return null;
}

function detectSourceKind(url: string): "ashby" | "greenhouse" | "lever" | null {
  if (url.includes("ashbyhq.com")) return "ashby";
  if (url.includes("greenhouse.io")) return "greenhouse";
  if (url.includes("lever.co")) return "lever";
  return null;
}

// ---------------------------------------------------------------------------
// Ashby board fetch — public API, no auth needed
// ---------------------------------------------------------------------------

interface AshbyJob {
  id: string;
  title: string;
  location: string;
  locationName?: string;
  isRemote?: boolean;
  descriptionHtml?: string;
  descriptionPlain?: string;
  publishedAt?: string;
  jobUrl?: string;
  department?: string;
  team?: string;
  secondaryLocations?: Array<{ location: string }>;
}

async function fetchAshbyBoard(boardName: string): Promise<AshbyJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(boardName)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Ashby ${res.status} for board: ${boardName}`);
  const data = (await res.json()) as { jobs?: AshbyJob[] };
  return data.jobs ?? [];
}

// ---------------------------------------------------------------------------
// Greenhouse fetch — public Job Board API, no auth needed
// ---------------------------------------------------------------------------

async function fetchGreenhouseJob(
  boardToken: string,
  jobPostId: string,
): Promise<Record<string, unknown> | null> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs/${encodeURIComponent(jobPostId)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  return res.json() as Promise<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Lever fetch — public v0 postings API, no auth needed
// ---------------------------------------------------------------------------

async function fetchLeverJob(
  site: string,
  postingId: string,
): Promise<Record<string, unknown> | null> {
  for (const base of [
    "https://api.lever.co/v0/postings",
    "https://api.eu.lever.co/v0/postings",
  ]) {
    const res = await fetch(`${base}/${encodeURIComponent(site)}/${encodeURIComponent(postingId)}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) return res.json() as Promise<Record<string, unknown>>;
    if (res.status === 404) continue;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Normalise into D1 columns
// ---------------------------------------------------------------------------

interface NormalisedJob {
  external_id: string;
  source_kind: string;
  company_key: string;
  title: string;
  location: string | null;
  url: string;
  description: string | null;
  posted_at: string;
  workplace_type: string | null;
  country: string | null;
  categories: string | null;
  ashby_is_remote: number | null;
}

function normaliseAshbyJob(job: AshbyJob, boardName: string): NormalisedJob {
  const jobUrl = job.jobUrl ?? `https://jobs.ashbyhq.com/${boardName}/${job.id}`;
  const allLocations = [
    job.location,
    ...(job.secondaryLocations?.map((l) => l.location) ?? []),
  ].filter(Boolean);
  return {
    external_id:     jobUrl,
    source_kind:     "ashby",
    company_key:     boardName,
    title:           job.title,
    location:        job.locationName ?? job.location ?? null,
    url:             jobUrl,
    description:     job.descriptionPlain ?? job.descriptionHtml ?? null,
    posted_at:       job.publishedAt ?? new Date().toISOString(),
    workplace_type:  job.isRemote ? "remote" : null,
    country:         null,
    categories:      JSON.stringify({ department: job.department, team: job.team, allLocations }),
    ashby_is_remote: job.isRemote === true ? 1 : job.isRemote === false ? 0 : null,
  };
}

function normaliseGreenhouseJob(
  data: Record<string, unknown>,
  boardToken: string,
  jobPostId: string,
): NormalisedJob {
  const url = `https://boards.greenhouse.io/${boardToken}/jobs/${jobPostId}`;
  const loc = data.location as { name?: string } | null;
  return {
    external_id:     url,
    source_kind:     "greenhouse",
    company_key:     boardToken,
    title:           String(data.title ?? ""),
    location:        loc?.name ?? null,
    url,
    description:     String(data.content ?? ""),
    posted_at:       String(data.updated_at ?? new Date().toISOString()),
    workplace_type:  null,
    country:         null,
    categories:      JSON.stringify({ departments: data.departments, offices: data.offices }),
    ashby_is_remote: null,
  };
}

function normaliseLeverJob(data: Record<string, unknown>, site: string): NormalisedJob {
  const categories = data.categories as Record<string, unknown> | undefined;
  const url = String(
    data.hostedUrl ?? data.applyUrl ?? `https://jobs.lever.co/${site}/${data.id}`,
  );
  return {
    external_id:     url,
    source_kind:     "lever",
    company_key:     site,
    title:           String(data.text ?? ""),
    location:        String(categories?.location ?? ""),
    url,
    description:     String(data.description ?? data.descriptionPlain ?? ""),
    posted_at:       data.createdAt
      ? new Date(Number(data.createdAt)).toISOString()
      : new Date().toISOString(),
    workplace_type:  String(data.workplaceType ?? ""),
    country:         String(data.country ?? ""),
    categories:      JSON.stringify(categories ?? {}),
    ashby_is_remote: null,
  };
}

// ---------------------------------------------------------------------------
// D1 insert helper (INSERT OR IGNORE = skip duplicates by external_id)
// ---------------------------------------------------------------------------

async function insertJob(
  client: ReturnType<typeof createD1HttpClient>,
  job: NormalisedJob,
): Promise<"inserted" | "skipped" | "error"> {
  try {
    const result = await client
      .prepare(
        `INSERT OR IGNORE INTO jobs
           (external_id, source_kind, company_key, title, location, url,
            description, posted_at, status, workplace_type, country,
            categories, ashby_is_remote, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'), datetime('now'))`,
      )
      .bind(
        job.external_id,
        job.source_kind,
        job.company_key,
        job.title,
        job.location,
        job.url,
        job.description,
        job.posted_at,
        "new",
        job.workplace_type,
        job.country,
        job.categories,
        job.ashby_is_remote,
      )
      .run();

    // D1 returns changes=0 when OR IGNORE silently skips a duplicate
    return (result.meta?.changes ?? 1) > 0 ? "inserted" : "skipped";
  } catch (err) {
    console.warn(
      `  ⚠️  Insert error for ${job.external_id.slice(-60)}: ${(err as Error).message.split("\n")[0]}`,
    );
    return "error";
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🚀 Job Ingestion — Brave Search → ATS APIs → D1");
  console.log("=================================================");
  console.log(`  freshness : ${FRESHNESS === "pd" ? "last 24h" : FRESHNESS === "pw" ? "last 7d" : "last month"}`);
  console.log(`  limit     : ${LIMIT} results/query`);
  console.log(`  dry-run   : ${DRY_RUN}`);
  console.log(`  queries   : ${QUERIES.length}`);

  // ── D1 connection ────────────────────────────────────────────────────────
  let client: ReturnType<typeof createD1HttpClient> | null = null;
  if (!DRY_RUN) {
    try {
      client = createD1HttpClient();
    } catch (err) {
      console.error(`\n❌ D1 not configured: ${(err as Error).message}`);
      process.exit(1);
    }
  }

  // ── Brave API key ────────────────────────────────────────────────────────
  const BRAVE_KEY =
    process.env.BRAVE_API_KEY ?? process.env.BRAVE_SEARCH_API_KEY;
  if (!BRAVE_KEY) {
    console.error(
      "\n❌ Missing BRAVE_API_KEY or BRAVE_SEARCH_API_KEY in .env.local",
    );
    process.exit(1);
  }

  // ── Step 1: Brave Search ─────────────────────────────────────────────────
  const discovered = new Map<
    string,
    { url: string; title: string; description: string }
  >();

  for (const query of QUERIES) {
    console.log(`\n🔍 "${query}"`);
    try {
      const results = await searchAshbyJobs({
        query,
        freshness: FRESHNESS,
        maxResults: LIMIT,
        apiKey: BRAVE_KEY,
      });
      for (const r of results) {
        if (!discovered.has(r.url))
          discovered.set(r.url, {
            url: r.url,
            title: r.title,
            description: r.description,
          });
      }
      console.log(`  ${results.length} results  (total: ${discovered.size})`);
    } catch (err) {
      console.warn(
        `  ⚠️  Search error: ${(err as Error).message.split("\n")[0]}`,
      );
    }
  }

  console.log(`\n📋 Unique URLs found: ${discovered.size}`);
  if (discovered.size === 0) {
    console.log("  No jobs found. Try --freshness pm or a broader --query.");
    return;
  }

  // ── Step 2: Classify URLs by ATS ─────────────────────────────────────────
  const ashbyBoards = new Map<string, Set<string>>();
  const greenhouseList: Array<{ boardToken: string; jobPostId: string }> = [];
  const leverList: Array<{ site: string; postingId: string }> = [];

  for (const { url } of discovered.values()) {
    const kind = detectSourceKind(url);
    if (kind === "ashby") {
      const p = parseAshbyUrl(url);
      if (p) {
        if (!ashbyBoards.has(p.boardName)) ashbyBoards.set(p.boardName, new Set());
        ashbyBoards.get(p.boardName)!.add(p.jobId);
      }
    } else if (kind === "greenhouse") {
      const p = parseGreenhouseUrl(url);
      if (p) greenhouseList.push(p);
    } else if (kind === "lever") {
      const p = parseLeverUrl(url);
      if (p) leverList.push(p);
    }
  }

  console.log(`  Ashby boards : ${ashbyBoards.size}`);
  console.log(`  Greenhouse   : ${greenhouseList.length} jobs`);
  console.log(`  Lever        : ${leverList.length} jobs`);

  // ── Step 3: Fetch ATS data + insert ──────────────────────────────────────
  const stats = { inserted: 0, skipped: 0, errors: 0 };

  // Ashby — batch-fetch boards, keep only jobs Brave found
  for (const [boardName, jobIds] of ashbyBoards) {
    console.log(`\n📦 Ashby: ${boardName}`);
    let boardJobs: AshbyJob[];
    try {
      boardJobs = await fetchAshbyBoard(boardName);
    } catch (err) {
      console.warn(`  ⚠️  ${(err as Error).message.split("\n")[0]}`);
      stats.errors++;
      continue;
    }

    // If board is small (<= 20 jobs), import everything; otherwise filter by Brave hits
    const targets =
      boardJobs.length <= 20
        ? boardJobs
        : boardJobs.filter((j) => jobIds.has(j.id));

    console.log(`  ${targets.length} jobs (${boardJobs.length} total on board)`);

    for (const job of targets) {
      const n = normaliseAshbyJob(job, boardName);
      if (DRY_RUN) {
        console.log(`  [dry] ${n.title} — ${n.location ?? "?"}`);
        stats.inserted++;
        continue;
      }
      const outcome = await insertJob(client!, n);
      if (outcome === "inserted") {
        stats.inserted++;
        console.log(`  ✅ ${n.title} (${n.location ?? "?"})`);
      } else if (outcome === "skipped") {
        stats.skipped++;
      } else {
        stats.errors++;
      }
    }
  }

  // Greenhouse — individual job fetch
  if (greenhouseList.length > 0) {
    console.log(`\n📦 Greenhouse: ${greenhouseList.length} jobs`);
    for (const { boardToken, jobPostId } of greenhouseList) {
      const data = await fetchGreenhouseJob(boardToken, jobPostId);
      if (!data) { stats.errors++; continue; }
      const n = normaliseGreenhouseJob(data, boardToken, jobPostId);
      if (DRY_RUN) { console.log(`  [dry] ${n.title}`); stats.inserted++; continue; }
      const outcome = await insertJob(client!, n);
      if (outcome === "inserted") { stats.inserted++; console.log(`  ✅ ${n.title}`); }
      else if (outcome === "skipped") stats.skipped++;
      else stats.errors++;
    }
  }

  // Lever — individual posting fetch
  if (leverList.length > 0) {
    console.log(`\n📦 Lever: ${leverList.length} jobs`);
    for (const { site, postingId } of leverList) {
      const data = await fetchLeverJob(site, postingId);
      if (!data) { stats.errors++; continue; }
      const n = normaliseLeverJob(data, site);
      if (DRY_RUN) { console.log(`  [dry] ${n.title}`); stats.inserted++; continue; }
      const outcome = await insertJob(client!, n);
      if (outcome === "inserted") { stats.inserted++; console.log(`  ✅ ${n.title}`); }
      else if (outcome === "skipped") stats.skipped++;
      else stats.errors++;
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n📊 Summary");
  console.log("──────────");
  if (DRY_RUN) {
    console.log(`  Would insert: ${stats.inserted} jobs`);
  } else {
    console.log(`  Inserted : ${stats.inserted}`);
    console.log(`  Skipped  : ${stats.skipped} (already in DB)`);
    console.log(`  Errors   : ${stats.errors}`);
  }

  if (!DRY_RUN && stats.inserted > 0) {
    console.log("\n⚡ Next: classify the new jobs:");
    console.log("  curl -X POST $CLASSIFY_JOBS_WORKER_URL/process-sync");
    console.log("  # then export real cases for evals:");
    console.log("  pnpm eval:export-db");
  }
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
