# Story 1.3: Admin UI — Artifact Viewer

Status: review

## Story

As an admin,
I want to click a completed task and read its full output artifact as rendered markdown,
so that I can review the generated BMAD planning artifact.

## Acceptance Criteria

1. **Given** a task with status `COMPLETE` and a non-null `outputArtifact` **When** the admin clicks the task in the list **Then** the full markdown artifact is rendered in a detail view with proper heading structure, sections, and formatting

2. **Given** a task with status `FAILED` and a non-null `outputArtifact` **When** the admin clicks the task **Then** the partial artifact is rendered with a banner indicating it's incomplete

3. **Given** the artifact detail view **When** displayed **Then** the task metadata is shown (workflow type, checkpoint count, started_at, completed_at/error_message, total run time)

## Tasks / Subtasks

- [x] Task 1: Create task detail page with metadata display
- [x] Task 2: Add ReactMarkdown rendering for output artifact
- [x] Task 3: Add partial artifact banner for failed tasks
- [x] Task 4: Add polling for running tasks in detail view
- [x] Task 5: Build and verify

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Completion Notes

- Server component wrapper (`[id]/page.tsx`) with `export const dynamic = "force-dynamic"`
- Client component (`[id]/task-detail-client.tsx`) with full task metadata, ReactMarkdown rendering, polling
- Shows task metadata: status badge, workflow type, ID, context, timestamps, duration, checkpoint count, current step
- Renders output artifact via `react-markdown` with line-height styling
- Partial artifact banner for failed tasks (orange Badge)
- Running/pending state indicators when no artifact yet
- Polls every 10s while task status is RUNNING

### File List

- `src/app/admin/deep-planner/[id]/page.tsx` (NEW) — Server component wrapper with force-dynamic
- `src/app/admin/deep-planner/[id]/task-detail-client.tsx` (NEW) — Client component with artifact viewer
