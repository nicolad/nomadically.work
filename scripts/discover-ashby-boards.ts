#!/usr/bin/env tsx
/**
 * Discover Ashby job boards from Common Crawl and save to Turso database
 *
 * Usage:
 *   pnpm tsx scripts/discover-ashby-boards.ts
 */

import { discoverAshbyBoards } from "../src/lib/common-crawl/index.ts";
import { db } from "../src/db/index.ts";
import { ashbyBoards } from "../src/db/schema.ts";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🔍 Discovering Ashby boards from Common Crawl...");

  try {
    const boards = await discoverAshbyBoards();

    console.log(`\n✅ Discovered ${boards.size} unique boards`);

    if (boards.size === 0) {
      console.log("No boards found. Exiting.");
      return;
    }

    console.log("\n💾 Saving to D1 database...");

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const boardName of boards) {
      try {
        // Try to insert, on conflict update the updated_at timestamp
        const result = await db
          .insert(ashbyBoards)
          .values({
            board_name: boardName,
          })
          .onConflictDoUpdate({
            target: ashbyBoards.board_name,
            set: {
              updated_at: sql`datetime('now')`,
              is_active: true,
            },
          })
          .returning();

        if (result.length > 0) {
          // Check if it was an insert or update by comparing timestamps
          const board = result[0];
          if (board.discovered_at === board.updated_at) {
            inserted++;
            console.log(`  ➕ New: ${boardName}`);
          } else {
            updated++;
            console.log(`  🔄 Updated: ${boardName}`);
          }
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`  ❌ Error saving ${boardName}:`, error);
        skipped++;
      }
    }

    console.log("\n📊 Summary:");
    console.log(`   Total discovered: ${boards.size}`);
    console.log(`   New boards: ${inserted}`);
    console.log(`   Updated boards: ${updated}`);
    console.log(`   Skipped/errors: ${skipped}`);

    // Show some sample boards
    console.log("\n📋 Sample boards:");
    Array.from(boards)
      .slice(0, 10)
      .forEach((board) => console.log(`   - ${board}`));

    if (boards.size > 10) {
      console.log(`   ... and ${boards.size - 10} more`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  console.log("\n✨ Done!");
}

main();
