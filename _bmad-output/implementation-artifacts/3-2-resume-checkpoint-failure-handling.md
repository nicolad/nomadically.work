# Story 3.2: Resume from Checkpoint & Failure Handling

Status: review

## Story

As an admin,
I want failed tasks to preserve their partial output and resume from the last checkpoint,
so that hours of work are never lost and I can see exactly where things stopped.

## Acceptance Criteria

1. **Given** a DO that crashed or was evicted after completing step 3 (9 checkpoints) **When** the next alarm fires or the task is re-triggered **Then** the DO loads the last checkpoint from DO storage and resumes execution from the next pass

2. **Given** a Workers AI call that times out or returns an error **When** the DO catches the error **Then** it retries with exponential backoff (max 3 retries per call) **And** if all retries fail, it sets task status to `failed` with error message

3. **Given** a task that fails mid-execution **When** the error handler runs **Then** the partial artifact (all completed steps so far) is written to `output_artifact` **And** `error_message` is set with a descriptive failure reason **And** `status` is set to `failed`

4. **Given** a task with status `running` and `updated_at` older than 30 minutes **When** the admin views it in the UI **Then** a "Stale — may have crashed" indicator is shown alongside the status

## Tasks / Subtasks

- [x] Task 1: Implement checkpoint resume in alarm() — load last checkpoint, determine next pass
- [x] Task 2: Implement retry with exponential backoff in _call_llm()
- [x] Task 3: Implement error handling — mark_failed with partial artifact
- [x] Task 4: Stale task indicator in admin UI (already implemented in Story 1.2)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Completion Notes

- Alarm handler loads checkpoint on each invocation, resumes from pass_index + 1
- LLM retry: 3 attempts with 2s, 4s, 8s backoff (capped at 10s)
- On failure: partial artifact_so_far written to output_artifact, error_message describes which step/pass failed
- Stale indicator: 30-minute threshold in admin list page (deep-planner-client.tsx)
- Trigger mutation allows re-triggering failed tasks from the UI

### File List

- `workers/deep-planner/src/durable_object.py` (NEW) — Resume logic + retry + error handling
- `workers/deep-planner/src/checkpoint.py` (NEW) — mark_failed preserves partial artifact
- `src/app/admin/deep-planner/deep-planner-client.tsx` (EXISTING) — Stale indicator
- `src/app/admin/deep-planner/[id]/task-detail-client.tsx` (MODIFIED) — Retry button for failed tasks
