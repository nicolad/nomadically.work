---
name: 'spec-analyze'
description: 'QA analysis of a spec for consistency, coverage, and risk. Spawns QA teammate to review spec against plan and constitution. Use: "spec analyze {slug}".'
---

Perform QA analysis on a spec before implementation begins.

Read `specs/constitution.md` for quality bars.

1. Read the spec, plan, and tasks at `specs/active/{slug}/`
2. Copy `specs/templates/analysis.md` → `specs/active/{slug}/analysis.md`
3. Perform the analysis:
   - **Consistency check** — does the plan address every spec requirement?
   - **Coverage assessment** — functional, non-functional, edge cases
   - **Risk review** — risks the Architect may have missed
   - **Test strategy** — how each criterion will be validated
   - **Constitution compliance** — technical boundaries, quality bars, process rules
4. Deliver a verdict:
   - **Approved** — proceed to implementation
   - **Approved with conditions** — specific conditions that must be met
   - **Blocked** — issues that must be resolved first
   - **Rejected** — fundamental problems with the spec or plan
5. Update `status.yaml`:
   - `phases.analyze.status = done`
   - `phases.analyze.verdict = {verdict}`

Read `.claude/team-roles/qa.md` for QA role context.
