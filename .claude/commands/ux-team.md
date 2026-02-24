---
name: 'ux-team'
description: 'Spawn a 3-teammate UX agent team (UX Lead + UX Researcher + UI Designer) to produce a UX design specification in parallel. Use when the user says "create UX team", "spawn UX team", "run UX team", or "ux team design".'
---

Create an agent team to produce the UX design specification for nomadically.work.

Spawn 3 teammates using the spawn prompts in `.claude/team-roles/`:

1. **ux-lead** — reads `.claude/team-roles/ux-lead.md`. Coordinates the team, synthesizes findings, owns `_bmad-output/planning-artifacts/ux-design-specification.md`. Require plan approval before it writes any final synthesis section.

2. **ux-researcher** — reads `.claude/team-roles/ux-researcher.md`. Handles user problem definition, personas, user journeys, content strategy, information architecture, and design principles (UX workflow steps 1-6). Works independently; messages ux-lead when sections are ready.

3. **ui-designer** — reads `.claude/team-roles/ui-designer.md`. Handles design system, component patterns, UX consistency patterns, responsive design, and accessibility (UX workflow steps 7-12). Must wait for ux-researcher's personas before finalizing navigation patterns.

Team task structure (create these tasks for the shared task list):
- [ ] Load project context: read CLAUDE.md, PRD, and existing planning artifacts (all teammates in parallel)
- [ ] UX Researcher: define user problem, goals, and design principles
- [ ] UX Researcher: create user personas (EU remote job seekers + hiring managers)
- [ ] UX Researcher: map user journeys (search, alert setup, application, company research)
- [ ] UX Researcher: define information architecture and content strategy
- [ ] UI Designer: select and configure design system (Radix UI)
- [ ] UI Designer: define component patterns (job cards, filters, skill tags, company profiles)
- [ ] UI Designer: establish UX consistency patterns (feedback, forms, states)
- [ ] UI Designer: document responsive breakpoints and accessibility requirements
- [ ] UX Lead: synthesize all findings into ux-design-specification.md
- [ ] UX Lead: run UX alignment check against PRD and architecture

Parallel tracks: ux-researcher (steps 1-6) and ui-designer (steps 7-9) run concurrently. ui-designer waits for personas before finalizing navigation. ux-lead synthesizes after both complete.

Read `.claude/team-roles/ux-lead.md`, `.claude/team-roles/ux-researcher.md`, and `.claude/team-roles/ui-designer.md` for full teammate instructions.
