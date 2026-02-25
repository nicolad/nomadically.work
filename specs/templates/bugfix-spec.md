# Bugfix Spec: {title}

> Slug: `{slug}`
> Size: S / M
> Created: {date}
> Author: PM / Dev
> Severity: critical / high / medium / low

---

## Bug Description

_What is broken? Include observed vs expected behavior._

**Observed:** {what happens}
**Expected:** {what should happen}
**Reproduction:** {steps to reproduce, or "intermittent" with frequency}

## Impact

_Who is affected and how severely?_

- Users affected: {scope — all users / admin only / specific flow}
- Data impact: {none / corrupted data / data loss}
- Workaround available: yes / no

## Root Cause Analysis

_Fill during Clarify phase. What is causing the bug?_

- Suspected cause: {description}
- Affected files: {file paths}
- Related code: {function/resolver/component names}

## Fix Criteria

_When is this bug fixed? Each criterion is a validation checkpoint._

- [ ] {criterion-1 — e.g., "Query returns correct results for edge case X"}
- [ ] {criterion-2 — e.g., "No regression in existing tests"}
- [ ] {criterion-3 — e.g., "Build and lint pass"}

## Regression Prevention

_How do we prevent this from recurring?_

- [ ] Test case added covering the bug scenario
- [ ] Root cause pattern documented (if systemic)

---

_After completing this spec, the Dev can proceed directly to implementation for S-size bugs. M-size bugs should go through Plan phase with Architect._
