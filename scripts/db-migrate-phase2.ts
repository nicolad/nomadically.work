#!/usr/bin/env tsx

/**
 * Phase 2 DB migration — role tagging columns
 *
 * Adds the five columns needed by the three-phase process-jobs pipeline
 * (keyword heuristic → Workers AI → DeepSeek) for frontend/AI role tagging.
 *
 * Safe to re-run: each ALTER TABLE is wrapped in a try/catch and "duplicate
 * column name" errors are silently ignored.
 *
 * Usage:
 *   pnpm db:migrate:phase2
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createD1HttpClient } from "../src/db/d1-http";

const COLUMNS = [
  "ALTER TABLE jobs ADD COLUMN role_frontend_react INTEGER",
  "ALTER TABLE jobs ADD COLUMN role_ai_engineer    INTEGER",
  "ALTER TABLE jobs ADD COLUMN role_confidence     TEXT",
  "ALTER TABLE jobs ADD COLUMN role_reason         TEXT",
  "ALTER TABLE jobs ADD COLUMN role_source         TEXT",
];

async function main() {
  console.log("🗄️  Phase 2 migration — role tagging columns");
  console.log("=============================================");

  let client: ReturnType<typeof createD1HttpClient>;
  try {
    client = createD1HttpClient();
  } catch (err) {
    console.error(`❌ D1 not configured: ${(err as Error).message}`);
    process.exit(1);
  }

  let applied = 0;
  let already = 0;

  for (const sql of COLUMNS) {
    const col = sql.match(/ADD COLUMN (\S+)/)?.[1] ?? sql;
    try {
      await client.prepare(sql).bind().run();
      console.log(`  ✅ Added: ${col}`);
      applied++;
    } catch (err) {
      const msg = (err as Error).message ?? "";
      if (msg.includes("duplicate column name") || msg.includes("already exists")) {
        console.log(`  ○  Already exists: ${col}`);
        already++;
      } else {
        console.error(`  ❌ Failed: ${col} — ${msg.split("\n")[0]}`);
      }
    }
  }

  console.log(`\n  Applied: ${applied}  Already present: ${already}`);

  if (applied > 0) {
    console.log("\n✅ Phase 2 migration complete.");
    console.log("   process-jobs worker can now write role_ai_engineer / role_frontend_react.");
  } else {
    console.log("\n✅ All columns already present — nothing to do.");
  }
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
