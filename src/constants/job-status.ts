/**
 * Job processing pipeline status values.
 *
 * These are the canonical string values used in the `jobs.status` column.
 * They must stay in sync with:
 *   - schema/jobs/schema.graphql  (JobStatus enum)
 *   - workers/process-jobs/src/entry.py  (JobStatus enum)
 */
export const JOB_STATUS = {
  NEW: "new",
  ENHANCED: "enhanced",
  ROLE_MATCH: "role-match",
  ROLE_NOMATCH: "role-nomatch",
  EU_REMOTE: "eu-remote",
  NON_EU: "non-eu",
  ERROR: "error",
  REPORTED: "reported",
} as const;

export type JobStatusValue = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];
