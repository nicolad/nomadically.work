# Quality Checklists

Distilled quality gates for Agent Teams teammates. Reference from spawn prompts.

---

## Code Review

Before approving any implementation:

- [ ] Acceptance criteria cross-checked against implementation
- [ ] All changed files reviewed for code quality
- [ ] Security review performed (auth guards, input validation, CORS)
- [ ] Tests identified and mapped to acceptance criteria; gaps noted
- [ ] No N+1 queries — field resolvers use `context.loaders.*`
- [ ] No new `any` types in resolvers — use generated types
- [ ] D1 boolean coercion handled (0/1 → true/false)
- [ ] JSON columns parsed in field resolvers
- [ ] `pnpm codegen` run if schema changed
- [ ] `pnpm lint` and `pnpm build` pass

## Definition of Done (Dev Stories)

Before marking a story complete:

- [ ] All tasks/subtasks marked complete
- [ ] Every acceptance criterion satisfied
- [ ] Unit tests cover core functionality
- [ ] All existing tests still pass (no regressions)
- [ ] File list includes every new/modified/deleted file
- [ ] Edge cases and error conditions handled
- [ ] Only project dependencies used (no surprise additions)
- [ ] `pnpm lint` and `pnpm build` pass

## Story Quality

When creating or reviewing stories:

- [ ] Clear technical requirements — no ambiguity
- [ ] Architecture compliance specified
- [ ] Previous story learnings incorporated (if applicable)
- [ ] Anti-patterns called out (what NOT to do)
- [ ] File ownership boundaries clear
- [ ] Actionable instructions — every sentence guides implementation

## Sprint Planning

When planning sprints:

- [ ] Every epic from epics file appears in sprint status
- [ ] Every story appears under its epic
- [ ] No orphaned items in status that don't exist in epic files
- [ ] Story count and epic count match source
- [ ] Items in correct order (epic → stories → retrospective)

## Test Generation (QA)

- [ ] Tests cover happy path
- [ ] Tests cover 1-2 critical error cases
- [ ] All generated tests run successfully
- [ ] Tests use proper locators (semantic, accessible)
- [ ] Tests are independent (no order dependency)
- [ ] No hardcoded waits or sleeps

## Course Correction

When a mid-sprint change is needed:

- [ ] Triggering issue clearly identified with evidence
- [ ] Impact on current epic assessed
- [ ] Impact on remaining epics assessed
- [ ] PRD/architecture/UX conflicts checked
- [ ] Path forward evaluated (adjust / rollback / reduce scope)
- [ ] Recommended approach justified with effort/risk analysis
- [ ] User approval obtained before implementing changes

## Spec Quality (PM)

Before marking a spec as `ready`:

- [ ] Problem statement is specific — not vague or aspirational
- [ ] Every success criterion is a testable checkbox (QA can objectively pass/fail it)
- [ ] Requirements use precise language — no "should ideally" or "nice to have"
- [ ] Scope boundaries are explicit — in-scope and out-of-scope listed
- [ ] Dependencies identified with resolution path
- [ ] Open questions listed (or "None" if fully resolved)
- [ ] Correct template used (feature / bugfix / refactor)
- [ ] Constitution constraints acknowledged (technical boundaries, quality bars)
- [ ] `status.yaml` created and updated

## Spec Plan Review (Architect)

Before marking a plan as `done`:

- [ ] Every spec requirement has a corresponding component or task
- [ ] File ownership boundaries defined — no teammate conflicts
- [ ] Schema changes specified (GraphQL and/or Drizzle)
- [ ] Data flow documented for new data paths
- [ ] Architecture decisions include rationale and alternatives considered
- [ ] Risks identified with mitigations
- [ ] Dependencies listed — nothing blocks implementation unexpectedly
- [ ] Constitution compliance verified (D1, Drizzle, Apollo, auth guards)
- [ ] Tasks are ordered by dependency with parallelizable tasks marked
- [ ] Verification tasks included (codegen, lint, build, eval)

## Spec Validation (QA)

Before marking a spec as `completed`:

- [ ] Every success criterion from `spec.md` verified — pass or fail recorded
- [ ] All tasks in `tasks.md` checked off
- [ ] Code Review checklist passed
- [ ] Definition of Done checklist passed
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes
- [ ] No regressions in existing tests
- [ ] `pnpm test:eval` passes (if AI/classification affected)
- [ ] `status.yaml` updated with final state and validation counts
- [ ] Spec moved to `specs/completed/` (or sent back to Dev with failure details)
