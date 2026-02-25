---
name: 'spec-specify'
description: 'Create a new spec using the appropriate template. Spawns PM teammate to define requirements, success criteria, and scope. Use: "spec specify {feature-name}".'
---

Create a new spec for nomadically.work.

Read `specs/constitution.md` for governing principles.

1. Determine the spec type from the user's description:
   - **Feature** — new capability or enhancement → use `specs/templates/feature-spec.md`
   - **Bugfix** — something is broken → use `specs/templates/bugfix-spec.md`
   - **Refactor** — structural improvement → use `specs/templates/refactor-spec.md`

2. Generate a slug from the title (kebab-case, e.g., `skill-based-job-matching`)

3. Create the spec directory and files:
   ```
   specs/active/{slug}/
   ├── spec.md         ← copy from appropriate template, fill in
   └── status.yaml     ← copy from specs/templates/status.yaml, fill in
   ```

4. Fill in the spec template:
   - Write concrete, testable requirements (not vague goals)
   - Success criteria must be checkboxes that can be objectively verified
   - Reference relevant CLAUDE.md sections for domain context
   - List dependencies on other specs or infrastructure
   - Flag open questions for the Clarify phase

5. Update `status.yaml`:
   - `lifecycle.state = draft` (or `ready` if no open questions)
   - `phases.specify.status = done`
   - Add history entry

6. Present the completed spec to the user for review.

Read `.claude/team-roles/pm.md` for PM role context.
