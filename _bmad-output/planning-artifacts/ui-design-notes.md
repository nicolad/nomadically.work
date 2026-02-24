# UI Design Notes: Company Profile Page (`/companies/[key]`)

**Date:** 2026-02-24
**Author:** UI Designer (Agent Teams)
**Scope:** `src/components/company-detail.tsx`, `/companies/[key]` route
**Stack constraint:** Radix UI Themes + Radix Icons only. No Tailwind. No custom CSS frameworks. Inline styles permitted for one-off overrides.

---

## Context: Existing Design System State

Before making per-section recommendations, one systemic fact must inform every decision: the codebase has three competing styling systems running in parallel (custom `.yc-*` CSS classes, Radix Themes components, and inline style objects), and `globals.css` uses `!important` to override Radix internals (`border-radius: 0` on `.rt-Button`, `.rt-Badge`, `.rt-Card`, etc.). The UX audit (`ux-audit.md`) catalogued this fully.

The company detail page (`company-detail.tsx`) is almost entirely on Radix Themes primitives — `Card`, `Badge`, `Avatar`, `Tabs`, `Callout`, `Text`, `Heading`, `Flex`, `Box`, `Separator`. This is the cleanest page in the codebase. Recommendations below stay within that pattern and do not introduce `.yc-*` classes or raw CSS modules.

---

## 1. Design System Config

### Accent color

Use `accent="indigo"` for the `Theme` wrapper on this page (or globally, if a per-page `Theme` override is added). Indigo is already implied by the `ui-library-spec.md` Button spec (`color="indigo"` for primary). It reads as professional and neutral — appropriate for a B2B job board. Avoid `blue` (too generic) and `violet` (already used for tech-signal badges in the enrichment section, creating palette conflicts).

### Gray scale

Use `grayColor="slate"` (Radix default) or `grayColor="sand"`. Sand gives warmer neutrals that soften the currently very cold gray-on-white contrast of `color="gray"` text. If the rest of the app is already using slate, stay consistent.

### Radius

The `globals.css` overrides force `border-radius: 0` on `.rt-Card` and `.rt-Button`. This is an intentional design choice established for the job-list aesthetic (dense, YC-inspired, flat). The company profile page should follow the same global override for visual consistency. Do not set `radius="large"` on `Theme` — it will be overridden anyway and creates false expectations in code. The one exception: keep `Avatar radius="large"` (line 882 in `company-detail.tsx`), which is not covered by the `.rt-Button` or `.rt-Badge` override.

### Theme token overrides needed

None beyond what `globals.css` already applies globally. If a future per-page `<Theme>` wrapper is added (e.g., for a light/dark split), set:

```tsx
<Theme accentColor="indigo" grayColor="slate" radius="none" scaling="100%">
```

`scaling="100%"` keeps the dense, information-heavy feel consistent with the rest of the app.

---

## 2. Header Redesign

### Current problems (lines 870–961)

- "Score 0.82", "ATS 2", "Tags 14" are internal pipeline metrics with no job-seeker meaning.
- The bullet separator (`•`) between these items is fragile on mobile (wraps awkwardly).
- The Avatar fallback initials have no `color` prop set — Radix defaults to a random accent color, which is inconsistent across page loads.
- The admin Enhance button is inline in the header row, pushing the company name off-center on small screens.

### What stats to show in the header

Replace the three gray text bullets with two purpose-built stat chips visible to all users, plus one admin-only stat:

| Stat | Audience | Component | Rationale |
|---|---|---|---|
| Open roles (N jobs) | Everyone | `Badge variant="soft" color="indigo"` | The primary reason a job seeker visits a company page |
| Remote EU verified | Everyone | `Badge variant="soft" color="green"` with `CheckCircledIcon` | Platform's core value prop — must be prominent |
| ATS boards (N) | Admin only | Plain `Text size="1" color="gray"` | Internal signal, not meaningful to users |

Remove "Score" and "Tags count" from the header entirely for non-admins. Score belongs in KeyFactsCard (already there), and tags count adds no information.

### Remote EU trust signal

The `Job` type has `is_remote_eu: Boolean!` and `status: JobStatus`. On the company profile, the "Remote EU" signal should be derived from `companyJobs` — if any job has `status === "eu_remote"`, display the badge. Proposed treatment:

```tsx
// Place immediately after company name, before the website link
{companyJobs.some((j) => j.status === "eu_remote") && (
  <Badge color="green" variant="soft" radius="full" size="2">
    <CheckCircledIcon />
    Remote EU
  </Badge>
)}
```

`radius="full"` on the badge only (not overridden by globals.css `.rt-Badge` override — verify and add an inline `style={{ borderRadius: "9999px" }}` if the global override wins). Placement: immediately after the `Heading` for company name, before the website link row. This ensures it appears in the visual flow before metadata.

For the `CheckCircledIcon`: import it from `@radix-ui/react-icons` — it is not currently imported in `company-detail.tsx`. Add it to the import block at line 36.

### Avatar / logo area

Current: `<Avatar size="8" src={...} fallback={initialsFromName(company.name)} radius="large" />`

Proposed changes:
1. Keep `size="8"` (96px) on desktop. On mobile, reduce to `size="6"` (48px) using Radix's responsive prop: `size={{ initial: "6", sm: "8" }}`.
2. Add `color="indigo"` to the Avatar to fix the random fallback color: `color="indigo"`. This ensures initials always render with the platform's accent color.
3. Add `aria-label` for screen readers: `aria-label={`${company.name} company logo`}`. Radix's `Avatar` does not automatically expose this.
4. Keep `radius="large"` — it is intentionally exempted from the flat-border-radius rule because company logos benefit from rounded corners (logos themselves often have square edges that look harsh without rounding).

### Responsive header behavior

Current header (lines 871–961) uses `direction={{ initial: "column", sm: "row" }}` on the outer Flex — this is correct. Additions needed:

- On mobile (`initial`): Avatar and name/metadata should stack vertically with the Avatar centered (`align={{ initial: "center", sm: "start" }}`).
- The admin Enhance button should move outside the name row on mobile — use a separate `Flex justify="end"` row below the header, visible only on mobile, and hide the inline version. Implement with `display={{ initial: "flex", sm: "none" }}` / `display={{ initial: "none", sm: "flex" }}` on wrapper Boxes.
- Open-roles badge and Remote EU badge should wrap onto a new line on narrow screens — the parent `Flex` already has `wrap="wrap"`, so no change needed there.

Concrete header structure (pseudocode, not production-ready):

```tsx
<Flex direction={{ initial: "column", sm: "row" }} gap="4" align={{ initial: "center", sm: "start" }}>
  <Avatar
    size={{ initial: "6", sm: "8" }}
    src={company.logo_url || undefined}
    fallback={initialsFromName(company.name)}
    radius="large"
    color="indigo"
    aria-label={`${company.name} company logo`}
  />
  <Box style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
    <Flex align="center" gap="2" wrap="wrap">
      <Heading size={{ initial: "6", sm: "8" }} style={{ lineHeight: 1.1 }}>
        {company.name}
      </Heading>
      {/* Remote EU trust badge — inline with name */}
      {hasRemoteEuJobs && (
        <Badge color="green" variant="soft" size="2" style={{ borderRadius: 9999 }}>
          <CheckCircledIcon /> Remote EU
        </Badge>
      )}
    </Flex>
    {/* Website + meta row */}
    <Flex align="center" gap="3" mt="2" wrap="wrap">
      {websiteHref && <WebsiteLink ... />}
      {/* Open roles count — replaces "ATS N" and "Tags N" */}
      {companyJobs.length > 0 && (
        <Badge color="indigo" variant="soft" size="1">
          {companyJobs.length} open {companyJobs.length === 1 ? "role" : "roles"}
        </Badge>
      )}
      {/* Admin-only: score */}
      {isAdmin && <Text size="1" color="gray">score {scoreText}</Text>}
    </Flex>
    {/* Category/size/location chips */}
    <Flex gap="2" wrap="wrap" mt="3">{...}</Flex>
  </Box>
  {/* Admin Enhance button — desktop only, inline */}
  {isAdmin && (
    <Box display={{ initial: "none", sm: "block" }}>
      <EnhanceButton ... />
    </Box>
  )}
</Flex>
{/* Admin Enhance button — mobile only, full row below */}
{isAdmin && (
  <Box display={{ initial: "block", sm: "none" }}>
    <Button ... style={{ width: "100%" }}>Enhance</Button>
  </Box>
)}
```

---

## 3. Component Patterns

### Job card in the Jobs tab

**Current:** Plain unstyled list — `Flex justify="between"` with title + location (left) and date (right), separated by `Separator`. This is the same pattern used in the fallback "no company record" view (lines 786–840).

**Recommendation: Use cards, not a separator list.**

The main `JobsList` component (`src/components/jobs-list.tsx`) uses a custom `.job-row` CSS class for dense list rows. The company page should NOT import that component (it uses global query state). Instead, build a `CompanyJobCard` sub-component within `company-detail.tsx`:

**Fields to show:**
- Title (primary, `Text size="3" weight="bold"`)
- Location (secondary, `Text size="2" color="gray"` with `GlobeIcon`)
- Date posted (tertiary, `Text size="1" color="gray"`) — formatted as "12 Mar" not "3/12/2026"
- Remote EU status badge if `job.status === "eu_remote"`: `<Badge color="green" variant="soft" size="1">Remote EU</Badge>`
- Employment type if available from `ashby_employment_type`: `<Badge color="gray" variant="surface" size="1">{type}</Badge>`
- Top 3 required skills from `job.skills` filtered by `level === "required"`, rendered as `<Badge color="gray" variant="surface" size="1">` chips
- Compensation summary if available from `ashby_compensation.compensationTierSummary` or `ashby_compensation.scrapeableCompensationSalarySummary`: `<Text size="2" color="green" weight="medium">`

**Card vs. list row:** Use `Card` (Radix `<Card>`) rather than separator-divided rows. Reasons: (1) cards provide a clear click target with hover state included via Radix's built-in interactive card variant; (2) salary/skills chips wrap naturally inside a card without disrupting the row layout; (3) screen readers benefit from card landmark semantics.

Use `<Card asChild>` with `<Link href={jobHref}>` as the child to get full-card clickability with correct semantics:

```tsx
<Card asChild>
  <Link href={jobHref} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
    <Box p="3">
      <Flex justify="between" align="start" gap="3">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="3" weight="bold" style={{ display: "block" }}>{job.title}</Text>
          <Flex gap="2" mt="1" align="center" wrap="wrap">
            {job.location && (
              <Flex align="center" gap="1">
                <GlobeIcon width={12} height={12} style={{ color: "var(--gray-9)" }} />
                <Text size="2" color="gray">{job.location}</Text>
              </Flex>
            )}
            {job.status === "eu_remote" && (
              <Badge color="green" variant="soft" size="1">Remote EU</Badge>
            )}
            {job.ashby_employment_type && (
              <Badge color="gray" variant="surface" size="1">{job.ashby_employment_type}</Badge>
            )}
          </Flex>
          {/* Skills */}
          {requiredSkills.length > 0 && (
            <Flex gap="1" mt="2" wrap="wrap">
              {requiredSkills.slice(0, 3).map(s => (
                <Badge key={s.tag} color="gray" variant="surface" size="1">{getSkillLabel(s.tag)}</Badge>
              ))}
              {requiredSkills.length > 3 && (
                <Text size="1" color="gray">+{requiredSkills.length - 3}</Text>
              )}
            </Flex>
          )}
        </Box>
        <Flex direction="column" align="end" gap="1" style={{ flexShrink: 0 }}>
          {salaryText && <Text size="2" color="green" weight="medium">{salaryText}</Text>}
          <Text size="1" color="gray">{formattedDate}</Text>
        </Flex>
      </Flex>
    </Box>
  </Link>
</Card>
```

**Interaction states:** Radix `Card` with no `variant` prop defaults to `variant="surface"` which applies a `var(--color-surface)` background. Add `variant="ghost"` on hover by wrapping in a state handler — OR rely on the Radix `asChild` + Link pattern, which triggers the browser's native `:hover` on the anchor. For a more explicit hover, use `style` with `onMouseEnter`/`onMouseLeave` toggling a border color — but this is overkill given the global `.rt-Card` override. The simplest correct approach: `<Card asChild>` will inherit Radix's built-in interactive surface styles when the child is a focusable element. Test this — if the override in `globals.css` removes the hover state, add `style={{ cursor: "pointer" }}` inline on the Card.

Focus ring: Radix handles `:focus-visible` automatically for interactive cards. Verify the `globals.css` overrides do not remove it.

---

### Trust signal chips

"Remote EU" is the platform's primary value proposition. Current code:
- `jobs-list.tsx` shows a `<Badge color="green" variant="soft">eu remote</Badge>` per job row.
- `company-detail.tsx` shows no Remote EU signal at the company level.

**Company-level treatment:**

1. **Header badge** (described in Section 2): `<Badge color="green" variant="soft" size="2" style={{ borderRadius: 9999 }}>` with `CheckCircledIcon`. Placement: inline with company name in the heading row.

2. **Per-job badge** in the Jobs tab: `<Badge color="green" variant="soft" size="1">Remote EU</Badge>` — match the existing pattern from `jobs-list.tsx` for consistency.

3. **Do not add a Remote EU chip to the Overview tab header chips** (category/size/location row). That row uses `color="gray" variant="surface"` chips for neutral metadata. Mixing a green trust badge there would dilute both signals.

**Color:** `color="green"` is correct. Radix's green is accessible at both `variant="soft"` (green-3 bg, green-11 text) and `variant="solid"` (green-9 bg, white text). Use `variant="soft"` to keep it from screaming — the badge should be noticed, not dominate.

**Icon:** `CheckCircledIcon` from `@radix-ui/react-icons`. Size: `width={12} height={12}` inline with `size="1"` badge, `width={14} height={14}` with `size="2"` badge.

**Placement priority:** Header (most prominent) > per-job row in Jobs tab. Do not add it to Overview tab body text.

---

### Empty states

**Company with no description (Overview tab, About section)**

Current: The `<SectionCard title="About">` block is conditionally rendered — if no description, it simply doesn't render (line 987–998 in `company-detail.tsx`). This leaves the left column of the Overview tab potentially empty, which collapses the 2-column layout unevenly.

Proposed: Always render the About section, with an empty state inside it:

```tsx
<SectionCard title="About">
  {company.description ? (
    <Text as="p" size="3" color="gray" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
      {company.description}
    </Text>
  ) : (
    <Flex direction="column" align="center" gap="2" py="4">
      <FileTextIcon width={24} height={24} style={{ color: "var(--gray-7)" }} />
      <Text size="2" color="gray" align="center">
        No company description available yet.
      </Text>
    </Flex>
  )}
</SectionCard>
```

Use `FileTextIcon` from `@radix-ui/react-icons`. Keep the icon muted (`var(--gray-7)`) — do not use colored icons for empty states.

**Company with no open jobs (Jobs tab)**

Current: `<Callout.Root color="gray" variant="soft"><Callout.Icon><InfoCircledIcon /></Callout.Icon><Callout.Text>No jobs found for this company.</Callout.Text></Callout.Root>` (line 1172–1177).

This is acceptable but generic. Proposed improvement:

```tsx
<Flex direction="column" align="center" gap="3" py="8">
  <MagnifyingGlassIcon width={32} height={32} style={{ color: "var(--gray-6)" }} />
  <Box style={{ textAlign: "center" }}>
    <Text size="3" weight="medium" as="p">No open roles right now</Text>
    <Text size="2" color="gray" as="p" mt="1">
      This company has no active listings on nomadically.work.
      Check back later or visit their careers page directly.
    </Text>
  </Box>
  {company.ats_boards?.[0]?.url && (
    <RadixLink
      href={coerceExternalUrl(company.ats_boards[0].url) ?? company.ats_boards[0].url}
      target="_blank"
      rel="noopener noreferrer"
      size="2"
    >
      View careers page <ExternalLinkIcon style={{ marginLeft: 4 }} />
    </RadixLink>
  )}
</Flex>
```

The link to the careers page is the actionable exit — this is high-value UX for a job seeker who has landed on a company with no current listings.

**Company with no contacts (Contacts tab)**

Current: `<Callout.Root color="gray" variant="soft">No contacts found.</Callout.Root>` (line 567–572).

Proposed:

```tsx
<Flex direction="column" align="center" gap="3" py="8">
  <PersonIcon width={32} height={32} style={{ color: "var(--gray-6)" }} />
  <Box style={{ textAlign: "center" }}>
    <Text size="3" weight="medium" as="p">No contacts yet</Text>
    <Text size="2" color="gray" as="p" mt="1">
      Hiring managers and recruiters at this company will appear here.
    </Text>
  </Box>
</Flex>
```

`PersonIcon` is available in `@radix-ui/react-icons`.

---

### Score display

**Current problem:** `KeyFactsCard` shows `Score: 0.82` as a plain text row. This is a data-science artefact — the score is a composite of crawl signals (career page confidence, enrichment data, ATS board count, etc.) not a quality rating recognizable to job seekers.

**Recommendation: Hide from non-admins. Relabel for admins.**

For non-admins: remove the Score row from `KeyFactsCard` entirely. The `careerPagesCount` row should also be renamed to "Career pages tracked" for clarity.

For admins: rename the row label from "Score" to "Crawl confidence" and render a segmented qualitative label alongside the number:

```tsx
// Admin-only score row in KeyFactsCard
{isAdmin && {
  label: "Crawl confidence",
  value: (
    <Flex align="center" gap="2">
      <Badge
        color={score >= 0.7 ? "green" : score >= 0.4 ? "amber" : "red"}
        variant="soft"
        size="1"
      >
        {score >= 0.7 ? "high" : score >= 0.4 ? "medium" : "low"}
      </Badge>
      <Text size="2" color="gray" style={{ fontVariantNumeric: "tabular-nums" }}>
        {formatScore(score)}
      </Text>
    </Flex>
  )
}}
```

This gives admins the raw number (auditable) plus a human label. The thresholds (0.7 high, 0.4 medium) are guesses — adjust based on actual score distribution. The `score` variable is in `[0, 1]` range based on `formatScore` behavior in the current code.

**Do not use a progress bar or star rating.** A progress bar implies the score is a single-dimension measure of "goodness" when it is actually a crawl-coverage signal. Stars imply user-facing quality ratings, which this is not. Qualitative label + raw number is the clearest admin treatment.

---

## 4. Information Architecture Decisions

### Should "Jobs" be the default tab?

**Yes.** Change `defaultValue="overview"` to `defaultValue="jobs"` on `<Tabs.Root>`.

Reasoning: A job seeker lands on `/companies/peec` either from a job listing (already interested in the company) or from a direct search. In both cases, their first question is "what roles are open?" The current default of Overview buries that answer one click away. This is the single highest-impact IA change.

Exception: If `companyJobs.length === 0`, default to `"overview"` to avoid immediately showing an empty state. Implement with:

```tsx
<Tabs.Root defaultValue={companyJobs.length > 0 ? "jobs" : "overview"}>
```

### Should the header show job count prominently?

**Yes.** Already addressed in Section 2. The open-roles `Badge` in the header (`N open roles`) is the correct placement — it is visible regardless of active tab.

### Tab order

Current order: Overview | Contacts | Jobs. This is backwards from job-seeker priorities. Proposed order:

**Jobs | Overview | Contacts**

```tsx
<Tabs.List>
  <Tabs.Trigger value="jobs">
    Jobs {companyJobs.length > 0 ? `(${companyJobs.length})` : ""}
  </Tabs.Trigger>
  <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
  {isAdmin && <Tabs.Trigger value="contacts">Contacts</Tabs.Trigger>}
</Tabs.List>
```

### Should "Contacts" be admin-only?

**Yes, conditionally.** The contacts feature currently imports from LinkedIn HTML (admin-only action), has no CTA for regular users, and displays people's emails and LinkedIn URLs. Showing an empty contacts tab to job seekers is confusing. Proposed: hide the tab entirely for non-admins by wrapping `<Tabs.Trigger value="contacts">` in `{isAdmin && ...}`, and also conditionally rendering `<Tabs.Content value="contacts">` only for admins.

If in a future iteration contacts become user-facing (e.g., to show "you can reach out to this hiring manager"), this decision should be revisited.

### Overview tab section order (left column)

Current left column order: About → Services. Proposed:

1. **About** (company description) — highest value, must be first
2. **What they build / Services** — renamed to "What they do" for user-facing clarity (current title "Services" is an internal field name)

If description is absent, the empty state (Section 3) fills the space.

### Overview tab section order (right column)

Current: KeyFacts → Industries → Tags. Proposed:

1. **KeyFacts** (domain link + career pages count, minus score for non-admins) — keep first
2. **Industries** — good for context
3. **Tech stack** (from `ashby_enrichment.tech_signals`) — surface this higher. Currently buried inside "Ashby Enrichment" section at the bottom. Tech signals are high-value for developers evaluating fit. Move to a dedicated `<SectionCard title="Tech stack">` in the right column.
4. **Tags** — keep last, least discoverable

### Overview tab sections below the 2-column grid

Current order: Ashby Enrichment → Career pages → Score breakdown

Proposed for non-admins:
- Remove "Score breakdown" entirely
- Remove "Ashby Enrichment" entirely (internal pipeline data)
- Keep "Career pages" (renamed "Job boards") — this is useful for users who want to apply directly

Proposed for admins:
- Keep all three sections, reordering to: Career pages → Ashby Enrichment → Score breakdown

---

## 5. Responsive Design

### Header

Breakpoint: `sm` (Radix default: 520px).

| Viewport | Logo | Name | Trust badge | Stats row |
|---|---|---|---|---|
| `< 520px` | `size="6"` (48px), centered | `size="6"` heading, centered | Below name, centered | Wrap to 2 rows |
| `>= 520px` | `size="8"` (96px), left-aligned | `size="8"` heading | Inline with name | Single row |

Use Radix's responsive object props throughout. Do not use CSS media queries for this — all breakpoints are achievable via Radix prop syntax:

```tsx
<Flex direction={{ initial: "column", sm: "row" }} align={{ initial: "center", sm: "start" }}>
```

### Overview tab 2-column layout

Current: `direction={{ initial: "column", md: "row" }}` — this is correct. The breakpoint is `md` (768px), which is appropriate for the 2/3 + 1/3 column split. No change needed.

One addition: on mobile, the right column (KeyFacts, Industries, Tags) should render above the left column (About, Services) — because KeyFacts contains the website link and domain, which job seekers want immediately. Radix Flex `direction="column"` stacks left-column-first by default. To reverse on mobile, use CSS `order` via inline style:

```tsx
<Box style={{ flex: 2, minWidth: 0, order: 1 }}>  {/* About + Services */}
<Box style={{ flex: 1, minWidth: 0, order: 0 }}>  {/* KeyFacts + right column */}
```

This only applies when the Flex is in `direction="column"` (mobile). On `direction="row"` (desktop), CSS `order` has no visual effect because source order matches desired visual order. Test this carefully — CSS `order` in a Flex row may still override expected visual order if the values differ.

### Tab labels on narrow screens

Current tabs trigger labels: "Overview" | "Contacts" | "Jobs (N)". At 320px viewport, three labels plus a job count number can overflow.

Radix `Tabs.List` does not truncate — it scrolls horizontally by default if content overflows. This is acceptable behavior. However, the proposed new order (Jobs | Overview | Contacts) puts the most important tab first, so horizontal scroll is less of a problem.

If label truncation is required, use `Text` inside `Tabs.Trigger` with `style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}`. Do not abbreviate labels (e.g., "Info" instead of "Overview") — abbreviations cause confusion.

---

## 6. Accessibility

### Missing ARIA labels

The following are missing from the current `company-detail.tsx`:

| Element | Issue | Fix |
|---|---|---|
| `<Avatar>` | No `aria-label`. Screen reader gets no information about logo | Add `aria-label={`${company.name} company logo`}` |
| `<Tabs.Root>` | No `aria-label` on the tab group | Add `aria-label="Company information"` to `<Tabs.Root>` |
| `<Tabs.List>` | No description for the list | Radix auto-generates `role="tablist"` but no `aria-label` — add `aria-label="Company sections"` |
| `CollapsibleChips` / `CollapsibleList` expand buttons | `<Button>` with `<ChevronDownIcon />` has visible text but no `aria-expanded` state | Add `aria-expanded={expanded}` to the Button |
| `<Card asChild><Link>` job rows | The link text is just the job title — no company context | Add `aria-label={`${job.title} at ${company.name}`}` on the Link |
| `<TextField.Root>` search in ContactsTab | No `aria-label` | Add `aria-label="Search contacts"` |
| Admin `<Dialog.Content>` | Has `Dialog.Title` and `Dialog.Description` — this is correct. No change needed | — |

### Focus management for tabs

Radix `Tabs` handles keyboard navigation (arrow keys between triggers) and focus management automatically via WAI-ARIA tabs pattern. No additional code is needed.

One edge case: when the default tab is `"jobs"` (proposed change), the initial focus on page load should not jump to the tab list. This is controlled by the browser's document focus order, not Radix. The tab list follows the header in DOM order, so focus lands on the first interactive element in the header (the website link) before reaching the tabs — this is correct.

If a user uses the browser back button to return to this page, React/Next.js may restore scroll position but not focus position. This is a known limitation of SPA navigation, not specific to this page.

### Color contrast for `color="gray"` on small text

Radix's `color="gray"` on `Text` resolves to `var(--gray-11)` in light mode and `var(--gray-11)` in dark mode (both are Radix's accessible step 11 tokens). Step 11 is designed to be WCAG AA compliant on step 1–3 backgrounds. The concern is not the color token itself but the font size.

Specific failing cases:

| Location | Current | Issue |
|---|---|---|
| `SectionCard` title (line 88–93) | `size="2"` `color="gray"` with `fontWeight: 600` | At size 2 (14px), `--gray-11` on a Card surface (`--gray-2` background) passes AA only if font-weight >= 700. Current is 600 — borderline. Change `fontWeight` to 700. |
| `KeyFactsCard` label column (line 340) | `size="1"` `color="gray"` | Size 1 is 12px. `--gray-11` on `--color-surface` is ~4.5:1 in light mode — passes AA for normal text only if weight >= 700 (large text threshold at 14px bold or 18px normal). This is below the threshold. **Fix: use `color="gray"` `size="2"` for labels in KeyFactsCard, or increase contrast with `style={{ color: "var(--gray-12)" }}`**. |
| Collapsible "Show more" button (lines 153–165) | `size="2" variant="ghost" color="gray"` | Ghost button text at gray-11 on white background: ~4.5:1. Passes AA. No change needed. |
| Contact meta row (lines 602–643) | `size="2" color="gray"` email/LinkedIn links | Links need to be distinguishable from body text by more than color alone. Add `style={{ textDecoration: "underline" }}` to all `RadixLink` elements in this section. |

**Concrete fixes:**

In `SectionCard` (line 91): `style={{ fontWeight: 700, letterSpacing: 0.2 }}` (change 600 to 700).

In `KeyFactsCard` label text (line 340): Change `size="1"` to `size="2"` for all label column `Text` elements, or use `style={{ color: "var(--gray-12)" }}` to step up contrast.

In `CollapsibleList` (line 193): `Text size="2" color="gray"` on bullet items — 14px gray-11 on card surface. Passes AA. No change needed.

### Screen reader text for Avatar fallback

Radix `Avatar` renders a fallback `<span>` with the initials when `src` fails to load. This span is inside a `<button>` (Radix's internal implementation for interactive avatars, though this Avatar is not interactive). The initials alone are not meaningful to screen readers.

Fix: The `aria-label` on the Avatar component (recommended above) covers this — it provides context regardless of whether the image or fallback is showing. Radix will use `aria-label` to override the accessible name of the Avatar's root element.

Additionally, add `alt=""` semantics by ensuring the Avatar's `src` image has an empty alt when it loads (decorative image since the label provides the name). Radix handles this internally when `aria-label` is set on the Avatar component — verify in the rendered HTML that the `<img>` gets `alt=""` or `alt={aria-label value}`.

---

## Implementation Priority

| Priority | Change | Effort | File |
|---|---|---|---|
| P0 | Default tab to "jobs" when jobs exist | 1 line | `company-detail.tsx:964` |
| P0 | Move "Jobs" tab trigger first, hide "Contacts" for non-admins | 5 lines | `company-detail.tsx:964–972` |
| P0 | Replace "ATS N / Score / Tags N" header stats with open roles badge + Remote EU badge | ~20 lines | `company-detail.tsx:917–939` |
| P1 | Add `aria-label` to Avatar, Tabs.Root, Tabs.List, collapsible buttons | ~8 lines | `company-detail.tsx` |
| P1 | Job card redesign in Jobs tab (Card-based, with skill chips and salary) | New sub-component | `company-detail.tsx` |
| P1 | Empty state for no-jobs (with careers page link) | ~15 lines | `company-detail.tsx:1171–1177` |
| P1 | Hide Score from non-admins in KeyFactsCard | 5 lines | `company-detail.tsx` — pass `isAdmin` to `KeyFactsCard` |
| P2 | Fix color contrast: `fontWeight: 700` in SectionCard, `size="2"` in KeyFactsCard labels | 2 lines | `company-detail.tsx:91, 340` |
| P2 | Avatar responsive size (`size={{ initial: "6", sm: "8" }}`) + `color="indigo"` | 2 props | `company-detail.tsx:879–883` |
| P2 | Empty state for no-description About section | ~10 lines | `company-detail.tsx:987–998` |
| P2 | Surface `tech_signals` as a separate "Tech stack" section in right column | ~15 lines | `company-detail.tsx` |
| P3 | Mobile admin Enhance button repositioned below header | ~10 lines | `company-detail.tsx` |
| P3 | Empty state for no-contacts | ~8 lines | `company-detail.tsx:566–573` |
| P3 | Section renames: "Services" to "What they do", "Career pages" to "Job boards" | 2 strings | `company-detail.tsx` |
| P3 | Remove Ashby Enrichment section for non-admins | 2 lines | `company-detail.tsx:1035` |
