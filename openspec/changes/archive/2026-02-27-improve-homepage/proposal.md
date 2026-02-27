# Proposal: improve-homepage

## Intent

Improve the homepage UI to be fully consistent with Radix UI Themes patterns, eliminate mixed styling systems, and ensure semantic correctness of interactive elements.

## Problem

The homepage component tree mixes multiple styling systems:
- Radix UI spacing props (`mb`, `mt`, `py`) alongside raw `style={{ marginTop: ... }}`
- Global CSS classes (`yc-cta`, `yc-cta-ghost`, `yc-row-meta`) alongside Radix components
- Non-interactive Radix components (Badge) used as interactive elements with manual ARIA overrides
- Inline `style={{ color: "var(--gray-N)" }}` on Text instead of `color` prop

## Scope

**In scope:**
- `src/app/page.tsx` — PageSkeleton
- `src/components/jobs-list.tsx` — job row list, error/empty/footer states
- `src/components/SourceFilter.tsx` — filter chip badges, label text
- `src/components/admin-bar.tsx` — admin strip
- `src/components/user-preferences.tsx` — secondary text

**Out of scope:**
- `src/components/companies-list.tsx` (separate page)
- `src/components/auth-header.tsx` (layout shell, separate concern)
- Job row vanilla-extract CSS classes (intentional design system layer)

## Approach

1. Replace `style={{ marginTop/marginBottom: N }}` with Radix `mt`/`mb` props
2. Replace `style={{ color: "var(--gray-N)" }}` with Radix `color` prop on Text
3. Replace `<button className="yc-cta">` with `<Button>` from Radix
4. Replace `<span className="yc-cta-ghost">` with `<Badge variant="outline">`
5. Replace `<span className="yc-row-meta">` with `<Text size="1" color="gray">`
6. Use Badge `size` prop instead of inline padding overrides

## Rollback Plan

All changes are visual/structural only — no logic changes. Git revert of the affected files is sufficient.

## Affected Modules

- `src/app/page.tsx`
- `src/components/jobs-list.tsx`
- `src/components/SourceFilter.tsx`
- `src/components/admin-bar.tsx`
- `src/components/user-preferences.tsx`
