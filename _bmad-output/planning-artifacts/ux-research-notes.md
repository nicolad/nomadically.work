# UX Research Notes: Company Profile Page (`/companies/[key]`)

**Date:** 2026-02-24
**Author:** UX Researcher (Agent Teams)
**Scope:** `src/components/company-detail.tsx`, `src/components/companies-list.tsx`, `schema/companies/schema.graphql`, `schema/jobs/schema.graphql`

---

## 1. User Problem Statement

### Who visits a company profile page and why?

The `/companies/[key]` page is currently reached via two entry paths:
1. A job seeker clicks the company name link from a job listing (visible in `src/app/applications/[id]/page.tsx` and the recent commit "Link company name on application pages to company profile").
2. An admin or power user navigates directly from `/companies` list.

There is no prominent "companies" discovery surface for casual users. The `/companies` page is an admin-style dense list with no marketing copy, no filtering by remote-EU friendliness, and no sorting by "most open roles." The list is ordered by name alphabetically by default. This means job seekers rarely browse to company pages organically — they arrive only after already finding a job.

### What are users trying to accomplish?

A job seeker landing on a company page is performing a **trust and fit evaluation**. They want to answer four concrete questions:

1. Is this company genuinely remote-EU? (The core question this platform exists to answer.)
2. What kind of company is this? (Stage, size, what they build.)
3. Are there roles I could apply to right now?
4. Will I enjoy working there? (Culture signals, tech stack, industry.)

A recruiter or admin doing competitive intelligence wants:
1. What ATS system does this company use?
2. How complete is our data on them?
3. What is their open role velocity?

### What makes users leave without getting value?

Based on code analysis of the current `company-detail.tsx`:

**The page fails job seekers on question 1 immediately.** There is no "Remote EU" signal anywhere on the page. The platform's entire value proposition — that these are verified remote-EU jobs — is invisible at the company level. A user has no way to know if this company has one remote-EU role or 20, or whether remote-EU eligibility is consistent across their postings.

**The "Score" field is shown without explanation.** The header shows "Score 0.87" next to a globe icon. No user other than the platform admin knows what this score means. The `score_reasons` array exists in the schema but is rendered as a collapsed "Score breakdown" section at the very bottom of the Overview tab — the last item users will see.

**The Jobs tab is a plain title list.** Job titles appear with a date and location but no salary, no remote signal per-job, no skill tags, no seniority level. There is no CTA to apply from the job list. Users must click through to the individual job page. This is an unnecessary extra step when the conversion goal is clear.

**The Contacts tab is admin-only in practice.** It exposes personal emails, LinkedIn URLs, and "do not contact" flags. For a public-facing company profile page, showing recruiter contacts is a mismatch — it signals "this page is for salespeople, not job seekers." The import-from-LinkedIn dialog is an admin tool exposed in the same tab.

**The "Services" section is machine-generated taxonomy.** The `services` field (e.g., ["Software Development", "IT Staffing", "Consulting"]) is a crawler-extracted list, not human-written copy. Displaying it as a plain bullet list labeled "Services" misrepresents it as official company content. To a job seeker, this looks like filler.

**The "Ashby Enrichment" section breaks the user's mental model.** A section titled "Ashby Enrichment" with fields like "Size signal," "Tech," and an enriched timestamp reads as an internal admin panel accidentally rendered on a public page. Users do not know what Ashby is.

**No open role count in the header.** The header shows ATS board count (number of career pages, not number of open jobs) and tag count — neither of which a job seeker cares about. The number of open remote-EU roles is the most relevant stat and it is not surfaced.

---

## 2. User Personas

### Persona 1: "The Targeted Applicant" — EU Remote Job Seeker

**Name:** Marta, 31, senior software engineer in Warsaw, Poland.
**Situation:** Has 6 years of backend experience. Is actively job hunting for a fully remote position at a product company (not consultancy) headquartered in the EU or with a European entity that can employ her. She found nomadically.work via a Hacker News post. She is evaluating 4-5 companies in parallel.

**Goal on this page:**
Quickly determine if this company is a legitimate remote-EU employer before investing time in writing a cover letter.

**Key frustrations with the current page:**
- She sees a "Score 0.87" but has no idea what it means. Is 0.87 good? What does it score?
- She cannot tell at a glance whether any of the listed jobs are actually classified as remote-EU. The Jobs tab shows "Remote" in the location field for some jobs but not all, and there is no consistent badge or indicator.
- The category chip says "PRODUCT" which is useful, but it is styled identically to "Poland" and "51-200" — she cannot immediately distinguish the company type from the location.
- The "Services" section lists ["Cloud Infrastructure", "Developer Tools"] — she reads this as the company's product areas but it is actually a taxonomy label from the crawler, which may be inaccurate.
- The "Contacts" tab shows 12 contacts including the Head of Engineering's personal email. This makes the platform feel like a sales tool, not a job board. She did not come here to cold-email someone.
- There is no "Follow this company" or "Save" action. She has no way to track the company without applying to a specific job.

**What success looks like:**
Within 30 seconds she can see: (1) a green "Remote EU verified" badge, (2) N open roles that match her background, (3) the tech stack the company uses, (4) one-click path to view and apply to a role.

---

### Persona 2: "The Skeptical Browser" — EU Remote Job Seeker Evaluating Platform Trust

**Name:** Tobias, 27, frontend developer in Berlin looking for his first fully-remote job. He is not actively job hunting but is building a shortlist of companies he would apply to if the right role opened. He found nomadically.work via a LinkedIn post.

**Goal on this page:**
Understand the company well enough to decide whether to bookmark it for future reference.

**Key frustrations with the current page:**
- The About section is often empty. When it is empty, the section is conditionally hidden (`{company.description ? (<SectionCard...>) : null}`) with no empty state messaging. This makes the page feel sparse and unfinished, not like a company page he would trust.
- He wants to know the tech stack. The "Ashby Enrichment > Tech" section has this data (`tech_signals` from `ashby_enrichment`), but it is styled as a developer-facing internal section with a timestamp ("Enriched 2025-12-03"). The data is there but the presentation destroys its credibility.
- The tab order (Overview | Contacts | Jobs) puts Contacts before Jobs. He wants to browse jobs first, contacts never. The tab ordering signals that contacts are more important than job listings.
- He cannot filter the company job list by department or role type.
- He sees no indication of how frequently this company posts new remote-EU roles. Is this a company that posts once a year or every week?

**What success looks like:**
He finds the tech stack prominently displayed, sees 2-3 open roles he could theoretically apply to, and can bookmark the company page URL to share with a friend or return to later.

---

### Persona 3: "The Data Steward" — Internal Admin Managing Company Records

**Name:** (Internal user, no public persona name needed)
**Role:** Platform administrator maintaining data quality.
**Situation:** Reviewing newly enriched companies, checking ATS board coverage, triggering re-enrichment on stale records.

**Goal on this page:**
Audit the completeness and accuracy of a company record. Trigger enrichment when data is stale. Verify ATS board active status.

**Key frustrations with the current page:**
- The "Enhance" button (orange, admin-only) is in the top-right header, far from the data it affects. After clicking it, the success message ("Company enhanced successfully") appears at the top but there is no visual diff showing what changed.
- The `score_reasons` breakdown is valuable for auditing but is buried at the bottom of the Overview tab after Career pages. It should be closer to the score display.
- The `last_seen_crawl_id`, `last_seen_capture_timestamp`, and `last_seen_source_url` are in the GraphQL fragment but not rendered anywhere on the page. Staleness signals are invisible.
- The Career pages section shows ATS boards with confidence percentages ("73% confidence") but active/inactive status badges are easy to miss. There is no aggregate health summary.
- The `facts_count` and `snapshots_count` fields exist on the Company type but are not used on this page. The admin has no way to see how many evidence records back this company's data without going to the GraphQL playground.

**What success looks like:**
A single "Data health" panel visible only to admins showing: last crawled date, facts count, snapshots count, ATS board health summary, score with inline reasons. One-click enhance button adjacent to the health panel.

---

## 3. User Journeys

### Journey 1: Job Seeker Landing from a Job Listing

**Entry point:** User is on a job detail page (`/jobs/[id]`) and clicks the company name link (added in commit "Link company name on application pages to company profile"). This is currently the primary way non-admin users reach a company page.

**Step 1 — Arrives on company page**
The user sees the company logo (or initials fallback), name as a large heading, and the website URL. Below that: "Score 0.87 • ATS 1 • Tags 12". Below that: three chips — "PRODUCT", "51-200", "Warsaw, Poland".

**Cognitive load at step 1:** High. The user must decode "Score," "ATS," and "Tags" simultaneously. None of these three secondary stats answer the question they arrived to answer ("Is this a real remote-EU employer?"). The category chip "PRODUCT" is useful but indistinguishable visually from the location and size chips.

**Step 2 — Scans the Overview tab (default)**
The user sees: About (description, if present), Services (crawler taxonomy), then in the right column: Key Facts (domain, score, career pages count), Industries (chips), Tags (chips). Below the fold: Ashby Enrichment, Career pages, Score breakdown.

**Cognitive load at step 2:** Medium-high. The information is organized by data type (facts, enrichment, boards) rather than by user need (trust signals, role fit, action). The most actionable content — job listings — is hidden behind a tab click.

**Step 3 — Clicks "Jobs" tab**
The user sees a flat list of job titles with location and date. No salary. No remote-EU badge per job. No skills. No apply button — they must click the title to navigate to the job detail page.

**Step 4 — Clicks a job title, lands on `/jobs/[id]`**
Now they can apply. But the path was: job detail → company page → jobs tab → click job → job detail. They have gone in a circle and done two extra page loads.

**Failure modes:**
- User abandons at step 1 because they cannot quickly verify remote-EU status.
- User abandons at step 2 because the About section is empty and Services looks like filler.
- User arrives at Jobs tab but finds no jobs (the tab shows an empty Callout) and there is no explanation of why or when jobs might appear.
- User wants to apply directly from the Jobs tab but cannot — they must click through to the job detail page first.

**Ideal journey:**
Job listing → company page → immediately see: Remote EU verified badge, open role count, tech stack, description → click a job card (not a bare title) that has enough info to decide without another page load → land on job detail page with apply CTA.

---

### Journey 2: Browsing Companies to Build a Remote-EU Shortlist

**Entry point:** User navigates to `/companies` directly (via nav menu or bookmark).

**Step 1 — Companies list**
The list shows company names in alphabetical order. There is a search box but no filters for category, size, industry, or — critically — remote-EU job availability. The list shows ATS vendor tags as secondary metadata, which is irrelevant to job seekers.

**Step 2 — Clicks a company**
The company profile page loads (no loading skeleton on the `[key]/page.tsx` beyond the Suspense spinner). The user is looking for a quick "is this company worth saving?" answer.

**Step 3 — Assessment**
The user needs to see: (a) what the company does, (b) whether they hire remotely in the EU, (c) whether there are currently open roles. All three require multiple sections/tabs to answer with the current IA.

**Step 4 — No save/bookmark action**
There is no "Follow company" or "Save to shortlist" action. The user either copies the URL, or relies on browser history. There is a `UserSettings.excluded_companies` field in the schema but no "follow companies" equivalent.

**Failure modes:**
- Companies with no description, no jobs, and a raw tech name as their listing (e.g., the company key "ashby" showing as a page title) appear alongside polished company records with no differentiation in quality.
- No way to filter for companies that currently have remote-EU open roles.
- No way to sort by "most open roles" or "recently posted."

**Ideal journey:**
Companies list with filter chips (Product / Consultancy / Staffing, company size, "has open roles now") → click a company card that already shows role count and a "Remote EU employer" badge in the list view → company profile page answers the 4 evaluation questions in order → clear "View all N open roles" CTA.

---

## 4. Information Architecture

### Current IA Critique

**Header (always visible):**
- Company logo and name — correct, keep.
- Website link — correct, keep.
- "Score 0.87" — unexplained metric, wrong prominence level. Should not be in the header subtitle row alongside the website.
- "ATS 1" — means "1 career page indexed." This is internal jargon. A job seeker interprets "ATS" as nothing.
- "Tags 12" — means the company has 12 internal taxonomy tags. Irrelevant to job seekers. Should be removed from public view entirely.
- Category / size / location chips — correct data, wrong visual hierarchy. "PRODUCT" (company type) should be visually distinct from "51-200" (size) and "Warsaw, Poland" (location), as these are semantically different types of information.

**Tab order: Overview | Contacts | Jobs**
- "Contacts" tab is the second tab but its content is entirely admin-facing (emails, do-not-contact flags, LinkedIn import). For job seekers, this tab is confusing and potentially alarming (personal contact info visible?). The tab should either be hidden behind an admin gate or renamed and repositioned.
- "Jobs" tab contains the primary conversion action but is the third tab. It should be the second tab at minimum, and for companies with active jobs, it should be the default.

**Overview tab — main column:**
- "About" — correct, keep. But needs an empty state instead of disappearing.
- "Services" — this is `company.services`, a crawler-extracted taxonomy list. The label "Services" implies official company content. Should be renamed or removed from public view. The `service_taxonomy` field (more normalized version) is in the schema but unused on the page — this is likely the more accurate representation.

**Overview tab — sidebar:**
- "Key Facts" contains: Domain (useful), Score (needs explanation), Career pages count (internal jargon). This card should contain: what the company does in one line (category), size, location, founded year if available, and a clearly labeled "Remote EU hiring: Yes / Verified" indicator.
- "Industries" — `company.industries` array of chips. This is useful for job seekers browsing by sector. Keep, but move above Tags.
- "Tags" — `company.tags` array. These are internal platform tags (e.g., crawler-assigned labels). They are not user-facing metadata. For job seekers this section has zero value and adds visual noise. Remove from public view or gate behind admin auth.

**Below the fold in Overview:**
- "Ashby Enrichment" — internal section title. `ashby_enrichment.tech_signals` is the tech stack, which is high-value for job seekers but buried and mislabeled. Rename "Tech stack" and move it to the sidebar above Industries.
- "Career pages" — `company.ats_boards`. The list of ATS board URLs is useful for power users to verify authenticity but not for typical job seekers. Move to a collapsible "About hiring" section.
- "Score breakdown" — `company.score_reasons`. Useful for admins. Move to a collapsible admin-only panel.

---

### Proposed IA

**Goal:** Answer the 4 job seeker questions in order, within the first viewport.

#### Header (all users)

```
[Logo]  [Company Name]   [Remote EU verified badge OR "Remote status unknown"]
        [Website link]   [Category chip: "Product company"]
        [Size chip]  [Location chip]  [Open roles count: "4 open roles"]
```

- Remove "Score," "ATS," and "Tags" counts from the header subtitle row entirely.
- `category` chip (from `CompanyCategory` enum) should be styled distinctly — it is the most important classification signal.
- "Remote EU verified" badge derives from: does this company have at least one active `ats_board` and at least one job with `is_remote_eu = true` and `remote_eu_confidence = high`? This requires a computed field or a frontend aggregation of `companyJobs`.
- Open roles count is `companyJobs.length` (already computed in the component, just not surfaced in the header).

#### Tab order: Jobs | Overview | Admin (admin-only)

For companies with open jobs: default tab is Jobs.
For companies with no open jobs: default tab is Overview.
Contacts tab renamed "Admin" and gated behind `isAdmin`.

#### Jobs tab (primary for job seekers)

Each job row should show:
- Title (`job.title`)
- Remote EU badge (`job.is_remote_eu` + `job.remote_eu_confidence`)
- Location text (`job.location`)
- Published date (`job.publishedAt`)
- Top 3 skill tags (`job.skills` array — `tag` + `level`)
- Salary if available (`job.ashby_compensation.scrapeableCompensationSalarySummary` for Ashby jobs)
- Direct "View & Apply" button linking to `/jobs/[id]`

Empty state copy (see Section 6).

#### Overview tab (secondary — company profile)

**Main column (2/3 width):**
1. About (`company.description`) — with empty state if null.
2. Tech stack (`company.ashby_enrichment.tech_signals`) — labeled "Tech stack," not "Ashby Enrichment."
3. Hiring process (collapsible) — career pages list (`company.ats_boards`), human-readable: "They use Greenhouse for hiring. 1 active job board."

**Sidebar (1/3 width):**
1. Quick facts:
   - Category: `company.category` (mapped to human label: PRODUCT → "Product company", CONSULTANCY → "Consultancy", etc.)
   - Size: `company.size`
   - Location: `company.location`
   - Website: `company.website`
   - Industries: `company.industries` (chips, collapsed to 4)
2. Remote EU hiring quality (new section):
   - Percentage of their indexed jobs that are remote-EU classified.
   - Based on `companyJobs` filtered by `is_remote_eu = true`.
   - Label: "Remote EU hire rate: X of Y active roles."

#### Admin tab (admin-only, hidden for public users)

- Contacts list (current ContactsTab component, unchanged)
- Score breakdown (`company.score_reasons`)
- Data health: `facts_count`, `snapshots_count`, `last_seen_capture_timestamp`, `last_seen_crawl_id`
- Tags (`company.tags`)
- Services (`company.services`)
- Raw Ashby enrichment metadata with timestamp
- Enhance button (move here from the header)

---

### Key IA Gaps

| Gap | Severity | Relevant Fields |
|---|---|---|
| No "Remote EU" signal at company level | Critical | `job.is_remote_eu`, `job.remote_eu_confidence` (aggregate from jobs query) |
| "Score" shown without explanation | High | `company.score`, `company.score_reasons` |
| Open role count not in header | High | `companyJobs.length` (already computed, not surfaced) |
| `tech_signals` from `ashby_enrichment` mislabeled as internal data | High | `company.ashby_enrichment.tech_signals` |
| `category` chip indistinct from size and location chips | Medium | `company.category` |
| `service_taxonomy` unused — more normalized than `services` | Medium | `company.service_taxonomy` |
| `last_seen_capture_timestamp` not rendered — no staleness signal | Medium | `company.last_seen_capture_timestamp` |
| No per-job salary in jobs list | Medium | `job.ashby_compensation.scrapeableCompensationSalarySummary` |
| No "Follow company" / save action | Medium | `UserSettings.excluded_companies` exists but no follow equivalent |
| Contacts tab public-facing with personal emails | High | ContactsTab (admin gate missing at tab level) |

---

## 5. Design Principles for This Page

### Principle 1: Remote EU status is the first signal, not a footnote

Every job seeker on this platform is here because they want a remote EU job. The company page must answer "does this company genuinely hire remote EU?" before anything else. This signal should appear in the header — a green verified badge when there are active remote-EU classified roles, a neutral "status unknown" when there are none or when confidence is low.

Implementation: derive from `companyJobs.filter(j => j.is_remote_eu && j.remote_eu_confidence === 'high').length`. If > 0, show "Remote EU hiring confirmed." If 0, show no badge.

### Principle 2: Jobs are the primary conversion action

A company profile page on a job board exists to convert visitors into applicants. The Jobs tab should be the default for companies with open roles. Each job row must include enough information (title, remote badge, skills, date) to make an apply decision without a further page load. The "View & Apply" CTA should be visible without scrolling.

### Principle 3: Internal data is not product copy

Fields populated by crawlers, ML pipelines, or admin enrichment — `score`, `tags`, `services`, `score_reasons`, `ashby_enrichment.enriched_at` — must not be presented as company-authored content. Either surface them with clear provenance labeling ("Detected from job descriptions"), gate them behind admin view, or transform them into user-friendly signals (e.g., `tech_signals` becomes "Tech stack").

### Principle 4: Empty states earn trust

When a company has no description, no jobs, or no tech stack data, blank space and hidden sections do not explain why. Empty states should be explicit: "No description available yet" or "No open remote-EU roles at this time — check back soon." An informed user is more likely to return than a confused one.

### Principle 5: Admin tools do not belong in job seeker views

The Contacts tab (email import, do-not-contact flags, LinkedIn scrape tool), the Enhance button, the Score breakdown, and the ATS board confidence percentages are all admin workflows. They should be gated behind `isAdmin` at the tab/section level, not just the button level. The current implementation gates only the "Import from LinkedIn" button while showing all contacts and their personal data to any authenticated user.

---

## 6. Content Strategy

### Label Renames

| Current label | Proposed label | Rationale |
|---|---|---|
| "Score" (header and Key Facts) | Remove from header; rename to "Platform confidence" in admin view | "Score" has no meaning to job seekers. In admin context, "Platform confidence" describes what it actually measures. |
| "ATS N" (header) | Remove from header entirely | "ATS" is technical jargon. Replace with "N open roles" in the header. |
| "Tags N" (header) | Remove from header entirely | Internal metadata count, irrelevant to users. |
| "Career pages" (section title) | "Hiring platforms" | "Career pages" is ambiguous. "Hiring platforms" is clearer: "They hire via Greenhouse and Ashby." |
| "Ashby Enrichment" (section) | "Tech stack" (for `tech_signals`) | The enrichment section should be decomposed. Tech signals surface as "Tech stack." Industry tags merge into the Industries chips. The enrichment timestamp goes to admin view. |
| "Services" | Remove from public view OR rename to "Areas of work" with a note "Detected from job descriptions" | The current label implies official company self-description. It is crawler-extracted. Either label it accurately or gate it. |
| "Score breakdown" | "Data quality notes" (admin only) | These are internal audit notes, not user-facing content. |
| "Key facts" (sidebar card title) | "About" or remove the card title entirely | "Key facts" is generic. The sidebar facts (domain, score, career pages count) need to be replaced with user-relevant content, at which point a title like "At a glance" or simply no title makes more sense. |
| "PRODUCT", "CONSULTANCY", etc. (category chip) | "Product company", "Consultancy", "Staffing agency" | The enum value as-is is uppercase with no space. Map to human-readable labels in the UI. |

### Empty State Copy

**No company description (`company.description` is null):**
> "This company hasn't provided a description yet. Browse their open roles below."

If there are also no roles:
> "We're still gathering information about this company. Check back soon."

**No open jobs (`companyJobs.length === 0`):**
> "No remote EU roles are listed for this company right now."
> "Get notified when they post" [action, if notification feature exists]

**No tech stack detected (`ashby_enrichment.tech_signals` is empty):**
(Do not show the Tech stack section at all — a missing section is better than "No tech stack detected.")

**Contacts tab is empty (admin view):**
> "No contacts imported for this company. Use 'Import from LinkedIn' to add them."

**Company not found (404 fallback):**
> "We don't have a profile for this company yet."
> (If jobs exist for the key, the fallback in the component correctly shows the jobs-only view — keep this behavior.)

### Microcopy for Key Conversion Actions

**Jobs tab — job row CTA:**
> "View role" (instead of just the job title being a link)

If applying from the platform is supported:
> "Apply via [Greenhouse / Ashby]" — use `job.source_kind` to specify the ATS vendor.

**Remote EU badge:**
> "Remote EU confirmed" (when `is_remote_eu = true` and `remote_eu_confidence = 'high'`)
> "Remote EU likely" (when `remote_eu_confidence = 'medium'`)
> (No badge when `remote_eu_confidence = 'low'` or `is_remote_eu = false`)

**Company header — open roles count:**
> "3 open roles" (singular/plural handled)
> "No open roles right now" (when count is 0)

**Enhance button (admin only — proposed move to Admin tab):**
> "Re-enrich company data" (more descriptive than "Enhance")

**Score in admin Key Facts (proposed label change):**
> "Platform confidence: 0.87 / 1.0"
> Tooltip on hover: "Confidence that this company actively hires for remote-EU eligible positions, based on crawl data and job classification history."

**Tab labels with counts:**
> "Jobs (4)" — current implementation already does this for job count; make it consistent:
> "Overview" | "Jobs (4)" | "Admin" (gated)
> When 0 jobs: "Jobs" (no count — empty parens look broken)

---

## Appendix: Schema Fields Currently Unused on the Company Profile Page

These fields exist in the GraphQL Company type or related Job type and have clear display value but are not currently rendered:

| Field | Type | Location in schema | Proposed use |
|---|---|---|---|
| `company.service_taxonomy` | `[String!]!` | `Company` type | More normalized than `services`; use instead of `services` or merge |
| `company.last_seen_capture_timestamp` | `String` | `Company` type | Admin data health: "Last crawled: X" |
| `company.last_seen_crawl_id` | `String` | `Company` type | Admin audit link |
| `company.last_seen_source_url` | `String` | `Company` type | Admin: link to source evidence |
| `company.facts_count` | `Int!` | `Company` type | Admin data health summary |
| `company.snapshots_count` | `Int!` | `Company` type | Admin data health summary |
| `job.is_remote_eu` | `Boolean!` | `Job` type | Remote EU badge per job in Jobs tab |
| `job.remote_eu_confidence` | `ClassificationConfidence` | `Job` type | Badge variant (confirmed / likely) |
| `job.skills` | `[JobSkill!]` | `Job` type | Skill chips in Jobs tab rows |
| `job.ashby_compensation` | `AshbyCompensation` | `Job` type | Salary summary in Jobs tab rows |
| `job.status` | `JobStatus` | `Job` type | Filter jobs by status (active only) in Jobs tab |
| `ats_board.first_seen_at` | `String!` | `ATSBoard` type | Admin: "Discovered on X" |
| `ats_board.last_seen_at` | `String!` | `ATSBoard` type | Admin: staleness signal |
