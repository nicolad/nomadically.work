/**
 * Extract a clean slug from a job's external_id.
 *
 * Handles:
 * - Bare UUIDs / numeric IDs → returned as-is
 * - Full URLs (Greenhouse, Ashby, Lever) → last non-empty path segment
 * - Trailing slashes → stripped before splitting
 * - Board-only URLs (e.g. https://jobs.ashbyhq.com/company/) → falls back
 * - null / undefined → uses fallback
 */
export function extractJobSlug(
  externalId: string | null | undefined,
  fallback?: string | number,
): string {
  if (!externalId) {
    return fallback != null ? String(fallback) : "";
  }

  // Not a URL — return as-is (bare UUID, numeric ID, etc.)
  if (!externalId.includes("://")) {
    return externalId;
  }

  // Parse as URL to get only the pathname segments
  try {
    const url = new URL(externalId);
    const pathSegments = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);

    // Need at least 2 segments: first is the company/board name, last is the job ID.
    // With only 1 segment (e.g. /elicit/) the "slug" is the board name, not a job ID.
    if (pathSegments.length >= 2) {
      return pathSegments[pathSegments.length - 1];
    }
  } catch {
    // Not a valid URL — fall through
  }

  // Fallback for degenerate URLs (bare host, parse failures)
  return fallback != null ? String(fallback) : externalId;
}

/**
 * Check if an external_id looks like a board-only URL (no job-specific path).
 * Board URLs have a single path segment after the host (the company/board name).
 *
 * Examples:
 *   "https://jobs.ashbyhq.com/neuroscale/"  → true  (board-only)
 *   "https://jobs.ashbyhq.com/neuroscale/abc-123" → false (has job ID)
 *   "abc-123-def"  → false (not a URL)
 */
export function isBoardOnlyUrl(externalId: string): boolean {
  if (!externalId.includes("://")) return false;

  try {
    const url = new URL(externalId);
    // Remove leading/trailing slashes, split path segments
    const segments = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
    // Board-only: 0 or 1 path segments (just the board/company name)
    return segments.filter(Boolean).length < 2;
  } catch {
    return false;
  }
}
