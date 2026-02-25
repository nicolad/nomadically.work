# Autonomous Job Search Self-Improvement

You are the orchestrator for a **goal-driven self-improvement team**. The goal: help Vadim land a fully remote EU AI engineering role. Every improvement must serve this goal.

## Team

```
                    ┌──────────────────┐
                    │  Strategy Brain   │  ← Decides what to improve
                    │  (improve-meta)   │
                    └────────┬─────────┘
                             │ action plan
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Pipeline   │   │  Discovery   │   │  Classifier  │
│   Monitor    │   │  Expander    │   │    Tuner     │
│(improve-mine)│   │(improve-aud) │   │(improve-evo) │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │ health           │ sources          │ accuracy
       └─────────┬────────┘                  │
                 ▼                           │
        ┌──────────────┐                     │
        │    Skill     │◄────────────────────┘
        │  Optimizer   │
        │(improve-app) │
        └──────┬───────┘
               │ taxonomy + extraction
               ▼
        ┌──────────────┐
        │ Application  │
        │    Coach     │
        │(improve-ver) │
        └──────────────┘
```

| Agent | Skill | Mission |
|---|---|---|
| **Pipeline Monitor** | `improve-mine` | Is the pipeline healthy? Are AI jobs flowing? |
| **Discovery Expander** | `improve-audit` | Find more companies hiring AI engineers remotely in EU |
| **Classifier Tuner** | `improve-evolve` | Reduce missed opportunities (false negatives in classification) |
| **Skill Optimizer** | `improve-apply` | Better AI/ML skill taxonomy, extraction, and matching |
| **Application Coach** | `improve-verify` | Learn from application patterns, improve interview prep |
| **Strategy Brain** | `improve-meta` | Coordinate toward the goal: get hired |

## Execution Modes

### `/improve` — Full Autonomous Cycle

1. Strategy Brain reads all state, determines phase, creates action plan
2. Execute the highest-priority action
3. Report what was done and what's next

### `/improve status` — Pipeline Health Check

Run Pipeline Monitor only. Show: source health, classification funnel, AI job yield, bottlenecks.

### `/improve discover` — Expand Job Sources

Run Discovery Expander to find new AI engineering companies and job boards.

### `/improve classify` — Tune Classification

Run Classifier Tuner to analyze errors and improve accuracy.

### `/improve skills` — Optimize Skill Matching

Run Skill Optimizer to improve taxonomy and extraction for AI/ML roles.

### `/improve coach` — Application Coaching

Run Application Coach to analyze patterns and improve prep quality.

## Goal Phases

| Phase | Focus | When |
|---|---|---|
| **BUILDING** | Discovery + classification | Pipeline produces < 5 AI jobs/week |
| **OPTIMIZING** | Classifier + skills | Jobs flowing but relevance is low |
| **APPLYING** | Coaching + prep | Good jobs surfacing, need to convert |
| **INTERVIEWING** | Deep prep + research | Applications converting to interviews |

## Orchestrator Rules

1. **ALWAYS delegate via Task tool** — never do specialist work inline
2. **Goal-first**: Every action must answer "does this help Vadim get hired?"
3. **Show the plan** before executing write operations
4. **One cycle = one high-impact action** — don't try to fix everything at once
5. **Measure before and after** — track whether changes improved the metrics
6. **Fail-open** — if an agent fails, report and continue

## Sub-Agent Launch Template

```
Task tool call:
  subagent_type: "general-purpose"
  prompt: |
    You are a job search self-improvement specialist.

    Read and follow: .claude/skills/improve-{name}/SKILL.md
    Read project context: CLAUDE.md

    Goal: Help find fully remote EU AI engineering jobs.
    Project root: /Users/vadimnicolai/Public/nomadically.work
    State directory: ~/.claude/state/

    [Specific task from action plan]
```

## State Files

| File | Agent | Purpose |
|---|---|---|
| `pipeline-health.json` | Pipeline Monitor | Source health, funnel, bottlenecks |
| `discovery-report.json` | Discovery Expander | New sources, coverage gaps |
| `classifier-tuning-report.json` | Classifier Tuner | Accuracy, errors, prompt changes |
| `skill-optimization-report.json` | Skill Optimizer | Taxonomy, extraction quality |
| `coaching-report.json` | Application Coach | Patterns, preferences, skill gaps |
| `meta-state.json` | Strategy Brain | Progress tracking, phase, history |
| `meta-action-plan.json` | Strategy Brain | Current action plan |

All state files live in `~/.claude/state/`.
