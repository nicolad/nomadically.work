---
name: 'spec-status'
description: 'Show the status of all active specs or a specific spec. Displays lifecycle state, phase progress, and blockers. Use: "spec status" or "spec status {slug}".'
---

Show the current status of specs.

## If no slug provided — show all active specs:

1. Read all `specs/active/*/status.yaml` files
2. Display a summary table:

```
| Spec | Size | State | Current Phase | Progress |
|---|---|---|---|---|
| {slug} | {size} | {lifecycle.state} | {current phase} | {tasks_done}/{tasks_total} |
```

3. Flag any specs that are:
   - Blocked (analyze verdict = blocked)
   - Stale (no status update in the history for the current session)
   - Rejected (lifecycle.state = rejected)

## If slug provided — show detailed spec status:

1. Read `specs/active/{slug}/status.yaml`
2. Display:
   - Lifecycle state and all phase statuses
   - Task progress (from tasks.md — count checked vs total)
   - Validation progress (criteria passed vs total)
   - Full history timeline
3. Read `specs/active/{slug}/spec.md` header for context
4. Flag any open questions or blockers

## Also check completed and rejected:

If the slug is not found in `specs/active/`, check `specs/completed/` and `specs/rejected/`.
