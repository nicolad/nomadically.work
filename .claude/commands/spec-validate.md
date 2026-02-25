---
name: 'spec-validate'
description: 'Validate implementation against spec success criteria. Spawns QA teammate to verify the implementation matches the spec. Use: "spec validate {slug}".'
---

Validate that the implementation matches the spec.

1. Read the spec at `specs/active/{slug}/spec.md` — focus on success criteria
2. Read `specs/active/{slug}/tasks.md` — verify all tasks are checked off
3. Read `specs/active/{slug}/status.yaml` — verify lifecycle is `review`

4. For each success criterion in the spec:
   - Verify the implementation satisfies it
   - Run relevant tests or checks
   - Record pass/fail in `status.yaml`: `validate.criteria_passed`

5. Run quality gate checklists from `_bmad/checklists.md`:
   - Code Review checklist
   - Definition of Done checklist
   - Test Generation checklist (if tests were added)

6. Run automated checks:
   - `pnpm lint`
   - `pnpm build`
   - `pnpm test:eval` (if classification affected)
   - `pnpm strategy:check`

7. Deliver final verdict:
   - **All criteria pass:** Update `lifecycle.state = completed`, move spec directory to `specs/completed/{slug}/`
   - **Criteria fail:** Keep `lifecycle.state = review`, document failures, send back to Dev with specific issues to fix

Read `.claude/team-roles/qa.md` for QA role context.
