# Analysis: {spec-title}

> Spec: `specs/active/{slug}/spec.md`
> Plan: `specs/active/{slug}/plan.md`
> Author: QA
> Date: {date}

---

## Spec Consistency Check

_Does the plan match the spec? Are there gaps or contradictions?_

| Spec Requirement | Plan Coverage | Status |
|---|---|---|
| {requirement from spec} | {how plan addresses it} | covered / gap / conflict |

## Coverage Assessment

### Functional Coverage

- [ ] All success criteria from spec have corresponding tasks
- [ ] All user stories have implementation paths
- [ ] Edge cases identified and handled

### Non-Functional Coverage

- [ ] Performance requirements addressed in plan
- [ ] Security requirements addressed (auth, validation, CORS)
- [ ] Accessibility requirements addressed (if UI)
- [ ] Observability requirements addressed (logging, tracing)

## Risk Review

_QA assessment of risks the Architect may have missed._

| Risk | Severity | Recommendation |
|---|---|---|
| {risk} | low/med/high/critical | {recommendation} |

## Test Strategy

_How will the implementation be validated?_

| Criterion | Test Type | Test Location |
|---|---|---|
| {from spec success criteria} | unit / eval / e2e / manual | {file or description} |

## Constitution Compliance

_Does this spec comply with the constitution?_

- [ ] Technical boundaries respected (D1, Drizzle, Apollo, etc.)
- [ ] Quality bars met (eval accuracy, type safety, security)
- [ ] Process rules followed (file ownership, plan approval)
- [ ] Spec sizing appropriate (not an XL disguised as M)

## Verdict

- [ ] **Approved** — proceed to implementation
- [ ] **Approved with conditions** — {conditions that must be met}
- [ ] **Blocked** — {issues that must be resolved before proceeding}
- [ ] **Rejected** — {reason for rejection}

---

_QA: After completing this analysis, update `status.yaml` with the verdict. If approved, Dev can begin implementation._
