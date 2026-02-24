# Story 1.3: Resume Profile Page (Skills-Based Matching)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want a `/resume` page where I can upload my resume and see my extracted skill profile and matched jobs,
so that I have a single place to manage my skills and find relevant remote EU roles.

## Acceptance Criteria

1. **Given** an unauthenticated user navigates to `/resume` **When** the Clerk auth check in `src/app/resume/page.tsx` runs **Then** they are redirected to `/sign-in`

2. **Given** an authenticated user with no existing skill profile navigates to `/resume` **When** `useMySkillProfileQuery` returns `null` **Then** the `JobMatchingSection` shows the drop zone with no pre-populated skills — the skills section and matched jobs section are hidden

3. **Given** an authenticated user submits a PDF resume via the drop zone in `JobMatchingSection` **When** the upload → extract flow completes **Then** `uploadSkillProfile(base64, filename, fileType)` is called first **And** `extractSkillProfile(profileId)` is called second **And** loading spinners show during each phase ("Uploading resume…" → "Extracting skills with AI…") **And** on success, extracted skill badges are displayed **And** matched jobs load automatically

4. **Given** an authenticated user with an existing skill profile (non-empty `extractedSkills`) navigates to `/resume` **When** `useMySkillProfileQuery` returns their profile **Then** their skill badges are displayed immediately without re-uploading (NFR19) **And** a "Replace resume" affordance is visible so they can trigger a new upload

5. **Given** the `matchedJobs` query returns results **When** matched jobs are rendered **Then** each card shows job title + external link, company name, match %, matched skills (green badges), missing skills (red badges) **And** pagination controls appear when `hasMore` is true or `matchPage > 0`

6. **Given** `pnpm build` is run **Then** `src/app/resume/page.tsx` compiles with no TypeScript errors **And** all 4 `useUploadSkillProfileMutation`, `useExtractSkillProfileMutation`, `useMySkillProfileQuery`, `useMatchedJobsQuery` hooks resolve from `@/__generated__/hooks`

## Tasks / Subtasks

- [x] Task 1: Verify auth redirect (AC: #1)
  - [x] 1.1: Confirm `useAuth()` from `src/lib/auth-hooks.ts` is used (wraps Clerk `useUser()`)
  - [x] 1.2: Confirm unauthenticated check at line ~520: `if (!loading && !isAuthenticated)` → `router.push("/sign-in")`
  - [x] 1.3: Confirm loading spinner shown during Clerk initialization (`if (loading)`)
- [x] Task 2: Verify `mySkillProfile` persistent loading (AC: #2, #4)
  - [x] 2.1: Confirm `useMySkillProfileQuery({ skip: !userId })` fires on page load when user is authenticated
  - [x] 2.2: Confirm `profile?.extractedSkills` from the query drives the skills display (not local state)
  - [x] 2.3: Confirm when `profile?.extractedSkills?.length > 0` the matched jobs query fires automatically
- [x] Task 3: Add "Replace resume" affordance (AC: #4) — **ONLY MISSING PIECE**
  - [x] 3.1: In `JobMatchingSection`, when `profile?.extractedSkills && profile.extractedSkills.length > 0`, add a `<Text size="1" color="gray">Your resume is ready — drop a new file to replace it.</Text>` (or equivalent Radix UI label) above the DropZone
  - [x] 3.2: Ensure the DropZone remains always visible (no toggle/hide logic needed — it already works)
- [x] Task 4: Verify upload → extract flow (AC: #3)
  - [x] 4.1: Confirm `handleMatchUpload` converts file to base64 via `arrayBuffer()` + `btoa()`
  - [x] 4.2: Confirm `uploadSkillProfile({ variables: { resumeBase64, filename, fileType } })` is called first
  - [x] 4.3: Confirm `extractSkillProfile({ variables: { profileId } })` called with `upData?.uploadSkillProfile?.id`
  - [x] 4.4: Confirm `refetchProfile()` + `refetchMatches()` called after extraction completes
- [x] Task 5: Verify build (AC: #6)
  - [x] 5.1: Run `pnpm build` — confirm no TypeScript errors
  - [x] 5.2: Confirm `/resume` route renders in build output

## Dev Notes

### ⚡ CRITICAL: PAGE IS LARGELY PRE-IMPLEMENTED

`src/app/resume/page.tsx` is a 904-line file that was built ahead of the sprint. It contains the full `JobMatchingSection` component with all 4 skill-matching hooks wired in.

**Your job:** Verify the implementation, add the one missing "Replace resume" affordance, run `pnpm build`.

### What's Already Fully Implemented

The page has **two independent resume systems** side by side:

1. **Resume Assistant (legacy RAG pipeline)** — lines ~464–898
   - Uses `useUploadResumeMutation`, `useIngestResumeParseMutation`, `useAskAboutResumeLazyQuery`, `useResumeStatusQuery`
   - PDF upload → polling → Q&A interface
   - **Do NOT touch this section** — it predates Skills-Based Matching

2. **Job Matching (Skills-Based Matching)** — lines ~241–460
   - Uses `useUploadSkillProfileMutation`, `useExtractSkillProfileMutation`, `useMySkillProfileQuery`, `useMatchedJobsQuery`
   - Drop zone → base64 upload → skill extraction → matched jobs
   - **This is the story 1.3 concern**

### Auth Pattern (Actual Implementation)

```ts
// src/lib/auth-hooks.ts — wraps Clerk useUser() with Playwright dev bypass
const { user, loading, isAuthenticated } = useAuth();

// Redirect if not authenticated:
if (!loading && !isAuthenticated) {
  router.push("/sign-in");
  return null;
}
```

Note: `isAuthenticated` = Clerk's `isSignedIn` (boolean | undefined). The `loading` check before the auth check prevents premature redirects. Works correctly.

### `mySkillProfile` Persistent Loading Pattern

```ts
// In JobMatchingSection:
const { data: profileData, refetch: refetchProfile } = useMySkillProfileQuery({ skip: !userId });
const profile = profileData?.mySkillProfile;
```

When an authenticated user loads the page, `userId` comes from `useAuth()`. The query fires, and if a profile exists, `profile?.extractedSkills` populates immediately. This satisfies NFR19 (persistent skills across sessions).

### Upload → Extract Flow (Already Correct)

```ts
// handleMatchUpload (simplified):
const base64 = btoa(new Uint8Array(buf).reduce(...));
const { data: upData } = await uploadSkillProfile({
  variables: { resumeBase64: base64, filename: file.name, fileType: file.type },
});
const profileId = upData?.uploadSkillProfile?.id;
await extractSkillProfile({ variables: { profileId } });
await refetchProfile();
await refetchMatches();
```

### Only Missing Piece: "Replace Resume" Affordance

AC #4 requires a visible affordance when an existing skill profile is loaded. The DropZone is always visible, but there's no contextual label explaining it's for replacement.

**Where to add it:** In `JobMatchingSection`, find the extracted skills display block (~line 401):

```tsx
{profile?.extractedSkills && profile.extractedSkills.length > 0 && (
  <Box>
    <Text size="2" weight="bold" mb="2">Your extracted skills</Text>
    {/* ADD HERE: */}
    {/* ... */}
  </Box>
)}
```

Add a small text above the DropZone (or below the skills section) such as:
```tsx
<Text size="1" color="gray">
  Drop a new PDF below to replace your resume and re-extract skills.
</Text>
```

This is a **1-line text addition** — do NOT restructure the component.

### Intentional Architecture Deviations (Do NOT Revert)

| Architecture Spec | Actual Implementation | Why |
|---|---|---|
| `src/components/resume/resume-upload-form.tsx` | Inline `DropZone` component in `page.tsx` | Avoid file bloat; co-location works fine |
| `src/components/resume/skill-tag-list.tsx` | Inline `<Badge>` rendering in `JobMatchingSection` | Simple enough to not warrant a component |
| `src/components/resume/matched-job-card.tsx` | Inline `MatchedJobCard` in `page.tsx` | Same reasoning |
| "Clerk auth check" | `useAuth()` from `src/lib/auth-hooks.ts` (Clerk wrapper) | Consistent app-wide auth hook |
| Server-side auth redirect | Client-side `router.push("/sign-in")` | `"use client"` page; works correctly |
| `myResume` / `uploadResume` names | `mySkillProfile` / `uploadSkillProfile` | As documented in sbm-1-1 — DO NOT rename |

### MatchedJobCard — What It Shows

The `MatchedJobCard` component (lines 255–311) displays:
- Job title + `ExternalLinkIcon` linking to `job.url`
- Company name and location
- Match % badge (green ≥70%, yellow ≥40%, gray otherwise)
- Matched skills as green `Badge` elements
- Missing skills as red `Badge` elements (capped at 8, "+N more" text for overflow)

The labelling ("You have:" / "You're missing:") is deferred to story 2.2 — do NOT add it here.

### Legacy Resume-RAG Hooks in page.tsx

The page imports these legacy hooks (`useUploadResumeMutation`, `useIngestResumeParseMutation`, `useAskAboutResumeLazyQuery`, `useResumeStatusQuery`) from the resume-RAG pipeline. These are defined in `src/graphql/resume.graphql` and must continue to exist in `@/__generated__/hooks`. Do NOT remove them.

### File Structure

| File | Status | Notes |
|------|--------|-------|
| `src/app/resume/page.tsx` | ✅ EXISTS (904 lines) | Full implementation — needs "Replace resume" label only |
| `src/lib/auth-hooks.ts` | ✅ EXISTS | Clerk wrapper with dev bypass |

### References

- [Source: epics-skills-based-matching-2026-02-23.md#Story 1.3] — Acceptance criteria
- [Source: architecture-skills-based-matching-2026-02-23.md#Frontend Architecture] — Page structure spec
- [Source: src/app/resume/page.tsx] — Full 904-line actual implementation
- [Source: src/lib/auth-hooks.ts] — Auth hook (Clerk `useUser()` wrapper)
- [Source: sbm-1-1 story Dev Notes] — Naming deviations (SkillProfile vs Resume)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `pnpm build` → clean, `/resume` route confirmed in build output (static, no TS errors)

### Completion Notes List

- Tasks 1, 2, 4 were pure verification — all implementation already present and correct
- Task 3: Added 4-line conditional `<Text>` block above the `DropZone` (lines 375–380 area), visible only when `profile?.extractedSkills.length > 0`
- Auth redirect: `if (!loading && !isAuthenticated)` → `router.push("/sign-in")` confirmed at lines 520–522
- Skill profile query: `useMySkillProfileQuery({ skip: !userId })` confirmed, drives skills display and matched jobs skip condition
- Upload flow: `arrayBuffer()` + `btoa()` base64 → `uploadSkillProfile` → `extractSkillProfile` → `refetchProfile` + `refetchMatches` confirmed

### File List

- `src/app/resume/page.tsx` (MODIFIED) — Added "Replace resume" affordance text in `JobMatchingSection`
