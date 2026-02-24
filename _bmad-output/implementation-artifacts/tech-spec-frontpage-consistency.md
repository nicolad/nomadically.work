---
title: 'Frontpage UI Consistency Pass'
slug: 'frontpage-consistency'
created: '2026-02-23'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 16', 'React 19', 'TypeScript', 'Radix UI Themes', 'Apollo Client']
files_to_modify: ['src/components/jobs-list.tsx', 'src/app/page.tsx']
code_patterns: ['Radix UI Themes props for spacing/size', 'CSS vars for colors', 'Radix Badge/Button for interactive elements']
test_patterns: []
---

# Tech-Spec: Frontpage UI Consistency Pass

**Created:** 2026-02-23

## Overview

### Problem Statement

`jobs-list.tsx` and `page.tsx` mix inline pixel styles, raw HTML elements, and custom CSS class-based components alongside Radix UI Themes components. Specific issues:
- Avatar skeleton is `borderRadius: 6` in `page.tsx` (line 27) vs `borderRadius: 4` in `jobs-list.tsx` (line 213) and `border-radius: 4px` in actual CSS
- Status badge has inline `fontSize: 10` despite already having Radix `size="1"` (line 262)
- `<span className="job-row-meta-badge">` and `<span className="yc-cta-ghost">` are raw HTML where Radix `<Badge>` is used everywhere else
- `<button className="yc-cta">` in the error state where Radix `<Button>` is used everywhere else
- `style={{ marginTop: 4 }}` inline on Skeleton elements where Radix `mt` props are used elsewhere
- `style={{ cursor: "pointer" }}` redundantly overrides `<IconButton>` which already provides this
- `style={{ flex: 1 }}` on `<Box>` where Radix `flexGrow` prop is available

### Solution

Replace all inline-style leaks and raw HTML element patterns in `jobs-list.tsx` and `page.tsx` with Radix UI Themes primitives and props, following the patterns established in `unified-jobs-provider.tsx` and `user-preferences.tsx`.

### Scope

**In Scope:**
- `jobs-list.tsx`: Add `Button` to imports, replace `<button className="yc-cta">` with Radix `<Button>`, remove `fontSize: 10` from status Badge, replace `<span className="job-row-meta-badge">` with Radix `<Badge>`, replace `<span className="yc-cta-ghost">` with Radix `<Badge>`, replace `style={{ marginTop: 4 }}` with `mt="1"` on Skeleton, remove `style={{ cursor: "pointer" }}` from `<IconButton>`, remove `style={{ borderRadius: 4 }}` from Skeleton avatar
- `page.tsx`: Align avatar skeleton `borderRadius: 6` → `4`, replace `style={{ flex: 1 }}` with `flexGrow="1"` Radix prop

**Out of Scope:**
- Refactoring `<div>`/`<span>` layout containers (load-bearing CSS class names in `globals.css`)
- Touching `globals.css` padding/spacing scale
- Removing dead CSS classes (`.yc-cta`, `.yc-cta-ghost`, `.job-row-meta-badge`) — leave CSS untouched
- Adding/removing features or content

---

## Context for Development

### Codebase Patterns

- Radix UI Themes is the primary component library — use `<Box>`, `<Flex>`, `<Text>`, `<Badge>`, `<Button>`, `<IconButton>` with prop-based APIs
- Spacing: Radix numeric scale (`mt="1"` = 4px, `mt="3"` = 12px) not inline pixels
- Font sizes: Radix `size` prop on `<Text>` and `<Badge>` — do not override with inline `fontSize`
- Colors: CSS vars (`var(--gray-9)`) via `style={{}}` or Radix `color` prop
- `unified-jobs-provider.tsx` and `user-preferences.tsx` are the reference implementations — Radix exclusively
- The `<span className="yc-cta-ghost">` is inside a `<Link>` wrapper — must use `<Badge>` not `<Button>` (button-in-anchor is invalid HTML)
- Radix `<IconButton>` already provides `cursor: pointer`; the `disabled` prop handles `cursor: default` automatically

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/components/jobs-list.tsx` | Primary file to fix — all inline style leaks and raw HTML patterns |
| `src/app/page.tsx` | Fix avatar skeleton borderRadius and flex: 1 inline style |
| `src/components/unified-jobs-provider.tsx` | Reference: pure Radix patterns to follow |
| `src/app/globals.css` | Do not modify — defines load-bearing CSS classes |

### Technical Decisions

- `Button` must be added to the `@radix-ui/themes` import in `jobs-list.tsx` (currently missing)
- Apply span inside `<Link>` → `<Badge variant="outline" color="gray">` not `<Button>` (button-in-anchor is invalid HTML)
- source_kind meta → `<Badge size="1" variant="surface" color="gray">` (muted, matches surrounding meta style)
- `style={{ textTransform: "lowercase" }}` on status badge stays — it is a semantic style, not a sizing hack
- Error retry → `<Button size="2" variant="soft" mt="3">` (replaces `<button className="yc-cta" style={{ marginTop: 12 }}>`)
- Skeleton avatar in `jobs-list.tsx` line 213: remove `style={{ borderRadius: 4 }}` entirely — parent `.job-row-avatar` CSS class already sets `border-radius: 4px`

---

## Implementation Plan

### Tasks

- [ ] Task 1: Add `Button` to `@radix-ui/themes` import
  - File: `src/components/jobs-list.tsx`
  - Action: Add `Button` to the existing named imports from `@radix-ui/themes` on line 16
  - Notes: `Badge`, `IconButton`, `Skeleton` are already imported — just add `Button`

- [ ] Task 2: Replace error state retry `<button>` with Radix `<Button>`
  - File: `src/components/jobs-list.tsx`
  - Action: Replace lines 173–178:
    ```tsx
    <button
      className="yc-cta"
      onClick={() => refetch()}
      style={{ marginTop: 12 }}
    >
      retry
    </button>
    ```
    With:
    ```tsx
    <Button size="2" variant="soft" mt="3" onClick={() => refetch()}>
      retry
    </Button>
    ```
  - Notes: `mt="3"` = 12px in Radix scale; removes raw HTML `<button>`, inline `marginTop`, and `.yc-cta` class dependency

- [ ] Task 3: Remove `style={{ borderRadius: 4 }}` from skeleton avatar
  - File: `src/components/jobs-list.tsx`
  - Action: On line 213, change:
    ```tsx
    <Skeleton width="100%" height="100%" style={{ borderRadius: 4 }} />
    ```
    To:
    ```tsx
    <Skeleton width="100%" height="100%" />
    ```
  - Notes: Parent `.job-row-avatar` CSS class already has `border-radius: 4px`; inline override is redundant

- [ ] Task 4: Replace `style={{ marginTop: 4 }}` with `mt="1"` on skeleton Skeletons
  - File: `src/components/jobs-list.tsx`
  - Action: On lines 219 and 220, replace `style={{ marginTop: 4 }}` with `mt="1"` Radix prop on both `<Skeleton>` elements
  - Notes: Radix spacing scale — `mt="1"` = 4px

- [ ] Task 5: Remove `fontSize: 10` from status Badge inline style
  - File: `src/components/jobs-list.tsx`
  - Action: On line 262, change:
    ```tsx
    style={{ fontSize: 10, textTransform: "lowercase" }}
    ```
    To:
    ```tsx
    style={{ textTransform: "lowercase" }}
    ```
  - Notes: Badge already has `size="1"` which sets font-size via Radix tokens; `textTransform: "lowercase"` is intentional and stays

- [ ] Task 6: Replace `<span className="job-row-meta-badge">` with Radix `<Badge>`
  - File: `src/components/jobs-list.tsx`
  - Action: Replace lines 303–305:
    ```tsx
    <span className="job-row-meta-badge">
      {job.source_kind}
    </span>
    ```
    With:
    ```tsx
    <Badge size="1" variant="surface" color="gray">
      {job.source_kind}
    </Badge>
    ```
  - Notes: If visual result looks too prominent, try `variant="soft"` instead; `.job-row-meta-badge` CSS class becomes dead code but leave it in globals.css

- [ ] Task 7: Replace `<span className="yc-cta-ghost">` with Radix `<Badge>`
  - File: `src/components/jobs-list.tsx`
  - Action: Replace lines 330–335:
    ```tsx
    <span
      className="yc-cta-ghost"
      style={{ fontSize: 12, padding: "4px 12px" }}
    >
      apply
    </span>
    ```
    With:
    ```tsx
    <Badge size="1" variant="outline" color="gray">
      apply
    </Badge>
    ```
  - Notes: Inside a `<Link>` — must use `<Badge>` not `<Button>` (button-in-anchor is invalid HTML); removes inline `fontSize`/`padding` and `.yc-cta-ghost` class dependency

- [ ] Task 8: Remove redundant `cursor` inline styles from `<IconButton>` elements
  - File: `src/components/jobs-list.tsx`
  - Action: Remove `style={{ cursor: job.status === "reported" ? "default" : "pointer" }}` from the report `<IconButton>` (line 358) and `style={{ cursor: "pointer" }}` from the delete `<IconButton>` (line 370)
  - Notes: Radix `<IconButton>` renders with `cursor: pointer` by default; the `disabled` prop on the report button already sets `cursor: default` via Radix

- [ ] Task 9: Align avatar skeleton `borderRadius` in `page.tsx`
  - File: `src/app/page.tsx`
  - Action: On line 27, change `borderRadius: 6` to `borderRadius: 4`:
    ```tsx
    style={{ borderRadius: 6, flexShrink: 0 }}
    // →
    style={{ borderRadius: 4, flexShrink: 0 }}
    ```
  - Notes: Aligns with `.job-row-avatar { border-radius: 4px }` in CSS and `borderRadius: 4` in jobs-list.tsx skeleton; was the only mismatch between the two skeleton implementations

- [ ] Task 10: Replace `style={{ flex: 1 }}` with `flexGrow="1"` on `<Box>` in `page.tsx`
  - File: `src/app/page.tsx`
  - Action: On line 28, change:
    ```tsx
    <Box style={{ flex: 1 }}>
    ```
    To:
    ```tsx
    <Box flexGrow="1">
    ```
  - Notes: Radix `<Box>` supports `flexGrow` as a first-class prop; removes inline style

### Acceptance Criteria

- [ ] AC 1: Given the error state in `JobsList`, when rendered, then a Radix `<Button>` appears with no inline margin style and no `.yc-cta` className
- [ ] AC 2: Given any job with a status, when the status badge is rendered, then `style` contains only `textTransform: "lowercase"` (no `fontSize`)
- [ ] AC 3: Given a job with `source_kind`, when the meta row is rendered, then a Radix `<Badge>` renders the source — no `<span className="job-row-meta-badge">`
- [ ] AC 4: Given a job with a URL, when the apply affordance is rendered, then a Radix `<Badge>` renders "apply" — no `<span className="yc-cta-ghost">` with inline styles
- [ ] AC 5: Given admin IconButtons (report, delete), when rendered, then neither has a `style` prop with `cursor`
- [ ] AC 6: Given the `PageSkeleton` in `page.tsx` and the skeleton rows in `jobs-list.tsx`, when both render, then the avatar `Skeleton` borderRadius values both equal `4`
- [ ] AC 7: Given the `PageSkeleton` content box, when rendered, then `<Box>` uses `flexGrow="1"` prop with no `style` prop
- [ ] AC 8: Given skeleton rows in `jobs-list.tsx`, when rendered, then `<Skeleton>` spacing uses `mt="1"` prop with no `style={{ marginTop }}` override

---

## Additional Context

### Dependencies

- No new packages — `Button` is already in `@radix-ui/themes`; just needs adding to the import
- No GraphQL schema changes
- No DB migrations
- No environment variable changes

### Testing Strategy

- Visual: Load frontpage in dev (`pnpm dev`), verify job rows render correctly with no visual regression
- Visual: Let initial load skeleton appear, compare avatar shape to loaded state
- Visual: Trigger error state, verify retry button uses Radix Button style
- Code: After changes, run `grep -n 'style={{' src/components/jobs-list.tsx` — should return only functional inline styles (color tokens, `textTransform`, `pointerEvents` on skeleton rows, `opacity` on the SVG icon)
- Build: Run `pnpm build` to confirm no TypeScript errors

### Notes

- `.yc-cta`, `.yc-cta-ghost`, `.job-row-meta-badge` CSS classes in `globals.css` become dead code after Tasks 2, 6, 7 — intentionally left in place (CSS cleanup is out of scope)
- If the `source_kind` Badge (Task 6) looks too visually heavy compared to the surrounding meta items, switch `variant="surface"` to `variant="soft"`
- The `style={{ pointerEvents: "none" }}` on skeleton rows (line 211) is functional — do not remove
- The `style={{ opacity: 0.5 }}` on the location SVG icon (line 292) is intentional — do not remove
- The `style={{ color: "var(--gray-9)" }}` and `style={{ color: "var(--gray-11)" }}` patterns on `<Text>` are consistent across the component — leave them (they represent a deliberate grey scale, not a Radix `color` prop case)
