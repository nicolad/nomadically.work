---
title: 'Application-to-Interview-Prep Linking'
slug: 'application-interview-prep-linking'
created: '2026-02-23'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: [Next.js 16, Apollo Server 5, Drizzle ORM, Cloudflare D1, Radix UI, GraphQL Codegen]
files_to_modify: [src/db/schema.ts, schema/applications/schema.graphql, src/apollo/resolvers/application.ts, src/graphql/applications.graphql, src/app/applications/[id]/page.tsx]
code_patterns: [lodash-merge-resolvers, mapApplication-mapping, fragment-based-queries, auth-guard-context-userEmail, mock-track-data-stable-slugs]
test_patterns: [no-unit-tests-for-applications, eval-suite-classification-only]
---

# Tech-Spec: Application-to-Interview-Prep Linking

**Created:** 2026-02-23

## Overview

### Problem Statement

Applications and interview prep tracks are completely disconnected. A user tracking a job application has no way to associate relevant prep tracks with it, making it hard to organize interview preparation per application.

### Solution

Add a many-to-many join table (`application_tracks`) linking applications to curated track slugs, expose the relation via GraphQL, and render linked tracks on the application detail page.

### Scope

**In Scope:**
- New `application_tracks` join table in D1 (application_id + track_slug)
- GraphQL schema: `interviewPrep` field on `Application`, mutations to link/unlink
- Application detail page UI: section to view and manage linked tracks
- Resolver wiring through existing mock track data

**Out of Scope:**
- Persisting tracks/prep resources to D1 (stays curated/in-memory)
- Auto-generating prep plans from job descriptions
- Track detail pages or track CRUD

## Context for Development

### Codebase Patterns

- Resolvers are merged via `lodash.merge` in `src/apollo/resolvers.ts` — application resolvers already registered, no changes needed there
- `mapApplication()` in `src/apollo/resolvers/application.ts` is the single mapping point from DB row to GraphQL type — does NOT need to handle `interviewPrep` because it will be a field resolver
- Client queries use fragment pattern (`ApplicationFields` fragment in `src/graphql/applications.graphql`)
- Auth guard: all application queries/mutations check `context.userEmail && context.userId`
- Mock tracks have stable slugs (`interview-prep`, `system-design`) defined in `src/apollo/resolvers/track.ts` as `mockTracks` array
- Track lookup by slug: `mockTracks.find(t => t.slug === slug)` — no DB query needed
- Migrations are sequential SQL files in `migrations/` (currently at 0007)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/db/schema.ts:460-483` | `applications` table definition — add `applicationTracks` join table after it |
| `schema/applications/schema.graphql` | `Application` type — add `interviewPrep: [Track!]!` field + link/unlink mutations |
| `src/apollo/resolvers/application.ts` | Application resolvers — add `Application.interviewPrep` field resolver + link/unlink mutations |
| `src/apollo/resolvers/track.ts:641-809` | `mockTracks` array — import and use for slug-to-track resolution |
| `src/graphql/applications.graphql` | `ApplicationFields` fragment — add `interviewPrep` + client mutations |
| `src/app/applications/[id]/page.tsx` | Detail page — add interview prep section between Notes and bottom of page |
| `src/apollo/resolvers.ts` | Resolver merge point — no changes needed |

### Technical Decisions

- Track slugs used as the foreign key (not track IDs) since tracks are curated in-memory data with stable slugs
- Many-to-many via `application_tracks` join table: `application_id` (integer FK) + `track_slug` (text), composite unique constraint
- `interviewPrep` is a field resolver on `Application` type (not inlined in `mapApplication`) — queries the join table, then resolves slugs against in-memory `mockTracks`
- No DataLoader needed — join table queries are per-application (detail page), not list-level
- Track data exported from `track.ts` so the application resolver can import and look up by slug

## Implementation Plan

### Tasks

- [x] Task 1: Add `applicationTracks` join table to Drizzle schema
  - File: `src/db/schema.ts`
  - Action: After the `applications` table (line ~483), add a new `applicationTracks` table with columns: `id` (integer PK autoincrement), `application_id` (integer, not null, FK to `applications.id`), `track_slug` (text, not null), `created_at` (text, default datetime). Add a composite unique index on `(application_id, track_slug)`. Export types `ApplicationTrack` and `NewApplicationTrack`.

- [x] Task 2: Generate and apply migration
  - Action: Run `pnpm db:generate` to create migration SQL file. Verify it creates the `application_tracks` table with the FK and unique constraint. Run `pnpm db:migrate` to apply locally. Run `pnpm db:push` to apply to remote D1.

- [x] Task 3: Export mock tracks data from track resolver
  - File: `src/apollo/resolvers/track.ts`
  - Action: Export the `mockTracks` array (currently `const mockTracks` at line 641) so it can be imported by the application resolver. Change `const mockTracks` to `export const mockTracks`. No other changes to this file.

- [x] Task 4: Update GraphQL schema with `interviewPrep` field and link/unlink mutations
  - File: `schema/applications/schema.graphql`
  - Action: Add `interviewPrep: [Track!]!` field to the `Application` type. Add two new mutations to the `Mutation` extension: `linkTrackToApplication(applicationId: Int!, trackSlug: String!): Application!` and `unlinkTrackFromApplication(applicationId: Int!, trackSlug: String!): Application!`. Note: `Track` type is already defined in `schema/tracks/schema.graphql` so it can be referenced directly.

- [x] Task 5: Run GraphQL codegen
  - Action: Run `pnpm codegen` to regenerate types in `src/__generated__/`. Verify the generated `Application` type includes `interviewPrep` field and the new mutation types are generated.

- [x] Task 6: Add field resolver and mutations in application resolver
  - File: `src/apollo/resolvers/application.ts`
  - Action:
    - Import `applicationTracks` from `@/db/schema` and `mockTracks` from `./track`
    - Import `eq, and` from `drizzle-orm` (already partially imported)
    - Add `Application` field resolver object with `interviewPrep` method: query `applicationTracks` where `application_id = parent.id`, map each row's `track_slug` to a track object via `mockTracks.find(t => t.slug === row.track_slug)`, filter out nulls (in case a slug no longer exists in curated data)
    - Add `linkTrackToApplication` mutation: auth guard, verify track slug exists in `mockTracks`, insert into `applicationTracks` (use `ON CONFLICT DO NOTHING` via `.onConflictDoNothing()` for idempotency), return the updated application by re-querying
    - Add `unlinkTrackFromApplication` mutation: auth guard, delete from `applicationTracks` where `application_id` and `track_slug` match, return the updated application by re-querying

- [x] Task 7: Update client-side GraphQL queries and mutations
  - File: `src/graphql/applications.graphql`
  - Action:
    - Add `interviewPrep { id slug title description level }` to the `ApplicationFields` fragment
    - Add `LinkTrackToApplication` mutation: `mutation LinkTrackToApplication($applicationId: Int!, $trackSlug: String!) { linkTrackToApplication(applicationId: $applicationId, trackSlug: $trackSlug) { id interviewPrep { id slug title description level } } }`
    - Add `UnlinkTrackFromApplication` mutation: same pattern with `unlinkTrackFromApplication`

- [x] Task 8: Run codegen again after client query changes
  - Action: Run `pnpm codegen` to generate the new hooks (`useLinkTrackToApplicationMutation`, `useUnlinkTrackFromApplicationMutation`).

- [x] Task 9: Add Interview Prep section to application detail page
  - File: `src/app/applications/[id]/page.tsx`
  - Action:
    - Import `useTracksQuery` (or inline a tracks query) to fetch available tracks for the dropdown
    - Import the new `useLinkTrackToApplicationMutation` and `useUnlinkTrackFromApplicationMutation` hooks
    - Add a new `<Card>` section between the Notes card and the end of the page with:
      - Heading: "Interview Prep"
      - List of currently linked tracks (from `app.interviewPrep`) — each shown as a Badge or Card with track title, level, and an unlink button (X icon)
      - A dropdown/select to add a new track: shows available tracks from `mockTracks` (fetched via `tracks` query), filtered to exclude already-linked ones. On select, calls `linkTrackToApplication` mutation with `refetchQueries: ["GetApplication"]`
      - Empty state: "No prep tracks linked yet. Add one to start preparing."

### Acceptance Criteria

- [x] AC 1: Given an application with no linked tracks, when the user views the application detail page, then an "Interview Prep" section is visible with an empty state message and an "Add Track" control.
- [x] AC 2: Given an application detail page, when the user selects a track from the dropdown, then the track is linked via GraphQL mutation and appears in the Interview Prep section without page reload.
- [x] AC 3: Given an application with linked tracks, when the user clicks the unlink button on a track, then the track is removed from the Interview Prep section without page reload.
- [x] AC 4: Given a track is already linked to an application, when the user tries to link the same track again, then no duplicate is created (idempotent — `ON CONFLICT DO NOTHING`).
- [x] AC 5: Given an unauthenticated user, when they attempt to link or unlink a track, then a "User must be authenticated" error is thrown.
- [x] AC 6: Given a track slug that doesn't exist in curated data, when the user attempts to link it, then an error is thrown ("Track not found").
- [x] AC 7: Given the `GetApplication` query, when it returns, then the `interviewPrep` field contains an array of Track objects with `id`, `slug`, `title`, `description`, and `level` fields.

## Additional Context

### Dependencies

- No new external libraries needed — all functionality uses existing Drizzle ORM, Apollo Server, and Radix UI
- Requires the `Track` type from `schema/tracks/schema.graphql` to be available in the merged schema (already is)
- Requires `mockTracks` to be exported from `src/apollo/resolvers/track.ts`

### Testing Strategy

- **Manual testing:** Navigate to `/applications/9`, verify empty Interview Prep section appears. Link a track, verify it renders. Unlink, verify it disappears. Test with both available tracks (`interview-prep`, `system-design`).
- **GraphQL Playground testing:** Run `linkTrackToApplication` and `unlinkTrackFromApplication` mutations directly. Verify `application(id: 9) { interviewPrep { slug title } }` returns linked tracks.
- **Edge case testing:** Link same track twice (should be idempotent). Unlink a track that isn't linked (should succeed silently). Test with unauthenticated user (should error).

### Notes

- When tracks are eventually persisted to D1, the `interviewPrep` field resolver will need to be updated to query the tracks table instead of `mockTracks` array. The join table design is forward-compatible — `track_slug` can be used as a lookup key in either case.
- The `mockTracks` array only has 2 entries currently. The UI dropdown will be very short. This is fine for now.
- The `@ts-expect-error` comments in `application.ts` for `job_title` and `company_name` suggest Drizzle schema may be slightly out of sync — the new `applicationTracks` table should be clean since it's being added fresh.

## Review Notes
- Adversarial review completed
- Findings: 13 total, 3 fixed, 10 skipped (noise/pre-existing/by-design)
- Resolution approach: auto-fix (real findings only)
- Fixed: auth bypass in link/unlink mutations (ownership check before write), ON DELETE CASCADE on FK
