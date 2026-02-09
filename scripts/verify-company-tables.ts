import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DB_URL!,
  authToken: process.env.TURSO_DB_AUTH_TOKEN!,
});

async function checkTables() {
  try {
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('companies', 'ats_boards', 'company_facts', 'company_snapshots') ORDER BY name"
    );
    
    console.log("Company-related tables:");
    result.rows.forEach((row: any) => {
      console.log(`  ✓ ${row.name}`);
    });
    
    if (result.rows.length === 4) {
      console.log("\n✓ All company tables exist!");
    } else {
      console.log(`\n⚠ Only ${result.rows.length}/4 tables found`);
    }
    
  } catch (error: any) {
    console.error("Error:", error.message);
  } finally {
    client.close();
  }
}

checkTables();
