---
title: 'Interview Prep Pages — Polish & Accessibility'
slug: 'interview-prep-polish-accessibility'
created: '2026-02-23'
status: 'Completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 16', 'React 19', 'TypeScript 5.9', '@radix-ui/themes 3.3.0', 'Apollo Client 3']
files_to_modify:
  - 'src/app/interview-prep/page.tsx'
  - 'src/app/interview-prep/exercises/page.tsx'
files_to_create:
  - 'src/components/markdown-content.tsx'
code_patterns:
  - 'Radix UI Themes primitives only (no external UI libs)'
  - '"use client" at top of interactive files'
  - 'PascalCase component filenames in src/components/'
  - '@/* path alias maps to src/*'
  - 'Dark theme (appearance=dark in layout.tsx) — use CSS vars for colors'
test_patterns: ['visual QA only — no unit test files found for components']
---

# Tech-Spec: Interview Prep Pages — Polish & Accessibility

**Created:** 2026-02-23

## Overview

### Problem Statement

The `/prep` and `/prep/exercises` pages have three core UX and accessibility gaps:

1. `/prep` shows plain `"Loading prep resources..."` text while the `prepResources` GraphQL query is in-flight — no skeleton loader, causing a jarring blank-to-content jump.
2. `ResourceLink` component nests a Radix `<Button variant="ghost">` inside a Radix `<Link>` (which renders as `<a>`) — this produces a `<button>` inside an `<a>` in the DOM, which is invalid HTML per the spec, breaks screen readers, and prevents correct keyboard navigation.
3. Exercise `scenario` and `revealContent` strings contain markdown-fenced code blocks (` ```typescript ... ``` `) and `**bold**` syntax stored as raw strings. They currently render via `whiteSpace: "pre-wrap"` which handles newlines but outputs raw backticks and asterisks — no code styling, no bold rendering.

### Solution

- Add a Radix `<Skeleton>` loader to `/prep` that mirrors the real category card layout (heading block + CTA card + 3 category cards with link rows).
- Refactor `ResourceLink` to use Radix `<Link>` directly (remove the nested `<Button>`) — valid `<a>` element, keyboard navigable, screen-reader friendly.
- Create a `MarkdownContent` component that parses fenced code blocks and `**bold**` markdown into proper JSX. Use it in `ExerciseCard` for both `scenario` and `revealContent`.

### Scope

**In Scope:**
- Skeleton loader for `/prep` while `prepResources` query loads
- `ResourceLink` accessibility fix — remove `<Button>` from inside `<Link>`
- New `MarkdownContent` component — renders fenced code blocks and `**bold**`
- `ExerciseCard` updated to use `MarkdownContent` for `scenario` and `revealContent`

**Out of Scope:**
- New exercise content or categories
- GraphQL schema / resolver changes
- Syntax highlighting (no library in deps; styled `<pre>` is sufficient)
- Complete visual redesign
- Adding new npm packages

## Context for Development

### Codebase Patterns

- **UI library**: `@radix-ui/themes` v3.3.0 — provides `Skeleton`, `Container`, `Card`, `Flex`, `Box`, `Text`, `Heading`, `Badge`, `Button`, `Link`
- **Skeleton import**: `import { Skeleton } from "@radix-ui/themes"` — available in v3+, no install needed
- **Theme**: `appearance="dark"` in `src/app/layout.tsx`. Colors via CSS vars: `var(--gray-3)`, `var(--accent-3)`, `var(--green-3)`, `var(--gray-11)`
- **No markdown libraries in deps** — no `react-markdown`, `rehype`, `prism`, `shiki`, `marked`. Use pure regex + JSX.
- **`"use client"`** required at top of both page files (they use Apollo `useQuery` / React `useState`)
- **Path alias**: `@/*` maps to `src/*`
- **Component naming**: kebab-case filenames (`markdown-content.tsx`), PascalCase exports (`MarkdownContent`)
- **Radix `<Link>`**: renders as `<a>` — never nest `<Button>` or other interactive elements inside

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/app/interview-prep/page.tsx` | Main `/prep` page — add skeleton, fix ResourceLink |
| `src/app/interview-prep/exercises/page.tsx` | Exercises page — use MarkdownContent in ExerciseCard |
| `src/components/exercise-timer.tsx` | Style reference: Radix-only, `"use client"`, named export |
| `src/app/layout.tsx` | Confirms dark theme wrapper, Radix `<Theme appearance="dark">` |

### Technical Decisions

1. **Skeleton shape**: Match real content structure — heading block (two skeleton lines), CTA card (one wider skeleton row), then 3× category card (each: heading skeleton + 3 link-row skeletons). Wrap in `<Card>` to match real cards. Use `<Skeleton height="Xpx" width="Y%" />` with explicit sizing.

2. **ResourceLink fix**: Delete the `<Button variant="ghost">` wrapper. Replace the inner JSX with Radix `<Link href={href} target="_blank" rel="noopener noreferrer">` wrapping a `<Flex gap="2" align="center">` of `<Text weight="medium" size="2">{title}</Text>` + `<ExternalLinkIcon width={14} height={14} />`. Keep the description `<Text>` and tags `<Flex>` unchanged below the link. Remove `Button` from the imports at the top of `page.tsx`.

3. **MarkdownContent algorithm**:
   - Split `content` string on fenced code blocks using regex: `/```(\w+)?\n([\s\S]*?)```/g`
   - Alternate between text segments and code blocks
   - Text segments: split on `**` alternating plain/bold, wrap in `<Text as="p" size="2">` fragments
   - Code blocks: render as `<Box style={{ background: "var(--gray-3)", borderRadius: "var(--radius-2)", padding: "12px 16px", overflowX: "auto", marginBlock: "4px" }}><pre style={{ margin: 0, fontFamily: "var(--font-mono, monospace)", fontSize: 12, whiteSpace: "pre", lineHeight: 1.5 }}><code>{codeContent}</code></pre></Box>`
   - Wrap all segments in `<Flex direction="column" gap="2">`

## Implementation Plan

### Tasks

Tasks are ordered by dependency — Task 1 must complete before Task 2.

- [x] **Task 1: Create `src/components/markdown-content.tsx`**
  - File: `src/components/markdown-content.tsx` (new file)
  - Action: Create a `"use client"` component `MarkdownContent({ content: string })` that:
    1. Uses regex `/```(\w+)?\n([\s\S]*?)```/g` to split `content` into alternating text/code segments
    2. For text segments: split on `**` and render alternating `<span>` / `<strong>` inside a `<Text as="p" size="2" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>` block
    3. For code segments: render a styled `<Box>` containing `<pre><code>` with monospace font, `var(--gray-3)` background, `borderRadius: "var(--radius-2)"`, `padding: "12px 16px"`, `overflowX: "auto"`
    4. Wrap all output segments in `<Flex direction="column" gap="2">`
  - Imports needed: `Flex`, `Box`, `Text` from `@radix-ui/themes`
  - Notes: The component must be `"use client"` since exercises page is client-side. Handle the edge case where there are no code blocks (entire content is one text segment).

- [x] **Task 2: Update `ExerciseCard` in `src/app/interview-prep/exercises/page.tsx`**
  - File: `src/app/interview-prep/exercises/page.tsx`
  - Action:
    1. Add import: `import { MarkdownContent } from "@/components/markdown-content"`
    2. In `ExerciseCard`, find the scenario `<Text>` block (line 349–354) — replace with `<MarkdownContent content={exercise.scenario} />`
    3. In `ExerciseCard`, find the reveal `<Text as="div">` block inside the green reveal box (line 401–406) — replace with `<MarkdownContent content={exercise.revealContent} />`
  - Notes: The reveal `<Box>` wrapper with `backgroundColor: "var(--green-3)"` stays unchanged — only the inner `<Text>` is replaced. The hints box is plain bullet text — leave it as-is.

- [x] **Task 3: Add skeleton loader to `src/app/interview-prep/page.tsx`**
  - File: `src/app/interview-prep/page.tsx`
  - Action:
    1. Add `Skeleton` to the `@radix-ui/themes` import
    2. Create a local `PrepSkeleton` component (above `InterviewPrepPage`) that renders:
       ```
       <Container size="4" p="8">
         <Flex direction="column" gap="8">
           <Box>
             <Skeleton height="48px" width="60%" mb="4" />
             <Skeleton height="24px" width="85%" />
           </Box>
           <Card><Skeleton height="72px" /></Card>
           {[1,2,3].map(i => (
             <Card key={i}>
               <Skeleton height="28px" width="40%" mb="4" />
               <Flex direction="column" gap="3">
                 <Skeleton height="16px" width="90%" />
                 <Skeleton height="16px" width="75%" />
                 <Skeleton height="16px" width="80%" />
               </Flex>
             </Card>
           ))}
         </Flex>
       </Container>
       ```
    3. Replace the `if (loading)` block (lines 33–38) with: `if (loading) return <PrepSkeleton />`
  - Notes: `<Skeleton>` from Radix Themes v3 accepts `height`, `width` as string props and renders an animated shimmer. The `mb` shorthand prop works on Skeleton same as Box.

- [x] **Task 4: Fix `ResourceLink` in `src/app/interview-prep/page.tsx`**
  - File: `src/app/interview-prep/page.tsx`
  - Action:
    1. Remove `Button` from the `@radix-ui/themes` import (it's only used in `ResourceLink`)
    2. Rewrite the `ResourceLink` component's return value. Replace:
       ```tsx
       <Box>
         <Link href={href} target="_blank" rel="noopener noreferrer">
           <Flex gap="2" align="center" asChild>
             <Button variant="ghost" size="2">
               <Text weight="medium">{title}</Text>
               <ExternalLinkIcon width={16} height={16} />
             </Button>
           </Flex>
         </Link>
         ...
       ```
       With:
       ```tsx
       <Box>
         <Link href={href} target="_blank" rel="noopener noreferrer" weight="medium" size="2">
           <Flex gap="2" align="center" display="inline-flex">
             {title}
             <ExternalLinkIcon width={14} height={14} />
           </Flex>
         </Link>
         ...
       ```
       Keep the `<Text size="2" color="gray" mt="1">{description}</Text>` and tags `<Flex>` below unchanged.
  - Notes: Radix `<Link>` accepts `weight` and `size` props directly. Using `display="inline-flex"` on the inner `<Flex>` makes the icon inline. The `<Flex>` here is purely for layout, not interactive — this is valid.

### Acceptance Criteria

- [x] **AC1 — Skeleton loader (happy path)**
  Given the `/prep` page is visited and the `prepResources` query has not yet resolved,
  When the page renders,
  Then skeleton cards appear (heading block + CTA card + 3 category cards with shimmer animation)
  And the plain `"Loading prep resources..."` text is gone.

- [x] **AC2 — Skeleton loader (resolves)**
  Given the skeleton is showing,
  When the `prepResources` query resolves successfully,
  Then the skeleton is replaced by the real category cards with no flash or layout shift.

- [x] **AC3 — ResourceLink valid HTML**
  Given any resource link on the `/prep` page,
  When inspecting the rendered DOM,
  Then no `<button>` element exists as a descendant of an `<a>` element.

- [x] **AC4 — ResourceLink keyboard navigation**
  Given any resource link on the `/prep` page,
  When pressing Tab to navigate,
  Then each resource link receives focus in order
  And a visible focus ring is shown on the focused link.

- [x] **AC5 — Code blocks render styled**
  Given an exercise with a fenced code block in `scenario` (e.g., the `enhanceJobFromATS` or cache Map exercise),
  When the exercise card is rendered,
  Then the code block appears inside a dark-background `<pre>` box with monospace font,
  And the raw backticks (` ``` `) are not visible in the output.

- [x] **AC6 — Bold text renders**
  Given an exercise `revealContent` with `**bold**` markers (e.g., "**Missing auth guard**"),
  When the reveal answer is shown,
  Then the text between `**` markers renders visually bold,
  And the raw asterisks are not visible.

- [x] **AC7 — No regression on build**
  Given the changes are complete,
  When running `pnpm build`,
  Then the build completes with no TypeScript errors or build failures.

- [x] **AC8 — Error state unchanged**
  Given the GraphQL query returns an error,
  When the error state renders on `/prep`,
  Then the red error message still displays correctly (error path is not affected by skeleton change).

## Review Notes
- Adversarial review completed
- Findings: 10 total, 0 fixed, 10 skipped
- Resolution approach: skip
- 1 real finding noted (F1: ExternalLinkIcon missing aria-hidden) — deferred

## Additional Context

### Dependencies

- `@radix-ui/themes` v3.3.0 — `Skeleton` component available, already installed
- No new npm packages required
- No GraphQL schema changes
- No backend changes

### Testing Strategy

**Manual QA steps:**
1. Open DevTools → Network → throttle to "Slow 3G"
2. Visit `localhost:3000/prep` — confirm skeleton renders during load, real content appears after
3. Visit `localhost:3000/interview-prep/exercises`
4. Click "Reveal Answer" on `ce-1` (Spot the Security Vulnerability) — confirm code block renders with dark background and monospace font, raw backticks gone
5. Confirm `revealContent` bold text (e.g., "**Missing auth guard**") renders as `<strong>`
6. On `/prep`, inspect a resource link in DevTools Elements — confirm no `<button>` inside `<a>`
7. Tab through resource links — confirm focus rings visible
8. Run `pnpm build` — confirm zero errors

### Notes

- **`revealContent` format**: Uses inconsistent markdown — some entries have numbered lists with embedded code blocks, some have plain bullet points. The `MarkdownContent` component handles fenced code blocks and `**bold**`; plain numbered lists and bullet text work naturally via `whiteSpace: "pre-wrap"` on text segments.
- **Escaped backticks in source**: The `ce-1` scenario string uses `\`` in the template literal (to escape backticks inside a template literal). At runtime these resolve to real backtick characters, so the regex will match the code blocks correctly.
- **`Button` import removal**: After Task 4, `Button` is no longer imported in `page.tsx` — remove it from the destructured import to avoid unused-import lint warnings.
- **Future**: If syntax highlighting is desired later, `shiki` or `sugar-high` can be dropped in as a replacement for the plain `<pre>` in `MarkdownContent` without changing the component's API.
