#!/usr/bin/env tsx

/**
 * Import companies and contacts from CRM JSON backup into nomadically.work D1.
 *
 * Usage:
 *   pnpm tsx scripts/import-from-crm.ts                        # import both
 *   pnpm tsx scripts/import-from-crm.ts companies               # companies only
 *   pnpm tsx scripts/import-from-crm.ts contacts                # contacts only
 *   pnpm tsx scripts/import-from-crm.ts --dry-run               # preview without writing
 *   pnpm tsx scripts/import-from-crm.ts --backup path/to/file   # use specific backup
 *
 * Requires: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN in .env.local
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { readFileSync, readdirSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TARGET_DATABASE_ID =
  process.env.CLOUDFLARE_D1_DATABASE_ID || "632b9c57-8262-40bd-86c2-bc08beab713b";
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!ACCOUNT_ID || !API_TOKEN) {
  console.error("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN");
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const backupIdx = args.indexOf("--backup");
const backupPath = backupIdx >= 0 ? args[backupIdx + 1] : undefined;
const nonFlagArgs = args.filter((a) => !a.startsWith("--") && (backupIdx < 0 || args.indexOf(a) !== backupIdx + 1));
const importCompanies = nonFlagArgs.length === 0 || nonFlagArgs.includes("companies");
const importContacts = nonFlagArgs.length === 0 || nonFlagArgs.includes("contacts");

const BASE_URL = "https://api.cloudflare.com/client/v4";

// ------------------------------------------------------------------
// D1 API helper
// ------------------------------------------------------------------

async function queryTarget(sql: string, params: any[] = []) {
  const url = `${BASE_URL}/accounts/${ACCOUNT_ID}/d1/database/${TARGET_DATABASE_ID}/query`;
  const body: { sql: string; params?: any[] } = { sql };
  if (params.length > 0) body.params = params;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(`D1 query failed: ${JSON.stringify(data.errors)}`);
  }

  return data.result[0].results;
}

// ------------------------------------------------------------------
// Load backup
// ------------------------------------------------------------------

function findLatestBackup(): string {
  const backupsDir = join(__dirname, "../../crm/backups");
  const files = readdirSync(backupsDir)
    .filter((f: string) => f.endsWith(".json.gz"))
    .sort()
    .reverse();
  if (files.length === 0) throw new Error("No JSON backups found in ../crm/backups/");
  return join(backupsDir, files[0]);
}

function loadBackup(path: string): { companies: any[]; contacts: any[] } {
  console.log(`Loading backup: ${path}`);

  let raw: string;
  if (path.endsWith(".gz")) {
    raw = execSync(`gunzip -c "${path}"`, { maxBuffer: 100 * 1024 * 1024 }).toString();
  } else {
    raw = readFileSync(path, "utf-8");
  }

  const data = JSON.parse(raw);
  const tables = data.tables || data;

  return {
    companies: tables.companies || [],
    contacts: tables.contacts || [],
  };
}

function ensureJsonString(val: any): string | null {
  if (val == null) return null;
  if (typeof val === "string") return val;
  if (Array.isArray(val) && val.length === 0) return "[]";
  return JSON.stringify(val);
}

// ------------------------------------------------------------------
// Companies
// ------------------------------------------------------------------

async function doImportCompanies(crmCompanies: any[]) {
  console.log(`\n--- Importing companies (${crmCompanies.length} in backup) ---`);

  const existing: { name: string; key: string; id: number }[] = await queryTarget(
    "SELECT id, name, key FROM companies",
  );
  const existingKeys = new Set(existing.map((c) => c.key));
  const existingNames = new Map(existing.map((c) => [c.name.toLowerCase(), c.id]));

  const idMap = new Map<number, number>();

  // Map existing matches
  for (const c of crmCompanies) {
    const key = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const match = existing.find(
      (e) => e.key === key || e.name.toLowerCase() === c.name.toLowerCase(),
    );
    if (match) idMap.set(c.id, match.id);
  }

  let imported = 0;
  let skipped = 0;

  for (const c of crmCompanies) {
    const key = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    if (!key) { skipped++; continue; }

    if (existingKeys.has(key) || existingNames.has(c.name.toLowerCase())) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  [DRY RUN] Would import: ${c.name} (key=${key})`);
      imported++;
      continue;
    }

    const location = [c.locationCity, c.locationCountry].filter(Boolean).join(", ") || null;
    const tags = ensureJsonString(c.tags);

    await queryTarget(
      `INSERT INTO companies (key, name, website, linkedin_url, job_board_url, description, location, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        key,
        c.name,
        c.website || null,
        c.linkedin || null,
        c.jobsUrl || null,
        c.description || null,
        location,
        tags,
        c.createdAt || new Date().toISOString(),
        c.updatedAt || new Date().toISOString(),
      ],
    );

    const inserted: { id: number }[] = await queryTarget(
      "SELECT id FROM companies WHERE key = ?",
      [key],
    );
    if (inserted[0]) {
      idMap.set(c.id, inserted[0].id);
      existingKeys.add(key);
      existingNames.set(c.name.toLowerCase(), inserted[0].id);
    }

    imported++;
    if (imported % 100 === 0) console.log(`  ... ${imported} companies imported`);
  }

  console.log(`Companies: ${imported} imported, ${skipped} skipped (already exist)`);
  return idMap;
}

// ------------------------------------------------------------------
// Contacts
// ------------------------------------------------------------------

async function doImportContacts(crmContacts: any[], companyIdMap: Map<number, number>) {
  console.log(`\n--- Importing contacts (${crmContacts.length} in backup) ---`);

  const existingEmails: { email: string }[] = await queryTarget(
    "SELECT email FROM contacts WHERE email IS NOT NULL AND email != ''",
  );
  const existingEmailSet = new Set(existingEmails.map((c) => c.email.toLowerCase()));

  const existingLinkedins: { linkedin_url: string }[] = await queryTarget(
    "SELECT linkedin_url FROM contacts WHERE linkedin_url IS NOT NULL AND linkedin_url != ''",
  );
  const existingLinkedinSet = new Set(existingLinkedins.map((c) => c.linkedin_url.toLowerCase()));

  let imported = 0;
  let skipped = 0;

  for (const c of crmContacts) {
    if (c.email && existingEmailSet.has(c.email.toLowerCase())) {
      skipped++;
      continue;
    }
    if (c.linkedinUrl && existingLinkedinSet.has(c.linkedinUrl.toLowerCase())) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(
        `  [DRY RUN] Would import: ${c.firstName} ${c.lastName}${c.company ? ` (${c.company})` : ""}`,
      );
      imported++;
      continue;
    }

    // Resolve company_id
    let targetCompanyId: number | null = null;
    if (c.companyId && companyIdMap.has(c.companyId)) {
      targetCompanyId = companyIdMap.get(c.companyId)!;
    } else if (c.company) {
      const match: { id: number }[] = await queryTarget(
        "SELECT id FROM companies WHERE LOWER(name) = LOWER(?) LIMIT 1",
        [c.company],
      );
      if (match[0]) targetCompanyId = match[0].id;
    }

    await queryTarget(
      `INSERT INTO contacts (
        first_name, last_name, linkedin_url, email, emails,
        company, company_id, position, user_id,
        nb_status, nb_result, nb_flags, nb_suggested_correction,
        nb_retry_token, nb_execution_time_ms, email_verified,
        bounced_emails, github_handle, telegram_handle,
        do_not_contact, tags, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.firstName,
        c.lastName || "",
        c.linkedinUrl || null,
        c.email || null,
        ensureJsonString(c.emails),
        c.company || null,
        targetCompanyId,
        c.position || null,
        c.userId || null,
        c.nbStatus || null,
        c.nbResult || null,
        ensureJsonString(c.nbFlags),
        c.nbSuggestedCorrection || null,
        c.nbRetryToken || null,
        c.nbExecutionTimeMs ?? null,
        c.emailVerified ? 1 : 0,
        ensureJsonString(c.bouncedEmails),
        c.githubHandle || null,
        c.telegramHandle || null,
        c.doNotContact ? 1 : 0,
        ensureJsonString(c.tags),
        c.createdAt || new Date().toISOString(),
        c.updatedAt || new Date().toISOString(),
      ],
    );

    if (c.email) existingEmailSet.add(c.email.toLowerCase());
    if (c.linkedinUrl) existingLinkedinSet.add(c.linkedinUrl.toLowerCase());

    imported++;
    if (imported % 500 === 0) console.log(`  ... ${imported} contacts imported`);
  }

  console.log(`Contacts: ${imported} imported, ${skipped} skipped (already exist)`);
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

async function main() {
  const file = backupPath || findLatestBackup();
  const backup = loadBackup(file);

  console.log(`Target D1: ${TARGET_DATABASE_ID}`);
  if (dryRun) console.log("** DRY RUN — no writes **");

  let companyIdMap = new Map<number, number>();

  if (importCompanies) {
    companyIdMap = await doImportCompanies(backup.companies);
  }

  // If only importing contacts, still build company ID map from existing data
  if (!importCompanies && importContacts) {
    const existing: { id: number; name: string; key: string }[] = await queryTarget(
      "SELECT id, name, key FROM companies",
    );
    for (const c of backup.companies) {
      const key = c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const match = existing.find(
        (e) => e.key === key || e.name.toLowerCase() === c.name.toLowerCase(),
      );
      if (match) companyIdMap.set(c.id, match.id);
    }
  }

  if (importContacts) {
    await doImportContacts(backup.contacts, companyIdMap);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
