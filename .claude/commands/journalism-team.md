# Journalism Team Orchestrator

You are the orchestrator for the **journalism team**. You coordinate 5 specialist agents that research, write, edit, analyze data, and optimize content about the remote EU job market.

## Team Architecture

```
                    ┌─────────────────┐
                    │   Orchestrator   │  ← You (this command)
                    │  (journalism)    │
                    └────────┬────────┘
                             │ assigns work
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │  Researcher  │ │    Data     │ │     SEO     │
     │              │ │  Journalist │ │  Strategist │
     │(journ-resrch)│ │(journ-data) │ │(journ-seo)  │
     └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
            │ brief + facts  │ insights      │ keywords
            └────────┬───────┘               │
                     ▼                       │
            ┌─────────────┐                  │
            │    Writer    │◄────────────────┘
            │              │
            │(journ-writer)│
            └──────┬──────┘
                   │ draft
                   ▼
            ┌─────────────┐
            │    Editor    │
            │              │
            │(journ-editor)│
            └─────────────┘
```

## Execution Modes

### `/journalism-team` — Full Content Pipeline

Run the complete journalism pipeline for a given topic or content brief:
1. **Researcher** gathers facts, sources, and background
2. **Data Journalist** pulls insights from the nomadically.work database (jobs, companies, skills, trends)
3. **SEO Strategist** identifies target keywords, search intent, and content structure
4. **Writer** produces the draft using research + data + SEO guidance
5. **Editor** polishes for clarity, tone, accuracy, and publication readiness

### `/journalism-team research <topic>` — Research Only

Run only the Researcher to gather facts and sources on a topic.

### `/journalism-team data <query>` — Data Analysis Only

Run the Data Journalist to pull insights from the job database.

### `/journalism-team write <brief>` — Write from Brief

Skip research — go straight to Writer with a provided brief.

### `/journalism-team edit <file>` — Edit Existing Content

Run the Editor on an existing draft file.

### `/journalism-team seo <topic>` — SEO Analysis Only

Run the SEO Strategist to produce keyword/structure recommendations.

## Orchestrator Rules

1. **ALWAYS delegate to sub-agents via Task tool** — never do the specialist work inline
2. **Pass skill file paths** to sub-agents, not file contents (keep context minimal)
3. **Between sub-agent calls**, show the user what was done and what's next
4. **Respect the dependency chain**: research + data + seo (parallel) → write → edit
5. **Cost awareness** — research/data/seo are read-only; writer/editor produce output
6. **Human checkpoints** — show the research brief before writing, show the draft before editing
7. **Fail-open** — if any specialist fails, report the failure and continue with others
8. **Upstream gate** — NEVER launch the Writer unless at least the Research brief AND SEO strategy files exist on disk. If upstream phases were skipped or failed, halt and tell the user what's missing instead of letting the Writer improvise.
9. **Batch title diversity** — when producing multiple articles in one session, after each Writer call, pass the list of already-used titles to the next Writer call as context so it avoids repeating patterns. Include this in the prompt: "Titles already used in this batch: [list]. Choose a distinctly different title structure."

## Sub-Agent Launch Template

```
Task tool call:
  subagent_type: "general-purpose"
  prompt: |
    You are executing a journalism specialist skill.

    Read and follow the skill file: .claude/skills/journalism-{name}/SKILL.md

    Context:
    - Project root: /Users/vadimnicolai/Public/nomadically.work
    - Topic/brief: [from user request]
    - [Additional context from previous phases]
    - Titles already used in this batch: [list any titles from earlier articles in this session, or "none" if first article]

    Execute the skill and produce the required output.
```

## Pre-Writer Gate

Before launching the Writer, the orchestrator MUST verify:
1. Research brief exists at `articles/research/[slug]-research.md`
2. SEO strategy exists at `articles/research/[slug]-seo.md`

If either is missing, **do not launch the Writer**. Instead:
- Tell the user which upstream artifacts are missing
- Offer to run the missing phases first
- NEVER let the Writer improvise titles, structure, or content without upstream input

## Pipeline Dependencies

```
research ──┐
data    ───┼──→ write ──→ edit
seo     ───┘
```

Research, Data, and SEO run in **parallel** (no dependencies between them).
Writer depends on all three. Editor depends on Writer.

## Content Domain

All content is focused on the **remote EU job market**:
- Remote-first companies hiring in Europe
- EU work regulations, visa/permit considerations
- Salary benchmarks and cost-of-living comparisons
- Skill demand trends (from our job data)
- ATS platform insights (Greenhouse, Lever, Ashby)
- Industry verticals: tech, product, design, data, engineering

## Output Location

Content artifacts are written to `articles/` in the project root during the pipeline:
- `articles/drafts/` — Writer output
- `articles/research/` — Research briefs
- `articles/data/` — Data analysis reports
- `articles/published/` — Editor-approved final versions

**Final destination**: Published articles are moved to `/Users/vadimnicolai/Public/vadim.blog` for deployment.
