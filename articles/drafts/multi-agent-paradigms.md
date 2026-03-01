---
title: "Two Paradigms of Multi-Agent AI: Rust Parallel Agents vs Claude Code Agent Teams"
description: "Own the concurrency or delegate it? A technical comparison of a 20-parallel-agent Rust/DeepSeek system vs Claude Code agent teams — with real implementation code and tradeoff analysis."
date: "2026-03-01"
author: "nomadically.work"
tags: ["multi-agent-ai", "rust", "deepseek", "claude-code", "agentic-ai", "ai-architecture", "parallel-agents"]
status: draft
---

# Two Paradigms of Multi-Agent AI Systems: Rust/DeepSeek Parallel Agents vs Claude Code Agent Teams

Agentic AI engineering roles have caught up with traditional machine learning positions in the job market. Across 9,392 jobs in the nomadically.work database, explicit AI/agentic title jobs number 112 — against 108 traditional ML titles. That near-parity is not a rounding error. It signals a structural shift: the engineering discipline that emerges from multi-agent systems is becoming as common a hiring category as the one that came before it.

The interesting question is no longer whether to build multi-agent systems. It is how — and specifically, which architectural pattern to reach for given the nature of the work. The answer is not a single framework. Two fundamentally different paradigms exist, and the clearest demonstration is that both live inside the same codebase.

<!-- chart: grouped bar comparing "Agentic/LLM titles" (112) vs "Traditional ML titles" (108) in the nomadically.work job database -->

## Why Multi-Agent AI Systems Are Having a Moment in 2026

The job market data reflects a broader trend. The word "agentic" appears in 195 job descriptions in this corpus — a term that barely registered in postings two years ago. "Multi-agent" appears in 62 descriptions. LangGraph, the most-adopted orchestration framework in the dataset, shows up in 16 job postings; AutoGen and CrewAI trail at 7 and 6 respectively. These are small absolute numbers, but they are naming specific orchestration frameworks in hiring requirements — a signal of operational adoption, not aspirational interest.

The academic side tells the same story. Agent papers grew from roughly 820 in 2024 to over 2,500 in 2025. Enterprise AI projects using multi-agent architectures reportedly reached 72% in 2025. The concept has moved from research to production infrastructure faster than most practitioners anticipated.

What the job market and the research papers do not tell you is which architectural pattern to use. That is the gap this article closes.

## Paradigm 1: Infrastructure-Owned Parallelism — The Rust/DeepSeek Approach

The `research` crate in this project is a real Rust binary that fans out 20 parallel DeepSeek agents against Semantic Scholar, collects their outputs, and writes results to Cloudflare D1. It is not a toy. It has run in production. And its architecture is almost aggressive in its simplicity.

The entry point (`research/src/bin/research_agent.rs`) exposes four subcommands: `research` (single agent), `study` (20 parallel agents over agentic-coding topics), `prep` (10 parallel agents over application-prep topics), and `backend`/`enhance` (10–20 agents per document section). Every subcommand follows the same pattern: define a static list of tasks, spawn one Tokio task per item, collect handles, await results.

The task list is a compile-time constant:

```rust
// research/src/study.rs — 20 topics, statically defined
static TOPICS: &[TopicDef] = &[
    TopicDef { slug: "react-patterns", ... },
    TopicDef { slug: "tool-use-loops", ... },
    // ... 18 more
];
```

Agent #3 always gets topic #3. Task assignment happens before the binary starts. There is no runtime negotiation.

## How the DeepSeek Tool-Use Loop Works in Rust

Each spawned agent runs the same inner loop, implemented in `research/src/agent.rs`. The loop is a direct implementation of the OpenAI-compatible function-calling protocol — without a Python SDK wrapper, without a framework abstraction layer:

```rust
// research/src/agent.rs — the agentic tool-use loop
impl DeepSeekAgent {
    pub async fn prompt(&self, user_prompt: String) -> Result<String> {
        let mut messages: Vec<Value> = vec![
            json!({"role": "system", "content": self.preamble}),
            json!({"role": "user",   "content": user_prompt}),
        ];

        loop {
            let resp: Value = self.http
                .post(&format!("{}/v1/chat/completions", self.base_url))
                .bearer_auth(&self.api_key)
                .json(&body)
                .send().await?
                .json().await?;

            let finish_reason = resp["choices"][0]["finish_reason"]
                .as_str().unwrap_or("stop");

            match finish_reason {
                "tool_calls" => {
                    // Execute each requested tool, append results, loop again
                    messages.push(message.clone());
                    for call in calls {
                        let result = tool.call_json(args).await?;
                        messages.push(json!({
                            "role": "tool",
                            "tool_call_id": call_id,
                            "content": result,
                        }));
                    }
                }
                _ => {
                    // "stop" — return the final content
                    return message["content"].as_str().map(String::from)...;
                }
            }
        }
    }
}
```

The `Tool` trait that backs this loop uses `async_trait` and is simple by design:

```rust
#[async_trait]
pub trait Tool: Send + Sync {
    fn name(&self) -> &str;
    fn definition(&self) -> ToolDefinition;
    async fn call_json(&self, args: Value) -> Result<String>;
}
```

Tools register their own JSON Schema via `definition()`, and the agent loop dispatches by name. In the research crate, the primary tools are `search_papers` (Semantic Scholar API) and `get_paper_detail`. Some agents in the `backend` subcommand run with tools; others in the `study` subcommand run without — direct chat completions for speed, because their task structure does not require external lookups.

## Spawning 20 Parallel Agents with Tokio

The fan-out is eleven lines of Rust. That is the entire concurrency model:

```rust
// research/src/study.rs — lines 425-462
let api_key = Arc::new(api_key.to_string());
let scholar = Arc::new(scholar.clone());
let d1 = Arc::new(d1.clone());

let mut handles = Vec::with_capacity(topics.len());

for (i, topic_def) in topics.iter().enumerate() {
    let api_key = Arc::clone(&api_key);
    let scholar = Arc::clone(&scholar);
    let d1 = Arc::clone(&d1);

    let handle = tokio::spawn(async move {
        let agent_id = i + 1;
        match run_single_agent(agent_id, topic_def, ...).await {
            Ok(row) => d1.insert_study_topic(&row).await,
            Err(e) => { error!(...); Err(e) }
        }
    });

    handles.push((topic_def.slug, handle));
}

// Collect results — failures increment a counter but don't abort peers
for (slug, handle) in handles {
    match handle.await {
        Ok(Ok(_)) => successes += 1,
        _         => failures += 1,
    }
}
```

Shared state is wrapped in `Arc<T>` and cloned cheaply into each task. No mutexes. No channels. Each agent reads its own inputs from the `Arc` and writes its own row to D1. They never communicate with each other. A Tokio task carries roughly 64 bytes of overhead and spawns in sub-microsecond time. Spinning up 20 agents adds negligible latency to the program startup.

The tradeoff is rigid: if Agent #7 discovers something that should change what Agent #12 does, there is no mechanism to communicate that. The output of Agent #7 sits in D1. Agent #12 has already been running in parallel since the binary started.

## Paradigm 2: Platform-Managed Agent Teams — The Claude Code Approach

Claude Code's experimental agent teams feature inverts every architectural assumption of the Rust crate. Where the Rust system owns its concurrency at the OS level, Claude teams delegate coordination to the platform. Where Rust pre-assigns tasks at compile time, Claude teams use a shared task list with file-locked claiming at runtime. Where Rust agents are completely isolated, Claude teammates send messages to each other directly.

The feature is enabled in this project with a single environment variable:

```json
// .claude/settings.json
{
  "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
}
```

That one line unlocks five coordination primitives: `TeamCreate`, `TaskCreate`, `TaskUpdate`, `TaskList`, and `SendMessage`. Each teammate is a full, independent Claude Code session — a separate process with its own context window, its own file system access, and its own ability to write and run code.

## How Claude Code Agent Teams Self-Organize

The team lead creates a shared task list stored in `~/.claude/tasks/{team-name}/`. Teammates discover available tasks by calling `TaskList`, claim work by calling `TaskUpdate` (setting themselves as owner), and the platform uses file locking to prevent two teammates from claiming the same task simultaneously. When a teammate finds something unexpected, they send a direct message to the relevant peer via `SendMessage` — the lead does not need to relay it.

This project uses Claude agent teams in its SDD (Spec-Driven Development) orchestrator. The `/sdd:ff` command spawns a team where spec-writing and design run in parallel — two teammates working simultaneously, each producing artifacts the other may need to reference. The key insight is that these phases are not fully independent: a spec decision can change a design constraint. If that happens, the teammates can tell each other directly.

Teammate display cycles through sessions via Shift+Down in-process, or splits into panes in tmux or iTerm2. The team lead's conversation history does not carry to teammates — each starts fresh from the shared CLAUDE.md project context and the task description. Context contamination is a real overhead: a teammate may re-investigate something the lead already resolved, spending tokens to rediscover context the lead has but could not transfer.

Known limitations apply: no session resumption, task status can lag under contention, no nested teams (teammates cannot spawn sub-teams), and the lead is fixed for the team's lifetime. These are experimental constraints, not permanent design decisions — but they are real constraints today.

## Comparing the Two Paradigms: A Decision Framework

The sharpest question to ask before choosing is this: **do your agents need to talk to each other?**

If the answer is no — if you can define all tasks before the run starts, if each agent's output is independent of what other agents are doing right now, if a failure in one agent should not affect the scope of another — then fan-out with static assignment. The Rust/Tokio pattern handles this at near-zero overhead.

If the answer is yes — if tasks may block on each other, if one agent finding an unexpected result should change what another agent investigates, if you want a human to be able to steer individual agents mid-run — then the coordination infrastructure of Claude teams is worth its cost.

| Dimension | Rust/Tokio Fan-Out | Claude Code Agent Teams |
|---|---|---|
| Task assignment | Static, compile-time | Dynamic, file-locked claiming at runtime |
| Inter-agent communication | None | Full bidirectional via `SendMessage` |
| Task dependency support | None | Blocked/unblocked dependency graph |
| Human-in-the-loop | Fire-and-forget | Direct message injection to any teammate mid-run |
| Concurrency overhead | ~64 bytes + sub-μs spawn | Full context window per teammate; token-linear scaling |
| Partial failure handling | Failures increment counter; peers continue | Failed teammate replaceable without aborting team |
| Task dynamism | Zero — determined before binary runs | Tasks can be created, re-assigned, or cancelled at runtime |
| Observability | Structured logs (tracing crate) | Teammate display modes (in-process, tmux, iTerm2) |

<!-- chart: decision tree visualization — "Do agents need to talk to each other?" branching to Rust fan-out vs Claude teams -->

## Cost, Latency, and Observability Tradeoffs

The Rust crate's cost model is transparent. 20 agents make 20 independent API calls to DeepSeek. Each call consumes tokens proportional to the agent's preamble, context, and tool results. Total cost is roughly 20x the cost of a single agent — no platform overhead, no coordination messages, no duplicate context.

Claude agent teams cost "significantly more" per the official documentation, though no specific multiplier is published. Each teammate carries its own full context window. Broadcast messages sent to all teammates multiply by team size. The lead's CLAUDE.md context and task description are embedded in each teammate's initial prompt. The official recommendation is 3–5 teammates with 5–6 tasks each — beyond that, coordination overhead accumulates faster than parallelism saves.

Latency follows the opposite pattern. The Rust system's wall-clock time is bounded by the slowest agent plus network latency to the DeepSeek API — typically 30–90 seconds for 20 agents running fully parallel. A Claude team doing the same breadth of work sequentially within a single session would take proportionally longer. The tradeoff is that the Claude team can do work that requires coordination — work that is genuinely impossible to parallelize without communication between workers.

For the jobs in the nomadically.work database that explicitly list multi-agent frameworks, LangGraph leads at 16 mentions, followed by LangChain (14), AutoGen (7), and CrewAI (6). Agent roles at AI-native companies like Sierra command $180K–$410K USD — compensation data from actual ATS records, not salary surveys. The engineering category is well-compensated precisely because operating these systems at production scale requires understanding these tradeoffs, not just knowing the API.

<!-- chart: horizontal bar chart of orchestration framework mentions — LangGraph (16), LangChain (14), AutoGen (7), CrewAI (6), LlamaIndex (6) -->

## When to Build Your Own vs Use Claude Code Agent Teams

Build infrastructure-owned concurrency (Rust, Python asyncio, TypeScript Promise.all) when:

- Task structure is fully known before execution starts
- Agent outputs are independent — no agent's result should reshape another's scope
- You need deterministic concurrency control with predictable retry behavior
- You are running on constrained infrastructure (Cloudflare Workers, WASM) where a full agent session per task is not viable
- Per-token cost matters at scale — flat API cost per agent, no platform overhead

Use Claude Code agent teams when:

- The task is exploratory — agents may discover things that change the plan
- Agents need to challenge or build on each other's reasoning
- Task dependencies are dynamic — you cannot know the full task graph upfront
- You want human steering capability mid-run without aborting the whole run
- Orchestration code itself is a maintenance burden you want to avoid writing

The Rust crate is an example of the first case. The SDD orchestrator is an example of the second. Both exist in the same codebase because the tasks they handle are structurally different — not because one pattern is better.

One nuance worth stating plainly: the static fan-out pattern is not Rust-specific. Python's `asyncio.gather()` and TypeScript's `Promise.all()` implement the same model. The Rust implementation is a hook into a concrete codebase, not an argument for Rust as the only language for this problem. The DeepSeek API is OpenAI-compatible; the tool-use loop in `agent.rs` could be ported to Python in an afternoon.

The Rust choice reflects a different set of constraints: WASM compilation targets, type-safe JSON handling, and zero-cost abstractions for a system that needs to be embedded in a Cloudflare Worker environment. Those are valid reasons; they are also not universal.

## What This Means for the Future of AI-Powered Software Development

The two paradigms are not competing toward convergence. They occupy different positions on a coordination spectrum that will remain relevant regardless of how individual frameworks evolve.

At one end: static fan-out, owned concurrency, zero coordination overhead, compile-time task structure. Maximally efficient for embarrassingly parallel work where the task graph is known. Will get faster as inference costs fall and async runtimes improve.

At the other end: dynamic coordination, platform-managed concurrency, full messaging infrastructure, runtime task discovery. Maximally flexible for exploratory work where the task graph emerges during execution. Will get cheaper as context window costs fall and team-size recommendations increase.

The emerging challenge — and it is genuinely unsolved — is automated task structure detection: given a goal, should the system fan-out statically or stand up a full team? The agentic frameworks (Claude Agent SDK, OpenAI Agents SDK, LangGraph) are converging on common primitives for describing tasks and dependencies. But the decision of which concurrency model to use still requires human judgment about the nature of the work.

That judgment is increasingly a senior engineering skill. The 112 agentic title jobs in the nomadically.work database — already matching traditional ML positions — are asking for it.

---

**FAQ**

**What is the difference between multi-agent orchestration and agent swarms?**
Orchestration implies a coordinator that assigns tasks to workers based on a defined structure — the coordinator knows the plan. Swarms imply emergent coordination where agents self-organize without a central planner. Claude Code agent teams are closer to orchestration (a lead agent coordinates); the Rust fan-out is neither — it is static parallelism without ongoing coordination of any kind.

**How does Claude Code agent teams pricing work?**
Each teammate is a full Claude session consuming its own token budget. The official documentation describes cost as "significantly more" than a single session, scaling linearly with team size. Broadcast messages multiply by team size. Targeted teammate-to-teammate messages add tokens to both sending and receiving contexts.

**Can I run AI agents in parallel with Rust?**
Yes. The `tokio::spawn` + `Arc<T>` pattern shown in this article is the idiomatic approach. Wrap shared clients (HTTP, database, API keys) in `Arc`, clone into each spawned task, collect `JoinHandle`s, await results. The overhead is ~64 bytes per task and sub-microsecond spawn latency.

**What is DeepSeek's tool use API?**
DeepSeek's tool use (function calling) is an OpenAI-compatible API feature where the model returns structured `tool_calls` JSON when it needs external data. The caller executes the requested function, appends the result as a `tool` message, and calls the API again. This repeats until `finish_reason == "stop"`. The `agent.rs` loop in this codebase implements this directly in Rust without a framework dependency.

**When should I use a multi-agent system instead of a single agent?**
When the task exceeds what a single context window can reliably hold, when subtasks can be parallelized for speed, or when different subtasks benefit from different system prompts or tool sets. Multi-agent overhead is only justified when the task structure genuinely benefits from it — for single-context tasks, a well-prompted single agent is faster and cheaper.

**What Rust crates support async LLM agents?**
The `rig` crate from 0xPlaygrounds is the most actively maintained Rust LLM agent framework (supports OpenAI, Anthropic, Cohere, and others). `async_openai` provides lower-level async bindings. The research crate in this project implements its own thin client (`agent.rs`) against the DeepSeek API directly — a valid approach when framework overhead outweighs the convenience.

---

*Data sourced from the [nomadically.work](https://nomadically.work) job database (9,392 jobs, queried 2026-03-01). Job counts reflect raw database rows; deduplication has not been applied. Classification pipeline has not processed all jobs — 73% of agentic-signal jobs remain unclassified for EU remote status. Salary data is from Ashby ATS structured compensation fields for US-headquartered companies; EU-specific salary data is not available in the current dataset. Code samples are taken verbatim from `research/src/agent.rs` and `research/src/study.rs` and lightly condensed for readability (omitting error message strings and logging details); no logic has been altered.*
