---
slug: two-paradigms-multi-agent-ai-rust-vs-claude-teams
title: "Two Paradigms of Multi-Agent AI: Rust Parallel Agents vs Claude Code Agent Teams"
description: "From static Tokio fan-out to full agent-teams parity in Rust — a technical comparison of three multi-agent coordination models, with real implementation code including TaskQueue, Mailbox, PlanGate, and ShutdownToken."
date: 2026-03-01
authors: [nicolad]
tags:
  - rust
  - rust-async
  - tokio
  - deepseek
  - claude-code
  - agent-teams
  - agent-coordination
  - task-coordination
  - inter-agent-messaging
  - cooperative-shutdown
  - multi-agent-ai
  - agentic-ai
  - ai-architecture
  - parallel-agents
---

:::tip TL;DR
Three multi-agent coordination positions, [one codebase](https://github.com/nicolad/nomadically.work). A static Rust/Tokio fan-out assigns 20 agents at compile time with zero coordination overhead. A `team.rs` library implements the full Claude Code agent-teams model in pure Rust — `TaskQueue`, `Mailbox`, `PlanGate`, `ShutdownToken` — and the `study` pipeline now uses it to run a 2-step search→write flow with inter-worker messaging. Claude Code agent teams invert every assumption of static fan-out: dynamic task claiming, file-locked concurrency, full bidirectional messaging. The decision rule is one question: **do your agents need to talk to each other?** If no, `tokio::spawn` + `Arc<T>`. If yes: build `team.rs`, or use `TeamCreate`.
:::

Multi-agent AI engineering has become a core discipline in production software development. The interesting question is no longer whether to build multi-agent systems. It is how — and specifically, which architectural pattern to reach for given the nature of the work. The clearest demonstration is that multiple fundamentally different paradigms live inside the [same codebase](https://github.com/nicolad/nomadically.work).

When this article was first published, the comparison was binary: the Rust crate used bare `tokio::spawn` fan-out while Claude Code provided the coordination model. That binary is no longer accurate. The research crate now ships `team.rs` — a 641-line generic coordination library in pure Rust that implements the complete Claude Code agent-teams model. The codebase now demonstrates all three positions simultaneously.

## Why Multi-Agent AI Systems Are Having a Moment in 2026

Agent papers grew from roughly 820 in 2024 to over 2,500 in 2025. Enterprise AI projects using multi-agent architectures reportedly reached 72% in 2025. LangGraph, the most-adopted orchestration framework in the ecosystem, leads adoption; AutoGen and CrewAI follow. The concept has moved from research to production infrastructure faster than most practitioners anticipated.

What the research papers do not tell you is which architectural pattern to use. That is the gap this article closes.

## Paradigm 1: Infrastructure-Owned Parallelism — The Rust/DeepSeek Approach

The [`research` crate](https://github.com/nicolad/nomadically.work/tree/main/research) is a real Rust binary that fans out up to 20 parallel DeepSeek agents against Semantic Scholar, collects their outputs, and writes results to Cloudflare D1. Its architecture is aggressive in its simplicity.

The entry point ([`research/src/bin/research_agent.rs`](https://github.com/nicolad/nomadically.work/blob/main/research/src/bin/research_agent.rs)) exposes five subcommands: `research` (single agent), `study` (20 parallel agents over agentic-coding topics), `prep` (10 parallel agents over application-prep topics), `enhance` (10 agents per application section), and `backend` (20 agents for backend interview prep). Every subcommand follows the same pattern: define a static list of tasks, queue them, spawn workers, collect results.

The task list is a compile-time constant:

```rust
// research/src/study.rs — 20 topics, statically defined
pub const TOPICS: &[TopicDef] = &[
    TopicDef { slug: "tool-use-patterns", ... },
    TopicDef { slug: "react-agent-loop", ... },
    // ... 18 more
];
```

The task structure is fully known before the binary starts. There is no runtime negotiation over which agent handles which topic.

## How the DeepSeek Tool-Use Loop Works in Rust

Each spawned agent runs the same inner loop, implemented in [`research/src/agent.rs`](https://github.com/nicolad/nomadically.work/blob/main/research/src/agent.rs). The loop is a direct implementation of the OpenAI-compatible function-calling protocol — without a Python SDK wrapper, without a framework abstraction layer:

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

Tools register their own JSON Schema via `definition()`, and the agent loop dispatches by name. In the research crate, the tools are `search_papers` (Semantic Scholar API) and `get_paper_detail`. Agents in the `study` subcommand use both tools for paper lookup; agents in the `prep` subcommand run without tools — direct chat completions for speed, because their task structure does not require external lookups.

## Spawning Parallel Agents with Tokio

The `prep` pipeline still demonstrates the flat fan-out pattern — no inter-worker communication, no dependency graph. The `APPLICATION_TOPICS` path is the cleanest example of infrastructure-owned parallelism:

```rust
// research/src/study.rs — run_prep()
let queue: TaskQueue<TopicDef> = TaskQueue::new();
for topic_def in APPLICATION_TOPICS {
    queue.push(topic_def.slug, *topic_def, vec![], 2).await;
}

let mailbox = Mailbox::new();
let (_shutdown_tx, shutdown) = shutdown_pair();
let summary = TeamLead::new(APPLICATION_TOPICS.len())
    .run(queue, mailbox, shutdown, move |ctx, task| {
        let api_key = Arc::clone(&api_key);
        let d1 = Arc::clone(&d1);
        let topic_def = task.payload;
        async move {
            info!(worker = %ctx.worker_id, topic = topic_def.slug, "Prep agent starting");
            let row = run_direct_agent(topic_def, &api_key).await?;
            d1.insert_study_topic(&row)
                .await
                .with_context(|| format!("D1 insert failed for {}", topic_def.slug))?;
            info!(worker = %ctx.worker_id, topic = topic_def.slug, "Saved to D1");
            Ok::<(), anyhow::Error>(())
        }
    })
    .await;
```

No mailbox communication between workers. No dependencies. Each worker reads its own topic, makes its own API call, writes its own row to D1. Workers never communicate with each other. This is the flat fan-out case expressed through the team abstraction — functionally equivalent to a bare `tokio::spawn` loop, but now with retry, idle notifications, and cooperative shutdown included for free.

Shared state is wrapped in `Arc<T>` and cloned cheaply into each task. A Tokio task carries roughly 64 bytes of overhead and spawns in sub-microsecond time. Spinning up 20 agents adds negligible latency to program startup.

## The Third Path: Implementing Agent-Teams Primitives in Rust

After observing the mismatch between "static fan-out is too rigid for the study pipeline" and "spinning up a full Claude session per research topic is too expensive," the research crate grew a third position: `research/src/team.rs`, a 641-line Rust coordination library that implements the complete Claude Code agent-teams model natively.

This is not an accidental similarity. The module-level doc comment states the goal explicitly, mapping every agent-teams concept to its Rust equivalent:

| Agent-teams concept | `team.rs` equivalent |
|---|---|
| Shared task list | `TaskQueue<P>` |
| Atomic task claiming | `TaskQueue::claim` |
| Task dependencies | `depends_on` in `TaskQueue::push` |
| Retry on failure | `max_attempts` + re-queue on fail |
| Queue change notification | `TaskQueue::notify_handle` |
| Lead / worker separation | `TeamLead` + `TeamContext` |
| Worker identity | stable `worker-NN` IDs |
| Peer discovery | `ctx.peer_ids` in `TeamContext` |
| Point-to-point message | `Mailbox::send` |
| Broadcast to all teammates | `Mailbox::broadcast` |
| Idle notifications | worker → `team-lead` inbox on exit |
| Plan approval gate | `PlanGate` |
| Cooperative shutdown | `ShutdownToken` / `shutdown_pair` |

Every concept from the Claude Code agent-teams documentation has a direct Rust/Tokio equivalent. The target audience is clear: engineers who need the coordination semantics of agent teams but cannot or will not run a full Claude session per task — whether because of WASM constraints, cost at scale, or infrastructure ownership requirements.

The full implementation is in [`research/src/team.rs`](https://github.com/nicolad/nomadically.work/blob/main/research/src/team.rs).

### TaskQueue — Atomic Claiming with Dependency Support

`TaskQueue<P>` is generic over the task payload type. Its `claim()` method is the coordination core — it holds the mutex for the full claim operation, computes which tasks have their dependencies satisfied, and claims the lowest available ID:

```rust
// research/src/team.rs — TaskQueue::claim
pub async fn claim(&self, worker: &str) -> Option<(TaskId, String, P)> {
    let mut s = self.inner.lock().await;
    let done: HashSet<TaskId> = s.tasks.values()
        .filter(|t| t.status == TaskStatus::Completed)
        .map(|t| t.id)
        .collect();
    let id = s.tasks.values()
        .filter(|t| {
            t.status == TaskStatus::Pending
                && t.depends_on.iter().all(|d| done.contains(d))
        })
        .map(|t| t.id)
        .min()?;                              // lowest ID wins (ID-order preference)
    let task = s.tasks.get_mut(&id).unwrap();
    task.status = TaskStatus::Claimed(worker.into());
    task.attempts += 1;
    Some((id, task.name.clone(), task.payload.clone()))
}
```

Tasks are pushed with an explicit dependency list:

```rust
// research/src/team.rs — TaskQueue::push
pub async fn push(
    &self,
    name: impl Into<String>,
    payload: P,
    depends_on: Vec<TaskId>,   // IDs that must be Completed before this can be claimed
    max_attempts: u32,
) -> TaskId {
    let mut s = self.inner.lock().await;
    let id = s.next_id;
    s.next_id += 1;
    s.tasks.insert(id, TaskEntry {
        id,
        name: name.into(),
        payload,
        status: TaskStatus::Pending,
        depends_on,
        attempts: 0,
        max_attempts,
    });
    id
}
```

Failure handling re-queues the task as `Pending` if attempts remain, permanently marks it `Failed` otherwise, and notifies idle workers via `Notify`:

```rust
// research/src/team.rs — TaskQueue::fail
pub async fn fail(&self, id: TaskId) {
    {
        let mut s = self.inner.lock().await;
        if let Some(t) = s.tasks.get_mut(&id) {
            if t.attempts >= t.max_attempts {
                warn!(task = %t.name, attempts = t.attempts, "Task permanently failed");
                t.status = TaskStatus::Failed;
            } else {
                warn!(task = %t.name, attempt = t.attempts, max = t.max_attempts,
                    "Task failed — re-queuing for retry");
                t.status = TaskStatus::Pending;
            }
        }
    }
    self.changed.notify_waiters();
}
```

### Mailbox — Point-to-Point and Broadcast Messaging

The `Mailbox` is an `Arc`-wrapped `HashMap<String, VecDeque<Envelope>>` — named inboxes, FIFO order. Any string can be an inbox name: worker IDs, task slugs, topic slugs. From the doc comment:

> Workers write to named inboxes and read from their own. The inbox name can be a worker ID, a task name, a topic slug — any agreed-upon key. This mirrors the agent-teams mailbox where teammates message each other directly without going through the lead.

Point-to-point send:

```rust
// research/src/team.rs — Mailbox::send
pub async fn send(
    &self,
    from: impl Into<String>,
    to: impl Into<String>,
    subject: impl Into<String>,
    body: impl Into<String>,
) { ... }
```

Broadcast delivers the same message to every recipient in the slice:

```rust
// research/src/team.rs — Mailbox::broadcast
pub async fn broadcast(
    &self,
    from: impl Into<String>,
    recipients: &[&str],
    subject: impl Into<String>,
    body: impl Into<String>,
) {
    let from = from.into();
    let subject = subject.into();
    let body = body.into();
    for recipient in recipients {
        self.send(from.clone(), *recipient, subject.clone(), body.clone()).await;
    }
}
```

Blocking receive parks the task until a message arrives:

```rust
// research/src/team.rs — Mailbox::recv_wait
pub async fn recv_wait(&self, inbox: &str) -> Envelope {
    loop {
        if let Some(env) = self.recv(inbox).await {
            return env;
        }
        self.notify.notified().await;
    }
}
```

The `Envelope` struct carries a monotonic message ID, sender, recipient, subject, and body (plain text or JSON):

```rust
// research/src/team.rs
pub struct Envelope {
    pub id: u64,
    pub from: String,
    pub to: String,
    pub subject: String,
    pub body: String,
}
```

### TeamLead::run() — The Worker Driver

`TeamLead` holds two fields: `worker_count` and `idle_poll_ms`. Its `run()` method is fully generic — the task payload type, return type, and worker closure are all type parameters:

```rust
// research/src/team.rs — TeamLead::run (signature)
pub async fn run<P, R, F, Fut>(
    &self,
    queue: TaskQueue<P>,
    mailbox: Mailbox,
    shutdown: ShutdownToken,
    worker_fn: F,
) -> QueueSummary
where
    P: Send + Clone + 'static,
    R: Send + 'static,
    F: Fn(TeamContext<P>, WorkerTask<P>) -> Fut + Send + Sync + Clone + 'static,
    Fut: std::future::Future<Output = anyhow::Result<R>> + Send,
```

Each worker loop checks shutdown, claims tasks, invokes the worker closure, and handles success or failure. When idle, workers wait on a `Notify` handle rather than busy-polling:

```rust
// research/src/team.rs — worker loop inside TeamLead::run
loop {
    if shutdown.is_cancelled() {
        info!(worker = %worker_id, "Shutdown requested — exiting");
        break;
    }

    match queue.claim(&worker_id).await {
        Some((id, name, payload)) => {
            info!(worker = %worker_id, task = %name, "Claimed task");
            let ctx = TeamContext {
                worker_id: worker_id.clone(),
                peer_ids: peer_ids.clone(),
                queue: queue.clone(),
                mailbox: mailbox.clone(),
                shutdown: shutdown.clone(),
            };
            let task = WorkerTask { id, name: name.clone(), payload };
            match worker_fn(ctx, task).await {
                Ok(_) => queue.complete(id).await,
                Err(e) => {
                    tracing::error!(worker = %worker_id, task = %name, "Task failed: {e}");
                    queue.fail(id).await;
                }
            }
        }
        None => {
            if queue.all_done().await {
                info!(worker = %worker_id, "All tasks done — idle");
                break;
            }
            let notify = queue.notify_handle();
            tokio::select! {
                _ = notify.notified() => {}
                _ = tokio::time::sleep(Duration::from_millis(idle_poll_ms)) => {}
            }
        }
    }
}

// Idle notification — mirrors agent-teams: "teammates notify the lead when they finish"
mailbox.send(
    &worker_id,
    "team-lead",
    "idle",
    format!("{worker_id} idle — queue: {} pending, ...", summary_snapshot.pending),
).await;
```

Workers send an "idle" message to the `"team-lead"` inbox on exit. This mirrors the agent-teams behavior where teammates automatically notify the lead when they finish.

### Peer Discovery via TeamContext

Each worker receives a `TeamContext` containing its own ID, the list of all peer IDs, the shared queue, the shared mailbox, and the shutdown token:

```rust
// research/src/team.rs
pub struct TeamContext<P: Clone + Send + 'static> {
    pub worker_id: String,
    /// IDs of all other active workers — mirrors agent-teams members array.
    pub peer_ids: Vec<String>,
    pub queue: TaskQueue<P>,
    pub mailbox: Mailbox,
    pub shutdown: ShutdownToken,
}
```

`peer_ids` is computed by `TeamLead::run()` before spawning. Each worker gets all IDs except its own:

```rust
// research/src/team.rs — inside TeamLead::run
let all_ids: Vec<String> = (1..=self.worker_count)
    .map(|i| format!("worker-{:02}", i))
    .collect();

// per-worker:
let peer_ids: Vec<String> = all_ids.iter()
    .filter(|id| *id != &worker_id)
    .cloned()
    .collect();
```

Workers can address each other directly via `ctx.mailbox.send(&ctx.worker_id, peer_id, ...)` using `ctx.peer_ids` as the address book — the exact same model as the agent-teams `members` array.

### Cooperative Shutdown via ShutdownToken

The `ShutdownToken` uses a `watch::channel` — the lead's sender writes `true` to signal shutdown, and each worker checks the value between task iterations, never inside task execution:

```rust
// research/src/team.rs
#[derive(Clone)]
pub struct ShutdownToken(watch::Receiver<bool>);

impl ShutdownToken {
    pub fn is_cancelled(&self) -> bool { *self.0.borrow() }
}

pub struct ShutdownSender(watch::Sender<bool>);

impl ShutdownSender {
    pub fn shutdown(&self) { let _ = self.0.send(true); }
}

pub fn shutdown_pair() -> (ShutdownSender, ShutdownToken) {
    let (tx, rx) = watch::channel(false);
    (ShutdownSender(tx), ShutdownToken(rx))
}
```

From the doc comment: "Workers poll `is_cancelled()` between task iterations. They always finish their current task before checking — matching the agent-teams behaviour: 'teammates finish their current request before shutting down'." Workers are never cancelled mid-flight; the shutdown is cooperative.

### PlanGate — Plan Approval Gate

`PlanGate` is the Rust equivalent of Claude Code's plan approval flow. Workers call `submit_and_wait()` and block on a `oneshot::Receiver`. The lead calls `approve()` or `reject()`, which sends on the `oneshot::Sender` and unblocks the worker:

```rust
// research/src/team.rs — PlanGate
pub async fn submit_and_wait(&self, worker_id: &str, plan: &str) -> PlanDecision {
    let (tx, rx) = tokio::sync::oneshot::channel();
    info!(worker = %worker_id, "Plan submitted, awaiting approval");
    self.pending.lock().await.insert(
        worker_id.into(),
        PlanEntry { plan: plan.into(), tx },
    );
    self.notify.notify_waiters();
    rx.await.unwrap_or(PlanDecision::Rejected { feedback: "Gate dropped".into() })
}

pub async fn approve(&self, worker_id: &str) {
    if let Some(e) = self.pending.lock().await.remove(worker_id) {
        info!(worker = %worker_id, "Plan approved");
        let _ = e.tx.send(PlanDecision::Approved);
    }
}

pub async fn reject(&self, worker_id: &str, feedback: &str) {
    if let Some(e) = self.pending.lock().await.remove(worker_id) {
        warn!(worker = %worker_id, "Plan rejected");
        let _ = e.tx.send(PlanDecision::Rejected { feedback: feedback.into() });
    }
}
```

The minimal example from the module's doc comment shows the full API surface in a dozen lines:

```rust
// research/src/team.rs — doc example
let queue: TaskQueue<String> = TaskQueue::new();
queue.push("greet", "hello".into(), vec![], 2).await;

let mailbox = Mailbox::new();
let (_sd_tx, shutdown) = shutdown_pair();

let summary = TeamLead::new(2)
    .run(queue, mailbox, shutdown, |_ctx, task| async move {
        println!("{}: {}", task.name, task.payload);
        Ok::<(), anyhow::Error>(())
    })
    .await;

assert_eq!(summary.completed, 1);
```

## The 2-Step Mailbox Pipeline: search→write via Mailbox

The `study` pipeline is where `team.rs` coordination replaces the old static fan-out. For each of the 20 agentic-coding topics, the pipeline queues two dependent tasks: a `Search` task that queries Semantic Scholar and deposits findings into the mailbox, and a `Write` task that reads those findings and generates the study guide.

### The ResearchTask Enum

```rust
// research/src/study.rs
#[derive(Clone)]
enum ResearchTask {
    Search(TopicDef),
    Write { topic: TopicDef, category: &'static str },
}
```

The old `run_single_agent()` function — which handled the full research-and-write pipeline in one agent — has been replaced by two phase-specific functions: `search_topic_papers()` (runs the tool-use agent with `SearchPapers` and `GetPaperDetail` tools, returns raw findings as markdown) and `write_study_guide()` (pure-completion agent, no tools, receives findings string, returns a `StudyTopicRow`). Only the search phase needs the Semantic Scholar API; the write phase is deterministic given the findings.

### Queuing Paired Tasks with Dependencies

For each topic, `run_topics()` pushes two tasks. The `write:{slug}` task carries the search task's ID in its `depends_on` list, so `TaskQueue::claim` cannot return it until the paired search task is completed:

```rust
// research/src/study.rs — run_topics()
let queue: TaskQueue<ResearchTask> = TaskQueue::new();
for topic_def in topics {
    let search_id = queue
        .push(
            format!("search:{}", topic_def.slug),
            ResearchTask::Search(*topic_def),
            vec![],    // no dependencies
            2,         // max 2 attempts
        )
        .await;
    queue
        .push(
            format!("write:{}", topic_def.slug),
            ResearchTask::Write { topic: *topic_def, category },
            vec![search_id],  // blocked until search completes
            2,
        )
        .await;
}
```

For 20 topics, this pushes 40 tasks total. The queue enforces that no `write:{slug}` task can be claimed until its paired `search:{slug}` is completed.

### The TeamLead::run() Call

The old bare `tokio::spawn` loop is replaced by `TeamLead::new(topics.len()).run(...)`. The number of workers equals the number of topics, so search and write tasks for different topics can overlap even while write tasks within one topic block on their own search:

```rust
// research/src/study.rs — run_topics()
let mailbox = Mailbox::new();
let (_shutdown_tx, shutdown) = shutdown_pair();
let summary = TeamLead::new(topics.len())
    .run(queue, mailbox, shutdown, move |ctx, task| {
        let api_key = Arc::clone(&api_key);
        let scholar = Arc::clone(&scholar);
        let d1 = Arc::clone(&d1);
        async move {
            match task.payload {
                ResearchTask::Search(topic) => {
                    info!(worker = %ctx.worker_id, topic = topic.slug, "Search phase starting");
                    let findings = search_topic_papers(topic, &scholar, &api_key).await?;
                    ctx.mailbox
                        .send(&ctx.worker_id, format!("findings:{}", topic.slug), "paper-findings", findings)
                        .await;
                    info!(worker = %ctx.worker_id, topic = topic.slug, "Search phase done, findings in mailbox");
                }
                ResearchTask::Write { topic, category } => {
                    info!(worker = %ctx.worker_id, topic = topic.slug, "Write phase starting");
                    let env = ctx.mailbox.recv_wait(&format!("findings:{}", topic.slug)).await;
                    let row = write_study_guide(topic, category, &env.body, &api_key).await?;
                    d1.insert_study_topic(&row)
                        .await
                        .with_context(|| format!("D1 insert failed for {}", topic.slug))?;
                    info!(worker = %ctx.worker_id, topic = topic.slug, "Saved to D1");
                }
            }
            Ok::<(), anyhow::Error>(())
        }
    })
    .await;
```

The mailbox inbox name convention is `findings:{slug}`. The search worker sends to that inbox; the write worker calls `recv_wait(&format!("findings:{slug}"))`, blocking until the message is available. Task dependency in the queue guarantees the `Write` task cannot even be claimed until `Search` completes, so `recv_wait` unblocks quickly in practice — but the mailbox blocking provides a safety net if the dependency graph and the mailbox arrive slightly out of sync.

This is what the `study.rs` pipeline looked like before `team.rs` existed: isolated agents, no inter-worker communication, outputs collected after-the-fact from D1. Adding the mailbox turned it from independent parallel agents into a coordinated pipeline where one worker's output is another's input — exactly the pattern the Claude Code agent-teams `SendMessage` primitive enables.

## Paradigm 2: Platform-Managed Agent Teams — The Claude Code Approach

Claude Code's experimental agent teams feature inverts every architectural assumption of static fan-out. Where the Rust system owns its concurrency at the OS level, Claude teams delegate coordination to the platform. Where Rust pre-assigns tasks via a queue, Claude teams use a shared task list with file-locked claiming at runtime. Where the flat Rust fan-out has isolated agents, Claude teammates send messages to each other directly.

The feature is enabled in the [nomadically.work repo](https://github.com/nicolad/nomadically.work) via `.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

That one line unlocks five coordination primitives: `TeamCreate`, `TaskCreate`, `TaskUpdate`, `TaskList`, and `SendMessage`. Each teammate is a full, independent Claude Code session — a separate process with its own context window, its own file system access, and its own ability to write and run code.

## How Claude Code Agent Teams Self-Organize

The team lead creates a shared task list stored in `~/.claude/tasks/{team-name}/`. Teammates discover available tasks by calling `TaskList`, claim work by calling `TaskUpdate` (setting themselves as owner), and the platform uses file locking to prevent two teammates from claiming the same task simultaneously. When a teammate finds something unexpected, they send a direct message to the relevant peer via `SendMessage` — the lead does not need to relay it.

The [nomadically.work repo](https://github.com/nicolad/nomadically.work) uses Claude agent teams in its SDD (Spec-Driven Development) orchestrator. The `/sdd:ff` command spawns a team where spec-writing and design run in parallel — two teammates working simultaneously, each producing artifacts the other may need to reference. The key point is that these phases are not fully independent: a spec decision can change a design constraint. If that happens, the teammates can tell each other directly.

Teammate display cycles through sessions via Shift+Down in-process, or splits into panes in tmux or iTerm2. The team lead's conversation history does not carry to teammates — each starts fresh from the shared CLAUDE.md project context and the task description. Context contamination is a real overhead: a teammate may re-investigate something the lead already resolved, spending tokens to rediscover context the lead has but could not transfer.

Known limitations apply: no session resumption, task status can lag under contention, no nested teams (teammates cannot spawn sub-teams), and the lead is fixed for the team's lifetime. These are experimental constraints, not permanent design decisions — but they are real constraints today.

## Comparing the Three Positions: A Decision Framework

These are not competing patterns converging toward the same solution. They occupy distinct positions on a coordination spectrum, each optimal for a different class of work.

The sharpest question to ask before choosing is: **do your agents need to talk to each other?**

If the answer is no — if you can define all tasks before the run starts, if each agent's output is independent, if a failure in one agent should not affect the scope of another — then flat fan-out is the right call. The `run_prep()` path in `study.rs` demonstrates this with `TeamLead` providing retry and shutdown for free, but no mailbox communication.

If the answer is yes — and you own your infrastructure, need deterministic concurrency control, or operate under WASM or cost constraints that make full Claude sessions per task unviable — then `team.rs` is the answer. You get the full coordination model (messaging, dependency graphs, plan gates, cooperative shutdown) at Tokio cost, not Claude token cost.

If the answer is yes — and you want the coordination model without writing it, prefer natural-language task definitions, need human-in-the-loop steering mid-run, or cannot afford the maintenance overhead of a custom coordination library — then Claude Code agent teams are the answer.

| Dimension | Rust flat fan-out | Rust with `team.rs` | Claude Code agent teams |
|---|---|---|---|
| Task assignment | Static, pre-queued | Dynamic, atomic `claim()` | Dynamic, file-locked claiming |
| Inter-agent communication | None | `Mailbox::send` / `broadcast` | Full bidirectional via `SendMessage` |
| Task dependency support | None | `depends_on: Vec<TaskId>` | Blocked/unblocked dependency graph |
| Task retry | Manual | `max_attempts` + re-queue | Platform-managed |
| Human-in-the-loop | Fire-and-forget | `PlanGate::submit_and_wait` | Direct message injection to any teammate |
| Cooperative shutdown | None | `ShutdownToken` / `watch` channel | Platform-managed |
| Concurrency overhead | ~64 bytes + sub-μs spawn | Same — `TeamLead` uses `tokio::spawn` internally | Full context window per teammate; token-linear scaling |
| Partial failure handling | Counter; peers continue | `fail()` re-queues within `max_attempts` | Failed teammate replaceable without aborting team |
| Task dynamism | Zero | Re-queue on failure; dependency graph changes effective availability | Tasks can be created, re-assigned, or cancelled at runtime |
| Observability | Structured logs (`tracing`) | Structured logs + `QueueSummary` + mailbox inbox counts | Teammate display modes (in-process, tmux, iTerm2) |
| Infrastructure ownership | Full | Full | Platform-managed |

<!-- chart: three-way decision tree — flat fan-out / team.rs / Claude teams -->

## Cost, Latency, and Observability Tradeoffs

The Rust crate's cost model is transparent regardless of which coordination layer you use. Workers make independent API calls to DeepSeek. Each call consumes tokens proportional to the agent's preamble, context, and tool results. Total cost is roughly N times the cost of a single agent — no platform overhead, no coordination messages, no duplicate context. The `team.rs` coordination layer is in-process Rust with zero token cost.

Claude agent teams cost more per the official documentation, though no specific multiplier is published. Each teammate carries its own full context window. Broadcast messages sent to all teammates multiply by team size. The official recommendation is 3–5 teammates with 5–6 tasks each — beyond that, coordination overhead accumulates faster than parallelism saves.

Latency follows the opposite pattern. The Rust system's wall-clock time is bounded by the slowest agent plus network latency — typically 30–90 seconds for 20 agents running fully parallel. The `team.rs` 2-step pipeline adds the mailbox handoff latency (sub-millisecond, in-process), which is negligible compared to LLM inference time. A Claude team doing the same breadth of work sequentially within a single session would take proportionally longer.

The engineering category is well-compensated precisely because operating these systems at production scale requires understanding these tradeoffs, not just knowing the API.

## When to Build Your Own vs Use Claude Code Agent Teams

Build infrastructure-owned concurrency (Rust `team.rs`, Python asyncio, TypeScript Promise.all) when:

- Task structure is fully or partially known before execution starts
- You need deterministic concurrency control with predictable retry behavior
- You are running on constrained infrastructure (Cloudflare Workers, WASM) where a full agent session per task is not viable
- Per-token cost matters at scale — flat API cost per agent, no platform overhead
- Inter-agent communication is needed but full Claude sessions per worker are too expensive
- You want compile-time type safety over agent payload shapes

Use Claude Code agent teams when:

- The task is exploratory — agents may discover things that change the plan
- Agents need to challenge or build on each other's reasoning in natural language
- Task dependencies are dynamic — you cannot know the full task graph upfront
- You want human steering capability mid-run without aborting the whole run
- Orchestration code itself is a maintenance burden you want to avoid writing
- Task definitions benefit from natural language rather than typed enum variants

The `run_prep()` path is an example of flat fan-out. The `run_topics()` pipeline is an example of `team.rs` coordination. The SDD orchestrator is an example of Claude agent teams. All three exist in the [same codebase](https://github.com/nicolad/nomadically.work) because the tasks they handle are structurally different — not because one pattern supersedes the others.

One nuance worth stating plainly: the static fan-out pattern is not Rust-specific. Python's `asyncio.gather()` and TypeScript's `Promise.all()` implement the same model. The Rust implementation is a hook into the [nomadically.work codebase](https://github.com/nicolad/nomadically.work), not an argument for Rust as the only language for this problem. The DeepSeek API is OpenAI-compatible; the tool-use loop in `agent.rs` could be ported to Python in an afternoon. The Rust choice reflects specific constraints — WASM compilation targets, type-safe JSON handling, and zero-cost abstractions for a system intended for Cloudflare Worker environments. Those are valid reasons; they are also not universal.

## What This Means for the Future of AI-Powered Software Development

The three positions now occupy distinct points on a coordination spectrum that will remain relevant regardless of how individual frameworks evolve.

At one end: static fan-out, owned concurrency, zero coordination overhead, compile-time task structure. Maximally efficient for embarrassingly parallel work where the task graph is known. Gets faster as inference costs fall and async runtimes improve.

In the middle: owned-infrastructure coordination (`team.rs` or equivalent), dynamic task claiming, in-process messaging, cooperative shutdown, plan gates. Maximally efficient when you need coordination semantics but cannot pay full-session cost per worker. Gets easier to build as the primitives become better understood.

At the other end: platform-managed coordination, dynamic teams, full messaging infrastructure, runtime task discovery in natural language. Maximally flexible for exploratory work where the task graph emerges during execution. Gets cheaper as context window costs fall and team-size recommendations increase.

The emerging challenge — genuinely unsolved — is automated task structure detection: given a goal, should the system fan-out statically, build a `team.rs`-style queue, or stand up a full agent team? The agentic frameworks (Claude Agent SDK, OpenAI Agents SDK, LangGraph) are converging on common primitives for describing tasks and dependencies. But the decision of which concurrency model to use still requires human judgment about the nature of the work.

That judgment is increasingly a senior engineering skill — and it is what separates engineers who can operate these systems at production scale from those who merely know the API.

---

**FAQ**

**What is the Rust equivalent of Claude Code agent teams?**
The `team.rs` module in the [nomadically.work research crate](https://github.com/nicolad/nomadically.work) implements full parity: `TaskQueue` replaces the shared task list, `TaskQueue::claim` handles atomic claiming, `Mailbox::send` and `Mailbox::broadcast` replace `SendMessage`, `PlanGate` implements the plan approval gate, and `ShutdownToken` (via `tokio::sync::watch`) handles cooperative shutdown. Every agent-teams primitive has a direct Rust/Tokio equivalent.

**What is the difference between multi-agent orchestration and agent swarms?**
Orchestration implies a coordinator that assigns tasks to workers based on a defined structure — the coordinator knows the plan. Swarms imply emergent coordination where agents self-organize without a central planner. Claude Code agent teams are closer to orchestration (a lead agent coordinates); the `team.rs` library is also orchestration (a `TeamLead` drives the queue); the bare `tokio::spawn` fan-out is neither — it is static parallelism without ongoing coordination of any kind.

**How does Claude Code agent teams pricing work?**
Each teammate is a full Claude session consuming its own token budget. The official documentation describes cost as higher than a single session, scaling linearly with team size. Broadcast messages multiply by team size. Targeted teammate-to-teammate messages add tokens to both sending and receiving contexts. No specific multiplier is published.

**Can I run AI agents in parallel with Rust?**
Yes. For flat fan-out (no inter-agent communication needed), the `tokio::spawn` + `Arc<T>` pattern is idiomatic. Wrap shared clients in `Arc`, clone into each spawned task, collect `JoinHandle`s, await results. For coordination (dynamic claiming, messaging, dependencies, retry), use `TeamLead::new(n).run(queue, mailbox, shutdown, worker_fn)` from [`research/src/team.rs`](https://github.com/nicolad/nomadically.work/blob/main/research/src/team.rs). The overhead for either is approximately 64 bytes per task and sub-microsecond spawn latency — the `team.rs` coordination layer is in-process Rust with no additional cost.

**How do I implement inter-agent messaging in Rust?**
Use a shared `Mailbox`: a `Mutex<HashMap<String, VecDeque<Envelope>>>` with a `Notify` for wake-up. Workers call `mailbox.send(from, to, subject, body)` to deposit messages into named inboxes; receivers call `recv_wait(inbox)` to block until a message arrives. For broadcast (send to all peers simultaneously), pass `&ctx.peer_ids` as recipients. Worker addresses (`peer_ids`) are pre-computed by `TeamLead::run()` so every worker can address peers directly without going through the lead.

**What is cooperative shutdown in Tokio async Rust?**
Cooperative shutdown means workers finish their current task before stopping — they are never cancelled mid-flight. In Tokio, implement with `watch::channel(false)`: the lead calls `sender.send(true)` to signal shutdown; each worker checks `*receiver.borrow()` between task iterations (not inside task execution). This matches the Claude Code agent-teams behavior where "teammates finish their current request before shutting down." The `ShutdownToken` / `shutdown_pair()` pattern in `team.rs` is a direct implementation of this.

**How do I implement task dependencies in an async task queue?**
Store tasks as `HashMap<TaskId, TaskEntry>` behind a `Mutex`. Each `TaskEntry` has a `depends_on: Vec<TaskId>` field. `claim()` locks the queue, computes the set of completed IDs, and picks the lowest-ID pending task whose all dependencies are in that set. On `complete()` or `fail()`, call `notify.notify_waiters()` to wake idle workers blocked on `queue.notify_handle().notified().await`. Workers that go idle call `tokio::select!` on the notify handle and a poll timeout, then re-attempt `claim()` on wake.

**What is a plan approval gate in multi-agent systems?**
A plan gate is a synchronization point where a worker submits its plan and blocks until the lead approves or rejects it — used to give a human or lead agent a chance to review before the worker makes irreversible changes. In Rust, implement with `Mutex<HashMap<worker_id, oneshot::Sender<PlanDecision>>>`: the worker calls `submit_and_wait(plan)` which inserts a `oneshot` channel sender and awaits the receiver. The lead calls `approve(worker_id)` or `reject(worker_id, feedback)`, which sends on the channel and unblocks the worker. `PlanGate` in `team.rs` is a direct implementation.

**What is DeepSeek's tool use API?**
DeepSeek's tool use (function calling) is an OpenAI-compatible API feature where the model returns structured `tool_calls` JSON when it needs external data. The caller executes the requested function, appends the result as a `tool` message, and calls the API again. This repeats until `finish_reason == "stop"`. The [`agent.rs`](https://github.com/nicolad/nomadically.work/blob/main/research/src/agent.rs) loop implements this directly in Rust without a framework dependency.

**When should I use a multi-agent system instead of a single agent?**
When the task exceeds what a single context window can reliably hold, when subtasks can be parallelized for speed, or when different subtasks benefit from different system prompts or tool sets. Multi-agent overhead is only justified when the task structure genuinely benefits from it — for single-context tasks, a well-prompted single agent is faster and cheaper.

**What Rust crates support async LLM agents?**
The `rig` crate from 0xPlaygrounds is the most actively maintained Rust LLM agent framework (supports OpenAI, Anthropic, Cohere, and others). `async_openai` provides lower-level async bindings. The [research crate](https://github.com/nicolad/nomadically.work/tree/main/research) implements its own thin client ([`agent.rs`](https://github.com/nicolad/nomadically.work/blob/main/research/src/agent.rs)) against the DeepSeek API directly, plus a full coordination layer ([`team.rs`](https://github.com/nicolad/nomadically.work/blob/main/research/src/team.rs)) — a valid approach when framework overhead outweighs the convenience.

---

*Code samples are taken from [`research/src/agent.rs`](https://github.com/nicolad/nomadically.work/blob/main/research/src/agent.rs), [`research/src/study.rs`](https://github.com/nicolad/nomadically.work/blob/main/research/src/study.rs), and [`research/src/team.rs`](https://github.com/nicolad/nomadically.work/blob/main/research/src/team.rs) and lightly condensed for readability; no logic has been altered.*
