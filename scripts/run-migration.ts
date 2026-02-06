import { config } from "dotenv";
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: ".env.local" });

const turso = createClient({
  url: process.env.TURSO_DB_URL!,
  authToken: process.env.TURSO_DB_AUTH_TOKEN,
});

async function runMigration() {
  try {
    console.log("Connecting to Turso database...");

    // Read the migration file
    const migrationSQL = readFileSync(
      join(__dirname, "../migrations/0001_eminent_excalibur.sql"),
      "utf-8",
    );

    // Split by statement separator and filter empty statements
    const statements = migrationSQL
      .split("-->")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("statement-breakpoint"));

    console.log(`Found ${statements.length} SQL statements to execute`);

    for (const statement of statements) {
      if (statement) {
        console.log(`Executing: ${statement.substring(0, 100)}...`);
        try {
          await turso.execute(statement);
          console.log("✓ Success");
        } catch (error: any) {
          // Ignore errors for DROP INDEX if index doesn't exist
          if (error.message?.includes("no such index")) {
            console.log("⚠ Skipped (index doesn't exist)");
          } else {
            console.error("✗ Error:", error.message);
            throw error;
          }
        }
      }
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    turso.close();
  }
}

runMigration();
