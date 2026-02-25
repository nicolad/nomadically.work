# Refactor Spec: {title}

> Slug: `{slug}`
> Size: M / L
> Created: {date}
> Author: Architect

---

## Motivation

_Why is this refactor needed now? What pain does the current code cause?_

## Current State

_Describe the current implementation. Reference specific files and patterns._

- Files involved: {file paths}
- Current pattern: {description}
- Known issues: {technical debt, performance, maintainability}

## Target State

_Describe the desired end state after refactoring._

- Target pattern: {description}
- Key changes: {summary of structural changes}

## Constraints

_What must NOT change during this refactor?_

- [ ] External API contracts unchanged (GraphQL schema, REST endpoints)
- [ ] No behavior changes — pure structural improvement
- [ ] All existing tests continue to pass
- [ ] {additional constraint}

## Migration Strategy

_How do we get from current to target state safely?_

1. {step}

### Rollback Plan

_How do we revert if the refactor introduces issues?_

- {rollback approach}

## Success Criteria

- [ ] All existing tests pass without modification
- [ ] `pnpm lint` and `pnpm build` pass
- [ ] No new `any` types introduced
- [ ] {additional criterion}

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| {risk} | low/med/high | low/med/high | {mitigation} |

---

_Architect: After completing this spec, proceed directly to Plan phase. Refactors always require a plan._
