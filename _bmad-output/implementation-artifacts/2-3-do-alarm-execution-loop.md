# Story 2.3: DO Alarm Execution Loop & Artifact Generation

Status: review

## Story

As an admin,
I want the Durable Object to execute the full BMAD workflow via alarm-chained LLM calls and produce a finished artifact,
so that I can assign a task and return to a complete planning document.

## Acceptance Criteria

1. **Given** a DO instantiated for a task **When** `alarm()` fires **Then** the DO determines the current BMAD step and pass, builds the prompt, calls Workers AI via `ChatCloudflareWorkersAI`, and stores the LLM response

2. **Given** the DO completes one LLM pass **When** the response is received **Then** the DO updates `deep_planner_tasks` (status, current_step, checkpoint_count, updated_at) and schedules the next alarm with a 6-second delay

3. **Given** rate limiting on Workers AI free tier **When** the DO paces calls at ~10/minute (6s between alarms) **Then** the workflow stays within free tier limits

4. **Given** all BMAD steps and passes are complete **When** the final refinement pass of the COMPLETE step finishes **Then** the DO assembles the full artifact markdown, writes it to `output_artifact`, sets status to `complete`, records `completed_at`, and does NOT schedule another alarm

5. **Given** the generated artifact **When** the admin reads it **Then** it follows BMAD product brief template format with properly sectioned content

## Tasks / Subtasks

- [x] Task 1: Implement alarm() handler with step/pass determination
- [x] Task 2: Implement _call_llm() with Workers AI + retry logic
- [x] Task 3: Implement artifact accumulation across steps
- [x] Task 4: Implement completion detection and final artifact write

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Completion Notes

- Alarm-based execution loop: each alarm fires one LLM pass, saves checkpoint, schedules next alarm (6s delay)
- Uses @cf/meta/llama-3.3-70b-instruct-fp8-fast (free Workers AI model)
- 18 total passes (6 steps x 3 passes), paced at ~10/minute
- Artifact accumulates after each step's refine pass; COMPLETE step produces final document
- Max 3 retries per LLM call with exponential backoff
- Content guarding for JsNull responses from Workers AI

### File List

- `workers/deep-planner/src/durable_object.py` (NEW) — DO with alarm loop, LLM calls, artifact assembly
