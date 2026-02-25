---
name: 'journalism-team'
description: 'Spawn a 5-teammate AI journalism team (Managing Editor + Researcher + Writer + Editor + Fact-Checker) to research, write, edit, and fact-check a long-form technical article for vadim.blog. Use when the user says "create journalism team", "spawn journalism team", "run journalism team", "write an article", or "journalism team".'
---

Create an agent team to produce a publish-ready long-form article for vadim.blog.

The article brief is: $ARGUMENTS

If no brief is provided, ask the user for: topic, angle/thesis, target audience, and any specific examples or sections they want included.

Blog details:
- Platform: Docusaurus 3.9
- Post path: `/Users/vadimnicolai/Public/vadim.blog/blog/YYYY/MM-DD-slug/index.md`
- Format: Markdown with YAML frontmatter (slug, title, description, date, authors: [nicolad], tags)
- Style: deep technical, TL;DR at top, mermaid diagrams, code blocks, direct voice

Spawn 4 teammates using the spawn prompts in `.claude/team-roles/`:

1. **managing-editor** — reads `.claude/team-roles/managing-editor.md`. Coordinates the team, synthesizes research into outline, assembles final article, writes to vadim.blog. Require plan approval before final article is written to the blog path.

2. **researcher** — reads `.claude/team-roles/researcher.md`. Researches the topic using web search, produces a structured research brief in `articles/research/[slug]-research.md`. Works independently; messages managing-editor when complete.

3. **writer** — reads `.claude/team-roles/writer.md`. Writes the full draft from the outline + research brief. Saves to `articles/drafts/[slug]-draft-v1.md`. Must wait for managing-editor's outline approval.

4. **editor** — reads `.claude/team-roles/editor.md`. Reviews draft for structure, clarity, and style. Edits directly in the draft file. Flags unsupported claims for fact-checker. Runs in parallel with fact-checker.

5. **fact-checker** — reads `.claude/team-roles/fact-checker.md`. Verifies all factual claims against primary sources. Fixes incorrect claims in the draft. Runs in parallel with editor.

Team task structure (create these tasks for the shared task list):
- [ ] Managing Editor: read brief, create research questions, assign to researcher
- [ ] Researcher: web research + produce research brief in `articles/research/`
- [ ] Managing Editor: synthesize research into article outline (requires research complete)
- [ ] Human approval: review and approve outline before writing
- [ ] Writer: write full draft v1 in `articles/drafts/` (requires outline approval)
- [ ] Editor: editorial review + in-place edits (parallel with fact-checker)
- [ ] Fact-Checker: verify all claims + fix errors (parallel with editor)
- [ ] Writer: revise to draft v2 incorporating editor + fact-checker feedback
- [ ] Managing Editor: final assembly + write to `/Users/vadimnicolai/Public/vadim.blog/blog/YYYY/MM-DD-slug/index.md`
- [ ] Managing Editor: run `pnpm build` in vadim.blog — fix any errors until build passes
- [ ] Managing Editor: `git add`, `git commit`, `git push` in vadim.blog

Parallel tracks:
- Researcher runs first, independently
- Editor + Fact-Checker run simultaneously on draft v1
- Writer revision waits for both to complete
- Managing Editor writes final article after revision

File ownership:
- `articles/research/` — researcher only
- `articles/drafts/` — writer only (editor edits in place, fact-checker edits in place)
- `/Users/vadimnicolai/Public/vadim.blog/blog/` — managing-editor only (final assembly)

Read `.claude/team-roles/managing-editor.md`, `.claude/team-roles/researcher.md`, `.claude/team-roles/writer.md`, `.claude/team-roles/editor.md`, and `.claude/team-roles/fact-checker.md` for full teammate instructions.
