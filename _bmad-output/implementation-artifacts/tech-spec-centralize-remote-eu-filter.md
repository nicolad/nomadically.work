---
title: 'Centralize Remote EU Filter - Remove Toggle'
slug: 'centralize-remote-eu-filter'
created: '2026-02-24'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript', 'Next.js', 'Apollo GraphQL', 'Python', 'Cloudflare Workers']
files_to_modify:
  - src/lib/constants.ts
  - schema/jobs/schema.graphql
  - src/apollo/resolvers/job/jobs-query.ts
  - src/components/unified-jobs-provider.tsx
  - src/components/jobs-list.tsx
  - workers/job-matcher/src/entry.py
code_patterns: ['central constant', 'GraphQL schema removal', 'codegen required']
test_patterns: []
---

# Tech-Spec: Centralize Remote EU Filter - Remove Toggle

**Created:** 2026-02-24

## Overview

### Problem Statement

nomadically.work is exclusively a remote-EU job board, but `is_remote_eu = true` is currently implemented as an optional, user-toggled filter via `?remote_eu=1` URL param. This means jobs without `is_remote_eu = true` can surface when the filter is off, and the toggle UI implies the focus is optional — which it isn't. The filter condition is scattered: URL param in the provider, prop drilling through `JobsList`, conditional in the GQL resolver, and hardcoded SQL in the job-matcher worker.

### Solution

Add `REMOTE_EU_ONLY = true` to the existing `src/lib/constants.ts` (TypeScript canonical source). Mirror it as `REMOTE_EU_ONLY = True` in each Python worker that queries by this flag. Remove the URL toggle entirely — the resolver always applies `is_remote_eu = true`. Strip `isRemoteEu` from the GraphQL schema arg, the component prop chain, and the UI.

### Scope

**In Scope:**
- Add `REMOTE_EU_ONLY` to `src/lib/constants.ts` (TS canonical)
- Add `REMOTE_EU_ONLY` to `workers/job-matcher/src/entry.py` (top-level constant, replaces raw `= 1` literal in SQL)
- Remove `isRemoteEu: Boolean` from `schema/jobs/schema.graphql` jobs query args
- Run `pnpm codegen` to regenerate `src/__generated__/`
- Update `jobs-query.ts` resolver to always apply `eq(jobs.is_remote_eu, true)` unconditionally (import from constants)
- Remove `?remote_eu=1` URL param logic, toggle button, and `remoteEuFilter` state from `unified-jobs-provider.tsx`
- Remove `isRemoteEu` prop from `jobs-list.tsx` interface and query variable

**Out of Scope:**
- Changing the `is_remote_eu` DB column or classification workers (eu-classifier, process-jobs write the flag — untouched)
- cleanup-jobs, job-reporter-llm (they read/reset the field for operational purposes, not filtering — untouched)
- Any DB migration

## Context for Development

### Codebase Patterns

- **Constants:** `src/lib/constants.ts` already exports `ADMIN_EMAIL`. Add `REMOTE_EU_ONLY` there.
- **GraphQL args:** Removing `isRemoteEu: Boolean` from `schema/jobs/schema.graphql` line 9 requires running `pnpm codegen` afterward — generated files in `src/__generated__/` must not be hand-edited.
- **Resolver conditions:** `jobs-query.ts` builds a `conditions` array pushed into Drizzle `and(...conditions)`. Always-on filter = unconditional `conditions.push(eq(jobs.is_remote_eu, true))` at the top, no arg check.
- **Python constant in job-matcher:** No `constants.py` exists yet in `workers/job-matcher/src/` — add a top-level constant directly in `entry.py` with a comment referencing `src/lib/constants.ts`. The SQL string `j.is_remote_eu = 1` becomes `j.is_remote_eu = {'1' if REMOTE_EU_ONLY else '0'}` (or simply leave the SQL unchanged but document the constant above it as governing the intent).

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/lib/constants.ts` | Add `REMOTE_EU_ONLY = true` here — TS canonical source |
| `schema/jobs/schema.graphql` | Remove `isRemoteEu: Boolean` from `JobsQueryArgs` (line 9) |
| `src/apollo/resolvers/job/jobs-query.ts` | Remove `if (args.isRemoteEu)` block; always push `eq(jobs.is_remote_eu, true)` |
| `src/components/unified-jobs-provider.tsx` | Remove `remoteEuFilter`, `handleRemoteEuToggle`, toggle `<Badge>` |
| `src/components/jobs-list.tsx` | Remove `isRemoteEu` from interface, props, and query variables |
| `workers/job-matcher/src/entry.py` | Add `REMOTE_EU_ONLY = True` constant at top; update SQL comment |

### Technical Decisions

- **Single TS source of truth:** `src/lib/constants.ts` (already exists, already used for `ADMIN_EMAIL`).
- **Python workers:** No shared cross-worker module is possible (each Python worker bundles `src/` independently). The constant is placed inline in each Python worker file that does the filtering, with a `# source of truth: src/lib/constants.ts` comment.
- **Only job-matcher filters by `is_remote_eu` in Python** — other Python workers either write the flag (eu-classifier, process-jobs) or use it for reporting/cleanup (job-reporter-llm, cleanup-jobs). Those are left untouched.
- **GraphQL schema removal:** `isRemoteEu` removed from query args entirely (not just defaulted). Codegen must run — this affects `src/__generated__/types.ts`, `hooks.tsx`, `resolvers-types.ts`, `gql.ts`.

## Implementation Plan

### Tasks

- [x] T1: Add `REMOTE_EU_ONLY` to TS constants
  - File: `src/lib/constants.ts`
  - Action: Append the following after the existing `ADMIN_EMAIL` export:
    ```ts
    /**
     * Canonical source of truth for the remote-EU-only filter.
     * All TS resolvers/components and Python workers reference this intent.
     * Python mirror: workers/job-matcher/src/entry.py (REMOTE_EU_ONLY)
     */
    export const REMOTE_EU_ONLY = true as const;
    ```

- [x] T2: Update `jobs-query.ts` resolver to always filter remote EU
  - File: `src/apollo/resolvers/job/jobs-query.ts`
  - Action:
    1. Add `import { REMOTE_EU_ONLY } from "@/lib/constants";` to the imports at the top.
    2. Replace lines 41–45:
       ```ts
       // Filter by is_remote_eu when requested
       if (args.isRemoteEu === true) {
         conditions.push(eq(jobs.is_remote_eu, true));
       } else if (args.isRemoteEu === false) {
         conditions.push(eq(jobs.is_remote_eu, false));
       }
       ```
       with:
       ```ts
       // Always filter to remote EU jobs (REMOTE_EU_ONLY = true in src/lib/constants.ts)
       if (REMOTE_EU_ONLY) {
         conditions.push(eq(jobs.is_remote_eu, true));
       }
       ```
  - Notes: `args.remoteEuConfidence` (line 60) is a separate, independent arg — leave it untouched.

- [x] T3: Remove `isRemoteEu` arg from GraphQL schema
  - File: `schema/jobs/schema.graphql`
  - Action: Delete line 9 — `isRemoteEu: Boolean` — from the jobs query args block.
  - Notes: Do NOT manually edit `src/__generated__/` — codegen handles it in T4.

- [x] T4: Run GraphQL codegen
  - Action: Run `pnpm codegen` in the project root.
  - Notes: This regenerates `src/__generated__/types.ts`, `hooks.tsx`, `resolvers-types.ts`, `gql.ts`. Must complete before T5/T6 edits that reference generated types.

- [x] T5: Remove toggle from `unified-jobs-provider.tsx`
  - File: `src/components/unified-jobs-provider.tsx`
  - Action:
    1. Delete line 15: `const remoteEuFilter = searchParams.get("remote_eu") === "1";`
    2. Delete the entire `handleRemoteEuToggle` callback (lines 31–41).
    3. Delete the `<Badge>` toggle element (variant/onClick for "remote EU only", lines 73–80).
    4. On the `<JobsList>` call, remove `isRemoteEu={remoteEuFilter}` prop — leave `searchFilter` and `sourceTypes`.

- [x] T6: Remove `isRemoteEu` prop from `jobs-list.tsx`
  - File: `src/components/jobs-list.tsx`
  - Action:
    1. Remove `isRemoteEu?: boolean;` from `JobsListProps` interface (line 35).
    2. Remove `isRemoteEu` from destructured function params (line 65).
    3. Remove `isRemoteEu: isRemoteEu || undefined,` from the `queryVariables` `useMemo` object (line 146).
    4. Remove `isRemoteEu` from the `useMemo` dependency array (line 151).

- [x] T7: Add `REMOTE_EU_ONLY` constant to job-matcher worker
  - File: `workers/job-matcher/src/entry.py`
  - Action:
    1. At the very top of the file (after any existing module docstring/imports), add:
       ```python
       # Remote EU filter — source of truth: src/lib/constants.ts (REMOTE_EU_ONLY)
       REMOTE_EU_ONLY = True
       ```
    2. On the SQL query at line 179, add an inline comment so intent is explicit:
       ```python
       WHERE jst.tag IN ({ph}) AND j.is_remote_eu = 1  -- REMOTE_EU_ONLY
       ```

### Acceptance Criteria

- [x] AC1: Given a user visits the jobs page, when the page loads, then the URL contains no `remote_eu` param and only remote EU jobs are shown with no toggle visible.

- [x] AC2: Given the GraphQL `jobs` query resolver runs (with any args or none), when it builds conditions, then `eq(jobs.is_remote_eu, true)` is unconditionally included — non-remote-EU jobs are never returned.

- [x] AC3: Given the jobs page renders, when inspecting the filter bar, then the "remote EU only" badge/button is absent; `SourceFilter` and the search bar remain intact.

- [x] AC4: Given `isRemoteEu: Boolean` has been deleted from `schema/jobs/schema.graphql`, when `pnpm codegen` runs, then it exits with no errors and `src/__generated__/` files no longer reference `isRemoteEu`.

- [x] AC5: Given all code changes are applied, when `pnpm build` runs, then it exits with zero TypeScript errors and zero lint errors.

- [x] AC6: Given the codebase, when searching for conditional `isRemoteEu` usage outside of `constants.ts` and `jobs-query.ts`, then no results are found — the constant is the single TS source of truth.

- [x] AC7: Given `workers/job-matcher/src/entry.py`, when reviewing the file, then `REMOTE_EU_ONLY = True` appears near the top with a comment referencing `src/lib/constants.ts` as the canonical source.

## Additional Context

### Dependencies

- `pnpm codegen` must run after T3 and before T5/T6 (generated hooks are consumed by `jobs-list.tsx`)
- T2 depends on T1 (import from constants)
- T5 and T6 can happen in parallel after T4

### Testing Strategy

- Manual: Load `http://localhost:3000/` — confirm only remote EU jobs appear, no toggle visible, URL stays clean
- Manual: Load `http://localhost:3000/?remote_eu=1` — should be ignored (param no longer read); same jobs shown
- Build check: `pnpm build` must pass with zero TS errors

### Notes

- `remoteEuConfidence` arg in the jobs query (line 60 of jobs-query.ts) is independent of `isRemoteEu` — leave it untouched.
- `is_remote_eu` field on the job detail page (`src/app/jobs/[id]/page.tsx`) — the badge showing "✅ Remote EU" is a read display, not a filter. Leave it as-is.
- `src/promptfoo/d1-test-generator.ts` and `src/evals/` use `is_remote_eu = 1` in raw SQL for test data seeding — leave untouched (eval infrastructure, not production filtering).
- `workers/eu-classifier/src/constants.py` — already has EU classification constants. `REMOTE_EU_ONLY` does not belong there (different concern — that file is about what counts as "EU", not whether to filter). Leave it untouched.
