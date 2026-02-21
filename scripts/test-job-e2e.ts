#!/usr/bin/env tsx
/**
 * E2E Worker Test — single job through both workers
 *
 * Usage:
 *   tsx scripts/test-job-e2e.ts                          # random classified job
 *   tsx scripts/test-job-e2e.ts <uuid-or-db-id>          # target a specific job
 *   tsx scripts/test-job-e2e.ts --assert-eu <uuid>        # assert the job is classified EU remote
 *
 * 1. Finds a real job in D1 (or the specified one)
 * 2. Calls ashby-crawler /enrich?slug=<company_key>   (Rust/WASM worker)
 * 3. Calls process-jobs /process-sync                  (Python worker, all 3 phases)
 * 4. Reads back the job's final status from D1
 * 5. (Optional) Asserts classification matches expectations
 *
 * Local dev — start both workers in separate terminals first:
 *   Terminal A: cd workers/process-jobs && wrangler dev --port 8787
 *   Terminal B: cd workers/ashby-crawler && wrangler dev --port 8788
 *
 * Deployed — set env vars:
 *   PROCESS_JOBS_URL=https://nomadically-work-process-jobs.<account>.workers.dev
 *   ASHBY_CRAWLER_URL=https://ashby-crawler.<account>.workers.dev
 *   CRON_SECRET=<secret>          (optional auth header for process-jobs)
 */

import { execSync } from "child_process";
import { config } from "dotenv";

config({ path: ".env.local" });

const PROCESS_JOBS_URL =
  process.env.PROCESS_JOBS_URL ?? "http://localhost:8787";
const ASHBY_CRAWLER_URL =
  process.env.ASHBY_CRAWLER_URL ?? "http://localhost:8788";
const CRON_SECRET = process.env.CRON_SECRET ?? "";
const DB_NAME = "nomadically-work-db";

// CLI args
const args = process.argv.slice(2);
const assertEU = args.includes("--assert-eu");
const targetJobId = args.filter((a) => !a.startsWith("--"))[0] ?? null;

// ---------------------------------------------------------------------------
// D1 helpers — uses wrangler CLI so we never need a local DB driver
// ---------------------------------------------------------------------------

function d1Query(sql: string): any[] {
  const escaped = sql.replace(/"/g, '\\"');
  const raw = execSync(
    `npx wrangler d1 execute ${DB_NAME} --remote --json --command="${escaped}"`,
    { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
  );
  // wrangler --json returns an array of result sets
  const parsed = JSON.parse(raw);
  return parsed?.[0]?.results ?? [];
}

function d1Run(sql: string): void {
  const escaped = sql.replace(/"/g, '\\"');
  execSync(
    `npx wrangler d1 execute ${DB_NAME} --remote --command="${escaped}"`,
    { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
  );
}

// ---------------------------------------------------------------------------
// Worker call helpers
// ---------------------------------------------------------------------------

async function callProcessJobs(limit = 1) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (CRON_SECRET) headers["Authorization"] = `Bearer ${CRON_SECRET}`;

  const res = await fetch(`${PROCESS_JOBS_URL}/process-sync`, {
    method: "POST",
    headers,
    body: JSON.stringify({ limit }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `process-jobs /process-sync → ${res.status}: ${body}`,
    );
  }
  return res.json();
}

async function callAshbyEnrich(slug: string) {
  const res = await fetch(
    `${ASHBY_CRAWLER_URL}/enrich?slug=${encodeURIComponent(slug)}`,
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `ashby-crawler /enrich?slug=${slug} → ${res.status}: ${body}`,
    );
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n=== E2E Job Worker Test ===\n");
  console.log(`process-jobs  → ${PROCESS_JOBS_URL}`);
  console.log(`ashby-crawler → ${ASHBY_CRAWLER_URL}\n`);

  // ── Step 1: Find a job to process ────────────────────────────────────────
  console.log("Step 1: Finding a real job to reset and reprocess…");
  if (targetJobId) {
    console.log(`  Targeting specific job: ${targetJobId}`);
  }

  let rows: any[];

  if (targetJobId) {
    // Target a specific job by DB id or external_id (UUID)
    const isNumeric = /^\d+$/.test(targetJobId);
    rows = d1Query(
      isNumeric
        ? `SELECT id, external_id, title, location, company_key, source_kind, status, is_remote_eu FROM jobs WHERE id = ${targetJobId}`
        : `SELECT id, external_id, title, location, company_key, source_kind, status, is_remote_eu FROM jobs WHERE external_id = '${targetJobId}' OR external_id LIKE '%${targetJobId}%' LIMIT 1`,
    );
  } else {
    // Prefer a previously-classified real job (has non-null is_remote_eu) so we
    // can reset it to 'new' and verify it reaches a terminal status again.
    rows = d1Query(
      "SELECT id, external_id, title, location, company_key, source_kind, status, is_remote_eu " +
        "FROM jobs " +
        "WHERE is_remote_eu IS NOT NULL AND company_key != 'testco' " +
        "ORDER BY id DESC LIMIT 1",
    );

    if (rows.length === 0) {
      // Fall back to any new job that isn't the test fixture
      console.log("  No classified jobs found, falling back to unprocessed…");
      rows = d1Query(
        "SELECT id, external_id, title, location, company_key, source_kind, status, is_remote_eu " +
          "FROM jobs WHERE status = 'new' AND company_key != 'testco' LIMIT 1",
      );
    }
  }

  if (rows.length === 0) {
    console.error(
      targetJobId
        ? `  ✗ Job '${targetJobId}' not found in D1.`
        : "  ✗ No real jobs found in D1 (only test fixtures).\n" +
          "  Ingest some jobs first: pnpm jobs:ingest",
    );
    process.exit(1);
  }

  const job = rows[0];
  const previousStatus = job.status;
  console.log(`  ✓ Found job #${job.id}`);
  console.log(`    Title:    ${job.title}`);
  console.log(`    Location: ${job.location ?? "—"}`);
  console.log(`    Company:  ${job.company_key}`);
  console.log(`    Source:   ${job.source_kind}`);
  console.log(`    Status:   ${previousStatus}`);

  // Reset to 'new' so the full 3-phase pipeline runs again
  console.log(`\n  Resetting job #${job.id} to 'new' for full pipeline run…`);
  d1Run(`UPDATE jobs SET status = 'new', is_remote_eu = NULL, remote_eu_confidence = NULL, remote_eu_reason = NULL, role_frontend_react = NULL, role_ai_engineer = NULL, role_confidence = NULL, role_source = NULL WHERE id = ${job.id}`);
  console.log("  ✓ Reset done");

  // ── Step 2: ashby-crawler /enrich ─────────────────────────────────────────
  console.log("\nStep 2: ashby-crawler /enrich…");
  try {
    const enrichResult = await callAshbyEnrich(job.company_key);
    console.log("  ✓ Enrichment response:");
    console.log(
      JSON.stringify(enrichResult, null, 2)
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n"),
    );
  } catch (err) {
    console.warn(`  ⚠ ashby-crawler unavailable: ${(err as Error).message}`);
    console.warn(
      "    Start it with: cd workers/ashby-crawler && wrangler dev --port 8788",
    );
  }

  // ── Step 3: process-jobs /process-sync ───────────────────────────────────
  console.log("\nStep 3: process-jobs /process-sync (limit=1)…");
  try {
    const processResult = await callProcessJobs(1);
    console.log("  ✓ Pipeline response:");
    console.log(
      JSON.stringify(processResult, null, 2)
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n"),
    );
  } catch (err) {
    console.error(`  ✗ process-jobs failed: ${(err as Error).message}`);
    console.error(
      "    Start it with: cd workers/process-jobs && wrangler dev --port 8787",
    );
    process.exit(1);
  }

  // ── Step 4: Read back final status ───────────────────────────────────────
  console.log("\nStep 4: Reading final job status from D1…");
  const after = d1Query(
    `SELECT id, title, status, is_remote_eu, remote_eu_confidence, remote_eu_reason, ` +
      `role_frontend_react, role_ai_engineer, role_confidence, role_source ` +
      `FROM jobs WHERE id = ${job.id}`,
  );

  if (after.length === 0) {
    console.error("  ✗ Could not read job back from D1");
    process.exit(1);
  }

  const final = after[0];
  console.log(`  ✓ Job #${final.id} final state:`);
  console.log(`    Status:              ${final.status}`);
  console.log(`    is_remote_eu:        ${final.is_remote_eu}`);
  console.log(`    remote_eu_confidence:${final.remote_eu_confidence ?? "—"}`);
  console.log(`    remote_eu_reason:    ${final.remote_eu_reason ?? "—"}`);
  console.log(`    role_frontend_react: ${final.role_frontend_react}`);
  console.log(`    role_ai_engineer:    ${final.role_ai_engineer}`);
  console.log(`    role_confidence:     ${final.role_confidence ?? "—"}`);
  console.log(`    role_source:         ${final.role_source ?? "—"}`);

  // ── Result ────────────────────────────────────────────────────────────────
  const terminalStatuses = ["eu-remote", "non-eu", "role-nomatch", "error"];
  const passed = terminalStatuses.includes(final.status);

  console.log(
    `\n${passed ? "✅ PASS" : "⚠  INCOMPLETE"} — job reached status: ${final.status}\n`,
  );

  if (!passed) {
    console.log(
      "  Job did not reach a terminal status. It may still be in-flight\n" +
        "  or the worker encountered an error. Check worker logs:\n" +
        "    wrangler tail --config workers/process-jobs/wrangler.jsonc",
    );
    process.exit(1);
  }

  // ── Step 5: Optional EU assertion ──────────────────────────────────────
  if (assertEU) {
    const isEU = final.is_remote_eu === 1 || final.is_remote_eu === true;
    if (!isEU) {
      console.error(
        `\n❌ ASSERTION FAILED: Expected is_remote_eu=true but got ${final.is_remote_eu}\n` +
          `   Status:     ${final.status}\n` +
          `   Confidence: ${final.remote_eu_confidence ?? "—"}\n` +
          `   Reason:     ${final.remote_eu_reason ?? "—"}\n`,
      );
      process.exit(1);
    }
    console.log("✅ EU assertion passed — job correctly classified as EU remote\n");
  }
}

main().catch((err) => {
  console.error("\n✗ Fatal:", err.message);
  process.exit(1);
});
