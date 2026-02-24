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
