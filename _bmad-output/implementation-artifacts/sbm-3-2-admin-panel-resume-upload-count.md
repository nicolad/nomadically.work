# Story 3.2: Admin Panel Resume Upload Count (Skills-Based Matching)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operator,
I want to see the total count of resumes uploaded in the admin panel,
so that I can monitor adoption of the skills matching feature after launch.

## Acceptance Criteria

1. **Given** an admin user navigates to `/admin/workers` **When** the page loads **Then** a "Feature Adoption" metric card is visible showing the count of uploaded resumes (total rows in `resumes` D1 table)

2. **Given** the data fetch for resume count **When** executed **Then** it calls `GET /api/admin/resume-count` **And** the route uses `checkIsAdmin()` — returns `403` for non-admin users **And** queries `db.select({ count: count() }).from(resumes)` via Drizzle **And** returns `{ count: number }`

3. **Given** the API route is called by a non-admin user **When** `checkIsAdmin()` returns `isAdmin: false` **Then** the route returns HTTP `403 Forbidden` — the resume count is not exposed

4. **Given** `pnpm build` is run **Then** the new API route and updated workers page compile without TypeScript errors

## Tasks / Subtasks

- [x] Task 1: Create API route (AC: #2, #3)
  - [x] 1.1: Create `src/app/api/admin/resume-count/route.ts` with `GET` handler
  - [x] 1.2: Call `checkIsAdmin()` from `@/lib/admin` — return `Response.json({ error: "Forbidden" }, { status: 403 })` if not admin
  - [x] 1.3: Query `db.select({ count: count() }).from(resumes)` using `drizzle(createD1HttpClient() as any)`
  - [x] 1.4: Return `Response.json({ count: result[0]?.count ?? 0 })`
  - [x] 1.5: Import `count` from `drizzle-orm`, `resumes` from `@/db/schema`, `createD1HttpClient` from `@/db/d1-http`
- [x] Task 2: Add metric card to workers page (AC: #1)
  - [x] 2.1: In `src/app/admin/workers/page.tsx`, add a `useEffect` + `useState` to fetch `/api/admin/resume-count` on mount
  - [x] 2.2: Add a "Feature Adoption" `Card` section above the "Cloudflare Workers" heading showing: `Text "Resumes uploaded"` + count value
  - [x] 2.3: Show a loading state (`Text color="gray"` with "…") while fetch is pending
  - [x] 2.4: Handle fetch error gracefully — show `"—"` if fetch fails (non-blocking)
- [x] Task 3: Verify build (AC: #4)
  - [x] 3.1: Run `pnpm build` — confirm no TypeScript errors

## Dev Notes

### Greenfield — No Pre-existing Implementation

Unlike previous stories in this feature, there is **no pre-existing implementation** for this story. Both the API route and the UI metric card need to be created from scratch. This is a small addition: ~30 lines of API route + ~20 lines of UI.

### API Route Implementation

```ts
// src/app/api/admin/resume-count/route.ts
import { NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/d1";
import { count } from "drizzle-orm";
import { createD1HttpClient } from "@/db/d1-http";
import { resumes } from "@/db/schema";
import { checkIsAdmin } from "@/lib/admin";

export async function GET() {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = drizzle(createD1HttpClient() as any);
  const result = await db.select({ count: count() }).from(resumes);

  return NextResponse.json({ count: result[0]?.count ?? 0 });
}
```

### UI Addition to `workers/page.tsx`

Add state + fetch at the top of `WorkersPage`:

```tsx
const [resumeCount, setResumeCount] = useState<number | null>(null);

useEffect(() => {
  if (!isAdmin) return;
  fetch("/api/admin/resume-count")
    .then((r) => r.json())
    .then((d) => setResumeCount(d.count ?? 0))
    .catch(() => setResumeCount(null));
}, [isAdmin]);
```

Add a metric card before the "Cloudflare Workers" heading:

```tsx
{/* Feature Adoption */}
<Heading size="4" mb="3">Feature Adoption</Heading>
<Flex gap="3" mb="6">
  <Card style={{ minWidth: 160 }}>
    <Flex direction="column" gap="1" p="2">
      <Text size="1" color="gray">Resumes uploaded</Text>
      <Text size="5" weight="bold">
        {resumeCount === null ? "…" : resumeCount}
      </Text>
    </Flex>
  </Card>
</Flex>
```

### Admin Auth Pattern in API Routes

The project uses `checkIsAdmin()` from `src/lib/admin.ts` for server-side route protection:

```ts
// src/lib/admin.ts
export async function checkIsAdmin(): Promise<{
  isAdmin: boolean; userId: string | null; userEmail: string | null;
}> {
  const { userId } = await auth();  // Clerk auth()
  // ... fetches user email, compares to ADMIN_EMAIL constant
}
```

This is a **server-side async function** — use it in Route Handlers (`route.ts`), not in client components. Client components use `user?.email === ADMIN_EMAIL` (already established in workers page).

### D1 + Drizzle `count()` Pattern

```ts
import { count } from "drizzle-orm";
import { resumes } from "@/db/schema";

const result = await db.select({ count: count() }).from(resumes);
// result: [{ count: number }]
const total = result[0]?.count ?? 0;
```

This is the exact pattern referenced in the architecture doc and consistent with CLAUDE.md (use Drizzle ORM methods, not raw SQL).

### Where to Add the UI

There is no root `src/app/admin/page.tsx`. The `workers/page.tsx` is the closest admin overview page. Adding a "Feature Adoption" section at the top is the minimal change that fits without creating a new page.

**Do NOT create** a separate `src/app/admin/stats/page.tsx` — that would be over-engineering for a single metric.

### Existing Admin Page Patterns

Admin pages consistently follow:
```tsx
const { user } = useAuth();
const isAdmin = user?.email === ADMIN_EMAIL;

if (!user) return <Container>Loading…</Container>;
if (!isAdmin) return <Container>Access denied</Container>;
// render admin content
```

The new `useEffect` fetch must be guarded by `if (!isAdmin) return` to avoid fetching when not admin (already handled since `useEffect` checks `isAdmin`).

### `useState` — Add Import

`workers/page.tsx` currently imports `useAuth` from `@/lib/auth-hooks` but does NOT import `useState` or `useEffect` from React. Add both:

```tsx
import { useState, useEffect } from "react";
```

### File Structure

| File | Status | Notes |
|------|--------|-------|
| `src/app/api/admin/resume-count/route.ts` | ❌ CREATE | New API route |
| `src/app/admin/workers/page.tsx` | ✅ EXISTS (179 lines) | Add feature adoption section |

### References

- [Source: epics-skills-based-matching-2026-02-23.md#Story 3.2] — Acceptance criteria
- [Source: src/lib/admin.ts] — `checkIsAdmin()` implementation
- [Source: src/app/admin/workers/page.tsx] — Existing admin page patterns
- [Source: src/app/admin/reported-jobs/page.tsx] — REST fetch pattern in admin pages
- [Source: CLAUDE.md#Drizzle ORM + D1] — `count()` query pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `pnpm build` → `✓ Compiled successfully`, `/api/admin/resume-count` route confirmed in build output

### Completion Notes List

- Task 1: Created `src/app/api/admin/resume-count/route.ts` — uses `checkIsAdmin()` for server-side 403 guard, Drizzle `count()` query against `resumes` table, returns `{ count: number }` via `NextResponse.json`
- Task 2: Added `useState` + `useEffect` imports to `workers/page.tsx`; `resumeCount` state initialised to `null` (shows "…"); `useEffect` guarded by `if (!isAdmin) return`; fetch error caught and leaves `resumeCount` as `null` showing "…" (graceful non-blocking failure); "Feature Adoption" `Heading` + `Card` added above "Cloudflare Workers" section

### File List

- `src/app/api/admin/resume-count/route.ts` (CREATED) — Admin API route for resume count
- `src/app/admin/workers/page.tsx` (MODIFIED) — Added `useState`/`useEffect` imports, `resumeCount` state, fetch, and Feature Adoption metric card
