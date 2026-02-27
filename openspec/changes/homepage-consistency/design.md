# Design: Homepage Visual Consistency

## Technical Approach

All changes are CSS/layout-only — no data fetching, GraphQL, or resolver changes. The strategy is to consolidate around Radix UI's built-in token system (`--gray-6` for borders, Radix `radius` prop for corners) and remove hand-rolled CSS that duplicates or conflicts with Radix primitives. The dual `Container` nesting is resolved by removing the inner one from `UnifiedJobsProvider` since `page.tsx` already provides the outer `Container size="4"`.

## Architecture Decisions

### Decision: Single border-color token (`--gray-6`)

**Choice**: Use `var(--gray-6)` for all structural borders (card outline, row dividers, search bar, skeleton).
**Alternatives considered**: `--gray-a6` (alpha variant), `--gray-5` (current row divider value).
**Rationale**: The `jobListCard` already uses `--gray-6` for its border. Row dividers currently use `--gray-5` (lighter) and the search bar uses `--gray-a5` (alpha, lighter still). Unifying on `--gray-6` gives the strongest visual boundary that already exists in the system. Alpha variants behave differently on light vs dark themes, making `--gray-6` the safer pick.

### Decision: `radius="large"` on TextField.Root

**Choice**: Set `radius="large"` on `JobsSearchBar`'s `TextField.Root` and change `jobListCard` border-radius from `8` to `var(--radius-4)` (which evaluates to `12px` at `radius="large"` theme setting, or `8px` at `"medium"`).
**Alternatives considered**: `radius="medium"` (6px — too subtle), hardcoded `borderRadius: 12` (breaks theme override).
**Rationale**: Radix Themes radius tokens should drive corner rounding so the search bar and card track theme changes. `"large"` (`--radius-4` = 12px default) gives a visible but not bubbly rounding. However, since the project doesn't set a global theme radius override, we keep the card at `borderRadius: 8` for now (which matches `--radius-3` / `"medium"`) and set the search bar to `radius="medium"` instead — this aligns the two at 8px without introducing a new larger radius that nothing else uses.

**Revised choice**: Use `radius="medium"` on `TextField.Root`. This evaluates to the same `8px` as the card's `borderRadius: 8`, keeping them visually identical.

### Decision: Replace `jobRowMetaBadge` with Radix `Badge`

**Choice**: Replace the custom `<span className={jobRowMetaBadge}>` with `<Badge size="1" variant="outline" color="gray">`.
**Alternatives considered**: Keep custom style but update its border-radius to match Radix Badge.
**Rationale**: The `apply` badge in `jobRowActions` already uses `<Badge variant="outline" color="gray" size="1">`. Using the same component for the source kind indicator ensures they share identical padding, border-radius, font-size, and border color — all governed by Radix.

### Decision: Remove inner Container from UnifiedJobsProvider

**Choice**: Remove `<Container size="4" py="4">` from `UnifiedJobsProvider`; keep the outer one in `page.tsx`.
**Alternatives considered**: Remove the outer one in `page.tsx` instead.
**Rationale**: `page.tsx` wraps both `AdminBar` and `UnifiedJobsProvider` in a single `Container`. The inner `Container` in `UnifiedJobsProvider` creates double max-width clamping and adds extra `py="4"` padding on top of whatever the outer container provides. The outer container in `page.tsx` is the authoritative layout boundary and also wraps the admin bar, so it must stay.

### Decision: Move `mb="4"` wrapper inside UserPreferences

**Choice**: The `<Box mb="4">` that wraps `<UserPreferences />` in `UnifiedJobsProvider` is removed; instead `UserPreferences` already has its own `<Box mb="4">` as its root element (line 130). Since `UserPreferences` returns `null` when `!userId`, no layout space is consumed for signed-out users.
**Alternatives considered**: Wrapping with a conditional `{userId && <Box mb="4"><UserPreferences /></Box>}` in the parent.
**Rationale**: `UserPreferences` already handles the auth check internally and already wraps itself in `<Box mb="4">`. The parent (`UnifiedJobsProvider`) currently does NOT wrap `UserPreferences` in an additional `<Box mb="4">` — inspecting the code, `UserPreferences` sits inside a `<Box mb="4">` alongside `SearchQueryBar` and `SourceFilter`. So the actual fix is that when `UserPreferences` returns `null`, the spacing before the search bar should not change. Currently the component handles this correctly since its own `<Box mb="4">` disappears with the `null` return. **No change needed** — the proposal's concern is already handled by the existing code structure.

## Data Flow

No data flow changes. All modifications are render-only.

```
page.tsx
  └─ Container size="4"            ← authoritative layout boundary
       ├─ AdminBar                  ← admin only
       └─ UnifiedJobsProvider       ← NO inner Container (removed)
            ├─ Box mb="5"           ← heading block
            ├─ Separator            ← NEW: visual boundary
            ├─ Box mb="4"           ← controls block
            │    ├─ UserPreferences ← self-contained, returns null if signed out
            │    ├─ SearchQueryBar
            │    │    └─ JobsSearchBar (TextField radius="medium")
            │    └─ SourceFilter chips
            └─ Box mt="4"
                 └─ JobsList
                      └─ div.jobListCard (borderRadius: 8, border: --gray-6)
                           └─ rows (borderBottom: --gray-6)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/unified-jobs-provider.tsx` | Modify | Remove `<Container size="4" py="4">` wrapper; add `<Separator>` between heading and controls blocks; remove `Container` import if unused |
| `src/components/JobsSearchBar.tsx` | Modify | Change `radius="none"` to `radius="medium"`; remove inline `style={{ boxShadow: "0 0 0 1px var(--gray-a5) inset" }}` (Radix `variant="surface"` already provides a border; if a visible border is needed, replace with `style={{ boxShadow: "0 0 0 1px var(--gray-6) inset" }}`) |
| `src/components/jobs-list.css.ts` | Modify | Remove `margin: "0 4px"` from `jobListCard`; change `borderBottom` in `jobRow` from `var(--gray-5)` to `var(--gray-6)` |
| `src/components/jobs-list.tsx` | Modify | Replace `<span className={jobRowMetaBadge}>{job.source_kind}</span>` with `<Badge size="1" variant="outline" color="gray">{job.source_kind}</Badge>`; remove `jobRowMetaBadge` import |
| `src/app/page.tsx` | Modify | In `PageSkeleton`, change skeleton card border from `var(--gray-4)` to `var(--gray-6)`; change skeleton row divider from `var(--gray-3)` to `var(--gray-6)` |
| `src/components/jobs-list.css.ts` | Modify | Remove `jobRowMetaBadge` style (dead code after replacement) |

## Interfaces / Contracts

No new interfaces. No prop changes. All modifications are internal to existing components.

## Detailed Changes

### 1. `src/components/unified-jobs-provider.tsx`

**Before:**
```tsx
return (
  <Container size="4" py="4">
    <Box mb="5">
      ...heading...
    </Box>
    <Box mb="4">
      ...controls...
    </Box>
    <Box mt="4">
      <JobsList ... />
    </Box>
  </Container>
);
```

**After:**
```tsx
return (
  <>
    <Box mb="5">
      ...heading...
    </Box>
    <Separator size="4" mb="4" />
    <Box mb="4">
      ...controls...
    </Box>
    <Box mt="4">
      <JobsList ... />
    </Box>
  </>
);
```

Import change: remove `Container` from the Radix import (already unused elsewhere in this file), add `Separator`.

### 2. `src/components/JobsSearchBar.tsx`

**Before (line 95):**
```tsx
radius="none"
```
**After:**
```tsx
radius="medium"
```

**Before (line 105):**
```tsx
style={{ boxShadow: "0 0 0 1px var(--gray-a5) inset" }}
```
**After:**
```tsx
style={{ boxShadow: "0 0 0 1px var(--gray-6) inset" }}
```

### 3. `src/components/jobs-list.css.ts`

**`jobListCard` before:**
```ts
margin: "0 4px",
```
**After:** line removed entirely.

**`jobRow` before:**
```ts
borderBottom: "1px solid var(--gray-5)",
```
**After:**
```ts
borderBottom: "1px solid var(--gray-6)",
```

**`jobRowMetaBadge`:** entire style block deleted (no longer used).

### 4. `src/components/jobs-list.tsx`

**Before (line 309):**
```tsx
<span className={jobRowMetaBadge}>
  {job.source_kind}
</span>
```
**After:**
```tsx
<Badge size="1" variant="outline" color="gray">
  {job.source_kind}
</Badge>
```

Remove `jobRowMetaBadge` from the CSS import on line 16.

### 5. `src/app/page.tsx`

**Before (line 24):**
```tsx
<Box style={{ border: "1px solid var(--gray-4)", borderRadius: 8, overflow: "hidden" }}>
```
**After:**
```tsx
<Box style={{ border: "1px solid var(--gray-6)", borderRadius: 8, overflow: "hidden" }}>
```

**Before (line 26):**
```tsx
style={{ borderBottom: i < 7 ? "1px solid var(--gray-3)" : undefined }}
```
**After:**
```tsx
style={{ borderBottom: i < 7 ? "1px solid var(--gray-6)" : undefined }}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Build | No TS/ESLint regressions | `pnpm build` and `pnpm lint` |
| Visual | Border alignment, radius consistency, skeleton-to-real transition | Manual browser check in both light and dark themes |
| Layout | Signed-out user sees no blank preference gap | Open homepage in incognito |
| Responsiveness | Job rows still fit on mobile after Badge swap | Check at 375px viewport width |

No unit or e2e tests exist for these components; adding them is out of scope for this change.

## Migration / Rollout

No migration required. All changes are frontend CSS/layout. Deploy via standard `pnpm deploy`.

## Open Questions

- None. All decisions are straightforward token/component swaps with clear rationale.
