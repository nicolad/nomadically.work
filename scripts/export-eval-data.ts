#!/usr/bin/env tsx

/**
 * Export real job data from D1 for use as LLM eval test cases.
 *
 * Queries jobs that have already been classified by the pipeline and exports
 * balanced samples as TypeScript test data files. The DB labels (is_remote_eu,
 * role_ai_engineer) serve as the ground truth for eval assertions.
 *
 * Outputs:
 *   src/evals/remote-eu/db-test-data.ts     — EU remote classification cases
 *   src/evals/role-tagging/db-test-data.ts  — AI engineer / frontend role cases
 *
 * Usage:
 *   pnpm tsx scripts/export-eval-data.ts
 *   pnpm tsx scripts/export-eval-data.ts --limit 20 --out src/evals/remote-eu/db-test-data.ts
 *
 * Requires (in .env.local):
 *   D1_GATEWAY_URL + D1_GATEWAY_KEY   (preferred)
 *   or
 *   CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_D1_DATABASE_ID + CLOUDFLARE_API_TOKEN
 */

import { config } from "dotenv";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

config({ path: ".env.local" });

import { createD1HttpClient } from "../src/db/d1-http";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const samplesPerBucket = parseInt(
  args[args.indexOf("--limit") + 1] ?? "15",
  10,
);
const euOut =
  args[args.indexOf("--out") + 1] ??
  "src/evals/remote-eu/db-test-data.ts";
const roleOut = "src/evals/role-tagging/db-test-data.ts";

// ---------------------------------------------------------------------------
// D1 query helpers
// ---------------------------------------------------------------------------

async function query<T = Record<string, unknown>>(
  client: ReturnType<typeof createD1HttpClient>,
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const stmt = params
    ? client.prepare(sql).bind(...params)
    : client.prepare(sql);
  const result = await stmt.all();
  return result.results as T[];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawJob {
  id: number;
  title: string;
  location: string | null;
  description: string | null;
  status: string | null;
  is_remote_eu: number | null; // SQLite INTEGER boolean
  remote_eu_confidence: string | null;
  remote_eu_reason: string | null;
  source_kind: string | null;
  company_key: string | null;
}

interface RawRoleJob {
  id: number;
  title: string;
  location: string | null;
  description: string | null;
  role_ai_engineer: number | null;
  role_frontend_react: number | null;
  role_confidence: string | null;
  role_reason: string | null;
  role_source: string | null;
  source_kind: string | null;
  company_key: string | null;
}

// ---------------------------------------------------------------------------
// Sampling helpers
// ---------------------------------------------------------------------------

/** Truncate description to ~600 chars at a word boundary. */
function trimDesc(raw: string | null, maxLen = 600): string {
  if (!raw) return "";
  // Strip HTML tags
  const text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

/** Make a slug-safe id from a string. */
function slugId(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function toConfidence(raw: string | null): "high" | "medium" | "low" {
  if (raw === "high" || raw === "medium" || raw === "low") return raw;
  return "medium";
}

// ---------------------------------------------------------------------------
// EU remote classification export
// ---------------------------------------------------------------------------

async function exportEURemoteCases(
  client: ReturnType<typeof createD1HttpClient>,
  n: number,
): Promise<void> {
  console.log("\n📡 Querying EU remote classification data from D1…");

  // Sample from each bucket: true-high, true-medium, false-high, false-medium,
  // unclassified (no label yet — useful for "live" eval without ground truth)
  const buckets: Array<{ label: string; sql: string; params: unknown[] }> = [
    {
      label: "eu-remote=true, high confidence",
      sql: `SELECT id, title, location, description, status,
                   is_remote_eu, remote_eu_confidence, remote_eu_reason,
                   source_kind, company_key
            FROM jobs
            WHERE is_remote_eu = 1
              AND remote_eu_confidence = 'high'
              AND title IS NOT NULL
              AND location IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ?`,
      params: [n],
    },
    {
      label: "eu-remote=true, medium/low confidence",
      sql: `SELECT id, title, location, description, status,
                   is_remote_eu, remote_eu_confidence, remote_eu_reason,
                   source_kind, company_key
            FROM jobs
            WHERE is_remote_eu = 1
              AND remote_eu_confidence IN ('medium', 'low')
              AND title IS NOT NULL
              AND location IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ?`,
      params: [n],
    },
    {
      label: "eu-remote=false, high confidence",
      sql: `SELECT id, title, location, description, status,
                   is_remote_eu, remote_eu_confidence, remote_eu_reason,
                   source_kind, company_key
            FROM jobs
            WHERE is_remote_eu = 0
              AND remote_eu_confidence = 'high'
              AND title IS NOT NULL
              AND location IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ?`,
      params: [n],
    },
    {
      label: "eu-remote=false, medium/low confidence",
      sql: `SELECT id, title, location, description, status,
                   is_remote_eu, remote_eu_confidence, remote_eu_reason,
                   source_kind, company_key
            FROM jobs
            WHERE is_remote_eu = 0
              AND remote_eu_confidence IN ('medium', 'low')
              AND title IS NOT NULL
              AND location IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ?`,
      params: [n],
    },
  ];

  // Collect all rows, deduplicating by id
  const seen = new Set<number>();
  const allRows: Array<{ row: RawJob; bucket: string }> = [];

  for (const bucket of buckets) {
    const rows = await query<RawJob>(client, bucket.sql, bucket.params);
    console.log(`  ${bucket.label}: ${rows.length} rows`);
    for (const row of rows) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        allRows.push({ row, bucket: bucket.label });
      }
    }
  }

  console.log(`\n  Total unique jobs: ${allRows.length}`);

  // Build TypeScript source
  const cases = allRows.map(({ row, bucket }, i) => {
    const id = `db-${row.id}-${slugId(row.title ?? `job-${i}`)}`;
    const desc = trimDesc(row.description);
    const confidence = toConfidence(row.remote_eu_confidence);
    const isRemoteEU = row.is_remote_eu === 1;
    const reason =
      row.remote_eu_reason?.replace(/"/g, '\\"').slice(0, 200) ??
      (isRemoteEU
        ? "Classified as EU remote by pipeline"
        : "Classified as non-EU by pipeline");

    return `  // ${bucket} — DB id ${row.id} [${row.source_kind ?? "?"}/${row.company_key ?? "?"}]
  {
    id: ${JSON.stringify(id)},
    description: ${JSON.stringify(row.title ?? "")},
    jobPosting: {
      title: ${JSON.stringify(row.title ?? "")},
      location: ${JSON.stringify(row.location ?? "")},
      description: ${JSON.stringify(desc)},
    },
    expectedClassification: {
      isRemoteEU: ${isRemoteEU},
      confidence: ${JSON.stringify(confidence)},
      reason: ${JSON.stringify(reason)},
    },
  }`;
  });

  const output = `/**
 * Real job data from D1 — EU remote classification test cases.
 *
 * AUTO-GENERATED by scripts/export-eval-data.ts — DO NOT EDIT BY HAND.
 * Re-run the script to refresh from the database.
 *
 * Ground truth: is_remote_eu + remote_eu_confidence set by the
 * process-jobs pipeline (Workers AI → DeepSeek).
 *
 * Review labels before using in CI — pipeline errors can produce wrong labels.
 * Cases marked with confidence "low" or "medium" should be spot-checked.
 *
 * Generated: ${new Date().toISOString()}
 * Total cases: ${cases.length}
 */

import type { RemoteEUTestCase } from "./schema";

export const dbRemoteEUTestCases: RemoteEUTestCase[] = [
${cases.join(",\n")}
];
`;

  mkdirSync(dirname(euOut), { recursive: true });
  writeFileSync(euOut, output, "utf8");
  console.log(`\n✅ EU remote test cases written to ${euOut} (${cases.length} cases)`);
}

// ---------------------------------------------------------------------------
// Role tagging export
// ---------------------------------------------------------------------------

async function exportRoleTaggingCases(
  client: ReturnType<typeof createD1HttpClient>,
  n: number,
): Promise<void> {
  console.log("\n📡 Querying role tagging data from D1…");
  console.log(
    "  Note: role columns require the Phase 2 migration to be applied.",
  );

  const buckets: Array<{ label: string; sql: string; params: unknown[] }> = [
    {
      label: "AI engineer = true, high confidence",
      sql: `SELECT id, title, location, description,
                   role_ai_engineer, role_frontend_react,
                   role_confidence, role_reason, role_source,
                   source_kind, company_key
            FROM jobs
            WHERE role_ai_engineer = 1
              AND role_confidence = 'high'
              AND title IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ?`,
      params: [n],
    },
    {
      label: "Frontend React = true, high confidence",
      sql: `SELECT id, title, location, description,
                   role_ai_engineer, role_frontend_react,
                   role_confidence, role_reason, role_source,
                   source_kind, company_key
            FROM jobs
            WHERE role_frontend_react = 1
              AND role_ai_engineer = 0
              AND role_confidence = 'high'
              AND title IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ?`,
      params: [n],
    },
    {
      label: "Dual role (AI + Frontend)",
      sql: `SELECT id, title, location, description,
                   role_ai_engineer, role_frontend_react,
                   role_confidence, role_reason, role_source,
                   source_kind, company_key
            FROM jobs
            WHERE role_ai_engineer = 1
              AND role_frontend_react = 1
              AND title IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ?`,
      params: [Math.max(3, Math.floor(n / 3))],
    },
    {
      label: "Non-target role (both false, high confidence)",
      sql: `SELECT id, title, location, description,
                   role_ai_engineer, role_frontend_react,
                   role_confidence, role_reason, role_source,
                   source_kind, company_key
            FROM jobs
            WHERE role_ai_engineer = 0
              AND role_frontend_react = 0
              AND role_confidence = 'high'
              AND title IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ?`,
      params: [n],
    },
    {
      label: "Uncertain (medium/low confidence)",
      sql: `SELECT id, title, location, description,
                   role_ai_engineer, role_frontend_react,
                   role_confidence, role_reason, role_source,
                   source_kind, company_key
            FROM jobs
            WHERE role_confidence IN ('medium', 'low')
              AND title IS NOT NULL
            ORDER BY RANDOM()
            LIMIT ?`,
      params: [Math.max(5, Math.floor(n / 2))],
    },
  ];

  const seen = new Set<number>();
  const allRows: Array<{ row: RawRoleJob; bucket: string }> = [];

  for (const bucket of buckets) {
    try {
      const rows = await query<RawRoleJob>(client, bucket.sql, bucket.params);
      console.log(`  ${bucket.label}: ${rows.length} rows`);
      for (const row of rows) {
        if (!seen.has(row.id)) {
          seen.add(row.id);
          allRows.push({ row, bucket: bucket.label });
        }
      }
    } catch (err) {
      // role columns may not exist yet if migration hasn't run
      console.warn(`  ⚠️  Skipping "${bucket.label}" — ${(err as Error).message.split("\n")[0]}`);
    }
  }

  if (allRows.length === 0) {
    console.log(
      "\n  ⚠️  No role tagging data found. Run the Phase 2 migration first:\n" +
        "    ALTER TABLE jobs ADD COLUMN role_ai_engineer INTEGER;\n" +
        "    ALTER TABLE jobs ADD COLUMN role_frontend_react INTEGER;\n" +
        "    ALTER TABLE jobs ADD COLUMN role_confidence TEXT;\n" +
        "    ALTER TABLE jobs ADD COLUMN role_reason TEXT;\n" +
        "    ALTER TABLE jobs ADD COLUMN role_source TEXT;\n",
    );
    return;
  }

  console.log(`\n  Total unique jobs: ${allRows.length}`);

  const cases = allRows.map(({ row, bucket }, i) => {
    const id = `db-role-${row.id}-${slugId(row.title ?? `job-${i}`)}`;
    const desc = trimDesc(row.description);
    const isAI = row.role_ai_engineer === 1;
    const isFrontend = row.role_frontend_react === 1;
    const confidence = toConfidence(row.role_confidence);
    const reason =
      row.role_reason?.replace(/"/g, '\\"').slice(0, 200) ??
      "Classified by pipeline";

    return `  // ${bucket} — DB id ${row.id} [${row.source_kind ?? "?"}/${row.company_key ?? "?"}] source=${row.role_source ?? "?"}
  {
    id: ${JSON.stringify(id)},
    description: ${JSON.stringify(row.title ?? "")},
    jobPosting: {
      title: ${JSON.stringify(row.title ?? "")},
      location: ${JSON.stringify(row.location ?? "")},
      description: ${JSON.stringify(desc)},
    },
    expectedRoleTags: {
      isAIEngineer: ${isAI},
      isFrontendReact: ${isFrontend},
      confidence: ${JSON.stringify(confidence)},
      reason: ${JSON.stringify(reason)},
    },
  }`;
  });

  const output = `/**
 * Real job data from D1 — role tagging test cases.
 *
 * AUTO-GENERATED by scripts/export-eval-data.ts — DO NOT EDIT BY HAND.
 * Re-run the script to refresh from the database.
 *
 * Ground truth: role_ai_engineer + role_frontend_react set by the
 * process-jobs Phase 2 pipeline (keyword heuristic → Workers AI → DeepSeek).
 *
 * Review labels before using in CI — especially medium/low confidence cases.
 *
 * Generated: ${new Date().toISOString()}
 * Total cases: ${cases.length}
 */

export interface RoleTagTestCase {
  id: string;
  description: string;
  jobPosting: {
    title: string;
    location: string;
    description: string;
  };
  expectedRoleTags: {
    isAIEngineer: boolean;
    isFrontendReact: boolean;
    confidence: "high" | "medium" | "low";
    reason: string;
  };
}

export const dbRoleTagTestCases: RoleTagTestCase[] = [
${cases.join(",\n")}
];
`;

  mkdirSync(dirname(roleOut), { recursive: true });
  writeFileSync(roleOut, output, "utf8");
  console.log(`\n✅ Role tagging test cases written to ${roleOut} (${cases.length} cases)`);
}

// ---------------------------------------------------------------------------
// Stats summary
// ---------------------------------------------------------------------------

async function printStats(
  client: ReturnType<typeof createD1HttpClient>,
): Promise<{ totalJobs: number; classifiedJobs: number; roleColumnsExist: boolean }> {
  console.log("\n📊 Database stats:");

  const total = await query<{ count: number }>(
    client,
    "SELECT COUNT(*) AS count FROM jobs",
  );
  const totalJobs = total[0]?.count ?? 0;
  console.log(`  Total jobs: ${totalJobs}`);

  // Status breakdown — shows where jobs are in the pipeline
  const statusStats = await query<{ status: string | null; count: number }>(
    client,
    `SELECT status, COUNT(*) AS count FROM jobs GROUP BY status ORDER BY count DESC`,
  );
  if (statusStats.length > 0) {
    console.log("  Pipeline status breakdown:");
    for (const row of statusStats) {
      console.log(`    ${row.status ?? "null"}: ${row.count}`);
    }
  }

  // EU classification breakdown
  const euStats = await query<{ is_remote_eu: number | null; confidence: string | null; count: number }>(
    client,
    `SELECT is_remote_eu, remote_eu_confidence AS confidence, COUNT(*) AS count
     FROM jobs
     WHERE is_remote_eu IS NOT NULL
     GROUP BY is_remote_eu, remote_eu_confidence
     ORDER BY is_remote_eu DESC, count DESC`,
  );
  const classifiedJobs = euStats.reduce((s, r) => s + r.count, 0);

  if (euStats.length > 0) {
    console.log(`  EU classification (${classifiedJobs} classified):`);
    for (const row of euStats) {
      const label = row.is_remote_eu === 1 ? "eu-remote=true " : "eu-remote=false";
      console.log(`    ${label}  conf=${row.confidence ?? "null"}  n=${row.count}`);
    }
  } else {
    console.log("  EU classification: no classified jobs yet (Phase 3 not run)");
  }

  // Role tagging (Phase 2 columns may not exist)
  const roleStats = await query<{ ai: number | null; frontend: number | null; count: number }>(
    client,
    `SELECT role_ai_engineer AS ai, role_frontend_react AS frontend, COUNT(*) AS count
     FROM jobs
     WHERE role_ai_engineer IS NOT NULL OR role_frontend_react IS NOT NULL
     GROUP BY role_ai_engineer, role_frontend_react
     ORDER BY count DESC`,
  ).catch(() => null);

  const roleColumnsExist = roleStats !== null;
  if (roleStats && roleStats.length > 0) {
    console.log("  Role tagging (Phase 2):");
    for (const row of roleStats) {
      console.log(`    ai=${row.ai ?? "null"}  frontend=${row.frontend ?? "null"}  n=${row.count}`);
    }
  } else if (!roleColumnsExist) {
    console.log("  Role tagging: columns not yet added (Phase 2 migration needed)");
  } else {
    console.log("  Role tagging: columns exist but no data yet");
  }

  return { totalJobs, classifiedJobs, roleColumnsExist };
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main() {
  console.log("🗃️  Export real D1 job data as LLM eval test cases");
  console.log("===================================================");

  let client: ReturnType<typeof createD1HttpClient>;
  try {
    client = createD1HttpClient();
  } catch (err) {
    console.error(`\n❌ ${(err as Error).message}`);
    process.exit(1);
  }

  const { totalJobs, classifiedJobs, roleColumnsExist } = await printStats(client);

  // Early-exit with remediation guidance if DB is not ready
  if (totalJobs === 0) {
    console.log("\n⚠️  DB is empty — no jobs to export yet.");
    console.log("\nTo populate the DB, run the ingestion pipeline:");
    console.log("  pnpm jobs:ingest          # pull jobs from Greenhouse/Lever/Ashby");
    console.log("  pnpm jobs:enhance         # enrich with ATS data (Phase 1)");
    console.log("  # Then trigger the process-jobs CF Worker to run Phase 2 + 3:");
    console.log("  curl -X POST $CLASSIFY_JOBS_WORKER_URL/process-sync");
    console.log("\nThen re-run: pnpm eval:export-db");
    return;
  }

  if (classifiedJobs === 0) {
    console.log("\n⚠️  Jobs exist but none are classified yet.");
    console.log(`  ${totalJobs} jobs in DB — run the process-jobs worker to classify them:`);
    console.log("  curl -X POST $CLASSIFY_JOBS_WORKER_URL/process-sync");
    console.log("  # or trigger via queue:");
    console.log("  curl -X POST $CLASSIFY_JOBS_WORKER_URL");
    console.log("\nThen re-run: pnpm eval:export-db");
    // Still try exporting — there may be partial data
  }

  if (!roleColumnsExist) {
    console.log("\n⚠️  Phase 2 role columns missing. Apply the migration:");
    console.log("  npx wrangler d1 execute nomadically-work-db --remote --command \\");
    console.log(`    "ALTER TABLE jobs ADD COLUMN role_ai_engineer INTEGER;`);
    console.log(`    ALTER TABLE jobs ADD COLUMN role_frontend_react INTEGER;`);
    console.log(`    ALTER TABLE jobs ADD COLUMN role_confidence TEXT;`);
    console.log(`    ALTER TABLE jobs ADD COLUMN role_reason TEXT;`);
    console.log(`    ALTER TABLE jobs ADD COLUMN role_source TEXT;"`);
    console.log("\nThen re-run: pnpm eval:export-db");
  }

  await exportEURemoteCases(client, samplesPerBucket);
  await exportRoleTaggingCases(client, samplesPerBucket);

  console.log("\n🏁 Done.");
  console.log(
    "\nNext steps:",
    "\n  1. Review the generated files — spot-check low/medium confidence labels",
    "\n  2. Run: pnpm test:eval  (DB cases are merged automatically)",
  );
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
