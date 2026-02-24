---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
status: complete
completedAt: 2026-02-24
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-nomadically.work-2026-02-23.md
classification:
  projectType: web_app
  domain: general
  complexity: low-medium
  projectContext: brownfield
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 4
  projectContext: 0
---

# Product Requirements Document — Email Multi-Tenancy

**Project:** nomadically.work
**Author:** Vadim
**Date:** 2026-02-24
**Type:** Brownfield feature — Next.js admin page

---

## Executive Summary

The **Email Multi-Tenancy** feature transforms `/admin/emails` from a single-tenant, client-side-guarded firehose into a server-enforced, per-user email view. The page currently renders all Resend account emails to any user who passes a client-side check — no server validation, no user scoping. This feature hardens the access model and scopes email data to the logged-in user's identity, laying the foundation for multi-user expansion beyond the hardcoded `ADMIN_EMAIL`.

**Target user:** Admin (Vadim). Views sent and received emails scoped to their own address, with confidence the restriction is real — not cosmetic.

**Problem:** Two compounding issues: (1) admin restriction is client-side only, making it bypassable; (2) Resend returns all account emails regardless of who is logged in. As the system grows toward multiple users, this model breaks.

### What Makes This Special

The core insight is minimal: do the obvious things correctly. Client-side guards are not access control. A hardcoded single-admin constant is not a multi-user model. This feature fixes both in one pass — adding server-side auth to Next.js server actions and filtering Resend API responses by the logged-in user's email via Clerk identity. No new infrastructure; correct use of what already exists. The result works right today and is structurally ready for a second admin without rework.

---

## Success Criteria

### User Success

- Admin opens `/admin/emails` and sees only emails where their address appears in `to` or `from`
- Admin can verify the restriction is real: unauthenticated direct navigation returns a server-level error, not a blank UI
- Non-admin signed-in users cannot access the page or see the nav link — enforced server-side and client-side
- The page is self-evidently scoped to "my emails" — no ambiguity about whose data is shown

### Business Success

- Feature ships without regressions to existing email send/receive flows
- Hardened auth model in place before any second admin is added
- No Resend API keys, tokens, or account-level data exposed to non-admin users

### Technical Success

- `getSentEmails` and `getReceivedEmails` server actions validate caller identity via Clerk before any Resend call
- Email results filtered post-fetch by the logged-in user's email (Resend API has no server-side `to`/`from` filter)
- `AdminNav` email link remains hidden for non-admins (preserved, no change)
- `ADMIN_EMAIL` constant remains the single source of truth for admin status; no new data store introduced

### Measurable Outcomes

- 0 Resend API calls from unauthenticated server action requests
- 100% of emails shown have the logged-in user's email in `to` or `from`
- Non-admin users see no email nav link and cannot reach the page (403 or redirect on direct URL access)

---

## User Journeys

### Journey 1: Admin — Viewing My Emails (Happy Path)

Vadim finishes a batch of job alert sends and wants to verify delivery. He clicks the envelope icon in the admin nav — visible because he's admin. The emails page loads; the Sent tab shows only emails where his address (`nicolai.vadim@gmail.com`) appears in `from` or `to`. The list is clean: no system noise, no emails to random job seekers. He spots the email he cares about, checks its `delivered` status badge, and moves on.

**Reveals:** Email filtering by logged-in user email, Sent/Received tab scoping, status badge display.

### Journey 2: Admin — Auth Edge Case / Error Recovery

Vadim realises someone could hit `/admin/emails` directly with no credentials. Today the server action calls Resend and returns all account emails. After this feature ships: the action calls `checkIsAdmin()` first. If not authenticated, it returns a Forbidden error — no Resend call made. The client displays an "Access denied" card.

**Reveals:** Server-side auth guard in server actions, structured error response, client-side error display.

### Journey 3: Non-Admin — Trying to Access Emails

A registered job seeker discovers `/admin/emails` and navigates there. Two layers block them: (1) `AdminNav` never showed the link; (2) the server-side check confirms they're not admin and returns an error. Even a direct server action call via devtools fails — `checkIsAdmin()` returns false and no Resend data flows.

**Reveals:** Server-side page-level access check, server action auth guard, `AdminNav` conditional rendering (existing).

### Journey 4: Second Admin Onboarded (Future Growth)

A second team member gets admin access. The filter is keyed to the logged-in user's identity, so they see only their own emails — not Vadim's. Expanding admin access from a single constant to a list or Clerk role check is a one-line change, enabled by the identity-keyed filtering established here.

**Reveals:** Per-user filtering is user-identity-driven, not address-hardcoded; admin check is the only expansion point for multi-admin.

### Journey Requirements Summary

| Journey | Capabilities Required |
|---|---|
| Admin happy path | Resend results filtered by logged-in user's email; Sent/Received tabs scoped correctly |
| Auth edge case | `checkIsAdmin()` in server actions; structured error to client; zero Resend calls on auth failure |
| Non-admin access attempt | Page-level server check + server action guard; `AdminNav` conditional rendering (existing) |
| Second admin (future) | User-identity-keyed filtering; admin check expandable beyond single constant |

---

## Domain-Specific Requirements

### Auth & Access Control

- Next.js server actions are public HTTP endpoints — auth must be enforced inside each action, not just at the UI layer
- `checkIsAdmin()` from `src/lib/admin.ts` (uses Clerk `auth()` server-side) is the correct guard — called at the top of every server action before any Resend API call
- `AdminGuard` client component is retained for UX (prevents content flash) but is not the security boundary
- Unauthenticated or non-admin server action calls must return a structured error object, not throw

### Technical Constraints (Resend API)

- `resend.instance.listEmails()` and `resend.instance.listReceived()` have no `to`/`from` filter params — filtering is applied post-fetch in the server action
- Fetch up to `limit` emails, filter in-process by user email before returning — acceptable for low-volume admin use
- Known limitation: inefficient at scale (fetch N, return subset) — documented for post-MVP pagination work
- `from` on system-sent emails may be a domain address, not the admin's personal email — filtering logic must handle both cases

### Risk Mitigations

- **Risk:** `ADMIN_EMAIL` constant not updated when admin email changes in Clerk → silent access failure. **Mitigation:** Document sync requirement; post-MVP move to Clerk metadata/role check.
- **Risk:** Compromised server action with account-wide Resend key leaks all emails. **Mitigation:** Server-side auth guard ensures only authenticated admins trigger Resend calls.

---

## Technical Architecture

**Stack:** Next.js 16 App Router, Clerk (auth), Resend (email), Radix UI Themes (components)

**Component model:** `EmailsPageContent` (client component) calls server actions on mount via `useEffect`. Server actions are the auth enforcement boundary.

**Data flow:**
```
Client useEffect
  → Server action: checkIsAdmin() → [deny if false]
  → resend.listEmails(limit)
  → filter: emails where to.includes(userEmail) || from === userEmail
  → return { emails, error }
  → Client state update
```

**Auth primitive:** Clerk `auth()` + `clerkClient().users.getUser()` — already used in `src/lib/admin.ts`. No new auth infrastructure.

**Key constraints:**
- User email retrieved server-side from Clerk — never accepted as a client parameter (spoofable)
- Server action signatures unchanged (`getSentEmails(limit)`, `getReceivedEmails(limit)`) — only internals change
- `AdminGuard` component and `AdminNav` unchanged — existing client-side UX preserved
- Email addresses normalized to lowercase before comparison to handle case mismatches

---

## Project Scoping & Phased Development

**MVP Approach:** Correctness MVP — make the feature do what it already claims (admin-only, user-scoped). No new capabilities; fix the existing implementation.

**Resource Requirements:** Solo developer (Vadim). ~2–4 hours. No new dependencies, no schema changes, no infra changes.

### Phase 1 — MVP

**Journeys supported:** Happy path, auth edge case, non-admin blocked (Journeys 1–3)

**Must-Have Capabilities:**
1. `checkIsAdmin()` guard at top of `getSentEmails` and `getReceivedEmails` — returns `{ emails: [], error: "Forbidden" }` for non-admins with zero Resend calls
2. Logged-in user's email retrieved server-side via Clerk
3. Post-fetch filter: sent emails where `to` includes user email OR `from` includes user email; received emails where `to` includes user email
4. `AdminGuard` and `AdminNav` unchanged

### Phase 2 — Growth

- Multi-admin support: `ADMIN_EMAIL` string → Clerk role/metadata check or array
- Pagination: `page`/`cursor` param to handle large email volumes
- Search/filter by subject, date range, delivery status

### Phase 3 — Expansion

- Regular users (job seekers) view their own email history — full multi-tenancy beyond admin
- Real-time status updates via Resend webhooks
- Per-user email analytics (open rates, click-through)

### Risk Mitigation

- *Resend `to` field format* — `to` is `string[]`; exact match may break if addresses include display names. **Mitigation:** Verify locally; normalize to lowercase; fall back to showing all emails if format is unexpected.
- *Clerk `getUser()` latency* — one additional Clerk API call per server action. **Mitigation:** Acceptable at admin-only, low-frequency usage; cache post-MVP if needed.

---

## Functional Requirements

### Access Control

- **FR1:** Admin can access the `/admin/emails` page
- **FR2:** Non-admin authenticated users are denied access to the `/admin/emails` page
- **FR3:** Unauthenticated users are denied access to the `/admin/emails` page
- **FR4:** Admin can see the email nav link in `AdminNav`
- **FR5:** Non-admin and unauthenticated users cannot see the email nav link in `AdminNav`
- **FR6:** System enforces admin access check server-side before any Resend API call is made

### Email Data Retrieval

- **FR7:** Admin can view sent emails scoped to their own email address
- **FR8:** Admin can view received emails scoped to their own email address
- **FR9:** System retrieves the logged-in user's email address from the auth provider server-side
- **FR10:** System filters sent email results to include only emails where the logged-in user's email appears in `to` or `from`
- **FR11:** System filters received email results to include only emails where the logged-in user's email appears in `to`
- **FR12:** System makes no Resend API calls when the caller is not authenticated or not an admin

### Email Display

- **FR13:** Admin can view sent emails in a "Sent" tab
- **FR14:** Admin can view received emails in a "Received" tab
- **FR15:** Admin can see subject, recipients, sender, timestamp, and delivery status for each sent email
- **FR16:** Admin can see subject, sender, and timestamp for each received email
- **FR17:** Admin can navigate to the Resend dashboard entry for a specific sent email
- **FR18:** Admin can manually refresh the email list

### Error Handling

- **FR19:** System displays an error message when email retrieval fails due to auth failure
- **FR20:** System displays an error message when email retrieval fails due to a Resend API error
- **FR21:** System displays an empty-state message when no emails match the user's address

---

## Non-Functional Requirements

### Security

- **NFR1:** Server actions validate caller admin status before any external API call — zero tolerance for unauthenticated data access
- **NFR2:** Logged-in user's email for filtering is retrieved server-side from the auth provider — never accepted as a client-supplied parameter
- **NFR3:** A failed or missing auth check returns an error with no Resend data — partial data must never be returned on auth failure
- **NFR4:** Email data returned to the client is scoped exclusively to the authenticated user — cross-user leakage is not acceptable in any state
- **NFR5:** `ADMIN_EMAIL` is the sole authoritative source for admin determination — no bypass via URL params, headers, or client state

### Performance

- **NFR6:** Server-side Clerk identity lookup adds no more than 500ms to total server action response time under normal conditions
- **NFR7:** Post-fetch filtering of ≤100 emails completes in under 10ms

### Integration

- **NFR8:** Resend API unavailability results in a structured error response (not an unhandled exception) — client displays a graceful error state
- **NFR9:** Clerk `getUser()` failure results in access denial — auth provider failure defaults to deny, not allow
