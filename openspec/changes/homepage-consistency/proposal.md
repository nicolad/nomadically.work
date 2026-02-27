# Proposal: Homepage Visual Consistency

## Intent

The homepage has grown organically across several refactors and now shows a number of visual inconsistencies that erode the overall look and feel. Specific issues:

1. **Dual layout system clash.** `UnifiedJobsProvider` renders its own `<Container size="4" py="4">` inside `page.tsx`, which already wraps everything in `<Container size="4">`. This creates a nested container that is not just redundant but shifts spacing in ways not governed by the design system.

2. **Search bar has no radius.** `JobsSearchBar` uses `radius="none"` on `TextField.Root`, giving it sharp corners that are inconsistent with every other interactive element on the page (badges, buttons, the job list card which uses `borderRadius: 8`).

3. **Job list card has a hard-coded left/right margin of 4 px.** `jobListCard` sets `margin: "0 4px"`. This pixel nudge is outside the Radix spacing scale and causes the card to appear slightly indented relative to the search bar and source filter above it — a subtle but noticeable misalignment.

4. **Mixed border-color tokens on the job list.** The card border uses `--gray-6`, rows use `--gray-5` for dividers, and the search bar injects `--gray-a5` via an inline style. Three different gray stops with no documented intent.

5. **Source filter chips vs job row badges are visually inconsistent.** The `SourceFilter` chips are Radix `Badge` at size `2`. The job row source kind indicator (`jobRowMetaBadge`) is a custom vanilla-extract style with a 3 px border-radius, 1 px border, and `--gray-6` border color — styled completely differently from the Radix badge system used everywhere else.

6. **Admin bar uses a custom `Card`/`Badge` from `src/components/ui/`** while the rest of the homepage consumes Radix primitives directly. The `ui/Badge` wrapper always forces `variant="outline"`, whereas the `AdminBar` admin label visually needs to stand out more (currently just an orange outline badge).

7. **Typography scale inconsistency in the preferences panel.** Section labels inside the `UserPreferences` dialog use `size="2" weight="bold"` while the main heading uses `size="5" weight="bold"` and helper text uses `size="1"`. The size jump from `1` to `5` skips intermediary scale steps that would create visual rhythm.

8. **Page heading has no visual separation from the search area.** `mb="5"` on the heading block and `mb="4"` on the controls block blur the boundary between the identity section (heading + subtitle) and the interaction section (search + filters).

9. **`PageSkeleton` in `page.tsx` uses raw inline `border`/`borderRadius` styles** (`border: "1px solid var(--gray-4)"`, `borderRadius: 8`) rather than matching the actual `jobListCard` token values (`--gray-6`, `border-radius: 8`). The skeleton renders with a lighter border than the real list, causing a visible jump on hydration.

10. **`UserPreferences` bottom margin (`mb="4"`) is always applied**, even when the user is not logged in (component returns `null` but the `Box` wrapping it in `UnifiedJobsProvider` still occupies `mb="4"` height).

## Scope

### In Scope

- Remove the redundant inner `Container` from `UnifiedJobsProvider` (de-nest layout)
- Apply consistent `radius="medium"` (or `"large"`) to `JobsSearchBar` `TextField.Root` and align it with the job list card border-radius
- Remove the `margin: "0 4px"` hack from `jobListCard` and use proper Radix spacing on the wrapping `Box` instead
- Unify border-color tokens on the job list to a single semantic step (`--gray-6` everywhere, or `--gray-a6`)
- Replace `jobRowMetaBadge` custom CSS with a Radix `Badge` component at size `1` / variant `"outline"` / color `"gray"` to match the existing `apply` badge in `jobRowActions`
- Synchronise `PageSkeleton` border/radius values with the `jobListCard` token values (`var(--gray-6)`)
- Add a visual separator (e.g. `<Separator />`) or increase margin between the heading block and the controls block to create clearer section boundaries
- Conditionally render the `UserPreferences` wrapping `Box` only when the user is signed in

### Out of Scope

- Redesigning the overall page layout or navigation
- Changing the color palette or switching Radix theme accent color
- Adding new UI features (saved searches, notifications, etc.)
- Changing the `AdminBar` component's role or functionality
- Mobile-specific layout restructuring beyond what is fixed by the above

## Approach

All changes are purely styling/structure — no GraphQL schema, resolver, or data-fetching logic is touched.

1. **Layout fix** — remove `<Container>` from `UnifiedJobsProvider`; the outer `<Container size="4">` in `page.tsx` is authoritative.
2. **Token consolidation** — audit every hardcoded color reference in `jobs-list.css.ts`, `page.tsx` (skeleton), and `JobsSearchBar.tsx`; replace with a single consistent step.
3. **Component unification** — replace `jobRowMetaBadge` custom style with inline `<Badge>` usage from Radix, consistent with the existing `apply` badge.
4. **Radius unification** — set `radius="large"` on the `TextField.Root` and confirm that the `jobListCard` `borderRadius` matches the same visual token.
5. **Conditional rendering** — move the `<UserPreferences />` `<Box mb="4">` wrapper inside the component itself so the margin disappears when the user is signed out.
6. **Skeleton fix** — use `var(--gray-6)` in `PageSkeleton` to match the real list border.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/unified-jobs-provider.tsx` | Modified | Remove inner Container; add conditional Box for preferences; add Separator between heading and controls |
| `src/components/JobsSearchBar.tsx` | Modified | Change `radius="none"` to `radius="large"` on TextField.Root |
| `src/components/jobs-list.css.ts` | Modified | Remove `margin: "0 4px"` from `jobListCard`; unify border tokens |
| `src/components/jobs-list.tsx` | Modified | Replace `jobRowMetaBadge` `<span>` with Radix `<Badge size="1" variant="outline" color="gray">` |
| `src/app/page.tsx` | Modified | Fix skeleton border token from `--gray-4` to `--gray-6`; align borderRadius |
| `src/components/user-preferences.tsx` | Modified | Move outer `Box mb="4"` inside component, conditional on auth |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Removing `margin: "0 4px"` shifts the list slightly wider and breaks pixel-level snapshots | Low | No visual regression tests exist; do a manual before/after check |
| Radius change on search bar looks inconsistent with Radix default theme radius setting | Low | Use the theme's `radius` prop token rather than a hardcoded value; check against both light and dark appearance |
| Replacing `jobRowMetaBadge` with Radix Badge changes line-height and may affect row height | Low | Radix Badge size `1` is compact; verify in browser that rows remain single-height |
| Conditional rendering of UserPreferences Box changes layout for signed-out users | Low | Signed-out users currently see the Box anyway; removing it only helps |

## Rollback Plan

All changes are isolated to 6 files, none touching data or API layers. Git revert of the change set restores the previous state immediately. No migrations, no worker deploys, no schema changes required.

```bash
git revert <commit-sha>
```

## Dependencies

- None. All changes are within the Next.js frontend. No new packages required.

## Success Criteria

- [ ] The search bar, job list card, and source filter chips share visually matching border-radius
- [ ] A single gray token step is used for all borders in the job list (card border, row dividers, search bar border)
- [ ] No extra horizontal margin on the job list card relative to the search bar
- [ ] The `PageSkeleton` border color matches the loaded job list border color (no visual jump on hydration)
- [ ] Signed-out users see no blank space where the preferences panel would be
- [ ] The source kind indicator in job rows uses a Radix Badge component, matching the `apply` badge style
- [ ] `pnpm build` completes without new TypeScript or ESLint errors
