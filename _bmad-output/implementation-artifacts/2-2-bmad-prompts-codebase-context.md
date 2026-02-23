# Story 2.2: BMAD Prompt Templates & Codebase Context

Status: review

## Story

As an admin,
I want the worker to have BMAD product brief prompts and codebase context baked in,
so that the autonomous execution produces structured, codebase-grounded output.

## Acceptance Criteria

1. **Given** `workers/deep-planner/src/prompts.py` **When** the BMAD product brief workflow steps are defined (INIT, VISION, USERS, SCOPE, METRICS, COMPLETE) **Then** each step has a system prompt template with placeholders for codebase context and accumulated artifact

2. **Given** each BMAD step **When** multi-pass prompts are defined **Then** three pass types exist: `draft` (generate), `critique` (self-review), and `refine` (improve based on critique)

3. **Given** `scripts/bundle-deep-planner-context.ts` **When** the script runs **Then** it copies CLAUDE.md, merged `schema/**/*.graphql`, and `src/db/schema.ts` into `workers/deep-planner/context/` as text files **And** total bundled context is under 8K tokens

4. **Given** prompt templates in `prompts.py` **When** codebase context is loaded from `context/` directory **Then** it is injected into system prompts as a `<codebase_context>` block

## Tasks / Subtasks

- [x] Task 1: Create prompts.py with BMAD_STEPS, PASS_TYPES, step-specific prompt templates
- [x] Task 2: Implement get_prompt() helper for template rendering
- [x] Task 3: Create scripts/bundle-deep-planner-context.ts bundler script
- [x] Task 4: Implement codebase context loading in DO

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Completion Notes

- 6 BMAD steps (INIT, VISION, USERS, SCOPE, METRICS, COMPLETE) x 3 passes (draft, critique, refine) = 18 total passes
- Each step has specific prompt templates with placeholders for problem_description, context, codebase_context, artifact_so_far, previous_output, critique_output
- Context bundler truncates to ~9K chars total (~2.25K tokens) — well under 8K token limit
- Codebase context loaded from DO storage, injected into prompts via {codebase_context} placeholder

### File List

- `workers/deep-planner/src/prompts.py` (NEW) — BMAD prompt templates and step definitions
- `scripts/bundle-deep-planner-context.ts` (NEW) — Codebase context bundler script
