---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
status: complete
completedAt: 2026-02-23
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: brownfield
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-nomadically.work-2026-02-23.md
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 1
  projectContext: 0
---

# Product Requirements Document — Frontpage UX & Performance

**Project:** nomadically.work
**Author:** Vadim
**Date:** 2026-02-23

## Executive Summary

The nomadically.work frontpage currently loads content synchronously, blocking visible layout until data resolves. This degrades perceived performance and first impressions for new visitors. This initiative improves frontpage **readability** and **perceived load speed** by decoupling the page skeleton from data fetching — introducing skeleton UI for the total job count so the layout is immediately visible and stable while numbers load asynchronously.

**Target outcome:** Visitor lands, sees a fully structured readable layout on first paint, watches data fill in gracefully. No blank spaces, no layout shift, no spinner blocking interaction.

### What Makes This Special

The frontpage is a trust signal. A fast, stable skeleton communicates the product is live and performant before a single job renders. Unlike a spinner (signals waiting) or a static placeholder (signals stale data), a skeleton that resolves quickly sets the right expectation: real, fresh data incoming. For a bootstrapped product competing against well-funded job boards, perceived performance *is* credibility.

## Project Classification

| Attribute | Value |
|---|---|
| **Project Type** | Web App (Next.js 16, App Router, React 19) |
| **Domain** | Job board / content discovery |
| **Complexity** | Medium — brownfield App Router with Apollo Client, RSC, AI-classified data pipeline |
| **Project Context** | Brownfield — scoped improvement to existing frontpage only |

## Success Criteria

### User Success

- Frontpage layout fully visible and stable on first paint — no blank content areas or deferred layout shifts
- Total job count shows skeleton placeholder immediately, resolves to real number asynchronously
- No CLS caused by late-loading count or job data
- Page readable and scannable before any data loads — structure, headings, and controls present from first paint

### Business Success

- Core Web Vitals: LCP < 2.5s, CLS < 0.1 — Google "Good" threshold, directly supporting SEO rankings
- Reduced frontpage bounce rate — immediate structure keeps users before jobs render
- Skeleton UI signals active maintenance and professional quality

### Technical Success

- Job count fetched asynchronously, decoupled from initial page render
- Skeleton implemented with Radix UI or CSS-only — consistent with existing design system
- No regression on filters, search, job list, or pagination
- Apollo Client count query independent of main jobs query

### Measurable Outcomes

| Metric | Target |
|---|---|
| LCP | < 2.5s |
| CLS | < 0.1 |
| FCP | < 1.8s |
| Skeleton visible on first paint | Yes — 0ms delay |
| Count resolves | < 1s after skeleton appears |

## Product Scope

### Phase 1 — MVP

**Approach:** Experience MVP — minimum change that makes the frontpage feel professional and fast to a first-time visitor. No new routes, no backend changes.

**Must-Have:**
- `JobCountSkeleton` client component — pulse animation, correct sizing, `aria-busy`/`aria-live`
- Separate `GET_JOB_COUNT` Apollo query (decoupled from `GET_JOBS`)
- Frontpage readability pass — typography, spacing, visual hierarchy
- CLS = 0 verified in Lighthouse before shipping

**Out of scope for MVP:** job list skeleton cards, backend/resolver changes, any route other than `/`

**Resources:** Solo developer (Vadim), ~1–2 days.

### Phase 2 — Growth

- Skeleton for job list cards during initial load and pagination
- Company logo image placeholder/skeleton
- Prefetch job detail on hover

### Phase 3 — Vision

- Full React 19 `<Suspense>` streaming across all data-heavy sections
- Edge-cached frontpage shell with live data streamed in — sub-100ms TTFB globally

### Risk Mitigation

| Risk | Mitigation |
|---|---|
| Stale count from aggressive Apollo cache | `fetchPolicy: "network-only"` or short `maxAge` on count query |
| Readability pass grows in scope | Defer to Phase 2; ship skeleton only in MVP |

## User Journeys

### Journey 1: First-Time Visitor (Primary — Success Path)

**Marta** — senior frontend developer, Warsaw. Googles "remote EU frontend jobs" at 9pm. Three other job boards tonight: spinners, full-page flashes, bounces.

She clicks nomadically.work. Layout appears immediately — headline, pulsing count skeleton. Before she scrolls, the number resolves: "2,847 remote EU jobs." She filters by React. 34 results. She bookmarks the site. nomadically.work earned a return visit in under 10 seconds.

**Reveals:** Skeleton component, stable first paint, fast count resolution, readable job list.

---

### Journey 2: Returning Mobile User (Primary — Edge Case)

**Dani** — commuting Prague to Brno on 3G. Visited nomadically.work last week. Opens it on mobile. Connection is slow — previous boards time out or half-load.

The page shell loads fast. Skeleton holds the count space. He waits. After 2 seconds, count appears. Jobs load. No layout shift — skeleton reserved the right space. He finds a Go remote role in the first five listings.

**Reveals:** Skeleton reserves correct space (no CLS), mobile-responsive sizing, graceful degradation on slow connections.

---

### Journey 3: Vadim — Admin Monitoring (Operations)

Ships a pipeline change at midnight. Opens the frontpage to verify count is updating. Skeleton appears, count resolves, matches the admin dashboard. Layout clean.

**Reveals:** Count must reflect live data (not aggressively cached); skeleton = real async fetch, not a hardcoded placeholder.

---

### Journey Requirements Summary

| Capability | Required By |
|---|---|
| Skeleton UI for job count | All 3 journeys |
| Stable layout / zero CLS | Journey 1, 2 |
| Async count fetch (decoupled from job list) | All 3 journeys |
| Mobile-responsive skeleton sizing | Journey 2 |
| Fast count resolution (< 1s) | Journey 1, 3 |
| Readable layout on first paint | Journey 1, 2 |

## Web App Technical Requirements

### Rendering Architecture

- **Model:** RSC for page shell + `"use client"` boundary for `JobCountSkeleton` component
- **Data fetching:** Apollo Client `useQuery` for async count on client; main job list query separate
- **Hydration:** Skeleton visible during hydration gap — prevents blank flash between SSR and client
- **Bundle:** Skeleton component < 2KB uncompressed; no heavy animation libraries

### Browser Support

| Browser | Support |
|---|---|
| Chrome 120+ | Full |
| Firefox 120+ | Full |
| Safari 17+ | Full |
| Edge 120+ | Full |
| Mobile Chrome/Safari | Full |

### Responsive Design

- Skeleton uses relative sizing (`width: 100%`, `max-width`) — never fixed pixel widths
- Count area skeleton matches resolved count dimensions at all breakpoints
- Zero layout shift between skeleton → resolved on mobile and desktop

### SEO

- H1, meta description, and job count label text server-rendered — fully crawlable
- Count number loaded client-side — acceptable; static label text satisfies crawler requirements
- CWV improvement directly supports search ranking

### Implementation Constraints

- Prefer Radix UI `Skeleton` primitive or CSS-only pulse — no JS animation loops
- Split Apollo queries: `GET_JOB_COUNT` independent of `GET_JOBS`
- Prefer explicit client-side skeleton over Next.js `loading.tsx` for this use case

## Functional Requirements

### Page Load & Skeleton Display

- **FR1:** Visitor can see a fully structured, stable page layout on first paint before any data resolves
- **FR2:** Visitor can see a skeleton placeholder in the job count area while the count is loading
- **FR3:** Visitor can see the skeleton animate (pulse) to signal active loading
- **FR4:** Visitor can see the real job count replace the skeleton once the async query resolves
- **FR5:** Visitor experiences zero layout shift when skeleton transitions to resolved count

### Async Data Fetching

- **FR6:** System fetches total job count independently of the main job list query
- **FR7:** System displays page shell and job list while count query is in-flight
- **FR8:** System retries count query on failure without affecting the rest of the page
- **FR9:** Admin can verify count reflects live data, not a stale cached value

### Readability & Visual Hierarchy

- **FR10:** Visitor can scan frontpage structure (headline, count, filters, job list) before any data loads
- **FR11:** Visitor can read all static text (headings, labels, navigation) immediately on page load
- **FR12:** Visitor can interact with navigation and filter controls before the count resolves

### Accessibility

- **FR13:** Screen reader user is informed the job count area is loading (`aria-busy="true"`)
- **FR14:** Screen reader user receives announcement when count resolves (`aria-live="polite"`)
- **FR15:** Keyboard user can navigate the page normally during and after skeleton loading

### Mobile Experience

- **FR16:** Mobile visitor sees a correctly sized skeleton matching the space the count will occupy
- **FR17:** Mobile visitor experiences no layout reflow between skeleton and resolved states at any viewport width

## Non-Functional Requirements

### Performance

- **NFR1:** FCP < 1.8s on 4G connection (Lighthouse simulated throttling)
- **NFR2:** LCP < 2.5s — Google "Good" threshold
- **NFR3:** CLS < 0.1 — skeleton reserves exact count space, no reflow on resolution
- **NFR4:** Count query resolves and renders within 1s of page hydration under normal network conditions
- **NFR5:** Skeleton animation is CSS-only — no JavaScript animation loop; no jank on low-end devices
- **NFR6:** `JobCountSkeleton` component adds < 2KB to client bundle (uncompressed)

### Accessibility

- **NFR7:** Frontpage meets WCAG 2.1 Level AA — verified with Lighthouse accessibility audit
- **NFR8:** Skeleton count region exposes `aria-busy="true"` while loading; `aria-busy="false"` on resolution
- **NFR9:** Count element uses `aria-live="polite"` — screen readers announce resolved number without interrupting user
- **NFR10:** All interactive elements remain keyboard-navigable during skeleton loading state
- **NFR11:** Skeleton pulse animation respects `prefers-reduced-motion` — static placeholder shown when motion is reduced
