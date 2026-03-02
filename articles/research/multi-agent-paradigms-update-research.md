# Research Brief: Multi-Agent Paradigms Article Update
## The research crate now implements both paradigms

**Target article:** `/Users/vadimnicolai/Public/vadim.blog/blog/2026/03-01-two-paradigms-multi-agent-ai-rust-vs-claude-teams/index.md`
**Files read:** `research/src/team.rs` (641 lines), `research/src/study.rs` (630 lines), `research/tests/task_queue.rs` (447 lines)
**Date of research:** 2026-03-01

---

## 1. The Core Narrative Shift

The existing article's central thesis was a clean binary: the Rust crate uses "bare `tokio::spawn` fan-out with zero coordination overhead" while Claude Code agent teams provide the coordination model. That binary is no longer accurate.

The research crate now ships its own coordination library — `research/src/team.rs` — that implements the complete Claude Code agent-teams model in pure Rust with full parity: shared task queue, atomic claiming, dependency graphs, inter-worker messaging, plan approval gate, cooperative shutdown, peer discovery, and idle notifications. The codebase now demonstrates both paradigms simultaneously, in the same language. The article's framing needs to change from "Rust vs Claude teams" to "the codebase itself has grown the second paradigm in Rust."

The `run_single_agent` call that appears in the existing article's code snippet no longer exists in `study.rs`. It has been replaced by `TeamLead::new(topics.len()).run(...)` with a two-step `ResearchTask` enum driving a search-then-write pipeline.

---

## 2. What Changed in team.rs — Structure and Purpose

`team.rs` is a 641-line generic coordination library. Its module-level doc comment explicitly declares parity with Claude Code's agent-teams model via a table:

```
| Agent-teams concept          | This module                              |
|------------------------------|------------------------------------------|
| Shared task list             | TaskQueue                                |
| Atomic task claiming         | TaskQueue::claim                         |
| Task dependencies            | depends_on in TaskQueue::push            |
| Retry on failure             | max_attempts + re-queue on fail          |
| Queue change notification    | TaskQueue::notify_handle                 |
| Lead / worker separation     | TeamLead + TeamContext                   |
| Worker identity              | stable worker-NN IDs                     |
| Peer discovery               | ctx.peer_ids in TeamContext              |
| Point-to-point message       | Mailbox::send                            |
| Broadcast to all teammates   | Mailbox::broadcast                       |
| Idle notifications           | worker→team-lead inbox on exit           |
| Plan approval gate           | PlanGate                                 |
| Cooperative shutdown         | ShutdownToken / shutdown_pair            |
```

Every concept from the Claude Code agent-teams documentation has a direct Rust equivalent. This is not accidental — the comments in the code cite the agent-teams model by name throughout.

The library is `Arc`-backed and cheaply cloneable. All types — `TaskQueue<P>`, `Mailbox`, `PlanGate` — share their state via `Arc<Mutex<_>>` internally. Cloning any of them gives a shared view, not a copy.

---

## 3. Key Code Snippets for the Article

### 3a. TaskQueue — Atomic Claiming with Dependency Support

The `TaskQueue<P>` type is generic over the task payload `P`. The `claim()` method is the core: it holds the mutex for the entire claim operation, computes which tasks have their dependencies satisfied, and claims the one with the lowest ID:

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

Pushing tasks:

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

The `fail()` method re-queues as `Pending` if attempts remain, permanently marks `Failed` otherwise, and notifies idle workers via `Notify`:

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

### 3b. Mailbox — Point-to-Point and Broadcast

The `Mailbox` is an `Arc`-wrapped `HashMap<String, VecDeque<Envelope>>` — named inboxes, FIFO order. Any string can be an inbox name: worker IDs, task slugs, topic slugs.

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

Broadcast — delivers the same message to every recipient in the slice:

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

Blocking receive — parks the task until a message arrives:

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

The `Envelope` struct:

```rust
// research/src/team.rs
pub struct Envelope {
    pub id: u64,        // monotonic message ID
    pub from: String,   // sender worker ID
    pub to: String,     // inbox name
    pub subject: String,
    pub body: String,   // plain text or JSON
}
```

### 3c. PlanGate — Plan Approval Gate

This is the most direct structural parity with Claude Code's plan approval flow. Workers call `submit_and_wait()` and block on a `oneshot::Receiver`. The lead calls `approve()` or `reject()` which sends to the `oneshot::Sender`.

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

The `PlanDecision` enum:

```rust
pub enum PlanDecision {
    Approved,
    Rejected { feedback: String },
}
```

### 3d. ShutdownToken — Cooperative Cancellation

Workers poll `is_cancelled()` between task iterations. They always finish their current task before checking — the code comment explicitly cites agent-teams semantics: "teammates finish their current request before shutting down".

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

### 3e. TeamContext — Per-Worker Context (Peer Discovery)

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

### 3f. TeamLead::run() — The Driver Loop

`TeamLead` holds only two fields: `worker_count` and `idle_poll_ms`. The `run()` method is a generic async function that spawns N workers and awaits all handles:

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

Each worker loop:

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
            // Wait for a status-change notification or poll timeout
            let notify = queue.notify_handle();
            tokio::select! {
                _ = notify.notified() => {}
                _ = tokio::time::sleep(Duration::from_millis(idle_poll_ms)) => {}
            }
        }
    }
}

// Idle notification on exit — mirrors agent-teams "teammates notify the lead when they finish"
mailbox.send(
    &worker_id,
    "team-lead",
    "idle",
    format!("{worker_id} idle — queue: {} pending, ...", summary_snapshot.pending),
).await;
```

After all handles complete, `run()` returns a `QueueSummary`:

```rust
pub struct QueueSummary {
    pub pending: usize,
    pub in_progress: usize,
    pub completed: usize,
    pub failed: usize,
}
```

### 3g. Minimal Example from the Doc Comment

The module-level doc comment includes a minimal runnable example that shows the full API surface:

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

---

## 4. What Changed in study.rs — The 2-Step Pipeline

### 4a. The ResearchTask Enum

The old `run_single_agent()` pattern (cited in the existing article) is gone. In its place is a `ResearchTask` enum that encodes two distinct phases of work as task payload variants:

```rust
// research/src/study.rs
#[derive(Clone)]
enum ResearchTask {
    Search(TopicDef),
    Write { topic: TopicDef, category: &'static str },
}
```

### 4b. Queuing Paired Tasks with Dependencies

For each topic, `run_topics()` pushes two tasks: a `Search` task with no dependencies, and a `Write` task that depends on the `Search` task's ID:

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

### 4c. TeamLead::run() Call — The Replacement for tokio::spawn Fan-Out

The old bare `tokio::spawn` loop is replaced by:

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

The mailbox inbox name convention is `findings:{slug}`. The search worker sends to `findings:{slug}`, the write worker calls `recv_wait(&format!("findings:{slug}"))` — blocking until the message is available. Task dependency in the queue guarantees the `Write` task cannot even be claimed until `Search` completes, so `recv_wait` will always unblock quickly in practice, but the mailbox blocking provides a safety net.

### 4d. run_prep() — The Simpler Case

The `APPLICATION_TOPICS` pipeline uses `TeamLead` without a 2-step pipeline — it is the "flat fan-out" case, which maps directly to what the article called the Rust/Tokio paradigm, but now using the team library:

```rust
// research/src/study.rs — run_prep()
let summary = TeamLead::new(APPLICATION_TOPICS.len())
    .run(queue, mailbox, shutdown, move |ctx, task| {
        let api_key = Arc::clone(&api_key);
        let d1 = Arc::clone(&d1);
        let topic_def = task.payload;
        async move {
            info!(worker = %ctx.worker_id, topic = topic_def.slug, "Prep agent starting");
            let row = run_direct_agent(topic_def, &api_key).await?;
            d1.insert_study_topic(&row).await?;
            Ok::<(), anyhow::Error>(())
        }
    })
    .await;
```

No mailbox communication between workers. No dependencies. This is the flat-fan-out case expressed through the team abstraction — functionally equivalent to the old `tokio::spawn` pattern, but now with retry, idle notifications, and cooperative shutdown included for free.

### 4e. What Happened to the Two Functions

The old article described `run_single_agent()` as the core function. That function no longer exists in `study.rs`. It was split into two phase-specific functions:

- `search_topic_papers(topic, scholar, api_key)` — runs the tool-use agent (with `SearchPapers` and `GetPaperDetail` tools), returns raw paper findings as a markdown string
- `write_study_guide(topic, category, findings, api_key)` — runs a pure-completion agent (no tools), receives the findings string, returns a `StudyTopicRow`

The separation of tool-use (search) from pure generation (write) is an intentional design: only the search phase needs the Semantic Scholar API. The write phase is deterministic given the findings — no external calls needed.

---

## 5. What Is Outdated in the Existing Article

### Outdated Code Snippet — Lines 113-144

The article's main Rust code block showing the fan-out pattern references `run_single_agent`:

```rust
// OUTDATED — this code no longer exists in study.rs
let handle = tokio::spawn(async move {
    let agent_id = i + 1;
    match run_single_agent(agent_id, topic_def, category, &api_key, &scholar).await {
        Ok(row) => d1.insert_study_topic(&row).await,
        Err(e) => { error!(...); Err(e) }
    }
});
```

This must be replaced with the `TeamLead::run()` call and the `ResearchTask` enum pattern.

### Outdated Framing — "bare tokio::spawn fan-out with zero coordination"

The opening TL;DR and Paradigm 1 section describe the Rust crate as using "zero coordination overhead — tasks are compile-time constants, agents never talk to each other." This is no longer accurate for `TOPICS` (the main study pipeline). It remains accurate for `APPLICATION_TOPICS` via `run_prep()`, but that is a simpler case.

### Outdated Table — "Inter-agent communication: None"

The comparison table at line 188:
```
| Inter-agent communication | None | Full bidirectional via SendMessage |
```

The Rust crate now has `Mailbox::send`, `Mailbox::broadcast`, and `Mailbox::recv_wait`. The `TOPICS` pipeline uses mailbox messaging to pass paper findings from search workers to write workers.

### Outdated Table — "Task dependency support: None"

The Rust crate now has `depends_on: Vec<TaskId>` with full dependency enforcement in `TaskQueue::claim`.

### Outdated Table — "Task dynamism: Zero"

The table says task structure is "determined before binary runs." While the initial set of tasks is still defined before `TeamLead::run()` is called, the system now supports dynamic retry (tasks can be re-queued on failure) and the task dependency graph means effective task availability changes at runtime as tasks complete.

### Section to Update — "Spawning 20 Parallel Agents with Tokio"

This section presents the old `tokio::spawn` pattern as the current implementation. It should describe `TeamLead::new(topics.len()).run(...)` instead, while noting that `TeamLead` itself uses `tokio::spawn` internally per worker.

### The Decision Rule Remains Valid

The article's core decision rule ("do your agents need to talk to each other?") is still valid and should be kept. The update is that the Rust crate now implements the "yes, they need to talk" branch via `team.rs`, not just the "no" branch.

---

## 6. Parity Mapping — Full Table

| Agent-teams concept | team.rs equivalent | Notes |
|---|---|---|
| Shared task list (`~/.claude/tasks/`) | `TaskQueue<P>` | In-process `Arc<Mutex<HashMap>>` instead of filesystem |
| Atomic task claiming (file lock) | `Mutex` + `claim()` returning lowest-ID pending | Lock held for full claim transaction |
| Task dependencies (`blockedBy`) | `depends_on: Vec<TaskId>` | Checked on every `claim()` call |
| ID-order preference | `.min()` on pending task IDs | Deterministic claiming order |
| Point-to-point message | `Mailbox::send` | Named inbox, any string key |
| Broadcast to all teammates | `Mailbox::broadcast` | Iterates recipients, one `send` each |
| Blocking receive | `Mailbox::recv_wait` | Parks on `Notify`, wakes on any inbox message |
| Idle notifications | worker sends `subject: "idle"` to `"team-lead"` inbox on loop exit | Exact subject convention matches |
| Plan approval gate | `PlanGate::submit_and_wait` / `approve` / `reject` | Backed by `oneshot::channel` per worker |
| Cooperative shutdown | `ShutdownToken::is_cancelled()` | `watch` channel, workers check between tasks |
| Peer discovery (members array) | `TeamContext::peer_ids` | Computed at spawn time, each worker excludes self |
| Worker identity | Stable `"worker-NN"` IDs (zero-padded) | Generated by `TeamLead::run()` |
| Lead/worker separation | `TeamLead` drives the run; `TeamContext` given to workers | Lead waits on all handles; workers loop independently |
| Task retry | `max_attempts` + re-queue in `fail()` + `notify_waiters()` | Max 2 attempts in production usage |

---

## 7. Test Coverage — 22 Tests in tests/task_queue.rs

All tests are pure async Rust with no network calls. Organized into five groups:

### TaskQueue tests (7)
1. `task_queue_push_and_claim` — basic push then claim, validates ID, name, payload
2. `task_queue_claim_returns_none_when_empty` — empty queue returns `None`
3. `task_queue_complete_marks_done` — `complete()` triggers `all_done()`
4. `task_queue_fail_requeues_within_max_attempts` — first fail re-queues, second fail permanently fails
5. `task_queue_dependency_blocks_claim` — dependent task blocked until parent completes
6. `task_queue_id_order_preference` — three tasks claimed in ascending ID order
7. `task_queue_summary_counts` — validates `in_progress`, `completed`, `total()` counts

### Mailbox tests (6)
8. `mailbox_send_and_recv` — basic send/recv with from/subject/body validation
9. `mailbox_recv_empty_returns_none` — empty inbox returns `None`
10. `mailbox_fifo_order` — two messages to same inbox arrive in send order
11. `mailbox_drain` — three messages drained in order, inbox empty after
12. `mailbox_recv_wait_unblocks_when_message_arrives` — spawned task blocks, sender unblocks it
13. `mailbox_pending_count` — `pending()` counts without consuming messages

### PlanGate tests (2)
14. `plan_gate_approve` — worker blocks, lead approves, worker receives `PlanDecision::Approved`
15. `plan_gate_reject` — worker blocks, lead rejects with feedback string, worker receives `PlanDecision::Rejected { feedback }`

### TeamLead integration tests (4)
16. `team_lead_runs_all_tasks` — 5 tasks, 3 workers, all complete, summary validates
17. `team_lead_respects_dependencies_in_pipeline` — 2-task search→write pipeline, verifies write runs after search via completion order tracking
18. `team_lead_cooperative_shutdown` — shutdown signalled before run, verifies workers exit, count is bounded
19. `team_lead_mailbox_2step_pipeline` — mirrors exact study.rs pattern: search sends to `findings:{slug}`, write calls `recv_wait`, validates body content and `completed == 2`

### Broadcast and peer discovery tests (3)
20. `mailbox_broadcast_delivers_to_all_recipients` — three recipients all receive the same body, from, subject; no extras
21. `team_context_peer_ids_exclude_self` — 3-worker team, each worker captures its `peer_ids`, validates each list has exactly 2 entries
22. `team_lead_sends_idle_notifications` — 2 workers, 1 task, both workers send idle to `"team-lead"` inbox on exit; validates `subject == "idle"` and `from.starts_with("worker-")`

---

## 8. Suggested Article Structure Update

### Section to keep, update framing only: "Paradigm 1"
Keep the description of static fan-out as a paradigm. Clarify that `run_prep()` still demonstrates this pattern (flat fan-out, no inter-worker communication). The `APPLICATION_TOPICS` path is a valid example.

### Section to heavily revise: "Spawning 20 Parallel Agents with Tokio"
Replace the `tokio::spawn` code block with the `TeamLead::new(topics.len()).run(...)` call from `run_topics()`. Explain that `TeamLead` internally uses `tokio::spawn` per worker but adds the full coordination layer on top.

### New section to add: "The Rust Crate Now Implements Both Paradigms"
Introduce `team.rs` as the new module. Show the parity table. Explain that the research crate started as paradigm 1 and grew paradigm 2 natively, in Rust.

### New section to add: "The 2-Step Pipeline: search→write via Mailbox"
Show the `ResearchTask` enum, the paired task queuing with `depends_on`, and the mailbox hand-off (`send` → `recv_wait`). This is the clearest demonstration that the codebase now uses coordination, not just fan-out.

### Update the comparison table
Add rows for `Mailbox messaging`, `Task dependencies`, and `Retry`. Change the Rust column entries from "None" to the actual values.

### Keep the decision framework
The question "do your agents need to talk to each other?" remains valid. The update is that the Rust crate now answers "yes" for the main study pipeline and "no" for the prep pipeline.

### Update the FAQ
The answer to "Can I run AI agents in parallel with Rust?" should mention `TeamLead` as the idiomatic approach when coordination is needed, with `tokio::spawn` + `Arc<T>` still valid for flat fan-out.

---

## 9. Additional Context: backend.rs and enhance.rs

Both `backend.rs` and `enhance.rs` also import from `team`:

```rust
// research/src/backend.rs — top comment
/// 20 parallel DeepSeek agents for backend interview prep.
/// Uses TeamLead + TaskQueue for dynamic claiming, retry (max 2 attempts),
/// and cooperative shutdown — matching the agent-teams coordination model.
use crate::team::{shutdown_pair, Mailbox, TaskQueue, TeamLead};
```

```rust
// research/src/enhance.rs — top comment
/// 10 parallel DeepSeek agents to enhance an application's agentic coding section.
/// Uses TeamLead + TaskQueue for dynamic claiming, retry (max 2 attempts),
/// and cooperative shutdown — matching the agent-teams coordination model.
use crate::team::{shutdown_pair, Mailbox, TaskQueue, TeamLead};
```

The `team.rs` library is the new standard for all parallel work in the research crate. The old `tokio::spawn` pattern has been fully replaced across all modules.

---

## 10. Key Quote to Carry into the Article

From `team.rs` line 443-445, the shutdown comment states what the library is designed to do:

> "Workers poll `is_cancelled()` between task iterations. They always finish their current task before checking — matching the agent-teams behaviour: 'teammates finish their current request before shutting down'."

And from the Mailbox doc comment (line 264-268):

> "Workers write to named inboxes and read from their own. The inbox name can be a worker ID, a task name, a topic slug — any agreed-upon key. This mirrors the agent-teams mailbox where teammates message each other directly without going through the lead."

Both comments name the agent-teams model explicitly. The implementation is designed as a conscious port, not an accidental similarity.
