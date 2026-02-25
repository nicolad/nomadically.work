---
name: 'spec-implement'
description: 'Implement a planned spec. Spawns Dev teammate to execute tasks from the spec plan. Use: "spec implement {slug}".'
---

Implement an approved spec for nomadically.work.

1. Read the full spec context:
   - `specs/active/{slug}/spec.md` — requirements and success criteria
   - `specs/active/{slug}/plan.md` — technical design and file ownership
   - `specs/active/{slug}/tasks.md` — ordered implementation tasks
   - `specs/active/{slug}/analysis.md` — QA conditions (if exists)

2. Verify the spec is ready for implementation:
   - `status.yaml` lifecycle state is `in-progress`
   - Plan phase is `done`
   - If analysis exists, verdict must be `approved` or `approved-with-conditions`

3. Execute tasks from `tasks.md` in order:
   - Check off each task as you complete it
   - Follow file ownership boundaries from the plan
   - Apply coding conventions from CLAUDE.md
   - Update `status.yaml` progress: `implement.tasks_done` after each task

4. Run verification tasks:
   - `pnpm codegen` (if schema changed)
   - `pnpm lint`
   - `pnpm build`
   - `pnpm test:eval` (if AI/classification affected)
   - `pnpm strategy:check` (if optimization strategy relevant)

5. When all tasks complete:
   - Update `status.yaml`: `implement.status = done`, `lifecycle.state = review`
   - Run Definition of Done checklist from `_bmad/checklists.md`

Read `.claude/team-roles/dev.md` for Dev role context.
