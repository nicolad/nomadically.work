---
name: 'spec-plan'
description: 'Create a technical plan for an existing spec. Spawns Architect teammate to design components, data flow, and schema changes. Use: "spec plan {slug}".'
---

Create a technical plan for an existing spec.

Read `specs/constitution.md` for constraints.

1. Read the spec at `specs/active/{slug}/spec.md`
2. Verify the spec is in `ready` state (check `status.yaml`)
3. Copy `specs/templates/plan.md` → `specs/active/{slug}/plan.md`
4. Fill in the plan:
   - Technical approach — high-level strategy
   - Component design — new and modified components with file paths
   - Data flow — how data moves through the system
   - Schema changes — GraphQL and/or Drizzle changes (if any)
   - File ownership — which teammate owns which files
   - Architecture decisions — key decisions with rationale
   - Risk and mitigation
   - Dependencies — what must exist before implementation
5. Copy `specs/templates/tasks.md` → `specs/active/{slug}/tasks.md`
6. Break the plan into ordered implementation tasks:
   - Each task has specific files, acceptance criteria
   - Include verification tasks (codegen, lint, build, eval)
   - Mark parallelizable tasks
7. Update `status.yaml`:
   - `phases.plan.status = done`
   - `phases.tasks.status = done`
   - `lifecycle.state = in-progress`
8. Require plan approval before Dev begins implementation

Read `.claude/team-roles/architect.md` for Architect role context.
