#!/usr/bin/env tsx

/**
 * DEPRECATED: Seed Skill Taxonomy - Vector Store Population
 *
 * This script is deprecated. Vector storage has been moved to D1 Vectorize.
 * Skills taxonomy is now managed via database migrations.
 *
 * For skill management, see:
 * - migrations/schema.ts for skills table structure
 * - D1 Vectorize documentation for vector operations
 */

console.warn("⚠️  This script is DEPRECATED");
console.log("Vector storage has been moved to D1 Vectorize");
console.log("Skills taxonomy is now managed via database migrations");
console.log("\nFor more information, see migrations/schema.ts");
process.exit(0);
 * Organized by category for maintainability
 */
const SKILL_TAXONOMY = [
  // Programming Languages
  {
    tag: "javascript",
    label: "JavaScript",
    aliases: ["js", "ecmascript", "es6", "es2015"],
  },
  {
    tag: "typescript",
    label: "TypeScript",
    aliases: ["ts"],
  },
  {
    tag: "python",
    label: "Python",
    aliases: ["py"],
  },
  {
    tag: "java",
    label: "Java",
    aliases: [],
  },
  {
    tag: "csharp",
    label: "C#",
