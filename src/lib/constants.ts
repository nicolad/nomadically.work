/**
 * Admin email address
 */
export const ADMIN_EMAIL = "nicolai.vadim@gmail.com";

/**
 * Canonical source of truth for the remote-EU-only filter.
 * All TS resolvers/components and Python workers reference this intent.
 * Python mirror: workers/job-matcher/src/entry.py (REMOTE_EU_ONLY)
 */
export const REMOTE_EU_ONLY = true as const;
