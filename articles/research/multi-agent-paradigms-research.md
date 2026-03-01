# Research Brief: Two Paradigms of Multi-Agent AI Systems

## Summary

Two concrete multi-agent implementations coexist within the nomadically.work project, each embodying a distinct architectural philosophy. The `research` Rust crate uses Tokio to fan out 10-20 DeepSeek agents across a static, pre-compiled task list — fast, cheap, and zero coordination overhead, but with no inter-agent communication. Claude Code's experimental agent teams feature (enabled here via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.json`) runs each agent as a full, independent Claude Code session with a shared task list, file-locked claiming, mailbox messaging, and direct human-in-the-loop access to individual teammates. Both implement parallel multi-agent work; the divide is between static fan-out and dynamic coordination. Understanding when each pattern applies is the core intellectual contribution of an article on this topic.

---

## Key Facts

### The research crate (Rust/Tokio pattern)

- Binary lives at `/Users/vadimnicolai/Public/nomadically.work/research/src/bin/research_agent.rs`. It exposes four subcommands: `research` (single agent), `study` (20 parallel agents over agentic-coding topics), `prep` (10 parallel agents over application-prep topics), and `enhance`/`backend` (10-20 agents per application document). — Source: codebase (`research_agent.rs`)
- The fan-out pattern: `for (i, topic_def) in topics.iter().enumerate() { let handle = tokio::spawn(async move { ... }); handles.push(handle); }` — all handles collected, then `handle.await` in a second loop to collect results. — Source: `research/src/study.rs`, lines 431-488
- Tasks are statically defined at compile time as `&'static [TopicDef]` slices (20 topics for study, 10 for prep, 10 sections for enhance, 20 sections for backend). No runtime task claiming. Each agent gets exactly one task for its lifetime. — Source: `research/src/study.rs` (TOPICS, APPLICATION_TOPICS constants)
- Shared state is passed via `Arc<T>`: `Arc::new(api_key)`, `Arc::new(scholar)`, `Arc::new(d1)` — cloned cheaply into each spawned task. No mutexes; writes go directly to D1 (each agent writes its own row). — Source: `research/src/study.rs`, lines 425-427
- Each agent implements a standard tool-use loop: POST messages → execute tool_calls → loop until `finish_reason == "stop"`. Tools available: `search_papers` (Semantic Scholar), `get_paper_detail`. Some agents run without tools (direct chat completion for speed). — Source: `research/src/agent.rs`
- Graceful failure isolation: a failed Tokio task increments a `failures` counter but does not abort peers. The binary reports `{successes}/{total}` at the end and only bails if every agent failed. — Source: `research/src/study.rs`, lines 465-488
- No inter-agent communication. Agents are completely isolated. They read shared `Arc` inputs but write to independent D1 rows. There is no mechanism for Agent #3 to react to Agent #7's output. — Source: architectural observation from codebase

### Claude Code agent teams (experimental feature)

- Enabled in this project via `.claude/settings.json`: `"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"`. This is a documented experimental feature, not a third-party tool. — Source: `/Users/vadimnicolai/Public/nomadically.work/.claude/settings.json`, line 3
- Tools unlocked: `TeamCreate`, `TaskCreate`, `TaskUpdate`, `TaskList`, `SendMessage`. These are the coordination primitives that distinguish teams from ordinary subagents. — Source: [Claude Code agent teams docs](https://code.claude.com/docs/en/agent-teams)
- Architecture: one "team lead" session manages a shared task list stored in `~/.claude/tasks/{team-name}/`. Teammates are separate, full Claude Code sessions (separate processes, separate context windows). The lead's conversation history does NOT carry over to teammates. — Source: official docs
- Task claiming uses **file locking** to prevent race conditions when multiple teammates try to claim the same task simultaneously. This is the key mechanism enabling dynamic task claiming vs. the Rust static pre-assignment. — Source: official docs
- Inter-agent communication: teammates message each other directly via `SendMessage`. Messages are delivered automatically; the lead doesn't poll. Two broadcast modes: targeted (one teammate) and broadcast (all teammates). — Source: official docs
- Display modes: in-process (Shift+Down to cycle through teammates) or split-pane via tmux or iTerm2. This project uses the default `"auto"` mode. — Source: official docs + settings.json (no `teammateMode` override set)
- Used in this project's SDD orchestrator (`.claude/commands/sdd.md`): `TeamCreate` for parallel specs+design in `/sdd:ff`, and for multi-phase `/sdd:apply` (each phase as a teammate in a worktree to avoid file conflicts). — Source: `/Users/vadimnicolai/Public/nomadically.work/.claude/commands/sdd.md`, lines 94-115
- Known limitations: no session resumption, task status can lag, one team per session, no nested teams (teammates cannot spawn sub-teams), lead is fixed for the team's lifetime, split panes require tmux/iTerm2 and don't work in VS Code terminal. — Source: official docs

### What they share conceptually

- Both give each agent its own isolated context window. Neither approach uses shared memory or shared embedding space between agents.
- Both implement a fan-out/gather pattern: spawn N agents → collect results.
- Both separate orchestration from execution: a coordinator assigns work, workers do not decide what to work on (Rust: statically; Claude teams: via claiming + assignment).
- Both handle graceful partial failure: the Rust crate collects individual handle results; Claude teams let a failed teammate be replaced without aborting the whole team.
- Both use a single persisted store for results: Cloudflare D1 (Rust crate), task list files + disk artifacts (Claude teams).

### The key differences

- **Task assignment model**: Rust uses static pre-assignment (Agent #3 always does topic #3, determined before the binary runs). Claude teams use dynamic claiming via file-locked task list (any available teammate picks the next unblocked task).
- **Inter-agent communication**: Rust agents have none (zero). Claude teams have full bidirectional messaging via `SendMessage` + automatic delivery.
- **Coordination overhead**: Rust has near-zero overhead; Tokio tasks are ~64 bytes RAM and sub-microsecond spawn latency. Claude teams have significant overhead: each teammate is a full Claude session consuming its own token budget; coordination messages add tokens; file-lock arbitration adds latency.
- **Dynamism**: Rust tasks are fully determined at compile time. Claude teams can have tasks blocked on dependencies, unblocked dynamically when dependencies complete, re-assigned on teammate failure, and adjusted mid-flight via human direct messaging to individual teammates.
- **Human-in-the-loop**: Rust is fire-and-forget (no human interaction during a run). Claude teams allow direct message injection to any teammate mid-run, plan approval gates, and live steering.
- **Language/runtime**: Rust + Tokio async runtime (MPSC concurrency on one machine). Claude teams: separate OS processes or sessions, coordinated via filesystem and message delivery system.

---

## Data Points

| Metric | Value | Source | Date |
|---|---|---|---|
| research crate max parallel agents | 20 (backend subcommand) | `research/src/backend.rs` | 2025 |
| research crate tasks with Semantic Scholar tools | ~4 of 20 in backend (agents #2, #14, #17, #20) | `research/src/backend.rs` | 2025 |
| Tokio task memory overhead | 64 bytes per task | [Tokio docs](https://docs.rs/tokio/latest/tokio/task/) | 2024 |
| Claude agent teams: recommended team size | 3-5 teammates | [Claude Code docs](https://code.claude.com/docs/en/agent-teams) | 2026 |
| Claude agent teams: tasks per teammate (recommended) | 5-6 | [Claude Code docs](https://code.claude.com/docs/en/agent-teams) | 2026 |
| Token cost scaling for agent teams | Linear per teammate (each has own context window) | [Claude Code docs](https://code.claude.com/docs/en/agent-teams) | 2026 |
| Enterprise AI projects using multi-agent architectures | 72% (up from 23% in 2024) | Various industry reports | 2025 |
| Parallel agents token overhead vs single agent | ~2x prompt+completion tokens in some studies | arXiv parallel agent research | 2025 |
| CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS env var | Set to "1" in this project | `.claude/settings.json` | 2025 |
| static `TOPICS` slice size (study subcommand) | 20 topics (agentic coding) | `research/src/study.rs` | 2025 |
| static `APPLICATION_TOPICS` slice size | 10 topics (app prep) | `research/src/study.rs` | 2025 |

---

## Sources

1. [Orchestrate teams of Claude Code sessions — Claude Code Docs](https://code.claude.com/docs/en/agent-teams) — authoritative primary source on agent teams architecture, tools, limitations, and best practices
2. [Agent Teams in Claude Code — Medium (Dan Avila)](https://medium.com/@dan.avila7/agent-teams-in-claude-code-d6bb90b3333b) — practitioner overview of enabling and using the feature
3. [From Tasks to Swarms: Agent Teams in Claude Code — alexop.dev](https://alexop.dev/posts/from-tasks-to-swarms-agent-teams-in-claude-code/) — architecture analysis comparing teams vs subagents
4. [Anthropic releases Opus 4.6 with new 'agent teams' — TechCrunch](https://techcrunch.com/2026/02/05/anthropic-releases-opus-4-6-with-new-agent-teams/) — news context on agent teams release
5. [Building agents with the Claude Agent SDK — Anthropic Engineering](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk) — SDK context (renamed from Claude Code SDK)
6. [Tokio task spawning docs](https://docs.rs/tokio/latest/tokio/task/) — Tokio task overhead, memory model, and fan-out patterns
7. [Tokio spawning tutorial](https://tokio.rs/tokio/tutorial/spawning) — fan-out pattern with JoinHandle vectors
8. [AI Agent Orchestration Patterns — Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns) — orchestrator-worker pattern taxonomy
9. [Scaling LangGraph Agents: Parallelization, Subgraphs, and Map-Reduce Trade-Offs — AI Practitioner](https://aipractitioner.substack.com/p/scaling-langgraph-agents-parallelization) — static vs dynamic (map-reduce) task allocation tradeoffs in practice
10. [Multi-Agent Collaboration via Evolving Orchestration — arXiv](https://arxiv.org/html/2505.19591v1) — research on coordination overhead and adaptive orchestration
11. [Optimizing Sequential Multi-Step Tasks with Parallel LLM Agents — arXiv](https://arxiv.org/html/2507.08944v1) — quantitative analysis of parallel agent token costs
12. [AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation — arXiv](https://arxiv.org/pdf/2308.08155) — foundational multi-agent conversation paper
13. [The Complete Guide to Choosing an AI Agent Framework in 2025 — Langflow](https://www.langflow.org/blog/the-complete-guide-to-choosing-an-ai-agent-framework-in-2025) — landscape context on framework choices
14. `/Users/vadimnicolai/Public/nomadically.work/research/src/study.rs` — primary internal source: static task list pattern, fan-out loop, Arc sharing
15. `/Users/vadimnicolai/Public/nomadically.work/research/src/agent.rs` — DeepSeekAgent tool-use loop implementation
16. `/Users/vadimnicolai/Public/nomadically.work/research/src/bin/research_agent.rs` — CLI entry point, all subcommands
17. `/Users/vadimnicolai/Public/nomadically.work/.claude/settings.json` — confirms `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1"` enabled
18. `/Users/vadimnicolai/Public/nomadically.work/.claude/commands/sdd.md` — shows Claude teams in actual use (SDD orchestrator)

---

## Recommended Angle

The strongest narrative is the **inversion of the conventional wisdom** that "more coordination = better multi-agent systems." The Rust crate proves that for embarrassingly parallel tasks with pre-known task structure, the cheapest, fastest, most reliable approach is zero coordination: compile-time task assignment, isolated agents, and a shared D1 sink. Claude agent teams prove that for tasks requiring discovery, debate, and dynamic rebalancing — the kind of work where a teammate finding an unexpected result should change what another teammate does next — full messaging infrastructure, dynamic task claiming, and human-in-the-loop steering are worth the token overhead. The article's value is in giving practitioners a concrete decision rule: "if your tasks are known upfront and independent, fan-out with static assignment; if your tasks are interdependent or exploratory, pay for coordination." This is demonstrated with actual code from the same codebase, making it unusually concrete for the genre.

---

## Counterarguments / Nuances

- **The Rust crate is not a "pure" example of the pattern**: some agents use Semantic Scholar tools (making them truly agentic with dynamic inner loops) while others are direct chat completions without tools. The fan-out is the outer pattern; individual agents may or may not be agentic internally.
- **Claude agent teams are experimental and have known limitations**: no session resumption, task lag, no nested teams. An article should not present them as production-ready without noting these caveats.
- **Token cost scaling is nonlinear in practice**: each Claude teammate has its own full context window, but context accumulates differently than a single session. Broadcast messages multiply cost by team size. The official docs say costs are "significantly more" but give no specific multiplier — this claim should be verified or left as directional.
- **Static task lists can also be done in Python/TypeScript**: the pattern is not Rust-specific. asyncio.gather() in Python or Promise.all() in TypeScript implement the same fan-out. The Rust angle is a hook, not a constraint.
- **Dynamic vs static is a spectrum**: Claude teams allow static assignment (lead assigns tasks explicitly to named teammates) AND dynamic claiming (teammates self-assign). The Rust crate technically allows some dynamism if you construct the task list at runtime from a database query rather than a compile-time constant.
- **Context contamination in teams**: each Claude teammate gets the project's CLAUDE.md and spawn context but NOT the lead's conversation history. This means teammates start fresh and may re-investigate context the lead already knows — a hidden coordination cost not counted in token metrics.
- **The Addy Osmani "Claude Code Swarms" article** covers similar territory from a practitioner UX angle; positioning this article as more technically grounded (actual code dissection) and framework-agnostic is important for differentiation.

---

## Needs Verification

- Exact token cost multiplier for Claude agent teams vs single session — official docs say "significantly more" but no numeric multiplier is given. [Costs page](https://code.claude.com/docs/en/costs#agent-team-token-costs) may have specifics (not fetched).
- Whether the `research` crate has ever been run with 20 agents simultaneously in production (vs. development/testing only) — no logs or run history available in codebase.
- Whether the file-locking mechanism in Claude teams is implemented via POSIX `flock()` or another OS primitive — docs say "file locking" but don't specify the implementation.
- The "72% of enterprise AI projects using multi-agent architectures" figure — found in a secondary source summary; primary study not identified.
- Whether Claude's `TeamCreate` tool is part of the Claude Agent SDK (available to third-party developers) or exclusive to Claude Code's internal tooling.

---

## Suggested Structure

1. **The two systems side-by-side** — brief tour of the Rust crate (what it does, the fan-out code) and Claude agent teams (what they do, the tools). Establish that both live in the same project.
2. **What they share: the universal pattern** — isolated context windows, fan-out/gather, orchestration separate from execution, resilient partial failure, single persisted store.
3. **Where they diverge: the coordination axis** — static pre-assignment vs. dynamic claiming (file locking), zero inter-agent comms vs. full SendMessage, fire-and-forget vs. human-in-the-loop steering. Use the actual code and docs for specifics.
4. **The cost vs coordination tradeoff** — Tokio task overhead (64 bytes, sub-microsecond) vs. Claude teammate overhead (full context window, token-linear scaling). When each is appropriate: known-upfront independent tasks vs. exploratory interdependent tasks.
5. **When to use each** — decision rule with examples from the codebase. Rust crate: study topic generation, application section enhancement (known task structure, parallelizable outputs). Claude teams: SDD fast-forward (specs+design can discover things that affect each other), debugging with competing hypotheses, cross-layer feature work.
6. **Academic context** — brief grounding in ReAct, AutoGen, orchestrator-worker pattern, the 2025 shift toward multi-agent architectures in enterprise. Avoid over-academic framing.
7. **What this means for the future of AI-powered software development** — the insight that multi-agent systems are a spectrum, not a binary, and that the most effective practitioners will combine both patterns depending on task structure. The emergence of agentic SDKs (Claude Agent SDK, OpenAI Agents SDK, LangGraph) shows this is converging toward standardized primitives. The remaining open problem is automated task structure detection: given a goal, should the system fan-out statically or stand up a full team?
