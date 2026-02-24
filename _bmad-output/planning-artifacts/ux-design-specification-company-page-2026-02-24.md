# UX Design Specification: Company Profile Page

**Date:** 2026-02-24
**Author:** UX Lead (Agent Teams synthesis)
**Source documents:** `ux-research-notes.md`, `ui-design-notes.md`
**Primary file:** `src/components/company-detail.tsx` (1217 lines)
**Page route:** `/companies/[key]`
**Stack:** Next.js 16, React 19, Radix UI Themes + Icons, Apollo Client

---

## 1. Problem Statement

The `/companies/[key]` page is reached primarily when a job seeker clicks a company name link from a job listing. These users arrive with one urgent question: **"Is this company a legitimate remote-EU employer, and do they have roles I can apply to now?"**

The current page answers this question poorly. The header displays three internal metrics ("Score 0.87 • ATS 1 • Tags 12") that have no meaning to job seekers. The tab order (Overview | Contacts | Jobs) buries the primary conversion action — browsing open roles — behind two tabs of admin-oriented content. There is no Remote EU trust signal anywhere on the page. The "Contacts" tab exposes personal recruiter emails and admin import tools to all authenticated users. Internal pipeline data ("Ashby Enrichment", "Score breakdown", "Services") is presented as company content.

The result: job seekers cannot quickly verify the platform's core value proposition at the company level, and the page's visual hierarchy is organized around internal data concerns rather than user goals.

**Primary UX goal:** A job seeker must be able to answer all four evaluation questions — (1) Is this company genuinely remote-EU? (2) What do they build? (3) Are there roles I can apply to? (4) What tech do they use? — within 30 seconds, without admin knowledge, using what is visible on first page load.

---

## 2. User Personas (condensed from research)

### Persona 1: The Targeted Applicant
**Marta, 31, senior backend engineer in Warsaw.** Actively job hunting. Arrives from a job listing link. Needs to quickly verify remote-EU legitimacy before investing time in an application. Will leave within 15 seconds if she cannot see a clear remote-EU signal or any relevant open roles. Does not know what "ATS," "Score," or "Tags" mean.

**Success criteria:** Sees Remote EU badge in header, open role count, tech stack — in that order — before scrolling.

### Persona 2: The Skeptical Browser
**Tobias, 27, frontend developer in Berlin.** Building a passive shortlist. Browsing company pages to decide which ones are worth bookmarking. Wants company description + tech stack visible without hunting. Will dismiss a page that looks sparse or has blank sections. Does not want to see recruiter contact information.

**Success criteria:** Description present or a clear empty state, tech stack surfaced in a labeled section, open role count visible.

### Persona 3: The Data Steward (Admin)
**Internal platform admin.** Auditing data quality, checking ATS board health, triggering re-enrichment. Needs: score + reasons, facts/snapshots counts, last crawl timestamp, ATS board confidence, and an enhance action — all without having to visit the GraphQL playground.

**Success criteria:** A single admin-only panel contains all data health signals. Enhance button is adjacent to, not separated from, that data.

---

## 3. Design Principles

### P1: Remote EU status is the first signal, not a footnote
Every user is here because they want a remote EU job. The company page must answer "does this company genuinely hire remote EU?" before any other information. This signal belongs in the header, not in a sidebar card or buried tab.

**Derived from:** `companyJobs.filter(j => j.is_remote_eu === true && j.remote_eu_confidence === 'high').length > 0`. This data is already fetched by `useGetJobsQuery` — no schema change needed.

### P2: Jobs are the primary conversion action
The Jobs tab must be the default when open roles exist. Each job row must contain enough information — title, remote badge, skills, date — to support an apply decision without a further page load.

### P3: Internal data is not product copy
Pipeline outputs (`score`, `tags`, `services`, `ashby_enrichment.enriched_at`, `score_reasons`) must not be presented as company-authored content. They are either gated behind admin view, transformed into user-friendly signals (`tech_signals` → "Tech stack"), or removed from public rendering entirely.

### P4: Empty states earn trust
Blank sections and conditionally hidden cards when data is absent make the page feel unfinished. Every section must render an explicit, purposeful empty state. An informed user is more likely to return than a confused one.

### P5: Admin tools do not belong in job seeker views
The Contacts tab, Enhance button, Score breakdown, ATS board confidence percentages, and raw enrichment metadata are admin workflows. Gate them at the tab/section level with `isAdmin`, not just at the button level.

---

## 4. Information Architecture

### 4.1 Tab Structure & Default Tab

**Proposed tab order: Jobs | Overview | Contacts (admin-only)**

```tsx
// Default tab logic
<Tabs.Root
  defaultValue={companyJobs.length > 0 ? "jobs" : "overview"}
  aria-label="Company information"
>
  <Tabs.List aria-label="Company sections">
    <Tabs.Trigger value="jobs">
      Jobs{companyJobs.length > 0 ? ` (${companyJobs.length})` : ""}
    </Tabs.Trigger>
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
    {isAdmin && <Tabs.Trigger value="contacts">Contacts</Tabs.Trigger>}
  </Tabs.List>
```

**Rationale for "Jobs" first:** Job seekers arrive to find open roles. Putting Jobs first eliminates one click from the primary user journey. The tab count label "Jobs (4)" confirms value before clicking. When there are no jobs, default to Overview so the empty state is not the first thing visible.

**Rationale for hiding Contacts from non-admins:** The Contacts tab exposes personal email addresses, LinkedIn URLs, and "do not contact" flags. It contains an admin-only LinkedIn HTML import tool. No job seeker use case is served by showing this tab. Gate the `<Tabs.Trigger>` and `<Tabs.Content>` both with `{isAdmin && ...}`.

**Conflict resolution:** The UX Researcher proposed a third tab named "Admin" consolidating all admin tools. The UI Designer proposed keeping the Contacts tab label but hiding it. **Decision: Keep the tab label "Contacts" but gate it with `isAdmin`. An "Admin" meta-tab would require restructuring the Tabs.Content layout and is a P3 item. The Contacts gate is a P0 change.**

### 4.2 Header Layout

**Proposed header — visible to all users:**

```
[Logo]  [Company Name]  [Remote EU badge — green, if confirmed]
        [Website link]
        [N open roles — indigo badge]  [Admin-only: score text]
        [Category chip] [Size chip] [Location chip]
```

**Remove from header for non-admins:**
- "Score 0.87" — move to admin-only KeyFacts card
- "ATS N" — remove entirely (replace with "N open roles" badge)
- "Tags N" — remove entirely (irrelevant to users)
- The bullet `•` separators between those items

**Keep in header:**
- Company name (Heading)
- Website link with GlobeIcon + ExternalLinkIcon
- Category / Size / Location chips (Chip components)
- Avatar with `color="indigo"` and `aria-label`

**Admin-only header elements:**
- Score text rendered as `<Text size="1" color="gray">` (not a badge)
- Enhance button (keep inline position on desktop; move to full-width row below header on mobile)

### 4.3 Overview Tab Sections (order + hierarchy)

**Left column (flex: 2) — public:**

1. **About** — Always rendered. If `company.description` is null, show empty state (see Section 5.5). Never conditionally omit this section.
2. **Tech stack** — Extracted from `company.ashby_enrichment.tech_signals`. Rendered as a new `<SectionCard title="Tech stack">` with violet `Badge` chips. Only shown when `tech_signals.length > 0`. If empty, omit the section entirely (do not show a "no tech stack" empty state — absence is cleaner than an empty card for this section).
3. **Job boards** (renamed from "Career pages") — `company.ats_boards`. Shown for all users. Strip confidence percentages for non-admins; show only vendor name, active/inactive badge, and link. Admin-only: keep confidence percentage display.

**Right column (flex: 1) — public:**

1. **At a glance** (renamed from "Key Facts") — Domain link, category (human-readable), size, location. Score row visible to admins only.
2. **Industries** — `company.industries` chips. Keep current `CollapsibleChips` pattern.
3. **Tags** — `company.tags` chips. Admin-only. Remove from public view.

**Below the 2-column grid — admin-only only:**

- Score breakdown (`company.score_reasons`) — renamed "Data quality notes"
- Ashby Enrichment raw section (company_name, size_signal, enriched_at timestamp)
- Data health: `facts_count`, `snapshots_count`, `last_seen_capture_timestamp`

**Mobile column order:** On mobile (direction="column"), the right column (At a glance, Industries) should render above the left column (About, Tech stack). Use inline `style={{ order: 0 }}` on the right column Box and `style={{ order: 1 }}` on the left column Box. This gives mobile users the quick facts (website, category, size) before the long description.

### 4.4 Jobs Tab

Each job entry is a full `<Card asChild>` with `<Link>` as the child (full-card clickability). Fields shown:

- **Title** — `Text size="3" weight="bold"`
- **Remote EU badge** — shown if `job.is_remote_eu === true && job.remote_eu_confidence === 'high'`: green badge. If `remote_eu_confidence === 'medium'`: green/amber badge variant.
- **Location** — `Text size="2" color="gray"` with `GlobeIcon`
- **Top 3 required skills** — from `job.skills.filter(s => s.level === 'required').slice(0, 3)`. Rendered as gray surface Badge chips. Overflow: "+N more" in gray text.
- **Employment type** — if `job.ashby_employment_type` is present.
- **Published date** — right-aligned, formatted as "12 Mar 2026" (not MM/DD/YYYY).

**Note on salary:** The `GetJobs` GraphQL query does NOT currently return `ashby_compensation` data. Fetching compensation requires adding it to the `GetJobs.graphql` query document and ensuring the resolver includes it. This is a P2 item requiring a GraphQL document change. Do not implement salary display in P0/P1 without first adding compensation to the query.

**Empty state:** See Section 5.5.

### 4.5 Admin-only vs Public sections

| Section | Public | Admin |
|---|---|---|
| Remote EU badge (header) | Yes | Yes |
| Open roles count badge (header) | Yes | Yes |
| Score text (header) | No | Yes |
| Enhance button | No | Yes |
| "At a glance" card — score row | No | Yes |
| "At a glance" card — domain, category, size, location | Yes | Yes |
| Tags section (right column) | No | Yes |
| Contacts tab | No | Yes |
| ATS board confidence % | No | Yes |
| "Ashby Enrichment" raw section | No | Yes |
| "Score breakdown" / "Data quality notes" | No | Yes |
| Data health panel (facts_count, snapshots_count, last crawled) | No | Yes |
| Tech stack section | Yes | Yes |
| Industries chips | Yes | Yes |
| Job boards section | Yes | Yes |

---

## 5. Component Specifications

### 5.1 Remote EU Trust Signal

**Location:** Inline with company name in the header, immediately after the `<Heading>` for company name.

**Derivation (no schema change needed):** `companyJobs` is already fetched by `useGetJobsQuery`. The data includes `is_remote_eu` and `remote_eu_confidence` per job. Compute:

```tsx
const hasRemoteEuConfirmed = companyJobs.some(
  (j) => j.is_remote_eu === true && j.remote_eu_confidence === "high"
);
const hasRemoteEuLikely = !hasRemoteEuConfirmed && companyJobs.some(
  (j) => j.is_remote_eu === true && j.remote_eu_confidence === "medium"
);
```

**Rendering:**

```tsx
// Add CheckCircledIcon to the existing @radix-ui/react-icons import at line 36
import { CheckCircledIcon, FileTextIcon } from "@radix-ui/react-icons";

// In the header, after <Heading size="8">:
{hasRemoteEuConfirmed && (
  <Badge
    color="green"
    variant="soft"
    size="2"
    style={{ borderRadius: 9999, display: "inline-flex", alignItems: "center", gap: 4 }}
  >
    <CheckCircledIcon width={14} height={14} />
    Remote EU
  </Badge>
)}
{hasRemoteEuLikely && (
  <Badge
    color="green"
    variant="soft"
    size="2"
    style={{ borderRadius: 9999, display: "inline-flex", alignItems: "center", gap: 4 }}
  >
    <CheckCircledIcon width={14} height={14} />
    Remote EU likely
  </Badge>
)}
```

**Note on globals.css override:** The project's `globals.css` applies `border-radius: 0` to `.rt-Badge`. Use the inline `style={{ borderRadius: 9999 }}` to override for the pill badge only. This is intentional and documented in `ui-design-notes.md`.

**No badge when:** `companyJobs` is empty, or all jobs have `is_remote_eu === false`, or all have `remote_eu_confidence === 'low'`.

**Do not add to:** the Overview tab chip row (category/size/location) — mixing a green trust badge into that neutral gray row dilutes both signals.

### 5.2 Job Cards in Jobs Tab

Replace the current separator-divided flat list (lines 1179–1208) with card-based rows. Build a `CompanyJobCard` function within `company-detail.tsx` (no new file needed — component is page-specific).

```tsx
function CompanyJobCard({
  job,
  companyName,
}: {
  job: (typeof companyJobs)[number];
  companyName: string;
}) {
  const jobId = extractJobSlug(job.external_id, job.id);
  const jobHref = `/jobs/${jobId}?company=${job.company_key}&source=${job.source_kind}`;

  const requiredSkills = (job.skills ?? []).filter((s) => s.level === "required");
  const otherSkills = (job.skills ?? []).filter((s) => s.level !== "required");
  const displaySkills = requiredSkills.length > 0 ? requiredSkills : otherSkills;

  const formattedDate = job.publishedAt
    ? new Date(job.publishedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const isRemoteEuConfirmed =
    job.is_remote_eu === true && job.remote_eu_confidence === "high";
  const isRemoteEuLikely =
    job.is_remote_eu === true && job.remote_eu_confidence === "medium";

  return (
    <Card asChild>
      <Link
        href={jobHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${job.title} at ${companyName}`}
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
      >
        <Box p="3">
          <Flex justify="between" align="start" gap="3">
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text
                size="3"
                weight="bold"
                style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {job.title}
              </Text>
              <Flex gap="2" mt="1" align="center" wrap="wrap">
                {job.location && (
                  <Flex align="center" gap="1">
                    <GlobeIcon width={12} height={12} style={{ color: "var(--gray-9)", flexShrink: 0 }} />
                    <Text size="2" color="gray">{job.location}</Text>
                  </Flex>
                )}
                {isRemoteEuConfirmed && (
                  <Badge color="green" variant="soft" size="1">Remote EU</Badge>
                )}
                {isRemoteEuLikely && (
                  <Badge color="green" variant="soft" size="1">Remote EU likely</Badge>
                )}
              </Flex>
              {displaySkills.length > 0 && (
                <Flex gap="1" mt="2" wrap="wrap">
                  {displaySkills.slice(0, 3).map((s) => (
                    <Badge key={s.tag} color="gray" variant="surface" size="1">
                      {s.tag}
                    </Badge>
                  ))}
                  {displaySkills.length > 3 && (
                    <Text size="1" color="gray">+{displaySkills.length - 3}</Text>
                  )}
                </Flex>
              )}
            </Box>
            <Flex direction="column" align="end" gap="1" style={{ flexShrink: 0 }}>
              {formattedDate && (
                <Text size="1" color="gray" style={{ whiteSpace: "nowrap" }}>
                  {formattedDate}
                </Text>
              )}
            </Flex>
          </Flex>
        </Box>
      </Link>
    </Card>
  );
}
```

**Render in Jobs tab:**

```tsx
<Flex direction="column" gap="2">
  {companyJobs.map((job) => (
    <CompanyJobCard key={job.id} job={job} companyName={company.name} />
  ))}
</Flex>
```

Replace the `<Box key={job.id}>` + `<Separator>` pattern at lines 1184–1205 entirely.

### 5.3 Header Stats Bar

**Current code (lines 917–940) to replace:**

Remove the entire block:
```tsx
<Text size="2" color="gray">• Score <Strong>{scoreText}</Strong></Text>
<Text size="2" color="gray">• ATS <Strong>{...}</Strong></Text>
<Text size="2" color="gray">• Tags <Strong>{...}</Strong></Text>
```

**Replace with (within the existing `<Flex align="center" gap="3" mt="2" wrap="wrap">`):**

```tsx
{/* Keep website link as-is */}

{/* Open roles count — replaces ATS + Tags + Score in header for all users */}
{companyJobs.length > 0 && (
  <Badge color="indigo" variant="soft" size="1">
    {companyJobs.length} open {companyJobs.length === 1 ? "role" : "roles"}
  </Badge>
)}

{/* Admin-only: score — plain text, not a badge */}
{isAdmin && (
  <Text size="1" color="gray">
    confidence {scoreText}
  </Text>
)}
```

**Also add `color="indigo"` and `aria-label` to the existing Avatar (line 878–883):**

```tsx
<Avatar
  size={{ initial: "6", sm: "8" }}
  src={company.logo_url || undefined}
  fallback={initialsFromName(company.name)}
  radius="large"
  color="indigo"
  aria-label={`${company.name} company logo`}
/>
```

**And wrap company name + Remote EU badge in a shared Flex:**

```tsx
<Flex align="center" gap="2" wrap="wrap">
  <Heading size={{ initial: "6", sm: "8" }} style={{ lineHeight: 1.1 }}>
    {company.name}
  </Heading>
  {hasRemoteEuConfirmed && (
    <Badge color="green" variant="soft" size="2" style={{ borderRadius: 9999, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <CheckCircledIcon width={14} height={14} />
      Remote EU
    </Badge>
  )}
  {hasRemoteEuLikely && (
    <Badge color="green" variant="soft" size="2" style={{ borderRadius: 9999, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <CheckCircledIcon width={14} height={14} />
      Remote EU likely
    </Badge>
  )}
</Flex>
```

### 5.4 Tech Stack Section

Surface `company.ashby_enrichment.tech_signals` as a dedicated section in the Overview tab's right column, between Industries and Tags. Currently this data is buried inside the admin-looking "Ashby Enrichment" section.

**Add to the right column (after Industries, before Tags) — public facing:**

```tsx
{company.ashby_enrichment?.tech_signals?.length ? (
  <SectionCard title="Tech stack">
    <Flex gap="2" wrap="wrap">
      {company.ashby_enrichment.tech_signals.map((sig) => (
        <Badge key={sig} color="violet" variant="soft" size="1">
          {sig}
        </Badge>
      ))}
    </Flex>
  </SectionCard>
) : null}
```

**Remove tech_signals from the "Ashby Enrichment" section** (which becomes admin-only). The "Ashby Enrichment" section at lines 1035–1082 should be gated: `{isAdmin && company.ashby_enrichment?.enriched_at ? (...) : null}`. The tech_signals within it are now surfaced separately in public view.

### 5.5 Empty States

**About section — no description (replaces the conditional null at lines 987–998):**

Always render the About SectionCard. When `company.description` is null:

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
        No description available for this company yet.
      </Text>
    </Flex>
  )}
</SectionCard>
```

Import `FileTextIcon` from `@radix-ui/react-icons` (add to existing import at line 36).

**Jobs tab — no open roles (replaces Callout at lines 1172–1177):**

```tsx
<Flex direction="column" align="center" gap="3" py="8">
  <MagnifyingGlassIcon width={32} height={32} style={{ color: "var(--gray-6)" }} />
  <Box style={{ textAlign: "center" }}>
    <Text size="3" weight="medium" as="p">No open roles right now</Text>
    <Text size="2" color="gray" as="p" mt="1">
      This company has no active listings on nomadically.work. Check their careers page directly.
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

`MagnifyingGlassIcon` is already imported at line 45. No new icon import needed.

**Contacts tab empty state (admin-only, replaces Callout at approx. line 567–572):**

```tsx
<Flex direction="column" align="center" gap="3" py="8">
  <PersonIcon width={32} height={32} style={{ color: "var(--gray-6)" }} />
  <Box style={{ textAlign: "center" }}>
    <Text size="3" weight="medium" as="p">No contacts yet</Text>
    <Text size="2" color="gray" as="p" mt="1">
      Use "Import from LinkedIn" below to add hiring contacts for this company.
    </Text>
  </Box>
</Flex>
```

Import `PersonIcon` from `@radix-ui/react-icons`.

### 5.6 Score Display (admin vs public)

**Public users:** Remove the Score row from `KeyFactsCard` entirely. The `KeyFactsCard` component (lines 270–365) accepts `score` as a prop. Add an `isAdmin` prop and gate the score row:

```tsx
function KeyFactsCard({
  canonicalDomain,
  score,
  careerPagesCount,
  isAdmin,          // ADD THIS PROP
}: {
  canonicalDomain?: string | null;
  score?: number | null;
  careerPagesCount: number;
  isAdmin?: boolean;  // ADD THIS
}) {
  // ...
  const rows = [
    // Domain row — keep for all users
    // Score row — admin only
    ...(isAdmin && typeof score === "number" && Number.isFinite(score) ? [{
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
            {score.toFixed(2)}
          </Text>
        </Flex>
      ),
    }] : []),
    // Career pages row — keep for all users, rename label
    { label: "Job boards", value: careerPagesCount },
  ];
```

Pass `isAdmin` from the calling site:
```tsx
<KeyFactsCard
  canonicalDomain={company.canonical_domain}
  score={company.score}
  careerPagesCount={company.ats_boards?.length ?? 0}
  isAdmin={isAdmin}
/>
```

**Also rename the card title** from "Key facts" to "At a glance" (line 327 in the component).

---

## 6. Content Strategy

### 6.1 Label Renames

| Current | Proposed | File location |
|---|---|---|
| "Score" (header) | Removed from header for non-admins; "confidence {val}" for admins | `company-detail.tsx:922` |
| "ATS N" (header) | Removed; replaced by "N open roles" Badge | `company-detail.tsx:929–931` |
| "Tags N" (header) | Removed entirely | `company-detail.tsx:935–938` |
| "Key facts" (section card title) | "At a glance" | `company-detail.tsx:327` |
| "Score" (KeyFactsCard row) | "Crawl confidence" (admin only) | `company-detail.tsx:~290` |
| "Career pages" (KeyFactsCard row) | "Job boards" | `company-detail.tsx:~303` |
| "Ashby Enrichment" (section title) | Admin-only; title stays for admin context | `company-detail.tsx:1036` |
| "Score breakdown" (section title) | "Data quality notes" (admin only) | `company-detail.tsx:1143` |
| "Services" (section title) | Admin-only; remove from public. Optionally rename "Areas of work" for admin | `company-detail.tsx:1001` |
| "Career pages (N)" (section title) | "Job boards" | `company-detail.tsx:1086` |
| Tab "Contacts" | Hide from non-admins; label stays for admin | `company-detail.tsx:967` |
| Category chip: "PRODUCT" | "Product company" | Requires a mapping function |
| Category chip: "CONSULTANCY" | "Consultancy" |  |
| Category chip: "STAFFING" | "Staffing agency" |  |
| Category chip: "AGENCY" | "Agency" |  |
| Category chip: "DIRECTORY" | "Directory" |  |
| Category chip: "OTHER" / "UNKNOWN" | Omit chip entirely |  |

**Category mapping function** (add near `initialsFromName`):

```tsx
const CATEGORY_LABELS: Record<string, string> = {
  PRODUCT: "Product company",
  CONSULTANCY: "Consultancy",
  STAFFING: "Staffing agency",
  AGENCY: "Agency",
  DIRECTORY: "Directory",
};

function categoryLabel(category?: string | null): string | null {
  if (!category) return null;
  return CATEGORY_LABELS[category] ?? null;
}
```

Render: `{categoryLabel(company.category) ? <Chip>{categoryLabel(company.category)}</Chip> : null}`

### 6.2 Empty State Copy

| Situation | Copy |
|---|---|
| No company description | "No description available for this company yet." |
| No open jobs (Jobs tab) | "No open roles right now. This company has no active listings on nomadically.work. Check their careers page directly." |
| No open jobs + no ATS board URL | "No open roles right now. This company has no active listings on nomadically.work." |
| No contacts (admin Contacts tab) | "No contacts yet. Use 'Import from LinkedIn' below to add hiring contacts for this company." |
| Company not found (existing 404 path) | Keep existing Callout "Company not found." |

### 6.3 Remote EU Badge Copy

| Condition | Badge copy | Color |
|---|---|---|
| `is_remote_eu === true` AND `remote_eu_confidence === 'high'` | "Remote EU" | `color="green"` |
| `is_remote_eu === true` AND `remote_eu_confidence === 'medium'` | "Remote EU likely" | `color="green"` |
| Any other state | No badge shown | — |

Header badge: `size="2"` with `CheckCircledIcon` (14x14). Per-job card badge: `size="1"`, no icon (consistent with `jobs-list.tsx` existing pattern).

---

## 7. Responsive Design Breakpoints

All breakpoints use Radix responsive prop syntax. No new CSS media queries.

### Header

| Viewport | Logo size | Name size | Remote EU badge | Stats row |
|---|---|---|---|---|
| `< 520px` (initial) | `size="6"` (48px) | `size="6"` | Below name | Wraps to multiple rows |
| `>= 520px` (sm) | `size="8"` (96px) | `size="8"` | Inline with name | Single row |

Implementation:
```tsx
<Avatar size={{ initial: "6", sm: "8" }} ... />
<Heading size={{ initial: "6", sm: "8" }} ... />
```

### Enhance button (admin-only)

On mobile, move the Enhance button out of the header row into a full-width row below:

```tsx
{/* Desktop: inline in header row */}
{isAdmin && (
  <Box display={{ initial: "none", sm: "block" }}>
    <Button onClick={handleEnhance} color="orange" variant="solid" disabled={isEnhancing}>
      <MagicWandIcon />
      {isEnhancing ? "Enhancing…" : "Enhance"}
    </Button>
  </Box>
)}
{/* Mobile: full-width row below header */}
{isAdmin && (
  <Box display={{ initial: "block", sm: "none" }}>
    <Button onClick={handleEnhance} color="orange" variant="solid" disabled={isEnhancing} style={{ width: "100%" }}>
      <MagicWandIcon />
      {isEnhancing ? "Enhancing…" : "Enhance"}
    </Button>
  </Box>
)}
```

### Overview tab 2-column layout

Existing `direction={{ initial: "column", md: "row" }}` is correct — no change.

On mobile (column direction), right column renders above left column for faster access to quick facts:

```tsx
<Box style={{ flex: 2, minWidth: 0, order: 1 }}>  {/* About + Tech stack + Job boards */}
<Box style={{ flex: 1, minWidth: 0, order: 0 }}>  {/* At a glance + Industries + Tags (admin) */}
```

CSS `order` only affects visual order in column direction; in row direction (desktop) source order matches visual order, so no unintended reordering occurs.

### Tab labels on narrow screens

Radix `Tabs.List` scrolls horizontally on overflow by default. With the proposed order "Jobs (N) | Overview | Contacts (admin)", the most important tab is first, so horizontal scroll is acceptable. Do not abbreviate tab labels.

---

## 8. Accessibility Requirements

### ARIA labels to add

| Element | Current state | Fix | File location |
|---|---|---|---|
| `<Avatar>` | No `aria-label` | Add `aria-label={`${company.name} company logo`}` | `company-detail.tsx:879` |
| `<Tabs.Root>` | No `aria-label` | Add `aria-label="Company information"` | `company-detail.tsx:964` |
| `<Tabs.List>` | No `aria-label` | Add `aria-label="Company sections"` | `company-detail.tsx:965` |
| `<Card asChild><Link>` job rows | Link text = job title only | Add `aria-label={`${job.title} at ${companyName}`}` | New `CompanyJobCard` |
| `CollapsibleChips` expand button | No `aria-expanded` | Add `aria-expanded={expanded}` to the `<Button>` | Lines ~153–165 |
| `CollapsibleList` expand button | No `aria-expanded` | Add `aria-expanded={expanded}` to the `<Button>` | Lines ~193–205 |
| `<TextField.Root>` in ContactsTab | No `aria-label` | Add `aria-label="Search contacts"` | Lines ~417–450 |

### Color contrast fixes

| Location | Issue | Fix |
|---|---|---|
| `SectionCard` title (line 90–91) | `fontWeight: 600` at 14px on card surface — borderline AA | Change `fontWeight: 600` to `fontWeight: 700` |
| `KeyFactsCard` label column (line 340) | `size="1"` (12px) gray text below AA threshold | Change `size="1"` to `size="2"` for label column |
| Contact links in ContactsTab | Not distinguishable from body text by color alone | Add `style={{ textDecoration: "underline" }}` to `RadixLink` elements in contact meta rows |

### Keyboard navigation

Radix `Tabs` handles arrow key navigation automatically. No additional code needed. The new `<Card asChild><Link>` job card pattern is fully keyboard-navigable (Tab to focus, Enter/Space to activate) via the anchor element.

---

## 9. Implementation Plan (prioritized)

---

**P0 — Do first (highest impact, lowest effort — no schema changes required):**

- [ ] **Tab reorder + default tab + Contacts gate**
  - File: `src/components/company-detail.tsx`, lines 964–973
  - Change `defaultValue="overview"` to `defaultValue={companyJobs.length > 0 ? "jobs" : "overview"}`
  - Reorder `<Tabs.Trigger>` elements: Jobs first, then Overview, then Contacts
  - Wrap the Contacts `<Tabs.Trigger>` and `<Tabs.Content>` both in `{isAdmin && ...}`
  - Add `aria-label="Company information"` to `<Tabs.Root>`
  - Add `aria-label="Company sections"` to `<Tabs.List>`
  - Add `{companyJobs.length > 0 ? \` (${companyJobs.length})\` : ""}` to Jobs trigger label
  - Data needed: `companyJobs` (already available), `isAdmin` (already available)

- [ ] **Replace header stats with open roles badge + Remote EU badge**
  - File: `src/components/company-detail.tsx`, lines 886–946
  - Step 1: Add `CheckCircledIcon` and `FileTextIcon` to the `@radix-ui/react-icons` import at line 36
  - Step 2: Add computed vars before the return statement (after `scoreText` useMemo):
    ```tsx
    const hasRemoteEuConfirmed = companyJobs.some(
      (j) => j.is_remote_eu === true && j.remote_eu_confidence === "high"
    );
    const hasRemoteEuLikely = !hasRemoteEuConfirmed && companyJobs.some(
      (j) => j.is_remote_eu === true && j.remote_eu_confidence === "medium"
    );
    ```
  - Step 3: Wrap `<Heading size="8">` and the Remote EU badges in a `<Flex align="center" gap="2" wrap="wrap">` (see Section 5.3)
  - Step 4: Remove lines 917–939 entirely (Score bullet, ATS bullet, Tags bullet, separator bullets)
  - Step 5: Add open roles Badge and admin-only score Text in their place (see Section 5.3)
  - Step 6: Add `color="indigo"` and `aria-label` to `<Avatar>` at line 878

- [ ] **Add `isAdmin` prop to `KeyFactsCard` and hide Score from non-admins**
  - File: `src/components/company-detail.tsx`, lines 270–365
  - Add `isAdmin?: boolean` to `KeyFactsCard` prop type
  - Gate the Score row: only include it in `rows` array when `isAdmin === true`
  - Rename score row label from "Score" to "Crawl confidence"
  - Rename career pages row label from "Career pages" to "Job boards"
  - Rename section title from "Key facts" to "At a glance" (line 327)
  - Pass `isAdmin={isAdmin}` from the usage site at line 1010
  - Add colored Badge + raw score number for admin display (see Section 5.6)

---

**P1 — High value:**

- [ ] **Redesign Jobs tab with `CompanyJobCard` component**
  - File: `src/components/company-detail.tsx`
  - Add `CompanyJobCard` function component (see full code in Section 5.2)
  - Replace lines 1179–1208 (the current `companyJobs.map` with flat separator list)
  - Replace with `<Flex direction="column" gap="2">{companyJobs.map(job => <CompanyJobCard key={job.id} job={job} companyName={company.name} />)}</Flex>`
  - No GraphQL changes needed — `is_remote_eu`, `remote_eu_confidence`, `skills` are already in `GetJobs.graphql`
  - Note: Do NOT add salary display yet (requires `GetJobs.graphql` + resolver change — track as P2)

- [ ] **Improve Jobs tab empty state**
  - File: `src/components/company-detail.tsx`, lines 1171–1177
  - Replace the plain `<Callout.Root>` with the centered empty state from Section 5.5
  - Include link to `company.ats_boards[0].url` if available (data already in query)

- [ ] **Surface Tech stack section in Overview right column**
  - File: `src/components/company-detail.tsx`, lines 1008–1031 (right column Box)
  - Add Tech stack `<SectionCard>` after Industries, before Tags
  - Uses `company.ashby_enrichment.tech_signals` — already fetched, no GraphQL change
  - Gate the "Ashby Enrichment" raw section (lines 1035–1082) behind `{isAdmin && ...}`
  - This removes the confusing "Ashby Enrichment" label from public view while promoting the tech signal data

- [ ] **Always-render About section with empty state**
  - File: `src/components/company-detail.tsx`, lines 987–998
  - Remove the outer `{company.description ? ... : null}` conditional
  - Render `<SectionCard title="About">` always, with the description text or the `FileTextIcon` empty state inside
  - Add `FileTextIcon` to the `@radix-ui/react-icons` import (part of P0 step 1 above)

- [ ] **Gate Tags section behind `isAdmin`**
  - File: `src/components/company-detail.tsx`, lines 1025–1029
  - Wrap `{company.tags?.length ? <SectionCard title="Tags">...</SectionCard> : null}` in `{isAdmin && ...}`
  - One line change

- [ ] **Gate Services section and Score breakdown behind `isAdmin`**
  - File: `src/components/company-detail.tsx`, lines 1000–1004 (Services) and 1142–1152 (Score breakdown)
  - Wrap both in `{isAdmin && ...}`
  - Rename "Score breakdown" to "Data quality notes" (line 1143)

---

**P2 — Polish:**

- [ ] **Fix color contrast in `SectionCard` and `KeyFactsCard`**
  - File: `src/components/company-detail.tsx`, line 90 — change `fontWeight: 600` to `fontWeight: 700`
  - File: `src/components/company-detail.tsx`, line 340 — change `size="1"` to `size="2"` for label column Text elements

- [ ] **Avatar responsive size + color fix**
  - File: `src/components/company-detail.tsx`, line 878–883
  - Change `size="8"` to `size={{ initial: "6", sm: "8" }}`
  - Add `color="indigo"` (fixes random fallback color across page loads)
  - Already captured in P0 `aria-label` change — combine into one Avatar prop update

- [ ] **Category chip mapping to human-readable labels**
  - File: `src/components/company-detail.tsx`
  - Add `CATEGORY_LABELS` mapping and `categoryLabel()` function (see Section 6.1)
  - Update the chip renders at line 943: `{categoryLabel(company.category) ? <Chip>{categoryLabel(company.category)}</Chip> : null}`
  - Omit chip entirely for `OTHER` and `UNKNOWN` categories

- [ ] **Mobile Overview column order (right column above left on mobile)**
  - File: `src/components/company-detail.tsx`, lines 985 and 1008
  - Add `style={{ order: 1 }}` to the left column Box (About + Tech stack)
  - Add `style={{ order: 0 }}` to the right column Box (At a glance + Industries)

- [ ] **Add `aria-expanded` to collapsible buttons**
  - File: `src/components/company-detail.tsx`, lines ~153–165 and ~193–205 (CollapsibleChips and CollapsibleList)
  - Add `aria-expanded={expanded}` prop to the `<Button>` in each component

- [ ] **Add `aria-label` to ContactsTab search field**
  - File: `src/components/company-detail.tsx`, within `ContactsTab` function (~line 417)
  - Add `aria-label="Search contacts"` to `<TextField.Root>`

- [ ] **Rename Career pages section to "Job boards"**
  - File: `src/components/company-detail.tsx`, line 1086
  - Change `title={\`Career pages (${company.ats_boards.length})\`}` to `title="Job boards"`

- [ ] **Gate ATS board confidence percentage behind `isAdmin`**
  - File: `src/components/company-detail.tsx`, lines 1090–1104 (the `confidence !== null ? <Badge>...% confidence</Badge>` block)
  - Wrap in `{isAdmin && confidence !== null ? ...}`

- [ ] **Add underline to contact links for non-color distinguishability**
  - File: `src/components/company-detail.tsx`, within `ContactsTab` (~lines 602–643)
  - Add `style={{ textDecoration: "underline" }}` to `RadixLink` elements in contact meta rows

- [ ] **Salary in job cards (requires GraphQL change)**
  - File: `src/graphql/GetJobs.graphql` — add `ashby_compensation { scrapeableCompensationSalarySummary compensationTierSummary }` to the jobs fragment
  - Run `pnpm codegen` to regenerate types
  - Update `CompanyJobCard` to render salary as `<Text size="2" color="green" weight="medium">` in the right column
  - Verify resolver returns compensation data for the `GetJobs` query (check `src/apollo/resolvers/job/`)

---

**P3 — Future:**

- [ ] **Admin Enhance button repositioned on mobile to full-width row below header**
  - File: `src/components/company-detail.tsx`, lines 950–960
  - Add responsive `display={{ initial: "none", sm: "block" }}` wrapper for inline version
  - Add separate `display={{ initial: "block", sm: "none" }}` full-width version
  - Low urgency: admins primarily use desktop

- [ ] **Improved empty state for Contacts tab (admin)**
  - File: `src/components/company-detail.tsx`, within `ContactsTab` (~lines 566–572)
  - Replace `<Callout.Root>` with centered `PersonIcon` + text + CTA (see Section 5.5)
  - Import `PersonIcon` from `@radix-ui/react-icons`

- [ ] **Data health panel for admins in Overview tab**
  - File: `src/components/company-detail.tsx`
  - Add admin-only `<SectionCard title="Data health">` below the score breakdown section
  - Show: `facts_count`, `snapshots_count`, `last_seen_capture_timestamp` (already in GraphQL fragment — verify they are included in `useGetCompanyQuery` variables/fragment)
  - If not in the current fragment, add them to `src/graphql/GetCompany.graphql` and run `pnpm codegen`

- [ ] **"Follow company" / save action**
  - No schema support currently (`UserSettings.excluded_companies` exists but no follow mechanism)
  - Requires new GraphQL mutation + `UserSettings` schema addition
  - Track as a separate story

- [ ] **Companies list page — remote-EU filter and role-count sorting**
  - Separate page (`src/app/companies/page.tsx`)
  - Out of scope for this spec; note as follow-up work

---

## Alignment Check

- [x] **Remote EU signal missing gap addressed:** Section 5.1 specifies header badge derived from existing `companyJobs` data. Section 5.2 specifies per-job badge in the new `CompanyJobCard`. Both are P0/P1 items.

- [x] **Radix UI constraints respected:** All components use existing Radix Themes primitives (`Card`, `Badge`, `Flex`, `Box`, `Text`, `Heading`, `Avatar`, `Tabs`). No Tailwind, no custom CSS classes, no `.yc-*` classes introduced. Inline `style={{ borderRadius: 9999 }}` override specified for pill badges where `globals.css` would otherwise override Radix defaults.

- [x] **All P0 items achievable with existing GraphQL data:** `is_remote_eu`, `remote_eu_confidence`, and `skills` are already in `GetJobs.graphql` (confirmed at lines 29–34 of that file). `companyJobs` is already fetched and filtered in the component. No `pnpm codegen` run required for P0 or P1 items. Salary display (P2) is the only item that requires a GraphQL document change.

- [x] **Contacts tab gating clearly specified:** `<Tabs.Trigger value="contacts">` and `<Tabs.Content value="contacts">` are both wrapped in `{isAdmin && ...}`. This is specified in Section 4.1 and listed as the first P0 task. The `ContactsTab` component internals (`isAdmin` prop for the LinkedIn import button) are unchanged.

- [x] **Score hiding clearly specified:** Section 5.6 specifies `isAdmin` prop addition to `KeyFactsCard`, the admin-only Score row with label rename to "Crawl confidence", and removal of Score from the public header stats row. Listed as P0 task 3.
