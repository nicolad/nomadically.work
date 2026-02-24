---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
workflowType: 'ux-design'
project_name: 'nomadically.work'
date: '2026-02-24'
feature: 'source-filter'
team:
  lead: 'ux-lead'
  researcher: 'ux-researcher'
  designer: 'ui-designer'
---

# UX Design Specification — Job Source / Board Filter

**Feature:** Source/Board filter for the job listing page
**Author:** UX Team (ux-lead, ux-researcher, ui-designer)
**Date:** 2026-02-24
**Status:** Ready for implementation

---

## Table of Contents

1. User Problem Definition
2. User Personas
3. User Journey Analysis
4. Information Architecture
5. Design Principles
6. Content Strategy
7. Component Design Decision
8. Component Patterns (Radix UI)
9. Interaction Patterns
10. Filter States
11. Responsive Behavior
12. Accessibility Requirements
13. GraphQL Integration
14. Implementation Checklist

---

## 1. User Problem Definition

### Core Problem

Job seekers on nomadically.work see a mixed feed of jobs from multiple sources — ATS platforms (Greenhouse, Ashby, Lever, Workable) and aggregator boards (Remotive, Arbeitnow). Each source has a distinct quality profile:

- **Greenhouse, Ashby, Lever** — direct-from-company ATS boards; high quality, structured data, often enhanced with salary, departments, and Ashby compensation tiers.
- **Remotive** — curated remote-only jobs aggregator; users trust the "remote" classification but quality varies.
- **Arbeitnow** — EU-focused job board; strong EU signal but less structured data.
- **Workable** — generic ATS; quality varies by company.

Without source filtering, job seekers cannot distinguish between a Greenhouse posting (trusted, full application flow) and a Remotive listing (aggregated, may point to a third-party form). Power users want to isolate one source at a time to calibrate their expectations before applying.

### Problem Statement

> As an EU-based remote job seeker, I want to filter jobs by their source or board origin so that I can focus on listings from sources I trust, avoid duplicate postings that appear across multiple aggregators, and tailor my application experience to the ATS platform I'm most comfortable with.

### Pain Points Identified

1. **Duplicates**: A single role may appear as both a Greenhouse listing and a Remotive listing. No visual differentiation exists on the list page beyond the small `source_kind` badge.
2. **Trust calibration**: Experienced job seekers know that Greenhouse/Ashby jobs have structured application forms, while Remotive jobs may redirect to external sites. They cannot filter to just those.
3. **Signal noise**: Arbeitnow and Remotive contain roles with vague "remote" labels that have not yet passed the AI `is_remote_eu` classification. Power users want to look only at classified ATS sources.
4. **No clear path to multi-source awareness**: The current `source_kind` badge is rendered at the job-row level (line 3 metadata in `jobs-list.tsx`). There is no aggregate view of "which sources exist in my current result set."

---

## 2. User Personas

### Persona A — "The Systematic Applicant" (primary)

- **Name:** Maria, 31, Warsaw, Poland
- **Role:** Senior Backend Engineer
- **Behavior:** Applies via ATS forms on Greenhouse and Ashby because she can track her applications precisely. Dislikes aggregator redirects. Checks the job board daily.
- **Goal with filter:** Select only `greenhouse` and `ashby` so every listing she sees has a native structured application form.
- **Device:** Desktop 80%, mobile 20% (commute browsing).

### Persona B — "The Broad Researcher" (primary)

- **Name:** Jonas, 27, Berlin, Germany
- **Role:** Product Designer
- **Behavior:** Scans widely. Prefers Remotive because it curates truly remote roles. Does not care about ATS structure — applies via email or external links.
- **Goal with filter:** Select `remotive` only to see the curated list without Greenhouse noise.
- **Device:** Mobile-first (50/50 split).

### Persona C — "The EU-Focused Opportunist" (secondary)

- **Name:** Ines, 34, Lisbon, Portugal
- **Role:** Data Analyst
- **Behavior:** Prioritizes EU-authorized roles. Trusts Arbeitnow because it explicitly lists EU-required jobs. Wants to combine the Arbeitnow filter with the existing "remote EU only" badge.
- **Goal with filter:** Select `arbeitnow` combined with the `remote EU only` toggle.
- **Device:** Desktop primary.

---

## 3. User Journey Analysis

### Current Journey (without source filter)

1. User opens `nomadically.work/`.
2. User sees a mixed feed of jobs from all sources.
3. User optionally types a search query in `SearchQueryBar`.
4. User optionally toggles "remote EU only" badge.
5. User scans list — `source_kind` badge visible at row level (small, gray, line 3 metadata).
6. User opens individual jobs to check source.
7. **Drop-off point**: User abandons because they see Remotive duplicates they have already reviewed on Remotive.com directly.

### Target Journey (with source filter)

1. User opens `nomadically.work/`.
2. User sees filter bar below search: existing "remote EU only" badge + new source chip filters.
3. User clicks "Greenhouse" and "Ashby" chips (or selects from dropdown on mobile).
4. Feed instantly updates — URL reflects `?source=greenhouse,ashby` (multi-select) or `?source=greenhouse` (single).
5. User sees a clean feed of direct-company ATS jobs. `source_kind` badge confirms source on each row.
6. User applies directly. Return visit: URL params persist filter state automatically.

### Critical Decision Points

- The filter must be **additive** with `remote_eu` and `search` query params — all three can be active simultaneously.
- Source names must match exactly the `source_kind` values stored in the DB (`greenhouse`, `ashby`, `lever`, `remotive`, `arbeitnow`, `workable`). These are the exact string values stored in `jobs.source_kind` and indexed in `idx_jobs_source_kind`.
- The GraphQL query already supports `sourceType: String` argument (single value). To support multi-source, either: (a) extend the GraphQL schema to accept `sourceTypes: [String!]`, or (b) implement multi-source as client-side OR filtering via multiple queries. **Recommendation: extend schema to `sourceTypes: [String!]`** — this is cleaner and avoids waterfall queries.

---

## 4. Information Architecture

### Placement

The source filter lives in `UnifiedJobsProvider` (`src/components/unified-jobs-provider.tsx`), in the filter row that currently holds only the "remote EU only" badge.

**Current filter row structure:**
```
[ SearchQueryBar                              ]
[ remote EU only badge ]
```

**Target filter row structure:**
```
[ SearchQueryBar                              ]
[ remote EU only ]  [ Sources ▾ dropdown/chips ]
```

On desktop (viewport >= 768px), sources are rendered as **chip toggles** (Radix `Badge` components in interactive mode) displayed inline after the "remote EU only" badge. On mobile (< 768px), sources collapse into a **single dropdown select** (Radix `Select` component) to conserve horizontal space.

### Hierarchy

```
Filter bar
├── Text filter       → q param (existing)
├── Remote EU toggle  → remote_eu param (existing)
└── Source filter     → source param (new)
    ├── All Sources   (default, clears source param)
    ├── Greenhouse
    ├── Ashby
    ├── Lever
    ├── Remotive
    ├── Arbeitnow
    └── Workable
```

### URL State Design

The source filter writes to the URL query string for bookmarkability and shareability:

| Selection | URL param | Behavior |
|---|---|---|
| No filter (default) | (no `source` param) | All sources shown |
| Single source | `?source=greenhouse` | Only that source |
| Multiple sources | `?source=greenhouse,ashby` | Comma-separated, OR logic |
| Combined with remote EU | `?source=remotive&remote_eu=1` | Both filters applied |

Comma-separated multi-value in a single param is simpler than repeating `source[]=` and consistent with how the existing `skills` filter operates at the GraphQL level.

---

## 5. Design Principles

1. **Progressive disclosure** — show the most common action (single source chip click) immediately. Advanced multi-select is a natural extension of the same interaction, not a separate UI.
2. **Filter state is always visible** — selected sources must be visually distinct (solid/filled variant) from unselected ones (outline variant). This mirrors the existing "remote EU only" badge pattern in `UnifiedJobsProvider`.
3. **Zero-latency feedback** — filter chips update the URL immediately on click; the list re-renders via Apollo `cache-and-network`. Do not block interaction waiting for the network.
4. **Non-destructive defaults** — selecting a source filter never clears search or remote EU state. All filter dimensions are orthogonal.
5. **Familiar patterns first** — re-use the Radix `Badge` interactive pattern already established for "remote EU only" before introducing new component types.

---

## 6. Content Strategy

### Source Display Names

The DB stores lowercase `source_kind` values. The UI presents human-readable names:

| `source_kind` value | Display label | Badge color |
|---|---|---|
| `greenhouse` | Greenhouse | `blue` |
| `ashby` | Ashby | `violet` |
| `lever` | Lever | `cyan` |
| `remotive` | Remotive | `orange` |
| `arbeitnow` | Arbeitnow | `grass` |
| `workable` | Workable | `teal` |

Colors are chosen for distinctiveness, not to imply quality ranking. All are Radix color tokens.

### Microcopy

| Context | Text |
|---|---|
| Filter label (desktop above chips) | `sources` (lowercase, matching the app's existing tone) |
| Dropdown placeholder (mobile) | `all sources` |
| Dropdown option — all | `all sources` |
| Active filter badge tooltip | `click to remove` |
| Loading state (while query fetches) | Spinner replaces count badge — existing pattern from `jobs-list.tsx` |
| Empty state (no jobs for selected source) | `no jobs from {source} right now` |
| Clear all chips button (when 2+ selected) | `clear` (ghost link, `Cross2Icon`) |

### Tone

Match existing app microcopy: lowercase, terse, technical. No marketing language. Labels must be recognizable to engineers and tech job seekers who know what Greenhouse and Lever are.

---

## 7. Component Design Decision

### Option A — Chip toggles (recommended for desktop)

Render each source as a clickable `Badge` component. Active state: `variant="solid"`. Inactive: `variant="outline"`. Clicking toggles membership in the selected-sources set.

**Pros:**
- Zero new component types — reuses the existing `Badge` interactive pattern from `remote EU only`.
- Scannable at a glance — all 6 sources visible simultaneously on a 1280px desktop.
- Multi-select is natural: click multiple chips.

**Cons:**
- At 6 sources + possible future additions, the chip row can overflow at smaller desktop widths.
- On mobile (375px), 6 chips wrap awkwardly.

**Mitigation:** On mobile (< 768px breakpoint), render a `Select` dropdown instead (Option B).

### Option B — Dropdown Select (mobile / fallback)

A Radix `Select` component. Single-select only (selects one source at a time). Label: "all sources" when unfiltered.

**Pros:** Compact. No overflow. Accessible via native mobile select interaction model.

**Cons:** No multi-select without a custom `DropdownMenu` with `Checkbox` items.

### Option C — DropdownMenu with CheckboxItems (alternative advanced path)

A single "Sources" trigger button opens a `DropdownMenu` with `DropdownMenu.CheckboxItem` for each source. Supports multi-select on both mobile and desktop.

**Pros:** Consistent across breakpoints. True multi-select everywhere.

**Cons:** Adds complexity. A trigger button does not communicate current filter state as clearly as chips do.

### Decision

**Desktop (>= 768px):** Option A — chip toggles inline in the filter row.
**Mobile (< 768px):** Option C (simplified) — a `DropdownMenu` with `CheckboxItem` per source, triggered by a "Sources" `Button` with a `ChevronDownIcon`. This gives mobile users multi-select without chips.

The mobile `DropdownMenu` approach is preferred over `Select` because `Select` is single-value only and the GraphQL schema extension will support multi-source selection.

---

## 8. Component Patterns (Radix UI)

### 8.1 Desktop Chip Filter

```tsx
// SourceFilter.tsx — desktop chip variant
import { Badge, Flex, Text } from "@radix-ui/themes";

const SOURCE_OPTIONS = [
  { value: "greenhouse", label: "Greenhouse", color: "blue" },
  { value: "ashby",      label: "Ashby",      color: "violet" },
  { value: "lever",      label: "Lever",      color: "cyan" },
  { value: "remotive",   label: "Remotive",   color: "orange" },
  { value: "arbeitnow",  label: "Arbeitnow",  color: "grass" },
  { value: "workable",   label: "Workable",   color: "teal" },
] as const;

type SourceFilterProps = {
  selected: string[];                         // current active source_kind values
  onChange: (selected: string[]) => void;
};

export function SourceFilterChips({ selected, onChange }: SourceFilterProps) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <Flex align="center" gap="2" wrap="wrap">
      <Text size="1" style={{ color: "var(--gray-9)" }}>sources</Text>
      {SOURCE_OPTIONS.map(({ value, label, color }) => (
        <Badge
          key={value}
          variant={selected.includes(value) ? "solid" : "outline"}
          color={color}
          style={{ cursor: "pointer", userSelect: "none" }}
          onClick={() => toggle(value)}
          role="checkbox"
          aria-checked={selected.includes(value)}
          aria-label={`Filter by ${label}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle(value);
            }
          }}
        >
          {label}
        </Badge>
      ))}
      {selected.length > 1 && (
        <Badge
          variant="ghost"
          color="gray"
          style={{ cursor: "pointer" }}
          onClick={() => onChange([])}
          aria-label="Clear all source filters"
        >
          clear
        </Badge>
      )}
    </Flex>
  );
}
```

### 8.2 Mobile DropdownMenu Filter

```tsx
// SourceFilterDropdown.tsx — mobile variant
import {
  Button, DropdownMenu, Flex, Text
} from "@radix-ui/themes";
import { ChevronDownIcon } from "@radix-ui/react-icons";

export function SourceFilterDropdown({ selected, onChange }: SourceFilterProps) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const label = selected.length === 0
    ? "all sources"
    : selected.length === 1
      ? SOURCE_OPTIONS.find((o) => o.value === selected[0])?.label ?? selected[0]
      : `${selected.length} sources`;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant="outline" size="1" aria-label="Filter by source">
          {label}
          <ChevronDownIcon />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>Job sources</DropdownMenu.Label>
        <DropdownMenu.Separator />
        {SOURCE_OPTIONS.map(({ value, label }) => (
          <DropdownMenu.CheckboxItem
            key={value}
            checked={selected.includes(value)}
            onCheckedChange={() => toggle(value)}
          >
            {label}
          </DropdownMenu.CheckboxItem>
        ))}
        {selected.length > 0 && (
          <>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              color="gray"
              onClick={() => onChange([])}
            >
              Clear filters
            </DropdownMenu.Item>
          </>
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
```

### 8.3 Responsive Wrapper

```tsx
// SourceFilter.tsx — responsive wrapper
"use client";

import { useMediaQuery } from "@/lib/use-media-query";  // to be created if not present

export function SourceFilter({ selected, onChange }: SourceFilterProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  return isDesktop
    ? <SourceFilterChips selected={selected} onChange={onChange} />
    : <SourceFilterDropdown selected={selected} onChange={onChange} />;
}
```

**Note:** If `useMediaQuery` does not exist in `src/lib/`, implement it as a small custom hook using `window.matchMedia`. Radix UI Themes does not ship a breakpoint hook. Alternatively, use CSS `display: none` with media queries to toggle between both rendered variants without JS for the responsive split — this avoids hydration mismatch risks in Next.js 16 App Router.

---

## 9. Interaction Patterns

### 9.1 Selection Behavior

- **Default state:** No source chips selected. All sources shown. URL has no `source` param.
- **Single chip click (inactive → active):** Chip goes solid. URL updates: `?source=greenhouse`. List re-fetches with `sourceType: "greenhouse"`.
- **Second chip click (different chip):** Both chips go solid. URL updates: `?source=greenhouse,ashby`. List re-fetches with `sourceTypes: ["greenhouse", "ashby"]` (requires schema extension — see Section 13).
- **Active chip click (active → inactive):** Chip returns to outline. URL removes that source from the comma list. If last selected, `source` param removed.
- **Clear all:** Immediately clears all selected chips. URL removes `source` param entirely.

### 9.2 Combined Filter Behavior

The source filter is purely additive:
- `remote_eu=1` AND `source=greenhouse` = only classified Remote EU jobs from Greenhouse.
- `q=react&source=remotive` = only Remotive jobs matching "react".
- All three active simultaneously is valid.

### 9.3 Loading State During Filter Change

When the user clicks a chip and the query is in flight:
- The selected chip immediately renders as `solid` (optimistic UI).
- The job list enters loading state: existing rows are dimmed (opacity 0.5 with `pointer-events: none`) rather than replaced by skeletons. This avoids jarring layout shifts for quick network responses.
- If the query takes > 300ms, the existing `Spinner` pattern from `jobs-list.tsx` appears in the count area.

### 9.4 URL Sync with Router

Implement in `UnifiedJobsProvider` mirroring the `handleRemoteEuToggle` pattern:

```tsx
const sourcesFilter = (searchParams.get("source") ?? "").split(",").filter(Boolean);

const handleSourcesChange = useCallback(
  (sources: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sources.length > 0) {
      params.set("source", sources.join(","));
    } else {
      params.delete("source");
    }
    params.delete("offset");
    router.push(`?${params.toString()}`, { scroll: false });
  },
  [router, searchParams],
);
```

### 9.5 Scroll Behavior

Filter changes reset the `offset` param (as shown above) and scroll position is not forced — `{ scroll: false }` is already used in the codebase, keeping the user's viewport stable when switching filters.

---

## 10. Filter States

### Empty State — No Jobs for Selected Source(s)

Render within the `jobs-list.tsx` empty state branch:

```
┌─────────────────────────────────────────┐
│                                         │
│   no jobs from Remotive right now       │
│                                         │
│   [clear source filter]                 │
│                                         │
└─────────────────────────────────────────┘
```

The "clear source filter" link calls `handleSourcesChange([])`. Text is lowercase, matching existing "no jobs found" microcopy tone.

### Active Filter State (1 source selected)

```
sources  [Greenhouse ×]  [Ashby]  [Lever]  ...
```

The active chip shows with `variant="solid"` and the source color. Clicking it deselects.

### Active Filter State (2+ sources selected)

```
sources  [Greenhouse ×]  [Ashby ×]  [Lever]  ...   [clear]
```

A `clear` ghost badge appears to the right when 2 or more chips are active.

### Loading State

Chips are not disabled during loading — clicking a second chip while the first query is in flight cancels the in-flight query (Apollo's `fetchPolicy: "cache-and-network"` handles this correctly). The list dimming indicates the result is stale.

### Error State

If the GraphQL query fails with a source filter active, the existing error display in `jobs-list.tsx` is shown unchanged. No special source-filter error handling is needed — the retry button re-triggers with the same filter state from URL params.

---

## 11. Responsive Behavior

### Breakpoints

| Breakpoint | Width | Source filter component |
|---|---|---|
| Mobile | < 768px | `SourceFilterDropdown` (DropdownMenu) |
| Desktop | >= 768px | `SourceFilterChips` (inline Badge chips) |

Radix UI Themes does not define these breakpoints in JS — use a `useMediaQuery("(min-width: 768px)")` hook or CSS-only approach.

### Desktop Layout (>= 768px)

```
┌─────────────────────────────────────────────────────────────────────┐
│  [🔍 Search jobs…                                        ✕  🔍 ]   │
│  [remote EU only]  sources  [Greenhouse] [Ashby] [Lever]            │
│                              [Remotive]  [Arbeitnow] [Workable]     │
└─────────────────────────────────────────────────────────────────────┘
```

If all 6 chips overflow a single line (narrow desktop), they wrap naturally. The `Flex wrap="wrap"` already handles this.

### Mobile Layout (< 768px)

```
┌──────────────────────────────────────┐
│  [🔍 Search jobs…            ✕  🔍 ] │
│  [remote EU only]  [all sources ▾]   │
└──────────────────────────────────────┘
```

The dropdown opens downward. On very small screens (< 375px), the two filter badges (`remote EU only` and `all sources`) can stack vertically using `Flex direction={{ initial: "column", sm: "row" }}` with Radix responsive props.

### Touch Targets

All interactive chips and dropdown items must have a minimum touch target of 44x44px (WCAG 2.5.5). Radix `Badge` used as buttons may need padding augmentation to meet this requirement:

```tsx
style={{ padding: "6px 12px", minHeight: 36 }}
```

Radix `DropdownMenu.CheckboxItem` meets touch target requirements at default size.

---

## 12. Accessibility Requirements

### WCAG 2.1 AA Compliance

#### Color Contrast

- All source badge labels must have >= 4.5:1 contrast ratio against their background in both light and dark themes.
- The existing `Theme appearance="dark"` (from `layout.tsx`) is the primary mode.
- Radix color tokens (e.g., `color="blue"` on `Badge`) are designed to meet AA contrast in both modes.
- Do not rely on color alone to communicate active state — use `variant="solid"` (which changes both color and border/background) in addition to color.

#### Keyboard Navigation

Chip-based filter (desktop):

| Key | Action |
|---|---|
| `Tab` | Move focus through chips in order |
| `Enter` or `Space` | Toggle chip active/inactive |
| `Escape` | No special behavior needed (no popover) |

Implement chips as `role="checkbox"` with `aria-checked` to communicate multi-select semantics correctly. A wrapping `role="group"` with `aria-label="Filter by job source"` groups them for screen readers.

DropdownMenu filter (mobile):

Radix `DropdownMenu` handles all keyboard navigation internally per WAI-ARIA `menu` pattern:
- `Enter` to open
- `Arrow keys` to navigate items
- `Space` to toggle `CheckboxItem`
- `Escape` to close

#### ARIA Labels

```tsx
// On the chip wrapper group
<Flex
  role="group"
  aria-label="Filter by job source"
  gap="2"
  wrap="wrap"
>
  ...chips...
</Flex>

// On each chip
<Badge
  role="checkbox"
  aria-checked={selected.includes(value)}
  aria-label={`Filter by ${label}`}
  tabIndex={0}
>
  {label}
</Badge>

// On the dropdown trigger
<Button
  aria-label={`Filter by source. Currently: ${label}`}
  aria-haspopup="true"
>
  {label}
  <ChevronDownIcon />
</Button>
```

#### Focus Management

- Focus must not move unexpectedly when a chip is toggled. The chip retains focus after toggle.
- When the "clear" badge is clicked, focus moves to the first chip (use `useRef` + `focus()` after state update).
- `DropdownMenu` focus returns to the trigger on close — Radix handles this automatically.

#### Screen Reader Announcements

When the filter updates the job count, announce the change to screen readers:

```tsx
// In jobs-list.tsx header area
<Text
  aria-live="polite"
  aria-atomic="true"
  aria-label={`Showing ${jobs.length} of ${totalCount} jobs`}
>
  {jobs.length}/{totalCount}
</Text>
```

The existing `aria-live="polite"` and `aria-busy={isInitialLoad}` in `jobs-list.tsx` already partially covers this — extend it to reflect filter state.

---

## 13. GraphQL Integration

### Current Capability

The `GetJobs` query already accepts `$sourceType: String` (singular). This maps to `eq(jobs.source_kind, args.sourceType)` in `src/apollo/resolvers/job/jobs-query.ts`.

### Required Schema Extension for Multi-Source

To support the multi-select interaction model, extend `schema/jobs/schema.graphql`:

```graphql
extend type Query {
  jobs(
    sourceType: String          # single source filter (keep for backward compat)
    sourceTypes: [String!]      # multi-source filter (new — OR logic)
    search: String
    limit: Int
    offset: Int
    excludedCompanies: [String!]
    isRemoteEu: Boolean
    remoteEuConfidence: String
    skills: [String!]
  ): JobsResponse!
  ...
}
```

And extend `GetJobs.graphql`:

```graphql
query GetJobs(
  $sourceType: String
  $sourceTypes: [String!]
  $search: String
  $limit: Int
  $offset: Int
  $excludedCompanies: [String!]
  $isRemoteEu: Boolean
  $skills: [String!]
) {
  jobs(
    sourceType: $sourceType
    sourceTypes: $sourceTypes
    ...
  ) { ... }
}
```

Resolver addition in `jobs-query.ts` (after the existing `sourceType` block):

```ts
// Filter by sourceTypes (multi-source OR logic)
if (args.sourceTypes && args.sourceTypes.length > 0) {
  conditions.push(inArray(jobs.source_kind, args.sourceTypes));
}
```

The implementation strategy in `UnifiedJobsProvider`: pass `sourceTypes` when the selected set has >= 1 entry. Do not pass `sourceType` for the new component — use `sourceTypes` exclusively and let `sourceType` remain for existing backward compatibility.

**Codegen:** Run `pnpm codegen` after schema change to regenerate `src/__generated__/hooks.tsx` and types.

### Query Variable Mapping

```tsx
const queryVariables = useMemo(
  () => ({
    search: searchFilter || undefined,
    limit: 20,
    offset: 0,
    isRemoteEu: remoteEuFilter || undefined,
    sourceTypes: sourcesFilter.length > 0 ? sourcesFilter : undefined,
    excludedCompanies: excludedCompanies.length > 0 ? excludedCompanies : undefined,
  }),
  [searchFilter, remoteEuFilter, sourcesFilter, excludedCompanies],
);
```

---

## 14. Implementation Checklist

The following checklist is the handoff to the Developer role. Each item is ordered by dependency.

### Phase 1 — Schema & API

- [ ] Extend `schema/jobs/schema.graphql` to add `sourceTypes: [String!]` argument to `jobs` query
- [ ] Add `sourceTypes` filter logic to `src/apollo/resolvers/job/jobs-query.ts` using `inArray(jobs.source_kind, args.sourceTypes)`
- [ ] Update `src/graphql/GetJobs.graphql` to pass `$sourceTypes: [String!]`
- [ ] Run `pnpm codegen` to regenerate types and hooks
- [ ] Verify `sourceKindIdx` index in schema is used by the new `inArray` condition (it is — `idx_jobs_source_kind` already exists)

### Phase 2 — Components

- [ ] Create `src/components/SourceFilter.tsx` with:
  - `SOURCE_OPTIONS` constant array
  - `SourceFilterChips` component (desktop)
  - `SourceFilterDropdown` component (mobile/DropdownMenu)
  - `SourceFilter` responsive wrapper
- [ ] If `useMediaQuery` hook does not exist, create `src/lib/use-media-query.ts`
- [ ] Add `role="group"`, `aria-label`, `role="checkbox"`, `aria-checked` to chip elements
- [ ] Add keyboard handlers (`Enter`, `Space`) to chip elements
- [ ] Verify touch targets >= 36px height on mobile

### Phase 3 — Integration

- [ ] Update `src/components/unified-jobs-provider.tsx`:
  - Parse `source` URL param: `searchParams.get("source")?.split(",").filter(Boolean) ?? []`
  - Add `handleSourcesChange` callback (mirrors `handleRemoteEuToggle` pattern)
  - Pass `sourcesFilter` to `<SourceFilter>` and `<JobsList>`
  - Pass `sourceTypes` to `queryVariables`
- [ ] Update `src/components/jobs-list.tsx`:
  - Accept `sourceTypes?: string[]` prop
  - Pass to `queryVariables`
  - Update empty state message to reference active sources if present

### Phase 4 — QA

- [ ] Test single-source filter: select Greenhouse, verify only `source_kind = 'greenhouse'` rows appear
- [ ] Test multi-source filter: select Greenhouse + Ashby, verify OR logic
- [ ] Test combination: Remote EU + Greenhouse + search query "react" all active simultaneously
- [ ] Test URL shareability: manually enter `?source=remotive&remote_eu=1`, verify correct filter state on load
- [ ] Test keyboard: Tab through all chips, Enter to toggle, screen reader announces checkbox state
- [ ] Test empty state: select `workable` on production (likely few jobs), verify empty state message
- [ ] Test mobile: DropdownMenu opens, checkbox items toggle, "clear filters" works
- [ ] Test loading state: slow network (DevTools throttling), verify optimistic chip activation + list dimming

---

## Appendix A — Source Kind Values Reference

These are the exact string values in `jobs.source_kind` (Drizzle schema, `src/db/schema.ts`). The filter component must use these exact values as the filter `value` — display label can differ.

| DB value (`source_kind`) | Worker / ingestion path |
|---|---|
| `greenhouse` | `src/ingestion/greenhouse.ts`, `workers/insert-jobs.ts` |
| `ashby` | `src/ingestion/ashby.ts`, `workers/insert-jobs.ts`, `workers/ashby-crawler` |
| `lever` | `src/ingestion/lever.ts`, `workers/insert-jobs.ts` |
| `remotive` | `workers/insert-jobs.ts` → `fetchRemotiveJobs()` |
| `arbeitnow` | `workers/insert-jobs.ts` → `fetchArbeitnowJobs()` |
| `workable` | `workers/insert-jobs.ts` → `fetchWorkableJobs()` |

---

## Appendix B — Existing Pattern Alignment

This feature reuses and extends established patterns — no new paradigms introduced:

| Pattern | Existing usage | Source filter usage |
|---|---|---|
| URL param filter state | `q`, `remote_eu` in `UnifiedJobsProvider` | `source` param |
| Badge as interactive chip | `remote EU only` badge | Source chips |
| `variant="solid"` active state | `remote EU only` active | Source chip active |
| `aria-live="polite"` count | `jobs-list.tsx` header | Extended with filter context |
| `searchParams` parse + `router.push` | `handleRemoteEuToggle` | `handleSourcesChange` |
| `inArray` Drizzle filter | Skills filter | `sourceTypes` filter |
| `cache-and-network` Apollo | `useGetJobsQuery` | No change needed |

---

*UX Team sign-off: ux-researcher (research complete), ui-designer (component patterns complete), ux-lead (synthesis complete). Ready for developer handoff.*
