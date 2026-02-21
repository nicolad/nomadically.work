/**
 * Mastra Storage Configuration
 *
 * Uses local LibSQL (SQLite) for agent memory, workflows, scores, and
 * observability. The database file is stored at `mastra.db` in the project
 * root, resolved to an absolute path so both Next.js (port 3000) and Mastra
 * Studio (port 4111) share the same file when running concurrently.
 */

import { LibSQLStore } from "@mastra/libsql";

/**
 * Returns a LibSQL storage instance backed by a local SQLite file.
 * The absolute path ensures the same file is used regardless of the
 * process working directory.
 */
export function createLocalStorage() {
  const absolutePath = `${process.cwd()}/mastra.db`;
  return new LibSQLStore({
    id: "mastra-local",
    url: `file:${absolutePath}`,
  });
}

/**
 * Get storage — always local SQLite for now.
 * If edge-replicated storage is needed in future, replace this function.
 */
export function getStorage() {
  return createLocalStorage();
}
