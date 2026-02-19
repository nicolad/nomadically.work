#!/usr/bin/env tsx
/**
 * Strategy Enforcement Script
 *
 * Runs the optimization strategy enforcer against staged git changes.
 * Can be used as a pre-commit hook, CI check, or standalone CLI tool.
 *
 * Usage:
 *   tsx scripts/enforce-strategy.ts              # Check staged changes
 *   tsx scripts/enforce-strategy.ts --all        # Check all tracked files
 *   tsx scripts/enforce-strategy.ts --files a.ts b.ts  # Check specific files
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { enforceStrategy } from "../src/agents/strategy-enforcer";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const checkAll = args.includes("--all");
const filesIndex = args.indexOf("--files");
const explicitFiles =
  filesIndex >= 0 ? args.slice(filesIndex + 1) : undefined;

// ---------------------------------------------------------------------------
// Get changed files
// ---------------------------------------------------------------------------

function getStagedFiles(): string[] {
  try {
    const output = execSync("git diff --cached --name-only --diff-filter=ACM", {
      encoding: "utf-8",
    }).trim();
    return output ? output.split("\n") : [];
  } catch {
    return [];
  }
}

function getUnstagedChanges(): string[] {
  try {
    const output = execSync("git diff --name-only --diff-filter=ACM", {
      encoding: "utf-8",
    }).trim();
    return output ? output.split("\n") : [];
  } catch {
    return [];
  }
}

function getAllTrackedFiles(): string[] {
  try {
    const output = execSync("git ls-files", {
      encoding: "utf-8",
    }).trim();
    return output ? output.split("\n") : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Load file contents for analysis
// ---------------------------------------------------------------------------

function loadFileContents(files: string[]): Map<string, string> {
  const contents = new Map<string, string>();

  // Only load TypeScript/JavaScript/Python files for content analysis
  const analysisExtensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".rs"];

  for (const file of files) {
    const ext = file.substring(file.lastIndexOf("."));
    if (!analysisExtensions.includes(ext)) continue;

    const fullPath = join(process.cwd(), file);
    if (existsSync(fullPath)) {
      try {
        contents.set(file, readFileSync(fullPath, "utf-8"));
      } catch {
        // Skip files we can't read
      }
    }
  }

  return contents;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log("=== Optimization Strategy Enforcer ===\n");

  // Determine which files to check
  let filesToCheck: string[];

  if (explicitFiles) {
    filesToCheck = explicitFiles;
    console.log(`Checking ${filesToCheck.length} specified file(s)...\n`);
  } else if (checkAll) {
    filesToCheck = getAllTrackedFiles();
    console.log(`Checking all ${filesToCheck.length} tracked file(s)...\n`);
  } else {
    const staged = getStagedFiles();
    const unstaged = getUnstagedChanges();
    filesToCheck = [...new Set([...staged, ...unstaged])];

    if (filesToCheck.length === 0) {
      console.log("No changed files to check. PASS.\n");
      process.exit(0);
    }

    console.log(`Checking ${filesToCheck.length} changed file(s)...\n`);
  }

  // Load contents and run enforcement
  const fileContents = loadFileContents(filesToCheck);
  const result = enforceStrategy(filesToCheck, fileContents);

  // Output results
  if (result.violations.length === 0) {
    console.log("All optimization strategy rules satisfied.\n");
    process.exit(0);
  }

  // Group by severity
  const blocking = result.violations.filter((v) => v.severity === "BLOCKING");
  const warnings = result.violations.filter((v) => v.severity === "WARNING");

  if (blocking.length > 0) {
    console.log(`BLOCKING (${blocking.length}):\n`);
    for (const v of blocking) {
      console.log(`  ${v.metaApproach}`);
      console.log(`  ${v.rule}`);
      console.log(`  File: ${v.file}${v.line ? `:${v.line}` : ""}`);
      console.log(`  ${v.message}`);
      console.log(`  Fix: ${v.fix}`);
      console.log();
    }
  }

  if (warnings.length > 0) {
    console.log(`WARNING (${warnings.length}):\n`);
    for (const v of warnings) {
      console.log(`  ${v.metaApproach}`);
      console.log(`  ${v.rule}`);
      console.log(`  File: ${v.file}${v.line ? `:${v.line}` : ""}`);
      console.log(`  ${v.message}`);
      console.log(`  Fix: ${v.fix}`);
      console.log();
    }
  }

  console.log(`---\n${result.summary}\n`);

  // Exit with error if blocking violations exist
  if (!result.pass) {
    process.exit(1);
  }
}

main();
