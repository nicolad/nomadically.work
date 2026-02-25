---
name: 'spec-team'
description: 'Orchestrate spec-driven development using Claude Code Teams. Creates a spec, plans it, breaks it into tasks, analyzes consistency, implements, and validates — all through coordinated teammates. Use: "spec team {feature-name}" or "run spec team".'
---

Run the full spec-driven development lifecycle for nomadically.work using Claude Code Agent Teams.

## Workflow

Read `specs/constitution.md` for governing principles. All specs must comply.

### Phase 1: Specify (PM)

Spawn a **pm** teammate (read `.claude/team-roles/pm.md`):

1. Ask the user what they want to build (or use the provided description)
2. Determine spec type: feature / bugfix / refactor
3. Create spec directory: `specs/active/{slug}/`
4. Copy the appropriate template from `specs/templates/{type}-spec.md` → `specs/active/{slug}/spec.md`
5. Fill in the spec with requirements, success criteria, and scope
6. Copy `specs/templates/status.yaml` → `specs/active/{slug}/status.yaml`
7. Update status: `specify.status = done`, `lifecycle.state = draft`
8. Present the spec to the user for approval before proceeding

### Phase 2: Clarify (PM + Architect)

If the spec has open questions or the user flags gaps:

1. PM resolves ambiguities with user input
2. Spawn an **architect** teammate (read `.claude/team-roles/architect.md`) to review technical feasibility
3. Architect flags any constitution violations or architectural concerns
4. PM updates `spec.md` with resolved questions
5. Update status: `clarify.status = done`, `lifecycle.state = ready`

For S-size specs with no open questions, skip this phase: `clarify.status = skipped`.

### Phase 3: Plan (Architect)

Spawn an **architect** teammate:

1. Read the spec at `specs/active/{slug}/spec.md`
2. Read `specs/constitution.md` for constraints
3. Copy `specs/templates/plan.md` → `specs/active/{slug}/plan.md`
4. Design the technical approach, component layout, data flow, and schema changes
5. Define file ownership boundaries to prevent teammate conflicts
6. Update status: `plan.status = done`
7. Require plan approval before proceeding

### Phase 4: Tasks (Architect)

Same architect teammate continues:

1. Copy `specs/templates/tasks.md` → `specs/active/{slug}/tasks.md`
2. Break the plan into ordered, concrete implementation tasks
3. Each task has: files, acceptance criteria, and dependency info
4. Include verification tasks (codegen, lint, build, eval)
5. Update status: `tasks.status = done`, `lifecycle.state = in-progress`

### Phase 5: Analyze (QA) — for M/L specs

Spawn a **qa** teammate (read `.claude/team-roles/qa.md`):

1. Copy `specs/templates/analysis.md` → `specs/active/{slug}/analysis.md`
2. Cross-check spec requirements against plan coverage
3. Identify gaps, risks, and missing test strategies
4. Check constitution compliance
5. Deliver verdict: approved / approved-with-conditions / blocked / rejected
6. Update status: `analyze.status = done`, `analyze.verdict = {verdict}`

For S-size specs, skip analysis: `analyze.status = skipped`.

### Phase 6: Implement (Dev)

Spawn a **dev** teammate (read `.claude/team-roles/dev.md`):

1. Read the spec, plan, and tasks
2. Implement tasks in order, checking off each one in `tasks.md`
3. Follow file ownership from the plan — do not touch files assigned to other teammates
4. Update `status.yaml` progress: `implement.tasks_done` as each task completes
5. Run verification tasks (codegen, lint, build)
6. Message QA when implementation is complete
7. Update status: `implement.status = done`

### Phase 7: Validate (QA)

Same or new **qa** teammate:

1. Validate each success criterion from `spec.md`
2. Run relevant tests (`pnpm test:eval`, `pnpm lint`, `pnpm build`)
3. Cross-check against `tasks.md` — all tasks should be checked off
4. Run checklists from `_bmad/checklists.md` (Code Review + Definition of Done)
5. Update status: `validate.criteria_passed`, `validate.status = done`
6. If all criteria pass: `lifecycle.state = completed`, move spec to `specs/completed/`
7. If criteria fail: send back to Dev with specific failures

## Team Task Structure

Create these tasks for the shared task list:

- [ ] PM: Create spec from template and fill requirements
- [ ] PM + Architect: Clarify open questions and resolve ambiguities
- [ ] Architect: Create technical plan with component design and data flow
- [ ] Architect: Break plan into ordered implementation tasks
- [ ] QA: Analyze spec consistency and coverage (M/L specs only)
- [ ] Dev: Implement all tasks from tasks.md
- [ ] Dev: Run verification (codegen, lint, build, eval)
- [ ] QA: Validate implementation against spec success criteria
- [ ] Move completed spec to specs/completed/

## Parallel Opportunities

- Phase 3 (Plan) and Phase 5 (Analyze) can overlap — QA starts analysis while Architect finalizes tasks
- Within Phase 6, parallelizable tasks from `tasks.md` can be assigned to multiple dev agents

## Shortcuts for Common Patterns

- **Quick bugfix (S):** Specify → Implement → Validate (skip Clarify, Plan, Tasks, Analyze)
- **Standard feature (M):** Full lifecycle, skip Analyze
- **Complex feature (L):** Full lifecycle including Analyze
- **Refactor:** Specify → Plan → Tasks → Implement → Validate (Architect drives specify)

Read `.claude/team-roles/pm.md`, `.claude/team-roles/architect.md`, `.claude/team-roles/dev.md`, and `.claude/team-roles/qa.md` for full teammate instructions.
