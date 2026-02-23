# Story 1.2: Admin UI — Task Creation & List View

Status: review

## Story

As an admin,
I want a page at `/admin/deep-planner` to create tasks and see all existing tasks,
so that I can assign planning work and track its progress.

## Acceptance Criteria

1. **Given** the admin navigates to `/admin/deep-planner` **When** the page loads **Then** a task list is displayed showing all deep planner tasks with status badge, workflow type, checkpoint count, and timestamps **And** the page is only accessible to authenticated admin users (Clerk + isAdminEmail())

2. **Given** the admin clicks "New Task" **When** they fill in workflow type (selector), problem description (textarea), and optional context (textarea) and submit **Then** the `createDeepPlannerTask` mutation is called and the new task appears in the list with status `PENDING`

3. **Given** the task list is displayed **When** any task has status `RUNNING` **Then** the UI polls `deepPlannerTask(id)` every 10 seconds and updates the status badge, checkpoint count, and current step

4. **Given** a task with status `FAILED` **When** the admin views the task list **Then** the error message is displayed alongside the status badge

## Tasks / Subtasks

- [x] Task 1: Create admin deep-planner page with auth guard and task list
- [x] Task 2: Add task creation form with workflow type selector
- [x] Task 3: Add polling for running tasks
- [x] Task 4: Build and verify

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Completion Notes

- Server component wrapper (`page.tsx`) with `export const dynamic = "force-dynamic"` to avoid SSR prerendering issues with Apollo Client
- Client component (`deep-planner-client.tsx`) with full task list, creation dialog, polling, stale detection
- Uses Radix UI Themes for all UI components (Badge, Card, Dialog, Select, TextArea)
- Polls running tasks every 10s via `setInterval` + `refetch()`
- Stale task detection (30min threshold) with warning badge

### File List

- `src/app/admin/deep-planner/page.tsx` (NEW) — Server component wrapper with force-dynamic
- `src/app/admin/deep-planner/deep-planner-client.tsx` (NEW) — Client component with task list + creation dialog
