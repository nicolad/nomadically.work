# Story 3.1: LangGraph D1 Checkpointing Integration

Status: review

## Story

As an admin,
I want every LLM pass checkpointed to D1,
so that no progress is lost if the worker crashes mid-execution.

## Acceptance Criteria

1. **Given** checkpoint.py implements save/load checkpoint functions **When** the DO completes an LLM pass **Then** the full workflow state (current step, pass, output, accumulated artifact) is persisted to DO storage and D1 task record is updated

2. **Given** the DO completes an LLM pass **When** the checkpoint is saved **Then** the `checkpoint_count` in `deep_planner_tasks` is incremented

3. **Given** a task with 18 expected passes (6 steps x 3 passes) **When** the workflow runs to completion **Then** 18 checkpoint writes are recorded and `checkpoint_count` reflects this

## Tasks / Subtasks

- [x] Task 1: Implement save_checkpoint() — stores to DO SQLite storage + updates D1 task record
- [x] Task 2: Implement load_checkpoint() — reads from DO storage for resume
- [x] Task 3: Implement mark_running/mark_complete/mark_failed helpers
- [x] Task 4: Wire checkpoint save into alarm loop after each LLM pass

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Completion Notes

- Dual-write checkpoint: DO local SQLite storage (fast) + D1 task record update (durable)
- Checkpoint data includes: step, pass_type, pass_index, output, artifact_so_far, saved_at
- D1 task record updated with: current_step, checkpoint_count, updated_at
- mark_running/mark_complete/mark_failed update all relevant D1 fields

### File List

- `workers/deep-planner/src/checkpoint.py` (NEW) — Checkpoint persistence and task status helpers
