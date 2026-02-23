/**
 * Bundle codebase context for the Deep Planner worker.
 *
 * Copies CLAUDE.md, merged GraphQL schema, and DB schema
 * into workers/deep-planner/context/ as text files.
 *
 * Usage: npx tsx scripts/bundle-deep-planner-context.ts
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, statSync } from "fs";
import { join, resolve } from "path";

const ROOT = resolve(import.meta.dirname, "..");
const CONTEXT_DIR = join(ROOT, "workers", "deep-planner", "context");

// Ensure context directory exists
mkdirSync(CONTEXT_DIR, { recursive: true });

// 1. Bundle CLAUDE.md (truncated to ~4K chars)
const claudeMd = readFileSync(join(ROOT, "CLAUDE.md"), "utf-8");
const truncatedClaudeMd = claudeMd.slice(0, 4000);
writeFileSync(join(CONTEXT_DIR, "claude-md.txt"), truncatedClaudeMd);
console.log(`Bundled CLAUDE.md (${truncatedClaudeMd.length} chars)`);

// 2. Bundle merged GraphQL schemas
function collectGraphqlFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectGraphqlFiles(full));
    } else if (entry.endsWith(".graphql")) {
      files.push(full);
    }
  }
  return files;
}

const schemaDir = join(ROOT, "schema");
const graphqlFiles = collectGraphqlFiles(schemaDir);
const mergedSchema = graphqlFiles
  .map((f) => `# --- ${f.replace(ROOT + "/", "")} ---\n${readFileSync(f, "utf-8")}`)
  .join("\n\n");
const truncatedSchema = mergedSchema.slice(0, 3000);
writeFileSync(join(CONTEXT_DIR, "schema-graphql.txt"), truncatedSchema);
console.log(`Bundled ${graphqlFiles.length} GraphQL files (${truncatedSchema.length} chars)`);

// 3. Bundle DB schema (first 2K chars — table definitions)
const dbSchema = readFileSync(join(ROOT, "src", "db", "schema.ts"), "utf-8");
const truncatedDbSchema = dbSchema.slice(0, 2000);
writeFileSync(join(CONTEXT_DIR, "db-schema.txt"), truncatedDbSchema);
console.log(`Bundled db/schema.ts (${truncatedDbSchema.length} chars)`);

const totalSize = truncatedClaudeMd.length + truncatedSchema.length + truncatedDbSchema.length;
console.log(`\nTotal bundled context: ${totalSize} chars (~${Math.ceil(totalSize / 4)} tokens)`);
console.log("Context files written to workers/deep-planner/context/");
