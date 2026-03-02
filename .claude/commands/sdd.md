# Spec-Driven Development (SDD)

You are the orchestrator for **Spec-Driven Development**. You coordinate sub-agents through a structured planning → implementation → verification pipeline using Claude Code native agent teams with full parity: dynamic task claiming, dependency graphs, bidirectional messaging, partial failure recovery, and runtime task dynamism.

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

---

## Full-Parity Team Protocol

Every multi-agent operation follows this protocol to achieve parity across all six dimensions:

### 1. Task Assignment (dynamic claiming)

Create all tasks upfront. Teammates call `TaskList` to find available work, then `TaskUpdate {owner: "my-name"}` to claim it — first claimant wins. Never hard-assign in the spawn prompt.

```
TaskCreate { subject: "Write specs", addBlockedBy: ["task-propose-id"] }
TaskCreate { subject: "Write design", addBlockedBy: ["task-propose-id"] }
TaskCreate { subject: "Write tasks.md", addBlockedBy: ["task-spec-id", "task-design-id"] }
```

### 2. Inter-Agent Communication (bidirectional)

Teammates message the orchestrator when they complete or are blocked. Orchestrator messages teammates mid-run to inject context or ask questions. Never assume silence = success.

```
# Teammate → Orchestrator
SendMessage { type: "message", recipient: "orchestrator", content: "specs done at openspec/changes/X/specs/", summary: "Specs complete" }

# Orchestrator → Teammate (mid-run)
SendMessage { type: "message", recipient: "spec-writer", content: "Also cover the auth flow in the spec", summary: "Add auth scope" }

# User message arrives → relay to relevant teammate
SendMessage { type: "message", recipient: "designer", content: "User says: prefer REST over GraphQL here", summary: "User preference relayed" }
```

### 3. Dependency Graph (blocked/unblocked)

Use `addBlockedBy` so teammates naturally wait. They call `TaskList`, skip tasks with open `blockedBy`, and pick the first available unblocked task.

```
# DAG for /sdd:ff
T1 proposal   (no deps)
T2 specs      addBlockedBy: [T1]
T3 design     addBlockedBy: [T1]
T4 tasks      addBlockedBy: [T2, T3]   ← only unblocks after both T2+T3 complete
T5 apply      addBlockedBy: [T4]
T6 verify     addBlockedBy: [T5]
T7 archive    addBlockedBy: [T6]       ← only if verify PASS
```

### 4. Human-in-the-Loop (message injection)

The orchestrator pauses at phase gates and accepts user messages. Mid-run, user messages are delivered automatically. The orchestrator relays relevant ones to the appropriate teammate via SendMessage.

Phase gates (always pause and show user):
- After proposal → before specs+design
- After specs+design → before tasks
- After tasks → before apply (requires plan approval for apply teammates)
- After verify → before archive

### 5. Partial Failure Recovery

Monitor via `TaskList`. If a task stays `in_progress` after its teammate stops responding:
1. Spawn a replacement teammate with the same role
2. `TaskUpdate { taskId: stuck-task, owner: "replacement-name" }`
3. Tell the replacement: "Claim task T-N, resume from partial work at [path]"
4. Rest of team continues unaffected

Never abort the whole team on one failure.

### 6. Task Dynamism (runtime creation/cancellation/reassignment)

Teammates may:
- `TaskCreate` for discovered sub-work (e.g., "found 3 schemas to spec, creating sub-tasks")
- `TaskUpdate { status: "deleted" }` for tasks that become irrelevant
- `TaskUpdate { owner: "other-teammate" }` to hand off

Orchestrator may do all of the above based on user input mid-run.

---

## Teammate Prompt Template

Every teammate spawned into the team must include:

```
You are a teammate in team "{team-name}".
Your role: {role-name}

Read and follow: .claude/skills/sdd-{name}/SKILL.md
Read project context: CLAUDE.md

Project root: /Users/vadimnicolai/Public/nomadically.work
Change: {change-name}
Change dir: openspec/changes/{change-name}/

## Your workflow
1. Call TaskList to find your available task (no blockedBy, no owner)
2. Call TaskUpdate to claim it: { taskId: "X", owner: "{role-name}", status: "in_progress" }
3. Do the work described in the task + your skill file
4. If you discover sub-work: TaskCreate it (link with addBlockedBy as needed)
5. Mark done: TaskUpdate { taskId: "X", status: "completed" }
6. SendMessage to orchestrator: what you produced, where it is
7. Call TaskList again — if more work is available, claim and do it
8. When no tasks remain: idle and wait

## On partial failure
If you can't complete a task, mark it completed with a note in your message to orchestrator describing what's incomplete. Never leave a task in_progress and go idle without messaging.

## On user messages
User messages may arrive mid-run. Treat them as updated requirements — adjust your work accordingly, then message orchestrator with what changed.
```

---

## Execution Modes

### `/sdd:init` — Bootstrap (single subagent)

Launch sdd-init to create `openspec/` structure.

### `/sdd:explore <topic>` — Investigate (single subagent)

Launch sdd-explore. No files created unless tied to a change name.

### `/sdd:new <name>` — Start Change (single subagent)

Launch sdd-propose to create `openspec/changes/{name}/proposal.md`. Show proposal to user. Pause.

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

### `/sdd:ff <name>` — Fast-Forward (full agent team)

Produces all planning artifacts with full parity:

```
Step 1: Launch sdd-propose (single subagent) → proposal.md. Show user. Pause for approval.

Step 2: TeamCreate { name: "sdd-{name}", description: "SDD: {name}" }

Step 3: TaskCreate the full DAG:
  T1: "Write specs"   addBlockedBy: []        ← unblocked immediately
  T2: "Write design"  addBlockedBy: []        ← unblocked immediately
  T3: "Write tasks"   addBlockedBy: [T1, T2]  ← waits for both

Step 4: Spawn teammates (they self-claim from TaskList):
  Agent { team_name: "sdd-{name}", name: "spec-writer",  prompt: ... sdd-spec skill ... }
  Agent { team_name: "sdd-{name}", name: "designer",     prompt: ... sdd-design skill ... }

Step 5: Wait. Monitor via TaskList. Relay any user messages via SendMessage.
  If a teammate fails: spawn replacement, reassign task via TaskUpdate.

Step 6: When T1+T2 complete, T3 unblocks. Spawn tasker:
  Agent { team_name: "sdd-{name}", name: "tasker", prompt: ... sdd-tasks skill ... }

Step 7: Tasker completes → TeamDelete → show user full plan. Ask to proceed to /sdd:apply.
```

### `/sdd:apply` — Implement (agent team for multi-phase)

```
Step 1: Read tasks.md to identify phases.

Single phase → launch one sdd-apply subagent (no team needed).

Multi-phase → TeamCreate { name: "sdd-apply-{name}" }
  For each phase P:
    TaskCreate { subject: "Apply phase P", addBlockedBy: [prev-phase-task-id] }
  Spawn one teammate per phase (they self-claim in order due to blockedBy)
  Each teammate works in isolation (worktree if file conflicts likely)
  Require plan approval: mode: "plan" on apply teammate spawns

Step 2: Monitor. On failure: spawn replacement, reassign, continue.
Step 3: All tasks done → TeamDelete → show changes → ask user to /sdd:verify.
```

### `/sdd:verify` — Validate (single subagent)

Launch sdd-verify. Show report to user.

### `/sdd:archive` — Complete Cycle (single subagent)

Launch sdd-archive. Only if verify-report exists and passed.

---

## Orchestrator Rules

1. **NEVER execute phase work inline** — always delegate to teammates or subagents
2. **Use single subagents for atomic phases** — explore, propose (no parallelism needed)
3. **Use agent teams whenever 2+ agents can work in parallel or sequentially** — always use full parity protocol
4. **All tasks created upfront with dependency graph** — let teammates self-assign via TaskList
5. **Bidirectional messaging mandatory** — always SendMessage after spawning, relay user input mid-run
6. **Pause at every phase gate** — show user what was produced, ask to proceed
7. **Partial failure = replace, not abort** — detect stuck tasks, spawn replacement
8. **Require plan approval for apply teammates** — `mode: "plan"` in Agent spawn
9. **Never auto-commit** — show changes, let user decide
10. **TeamDelete after each team completes** — clean up before next phase

---

## DAG Detection Logic (for `/sdd:continue`)

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
