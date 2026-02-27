# Tasks: Homepage Visual Consistency

## Phase 1: Token and CSS Fixes (no JSX changes)

- [x] 1.1 `src/components/jobs-list.css.ts` line 8 — remove `margin: "0 4px"` from the `jobListCard` style object entirely
- [x] 1.2 `src/components/jobs-list.css.ts` line 16 — change `borderBottom: "1px solid var(--gray-5)"` in `jobRow` to `"1px solid var(--gray-6)"`
- [x] 1.3 `src/components/jobs-list.css.ts` lines 97–105 — delete the entire `jobRowMetaBadge` style block (it becomes dead code after Phase 2)
- [x] 1.4 `src/app/page.tsx` line 24 — in `PageSkeleton`, change `var(--gray-4)` to `var(--gray-6)` in the skeleton card border style
- [x] 1.5 `src/app/page.tsx` line 26 — in `PageSkeleton`, change `var(--gray-3)` to `var(--gray-6)` in the skeleton row divider style

## Phase 2: Component JSX Changes

- [x] 2.1 `src/components/JobsSearchBar.tsx` line 95 — change `radius="none"` to `radius="medium"` on `TextField.Root`
- [x] 2.2 `src/components/JobsSearchBar.tsx` line 105 — change the inline `boxShadow` from `"0 0 0 1px var(--gray-a5) inset"` to `"0 0 0 1px var(--gray-6) inset"`
- [x] 2.3 `src/components/jobs-list.tsx` line 14 — remove `jobRowMetaBadge` from the CSS import on line 14
- [x] 2.4 `src/components/jobs-list.tsx` lines 308–312 — replace the `<span className={jobRowMetaBadge}>{job.source_kind}</span>` with `<Badge size="1" variant="outline" color="gray">{job.source_kind}</Badge>` (the `Badge` import already exists on line 35)
- [x] 2.5 `src/components/unified-jobs-provider.tsx` line 47 — replace the `<Container size="4" py="4">` opening tag with a React fragment `<>` and replace the closing `</Container>` on line 69 with `</>`
- [x] 2.6 `src/components/unified-jobs-provider.tsx` line 5 — remove `Container` from the `@radix-ui/themes` import; add `Separator` to the same import
- [x] 2.7 `src/components/unified-jobs-provider.tsx` — insert `<Separator size="4" mb="4" />` between the heading `<Box mb="5">` block (ends line 55) and the controls `<Box mb="4">` block (starts line 56); remove the redundant `mb="4"` from the controls `Box` since the `Separator` now carries that bottom margin

## Phase 3: Verification

- [ ] 3.1 Run `pnpm build` — confirm zero new TypeScript or ESLint errors introduced by the changes
- [ ] 3.2 Run `pnpm lint` — confirm no lint regressions
- [ ] 3.3 Open `http://localhost:3000` in a browser (signed-in) — verify the search bar corners visually match the job list card corners (both 8 px radius)
- [ ] 3.4 Open `http://localhost:3000` in a browser (signed-in) — verify the job list card left and right edges are flush with the search bar and source filter above it (no 4 px indent)
- [ ] 3.5 Open `http://localhost:3000` in a browser (signed-in) — verify the source kind badge in each job row uses Radix Badge styling, visually matching the `apply` badge in the same row
- [ ] 3.6 Open `http://localhost:3000` in incognito / signed-out — verify no blank gap appears where the UserPreferences strip would be
- [ ] 3.7 Open `http://localhost:3000` in a browser — verify page load transition from skeleton to real content shows no visible border-color jump (skeleton and loaded card both use `--gray-6`)
- [ ] 3.8 Open `http://localhost:3000` in a browser — verify a visible `Separator` line appears between the heading/subtitle block and the search bar / controls block
- [ ] 3.9 Resize to 375 px viewport width — verify job rows still render as single-height lines after the Badge swap (no unexpected line wrapping in the meta row)
- [ ] 3.10 Toggle dark theme (via Radix theme toggle or browser override) — verify border-color and radius are consistent in both light and dark appearance
