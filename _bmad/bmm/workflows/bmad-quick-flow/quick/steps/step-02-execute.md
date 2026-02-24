---
name: 'step-02-execute'
description: 'Autonomous implementation — execute all tasks without interrupting the user'

nextStepFile: './step-03-done.md'
---

# Step 2: Execute Autonomously

**Goal:** Implement everything in `{implementation_plan}` without stopping, asking, or confirming.

**Critical:** You have all the information you need. The user answered your questions. Now ship code.

---

## AVAILABLE STATE

From step-01:

- `{baseline_commit}` - Git HEAD at workflow start
- `{task_description}` - Original request
- `{files_to_modify}` - Files identified during investigation
- `{implementation_plan}` - Ordered task list with answers incorporated
- `{project_context}` - Project patterns (if exists)

---

## EXECUTION LOOP

For each task in `{implementation_plan}`:

### 1. Load File Context

- Read the specific file(s) for this task
- Review the patterns already observed in step-01
- Confirm no surprises before writing

### 2. Implement

- Write code following existing patterns exactly
- Match the codebase's naming conventions, error handling style, import patterns
- Apply all answers from the user's question round
- Where user left something open, use the most conservative/consistent option

### 3. Verify

- If tests exist for this area, run them
- If schema/generated types changed, run codegen (`pnpm codegen`) as needed
- If the task touches DB schema, note the migration step needed but do not auto-run migrations

### 4. Mark Complete

- Check off task: `- [x] Task N — done`
- Continue immediately to next task — no pause, no commentary

---

## HALT CONDITIONS

**HALT and ask the user ONLY if:**

- **3 consecutive failures** on the same task with no clear fix path
- **Missing critical dependency** — a file, secret, or service that must exist but doesn't
- **Security decision** — e.g., "should this endpoint be public or require auth?" with no clear answer from existing code or user's answers

**Do NOT halt for:**

- Warnings that don't block compilation
- Ambiguous style choices (follow existing patterns)
- Test failures you can fix
- Minor scope creep that's obviously implied by the task

---

## ASSUMPTIONS LOG

When you make an assumption (not explicitly answered by the user), log it:

```
[ASSUMED] {what you assumed} — {why this is the safe choice}
```

Collect all assumptions to report in step-03.

---

## NEXT STEP

When ALL tasks are complete, read fully and follow: `{project-root}/_bmad/bmm/workflows/bmad-quick-flow/quick/steps/step-03-done.md`

---

## SUCCESS METRICS

- All tasks implemented
- Code follows existing patterns
- Tests pass (or test failures noted with reason)
- No unnecessary halts
- All assumptions logged

## FAILURE MODES

- Stopping between tasks for approval
- Asking the user questions (unless true blocker)
- Ignoring patterns from step-01 investigation
- Not running tests after changes
- Giving up after first failure instead of retrying
