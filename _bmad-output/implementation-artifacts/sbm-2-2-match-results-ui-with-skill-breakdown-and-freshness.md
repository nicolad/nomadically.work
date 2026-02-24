# Story 2.2: Match Results UI with Skill Breakdown & Freshness (Skills-Based Matching)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to see my ranked matched jobs with per-job skill breakdowns, freshness indicators, and proper loading states,
so that I can spot the best opportunities, know which skills I have or lack, and see when new jobs appeared since my last visit.

## Acceptance Criteria

1. **Given** an authenticated user with extracted skills is on the `/resume` page **When** the `matchedJobs` query completes **Then** ranked `MatchedJob` cards are displayed, each showing: job title + external link, company name, match %, matched skills, missing skills

2. **Given** a matched job card is rendered **When** matched and missing skills are shown **Then** matched skills are preceded by a `"You have:"` text label **And** missing skills are preceded by a `"You're missing:"` text label **And** both groups are labelled in plain text (not colour alone) — satisfying NFR12 and making them accessible to screen readers (NFR11)

3. **Given** a matched job's `publishedAt` is after the authenticated user's `profile.updatedAt` **When** the card renders **Then** a `"New"` badge indicator is shown on the card (FR21)

4. **Given** the `matchedJobs` query is loading (`matchLoading === true`) and no results are yet available **When** the matched jobs section renders **Then** 3 skeleton card placeholders are shown instead of the spinner-only state (NFR4) **And** the skeletons use existing Radix UI `Box` + `Card` primitives with `var(--gray-3)` / `var(--gray-4)` backgrounds — no new dependencies

5. **Given** an authenticated user has no extracted skills (empty or absent `extractedSkills`) **When** the match results section renders **Then** a prompt is shown: `"Upload your resume to see matched jobs"` — not an empty list or hidden section

6. **Given** `pnpm build` is run **Then** `src/app/resume/page.tsx` compiles with no TypeScript errors

## Tasks / Subtasks

- [x] Task 1: Add skill section labels to `MatchedJobCard` (AC: #2)
  - [x] 1.1: In `MatchedJobCard`, before the matched skills `<Flex>`, add `<Text size="1" color="gray">You have:</Text>`
  - [x] 1.2: Before the missing skills `<Flex>`, add `<Text size="1" color="gray">You're missing:</Text>`
  - [x] 1.3: Wrap each label+skills block in a `<Flex direction="column" gap="1">` for visual grouping
- [x] Task 2: Add "New" indicator (AC: #3)
  - [x] 2.1: Add `isNew?: boolean` prop to `MatchedJobCard`
  - [x] 2.2: When `isNew === true`, render a `<Badge color="blue" variant="soft" size="1">New</Badge>` next to the match % badge
  - [x] 2.3: In `JobMatchingSection`, pass `isNew={!!job.publishedAt && !!profile?.updatedAt && job.publishedAt > profile.updatedAt}` to each `MatchedJobCard`
- [x] Task 3: Add skeleton loading cards (AC: #4)
  - [x] 3.1: In `JobMatchingSection`, replace the header spinner-only state with: when `matchLoading && matchedJobs.length === 0`, render 3 skeleton `Card` placeholders
  - [x] 3.2: Each skeleton card uses `Box` with `background: "var(--gray-4)"` and `borderRadius: 4` for title placeholder, and smaller boxes for skill badge placeholders — no new packages
  - [x] 3.3: Keep the existing header spinner for subsequent loads (when `matchLoading && matchedJobs.length > 0`)
- [x] Task 4: Add empty-skills prompt (AC: #5)
  - [x] 4.1: Add a condition: when `!profile?.extractedSkills?.length` (no profile or empty skills), render a `<Callout.Root>` or `<Text>` saying `"Upload your resume to see matched jobs"`
  - [x] 4.2: Ensure this shows BELOW the DropZone (so the DropZone is still the primary CTA)
  - [x] 4.3: Do NOT add a separate link — the DropZone above already serves as the upload CTA
- [x] Task 5: Verify build (AC: #6)
  - [x] 5.1: Run `pnpm build` — confirm no TypeScript errors in `src/app/resume/page.tsx`

## Dev Notes

### ⚠️ THIS STORY HAS REAL IMPLEMENTATION WORK

Unlike sbm-1-1, 1-2, 1-3, and 2-1 which were largely pre-implemented, this story has **4 specific UI changes** to make to `src/app/resume/page.tsx`. None of them are complex — they are targeted additions to existing components.

**All changes are in `src/app/resume/page.tsx` only.** Do not create new files.

### What's Already Working (Do Not Touch)

- `MatchedJobCard` component (lines 255–311): card layout, job title, company, location, match % badge, skill badges, pagination
- `JobMatchingSection` (lines 313–460): upload flow, query wiring, page state
- `useMatchedJobsQuery` with `skip: !profile?.extractedSkills?.length` (correct skip condition)
- Pagination (`matchPage` state, `hasMore` flag)
- `publishedAt` IS already in the `MatchedJobs` query document (`src/graphql/skill-matching.graphql` line 45) — no codegen changes needed

### Change 1: Skill Section Labels (Task 1)

Current `MatchedJobCard` (lines 294–307):
```tsx
{matchedSkills.length > 0 && (
  <Flex gap="1" wrap="wrap">
    {matchedSkills.map((s) => <SkillBadge key={s} skill={s} variant="matched" />)}
  </Flex>
)}
{missingSkills.length > 0 && (
  <Flex gap="1" wrap="wrap">
    {missingSkills.slice(0, 8).map((s) => <SkillBadge key={s} skill={s} variant="missing" />)}
    {missingSkills.length > 8 && (
      <Text size="1" color="gray">+{missingSkills.length - 8} more</Text>
    )}
  </Flex>
)}
```

Change to (add labels, wrap in column flex):
```tsx
{matchedSkills.length > 0 && (
  <Flex direction="column" gap="1">
    <Text size="1" color="gray">You have:</Text>
    <Flex gap="1" wrap="wrap">
      {matchedSkills.map((s) => <SkillBadge key={s} skill={s} variant="matched" />)}
    </Flex>
  </Flex>
)}
{missingSkills.length > 0 && (
  <Flex direction="column" gap="1">
    <Text size="1" color="gray">You're missing:</Text>
    <Flex gap="1" wrap="wrap">
      {missingSkills.slice(0, 8).map((s) => <SkillBadge key={s} skill={s} variant="missing" />)}
      {missingSkills.length > 8 && (
        <Text size="1" color="gray">+{missingSkills.length - 8} more</Text>
      )}
    </Flex>
  </Flex>
)}
```

### Change 2: "New" Indicator (Task 2)

Add `isNew` prop to `MatchedJobCard`:
```tsx
function MatchedJobCard({
  job, matchedSkills, missingSkills, matchScore, isNew,
}: {
  // ...existing props...
  isNew?: boolean;
}) {
  // In the header Flex (next to the match % badge):
  <Badge color={pct >= 70 ? "green" : pct >= 40 ? "yellow" : "gray"} variant="solid" size="1">
    {pct}% match
  </Badge>
  {isNew && <Badge color="blue" variant="soft" size="1">New</Badge>}
```

In `JobMatchingSection` where `MatchedJobCard` is rendered (line 432–440):
```tsx
{matchedJobs.map((item) => (
  <MatchedJobCard
    key={item.job.id}
    job={item.job}
    matchedSkills={item.matchedSkills}
    missingSkills={item.missingSkills}
    matchScore={item.matchScore}
    isNew={
      !!item.job.publishedAt &&
      !!profile?.updatedAt &&
      item.job.publishedAt > profile.updatedAt
    }
  />
))}
```

Note: Both `publishedAt` and `profile.updatedAt` are ISO strings from the GraphQL response — string comparison works correctly for ISO 8601 dates.

### Change 3: Skeleton Loading Cards (Task 3)

Replace the current loading state in `JobMatchingSection` (lines 414–423):

Current:
```tsx
<Flex align="center" justify="between">
  <Heading size="3">Matched Jobs</Heading>
  {matchLoading && (
    <Flex align="center" gap="1">
      <ReloadIcon style={{ animation: "spin 1s linear infinite" }} />
      <Text size="1" color="gray">Loading…</Text>
    </Flex>
  )}
</Flex>
```

Change to:
```tsx
<Flex align="center" justify="between">
  <Heading size="3">Matched Jobs</Heading>
  {matchLoading && matchedJobs.length > 0 && (
    <Flex align="center" gap="1">
      <ReloadIcon style={{ animation: "spin 1s linear infinite" }} />
      <Text size="1" color="gray">Loading…</Text>
    </Flex>
  )}
</Flex>

{matchLoading && matchedJobs.length === 0 && [1, 2, 3].map((i) => (
  <Card key={i} variant="surface">
    <Flex direction="column" gap="2">
      <Box style={{ height: 16, width: "55%", background: "var(--gray-4)", borderRadius: 4 }} />
      <Box style={{ height: 12, width: "30%", background: "var(--gray-3)", borderRadius: 4 }} />
      <Flex gap="1">
        {[1, 2, 3].map((j) => (
          <Box key={j} style={{ height: 20, width: 56, background: "var(--gray-3)", borderRadius: 20 }} />
        ))}
      </Flex>
    </Flex>
  </Card>
))}
```

### Change 4: Empty-Skills Prompt (Task 4)

Add below the existing extracted skills block (around line 410) in `JobMatchingSection`:

```tsx
{/* Empty state when no skills extracted yet */}
{(!profile?.extractedSkills || profile.extractedSkills.length === 0) && (
  <Text size="2" color="gray">
    Upload your resume to see matched jobs.
  </Text>
)}
```

This shows below the DropZone. Do NOT add a separate "link to upload form" — the DropZone above IS the upload CTA.

### Intentional Design Deviations (Do NOT Change)

| Spec Says | Actual | Reason |
|---|---|---|
| `matched-job-card.tsx` component file | Inline `MatchedJobCard` in `page.tsx` | Established in sbm-1-3; do not refactor |
| Navigate to internal job detail route | Opens `job.url` in new tab | `MatchedJob` query returns no internal slug; external URL is correct |
| "link to the upload form" in empty state | DropZone above serves as upload CTA | Adding a separate link would be redundant |

### Radix UI Primitives — Already Imported

All components used in the changes are already imported at the top of `page.tsx`:
- `Card`, `Flex`, `Box`, `Text`, `Badge`, `Callout` — all from `@radix-ui/themes` ✅
- `InfoCircledIcon` — from `@radix-ui/react-icons` ✅

No new imports needed.

### TypeScript — `isNew` Date Comparison

`job.publishedAt` is typed as `string` (ISO 8601) from `@/__generated__/hooks`. `profile.updatedAt` is also `string`. String comparison of ISO 8601 dates is lexicographically correct — no `Date` parsing needed.

### Previous Story Context

- sbm-1-3: Established all components inline in `page.tsx` (no separate component files)
- sbm-2-1: Confirmed `publishedAt` IS in the `MatchedJobs` query document — no codegen changes needed
- The `profile.updatedAt` field is already fetched by `useMySkillProfileQuery` (confirmed in `src/graphql/skill-matching.graphql` line 9: `updatedAt`)

### File Structure

| File | Status | Notes |
|------|--------|-------|
| `src/app/resume/page.tsx` | ✅ EXISTS (904 lines) | Only file to modify |

### References

- [Source: epics-skills-based-matching-2026-02-23.md#Story 2.2] — Acceptance criteria
- [Source: src/app/resume/page.tsx#L255] — `MatchedJobCard` component
- [Source: src/app/resume/page.tsx#L313] — `JobMatchingSection` component
- [Source: src/graphql/skill-matching.graphql#L37] — `MatchedJobs` query document (has `publishedAt`, `updatedAt`)
- [Source: sbm-1-3 story] — Component inline pattern established

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `pnpm build` → `✓ Compiled successfully` — no TypeScript errors

### Completion Notes List

- Task 1: Wrapped matched/missing skill `<Flex>` blocks in `<Flex direction="column" gap="1">` with `<Text size="1" color="gray">` labels ("You have:" / "You&apos;re missing:") — used HTML entity for apostrophe to satisfy Next.js linting
- Task 2: Added `isNew?: boolean` prop to `MatchedJobCard`; wrapped match% badge and "New" badge in `<Flex align="center" gap="1">`; wired ISO 8601 string comparison `item.job.publishedAt > profile.updatedAt` in `JobMatchingSection`
- Task 3: Spinner in header now conditional on `matchLoading && matchedJobs.length > 0`; added 3 skeleton `<Card>` placeholders rendered when `matchLoading && matchedJobs.length === 0` using `var(--gray-3)`/`var(--gray-4)` — no new deps
- Task 4: Added `(!profile?.extractedSkills || profile.extractedSkills.length === 0)` prompt `<Text>` above matched jobs section, below DropZone area
- All changes are in `src/app/resume/page.tsx` only — no new files created

### File List

- `src/app/resume/page.tsx` (MODIFIED) — Add skill labels, "New" badge, skeleton cards, empty-skills prompt
