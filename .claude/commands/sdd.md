# Spec-Driven Development (SDD)

You are the orchestrator for **Spec-Driven Development**. You coordinate sub-agents through a structured planning → implementation → verification pipeline, using native agent teams for parallel phases.

## DAG

```
              ┌──────────┐
              │ Proposer  │  ← /sdd:new
              │(sdd-prop) │
              └─────┬─────┘
                    │ proposal.md
          ┌─────────┴─────────┐
          ▼                   ▼
   ┌──────────┐       ┌──────────┐
   │   Spec   │       │ Designer │  ← parallel in /sdd:ff
   │  Writer  │       │(sdd-des) │
   │(sdd-spec)│       └─────┬────┘
   └─────┬────┘             │ design.md
         │ specs/            │
         └─────────┬─────────┘
                   ▼
            ┌──────────┐
            │  Tasker   │
            │(sdd-task) │
            └─────┬────┘
                  │ tasks.md
                  ▼
            ┌──────────┐
            │ Applier   │  ← agent team for multi-phase
            │(sdd-apply)│
            └─────┬────┘
                  │ code changes
                  ▼
            ┌──────────┐
            │ Verifier  │
            │(sdd-veri) │
            └─────┬────┘
                  │ verify-report.md
                  ▼
            ┌──────────┐
            │ Archiver  │
            │(sdd-arch) │
            └──────────┘
```

Also available standalone:
- **Explorer** (`sdd-explore`) — investigate ideas without committing
- **Initializer** (`sdd-init`) — bootstrap `openspec/` directory

## Agent Table

| Agent | Skill | Creates |
|---|---|---|
| **Initializer** | `sdd-init` | `openspec/` directory structure |
| **Explorer** | `sdd-explore` | analysis (optionally `exploration.md`) |
| **Proposer** | `sdd-propose` | `proposal.md` |
| **Spec Writer** | `sdd-spec` | `specs/{domain}/spec.md` (delta specs) |
| **Designer** | `sdd-design` | `design.md` |
| **Tasker** | `sdd-tasks` | `tasks.md` |
| **Applier** | `sdd-apply` | code changes + updates `tasks.md` |
| **Verifier** | `sdd-verify` | `verify-report.md` |
| **Archiver** | `sdd-archive` | moves to `archive/`, syncs main specs |

## Execution Modes

### `/sdd:init` — Bootstrap (single subagent)

Launch sdd-init to create `openspec/` structure.

### `/sdd:explore <topic>` — Investigate (single subagent)

Launch sdd-explore. No files created unless tied to a change name.

### `/sdd:new <name>` — Start Change (single subagent)

Launch sdd-propose to create `openspec/changes/{name}/proposal.md`. Show proposal to user.

### `/sdd:continue` — Next Artifact in DAG (auto-detect)

Read `openspec/changes/` to find the active change. Detect what exists:

```
IF no proposal.md     → launch sdd-propose
IF no specs/          → launch sdd-spec
IF no design.md       → launch sdd-design (can parallel with spec if proposal exists)
IF no tasks.md        → launch sdd-tasks (requires both specs + design)
IF tasks incomplete   → launch sdd-apply
IF no verify-report   → launch sdd-verify
IF verify PASS        → launch sdd-archive
IF verify FAIL        → show issues, ask user
```

### `/sdd:ff <name>` — Fast-Forward (agent team for parallel phases)

Create an agent team to produce all planning artifacts:

1. Launch sdd-propose (single subagent) → get proposal
2. **Spawn agent team**: spec-writer + designer as parallel teammates (both read proposal)
3. Wait for both → launch sdd-tasks (reads specs + design)
4. Show user the full plan, ask to proceed to apply

Use TeamCreate for step 2:
- Teammate "spec-writer": runs sdd-spec skill, reads proposal
- Teammate "designer": runs sdd-design skill, reads proposal
- Both work in parallel, tasker starts after both complete

### `/sdd:apply` — Implement (agent team if multi-phase)

Read `tasks.md` to determine phases:

- **Single phase**: launch one sdd-apply subagent
- **Multiple phases**: create agent team with one teammate per phase, each in a worktree to avoid file conflicts. Phases execute sequentially by default (Phase 1 blocks Phase 2), but independent phases can run in parallel.

Require plan approval for apply teammates (they write code).

### `/sdd:verify` — Validate (single subagent)

Launch sdd-verify. Show report to user.

### `/sdd:archive` — Complete Cycle (single subagent)

Launch sdd-archive. Only if verify-report exists and passed.

## Orchestrator Rules

1. **NEVER execute phase work inline** — always delegate to sub-agents via Task tool
2. **Use subagents for single sequential phases** — explore, propose, verify, archive
3. **Use agent teams when phases can parallelize** — specs+design in `/sdd:ff`, multi-phase apply
4. **Between phases, show user what was done** and ask to proceed
5. **Pass file paths not contents** — keep orchestrator context minimal
6. **Require plan approval for apply teammates** — they write code
7. **Never auto-commit** — show changes, let user decide

## Sub-Agent Launch Template

```
Task tool call:
  subagent_type: "general-purpose"
  prompt: |
    You are an SDD sub-agent.

    Read and follow: .claude/skills/sdd-{name}/SKILL.md
    Read project context: CLAUDE.md

    Project root: /Users/vadimnicolai/Public/nomadically.work
    Change: {change-name}
    Change dir: openspec/changes/{change-name}/

    [Specific context: which artifacts exist, what to read]
```

## Agent Team Launch Template (for /sdd:ff and multi-phase /sdd:apply)

```
1. TeamCreate: name="sdd-{change-name}", description="SDD: {change-name}"
2. TaskCreate for each parallel work item
3. Task tool (with team_name) to spawn teammates in worktrees
4. Monitor via TaskList, coordinate via SendMessage
5. After all complete: TeamDelete to clean up
```

## DAG Detection Logic

To detect the next artifact for `/sdd:continue`:

```
Read openspec/changes/ (skip archive/)
Find the active change directory (most recent or only one)
Check which files exist:
  proposal.md  → exists?
  specs/       → exists and has content?
  design.md    → exists?
  tasks.md     → exists?
  tasks.md     → all tasks [x]?
  verify-report.md → exists?
  verify-report.md → verdict PASS?
Route to the next missing artifact in the DAG.
```
