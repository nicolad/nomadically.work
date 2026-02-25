# Tasks: {spec-title}

> Spec: `specs/active/{slug}/spec.md`
> Plan: `specs/active/{slug}/plan.md`
> Author: Architect
> Assigned to: Dev

---

## Implementation Order

_Tasks are ordered by dependency. Complete each before starting the next unless marked as parallelizable._

### Phase 1: {phase-name}

- [ ] **Task 1.1:** {description}
  - Files: `{file-paths}`
  - Acceptance: {what "done" looks like for this task}

- [ ] **Task 1.2:** {description}
  - Files: `{file-paths}`
  - Acceptance: {criteria}

### Phase 2: {phase-name}

- [ ] **Task 2.1:** {description}
  - Files: `{file-paths}`
  - Acceptance: {criteria}

### Phase 3: Verification

- [ ] **Task 3.1:** Run `pnpm codegen` (if schema changed)
- [ ] **Task 3.2:** Run `pnpm lint` — fix any errors
- [ ] **Task 3.3:** Run `pnpm build` — fix any errors
- [ ] **Task 3.4:** Run `pnpm test:eval` (if AI/classification affected)
- [ ] **Task 3.5:** Run `pnpm strategy:check` (if optimization strategy relevant)

## Parallelizable Tasks

_These tasks have no dependencies on each other and can run concurrently._

- {task-ids that can run in parallel}

## Blocked Tasks

_Tasks that cannot start until an external dependency is resolved._

| Task | Blocked By | Resolution |
|---|---|---|
| {task-id} | {what's blocking} | {how to unblock} |

---

_Dev: Update task checkboxes as you complete each one. Update `status.yaml` when all tasks are done. Message QA when ready for validation._
