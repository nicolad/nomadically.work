#!/usr/bin/env tsx

/**
 * Apply migration 0011 - Add Lever ATS fields
 * This applies to the REMOTE Turso database
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";

config({ path: ".env.local" });

async function applyMigration() {
  console.log("📝 Applying migration 0011 to REMOTE Turso database");
  console.log(
    `📍 Database: ${process.env.TURSO_DB_URL?.replace(/:.+@/, ":***@")}`,
  );

  const client = createClient({
    url: process.env.TURSO_DB_URL!,
    authToken: process.env.TURSO_DB_AUTH_TOKEN,
  });

  const db = drizzle(client);

  const columns = [
    "categories",
    "workplace_type",
    "country",
    "opening",
    "opening_plain",
    "description_body",
    "description_body_plain",
    "additional",
    "additional_plain",
    "lists",
    "ats_created_at",
  ];

  for (const column of columns) {
    try {
      await db.run(sql.raw(`ALTER TABLE jobs ADD COLUMN ${column} TEXT`));
      console.log(`✅ Added ${column} column`);
    } catch (error: any) {
      // Access the error message from the nested cause structure
      const causeMessage = error.cause?.message || "";
      const isDuplicate = causeMessage.includes("duplicate column name");

      if (isDuplicate) {
        console.log(`⏭️  ${column} column already exists`);
      } else {
        console.error(`❌ Unexpected error adding ${column}:`, error);
        throw error;
      }
    }
  }

  console.log(
    "✅ Migration 0011 completed successfully on remote Turso database!",
  );
}

applyMigration().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
