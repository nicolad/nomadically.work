//! Generic team coordination — full parity with Claude Code's agent-teams model.
//!
//! | Agent-teams concept          | This module                              |
//! |------------------------------|------------------------------------------|
//! | Shared task list             | [`TaskQueue`]                            |
//! | Atomic task claiming         | [`TaskQueue::claim`]                     |
//! | Task dependencies            | `depends_on` in [`TaskQueue::push`]      |
//! | Retry on failure             | `max_attempts` + re-queue on fail        |
//! | Queue change notification    | [`TaskQueue::notify_handle`]             |
//! | Lead / worker separation     | [`TeamLead`] + [`TeamContext`]           |
//! | Worker identity              | stable `worker-NN` IDs                   |
//! | Peer discovery               | `ctx.peer_ids` in [`TeamContext`]        |
//! | Point-to-point message       | [`Mailbox::send`]                        |
//! | Broadcast to all teammates   | [`Mailbox::broadcast`]                   |
//! | Idle notifications           | worker→`team-lead` inbox on exit         |
//! | Plan approval gate           | [`PlanGate`]                             |
//! | Cooperative shutdown         | [`ShutdownToken`] / [`shutdown_pair`]    |
//!
//! # Minimal example
//!
//! ```rust,no_run
//! use research_agent::team::{TaskQueue, Mailbox, TeamLead, shutdown_pair};
//!
//! #[tokio::main]
//! async fn main() {
//!     let queue: TaskQueue<String> = TaskQueue::new();
//!     queue.push("greet", "hello".into(), vec![], 2).await;
//!
//!     let mailbox = Mailbox::new();
//!     let (_sd_tx, shutdown) = shutdown_pair();
//!
//!     let summary = TeamLead::new(2)
//!         .run(queue, mailbox, shutdown, |_ctx, task| async move {
//!             println!("{}: {}", task.name, task.payload);
//!             Ok::<(), anyhow::Error>(())
//!         })
//!         .await;
//!
//!     assert_eq!(summary.completed, 1);
//! }
//! ```
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::Arc;
use tokio::sync::{watch, Mutex, Notify};
use tracing::{info, warn};

pub type TaskId = usize;

// ─── TaskStatus ──────────────────────────────────────────────────────────────

/// Status of a single task in the queue.
#[derive(Debug, Clone, PartialEq)]
pub enum TaskStatus {
    /// Waiting to be claimed (new, or re-queued after a failed attempt).
    Pending,
    /// Claimed by a worker; currently being executed.
    Claimed(String),
    /// Successfully completed.
    Completed,
    /// Exhausted all retry attempts permanently.
    Failed,
}

// ─── TaskEntry ───────────────────────────────────────────────────────────────

/// An entry in the task queue.
pub struct TaskEntry<P> {
    pub id: TaskId,
    pub name: String,
    pub payload: P,
    pub status: TaskStatus,
    /// IDs that must be [`TaskStatus::Completed`] before this task can be claimed.
    pub depends_on: Vec<TaskId>,
    pub attempts: u32,
    pub max_attempts: u32,
}

// ─── TaskQueue ───────────────────────────────────────────────────────────────

struct QueueState<P> {
    tasks: HashMap<TaskId, TaskEntry<P>>,
    next_id: TaskId,
}

/// Shared, atomically-claimed task list with dependency support and retry.
///
/// Cheaply cloneable — all clones share the same state via `Arc`.
pub struct TaskQueue<P> {
    inner: Arc<Mutex<QueueState<P>>>,
    changed: Arc<Notify>,
}

impl<P> Clone for TaskQueue<P> {
    fn clone(&self) -> Self {
        Self { inner: Arc::clone(&self.inner), changed: Arc::clone(&self.changed) }
    }
}

impl<P: Send + Clone + 'static> TaskQueue<P> {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(QueueState { tasks: HashMap::new(), next_id: 0 })),
            changed: Arc::new(Notify::new()),
        }
    }

    /// Add a task and return its [`TaskId`].
    ///
    /// `depends_on` blocks this task until all listed IDs are
    /// [`TaskStatus::Completed`]. Tasks are claimed in ascending ID order
    /// (mirrors "prefer tasks in ID order" from the docs).
    pub async fn push(
        &self,
        name: impl Into<String>,
        payload: P,
        depends_on: Vec<TaskId>,
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

    /// Claim the lowest-ID task whose dependencies are all completed.
    ///
    /// Returns `None` if no claimable task exists right now.
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
            .min()?;
        let task = s.tasks.get_mut(&id).unwrap();
        task.status = TaskStatus::Claimed(worker.into());
        task.attempts += 1;
        Some((id, task.name.clone(), task.payload.clone()))
    }

    /// Mark a task as successfully completed.
    pub async fn complete(&self, id: TaskId) {
        {
            let mut s = self.inner.lock().await;
            if let Some(t) = s.tasks.get_mut(&id) {
                info!(task = %t.name, "Task completed");
                t.status = TaskStatus::Completed;
            }
        }
        self.changed.notify_waiters();
    }

    /// Mark a task attempt as failed.
    ///
    /// Re-queues as `Pending` if attempts remain; permanently fails otherwise.
    /// Notifies idle workers so they can claim the re-queued task.
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

    /// `true` when every task is in a terminal state.
    pub async fn all_done(&self) -> bool {
        let s = self.inner.lock().await;
        s.tasks.values().all(|t| matches!(t.status, TaskStatus::Completed | TaskStatus::Failed))
    }

    /// Suspend until all tasks reach a terminal state.
    pub async fn wait_until_done(&self) {
        loop {
            if self.all_done().await { return; }
            self.changed.notified().await;
        }
    }

    /// Snapshot of task counts.
    pub async fn summary(&self) -> QueueSummary {
        let s = self.inner.lock().await;
        let mut r = QueueSummary::default();
        for t in s.tasks.values() {
            match &t.status {
                TaskStatus::Pending    => r.pending    += 1,
                TaskStatus::Claimed(_) => r.in_progress += 1,
                TaskStatus::Completed  => r.completed  += 1,
                TaskStatus::Failed     => r.failed     += 1,
            }
        }
        r
    }

    /// A [`Notify`] that fires on every status change.
    ///
    /// Workers that go idle wait on this so they're woken immediately when a
    /// blocked task's dependency completes.
    pub fn notify_handle(&self) -> Arc<Notify> { Arc::clone(&self.changed) }
}

// ─── QueueSummary ────────────────────────────────────────────────────────────

#[derive(Debug, Default, Clone)]
pub struct QueueSummary {
    pub pending: usize,
    pub in_progress: usize,
    pub completed: usize,
    pub failed: usize,
}

impl QueueSummary {
    pub fn total(&self) -> usize {
        self.pending + self.in_progress + self.completed + self.failed
    }
}

// ─── Mailbox ─────────────────────────────────────────────────────────────────

/// A message delivered through the mailbox.
#[derive(Debug, Clone)]
pub struct Envelope {
    /// Monotonic message ID.
    pub id: u64,
    /// Worker ID of the sender.
    pub from: String,
    /// Inbox name. Convention: worker IDs, task names, or topic slugs.
    pub to: String,
    /// Short description of the content.
    pub subject: String,
    /// Body — plain text or JSON.
    pub body: String,
}

struct MailboxState {
    inboxes: HashMap<String, VecDeque<Envelope>>,
    next_id: u64,
}

/// Inter-worker message bus.
///
/// Workers write to named inboxes and read from their own. The inbox name can
/// be a worker ID, a task name, a topic slug — any agreed-upon key. This
/// mirrors the agent-teams mailbox where teammates message each other directly
/// without going through the lead.
///
/// Cheaply cloneable — all clones share state via `Arc`.
#[derive(Clone)]
pub struct Mailbox {
    state: Arc<Mutex<MailboxState>>,
    /// Fires whenever any inbox receives a message.
    notify: Arc<Notify>,
}

impl Mailbox {
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(MailboxState { inboxes: HashMap::new(), next_id: 0 })),
            notify: Arc::new(Notify::new()),
        }
    }

    /// Send a message to the named inbox.
    pub async fn send(
        &self,
        from: impl Into<String>,
        to: impl Into<String>,
        subject: impl Into<String>,
        body: impl Into<String>,
    ) {
        let to = to.into();
        let mut state = self.state.lock().await;
        let id = state.next_id;
        state.next_id += 1;
        let env = Envelope {
            id,
            from: from.into(),
            to: to.clone(),
            subject: subject.into(),
            body: body.into(),
        };
        info!(from = %env.from, to = %env.to, subject = %env.subject, "Mailbox: message sent");
        state.inboxes.entry(to).or_default().push_back(env);
        drop(state);
        self.notify.notify_waiters();
    }

    /// Non-blocking read. Returns the oldest message in the inbox, if any.
    pub async fn recv(&self, inbox: &str) -> Option<Envelope> {
        self.state.lock().await.inboxes.get_mut(inbox)?.pop_front()
    }

    /// Blocking read. Suspends until at least one message is available.
    pub async fn recv_wait(&self, inbox: &str) -> Envelope {
        loop {
            if let Some(env) = self.recv(inbox).await {
                return env;
            }
            self.notify.notified().await;
        }
    }

    /// Drain all pending messages from an inbox in FIFO order.
    pub async fn drain(&self, inbox: &str) -> Vec<Envelope> {
        self.state.lock().await
            .inboxes
            .get_mut(inbox)
            .map(|q| q.drain(..).collect())
            .unwrap_or_default()
    }

    /// Count pending messages in an inbox without removing them.
    pub async fn pending(&self, inbox: &str) -> usize {
        self.state.lock().await.inboxes.get(inbox).map(|q| q.len()).unwrap_or(0)
    }

    /// Send the same message to every inbox in `recipients`.
    ///
    /// Mirrors the agent-teams `broadcast` message type: "send to all teammates
    /// simultaneously". Use sparingly — one `send` per recipient.
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
}

// ─── PlanGate ────────────────────────────────────────────────────────────────

/// Decision returned to a worker after plan review.
#[derive(Debug, Clone)]
pub enum PlanDecision {
    Approved,
    Rejected { feedback: String },
}

struct PlanEntry {
    plan: String,
    tx: tokio::sync::oneshot::Sender<PlanDecision>,
}

/// Optional plan approval gate.
///
/// Workers in "plan mode" call [`PlanGate::submit_and_wait`] with their plan
/// text and block until the lead calls [`PlanGate::approve`] or
/// [`PlanGate::reject`]. This mirrors agent-teams plan approval where the lead
/// reviews plans before workers make any changes.
///
/// Cheaply cloneable — all clones share state via `Arc`.
#[derive(Clone)]
pub struct PlanGate {
    pending: Arc<Mutex<HashMap<String, PlanEntry>>>,
    notify: Arc<Notify>,
}

impl PlanGate {
    pub fn new() -> Self {
        Self { pending: Arc::new(Mutex::new(HashMap::new())), notify: Arc::new(Notify::new()) }
    }

    /// Worker: submit a plan and block until the lead decides.
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

    /// Lead: list workers currently waiting for plan approval.
    pub async fn pending_workers(&self) -> Vec<(String, String)> {
        self.pending.lock().await
            .iter()
            .map(|(id, e)| (id.clone(), e.plan.clone()))
            .collect()
    }

    /// Lead: approve a worker's plan, unblocking it.
    pub async fn approve(&self, worker_id: &str) {
        if let Some(e) = self.pending.lock().await.remove(worker_id) {
            info!(worker = %worker_id, "Plan approved");
            let _ = e.tx.send(PlanDecision::Approved);
        }
    }

    /// Lead: reject a plan with feedback; the worker stays blocked and must
    /// revise and resubmit.
    pub async fn reject(&self, worker_id: &str, feedback: &str) {
        if let Some(e) = self.pending.lock().await.remove(worker_id) {
            warn!(worker = %worker_id, "Plan rejected");
            let _ = e.tx.send(PlanDecision::Rejected { feedback: feedback.into() });
        }
    }

    /// Lead: wait until at least one plan is pending review.
    pub async fn wait_for_submission(&self) {
        loop {
            if !self.pending.lock().await.is_empty() { return; }
            self.notify.notified().await;
        }
    }
}

// ─── Shutdown ────────────────────────────────────────────────────────────────

/// Cooperative cancellation token distributed to workers.
///
/// Workers poll [`ShutdownToken::is_cancelled`] between task iterations.
/// They always finish their current task before checking — matching the
/// agent-teams behaviour: "teammates finish their current request before
/// shutting down".
#[derive(Clone)]
pub struct ShutdownToken(watch::Receiver<bool>);

impl ShutdownToken {
    /// `true` if the team lead has requested a shutdown.
    pub fn is_cancelled(&self) -> bool { *self.0.borrow() }
}

/// Lead-side handle for triggering a cooperative shutdown.
pub struct ShutdownSender(watch::Sender<bool>);

impl ShutdownSender {
    /// Signal all workers to stop after their current task.
    pub fn shutdown(&self) { let _ = self.0.send(true); }
}

/// Create a linked (`sender`, `token`) pair.
pub fn shutdown_pair() -> (ShutdownSender, ShutdownToken) {
    let (tx, rx) = watch::channel(false);
    (ShutdownSender(tx), ShutdownToken(rx))
}

// ─── TeamContext ─────────────────────────────────────────────────────────────

/// Everything a worker needs to coordinate with the rest of the team.
///
/// Passed to every worker invocation. Workers can:
/// - Send and receive mailbox messages (`ctx.mailbox`)
/// - Address peers directly via `ctx.peer_ids` (mirrors team member discovery)
/// - Check overall queue progress (`ctx.queue.summary()`)
/// - Test whether shutdown was requested (`ctx.shutdown.is_cancelled()`)
pub struct TeamContext<P: Clone + Send + 'static> {
    pub worker_id: String,
    /// IDs of all other active workers — use these as mailbox `to` addresses
    /// for point-to-point or as `recipients` for broadcast.
    /// Mirrors the agent-teams team config `members` array.
    pub peer_ids: Vec<String>,
    pub queue: TaskQueue<P>,
    pub mailbox: Mailbox,
    pub shutdown: ShutdownToken,
}

// ─── WorkerTask ──────────────────────────────────────────────────────────────

/// The specific task assigned to a worker for this invocation.
pub struct WorkerTask<P> {
    pub id: TaskId,
    pub name: String,
    pub payload: P,
}

// ─── TeamLead ────────────────────────────────────────────────────────────────

/// Coordinates a fixed pool of workers over a shared [`TaskQueue`].
///
/// The lead spawns workers and waits for the queue to drain. Workers are fully
/// independent — each has a stable `worker-NN` identity and access to the full
/// [`TeamContext`] (queue, mailbox, shutdown).
pub struct TeamLead {
    /// Number of concurrent workers to spawn.
    pub worker_count: usize,
    /// Poll interval (ms) when a worker goes idle (normally woken by [`Notify`]).
    pub idle_poll_ms: u64,
}

impl TeamLead {
    pub fn new(worker_count: usize) -> Self {
        Self { worker_count, idle_poll_ms: 50 }
    }

    /// Drive the queue to completion and return the final [`QueueSummary`].
    ///
    /// Each worker loop:
    /// 1. Checks `shutdown.is_cancelled()`.
    /// 2. Calls `queue.claim()`. On success, invokes `worker_fn(ctx, task)`.
    /// 3. Calls `queue.complete()` or `queue.fail()` based on the result.
    /// 4. If no task is claimable and not all done, logs "idle" and waits for
    ///    a status-change notification or poll timeout.
    /// 5. Exits when all tasks are done or shutdown is signalled.
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
    {
        // Keep a handle for post-run summary; all other clones share the same state.
        let queue_ref = queue.clone();
        let mut handles = Vec::with_capacity(self.worker_count);

        // Build the full roster so every worker can address its peers by ID.
        // Mirrors the agent-teams team config `members` array.
        let all_ids: Vec<String> = (1..=self.worker_count)
            .map(|i| format!("worker-{:02}", i))
            .collect();

        for i in 0..self.worker_count {
            let worker_id = all_ids[i].clone();
            // peer_ids = all workers except self — matches member discovery semantics
            let peer_ids: Vec<String> = all_ids.iter()
                .filter(|id| *id != &worker_id)
                .cloned()
                .collect();
            let queue = queue.clone();
            let mailbox = mailbox.clone();
            let shutdown = shutdown.clone();
            let worker_fn = worker_fn.clone();
            let idle_poll_ms = self.idle_poll_ms;

            let handle = tokio::spawn(async move {
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
                                    tracing::error!(
                                        worker = %worker_id, task = %name,
                                        "Task failed: {e}"
                                    );
                                    queue.fail(id).await;
                                }
                            }
                        }
                        None => {
                            if queue.all_done().await {
                                info!(worker = %worker_id, "All tasks done — idle");
                                break;
                            }
                            // No claimable task right now — go idle.
                            // Woken by notify (another task completed/failed)
                            // or by poll timeout.
                            info!(worker = %worker_id, "No claimable task — idle, waiting");
                            let notify = queue.notify_handle();
                            tokio::select! {
                                _ = notify.notified() => {}
                                _ = tokio::time::sleep(
                                    std::time::Duration::from_millis(idle_poll_ms)
                                ) => {}
                            }
                        }
                    }
                }

                // Idle notification — mirrors the agent-teams behaviour where
                // "teammates automatically notify the lead when they finish and stop".
                // Workers send to the conventional "team-lead" inbox.
                let summary_snapshot = queue.summary().await;
                mailbox.send(
                    &worker_id,
                    "team-lead",
                    "idle",
                    format!(
                        "{worker_id} idle — queue: {} pending, {} in_progress, {} completed, {} failed",
                        summary_snapshot.pending,
                        summary_snapshot.in_progress,
                        summary_snapshot.completed,
                        summary_snapshot.failed,
                    ),
                ).await;
            });

            handles.push(handle);
        }

        // Wait for all workers to exit. Workers exit when either:
        // - all tasks are done (every worker's loop breaks on `all_done`)
        // - shutdown is signalled (every worker breaks on `is_cancelled`)
        // We do NOT call `wait_until_done()` here — that would block forever
        // when shutdown fires before the queue drains.
        for h in handles { let _ = h.await; }
        queue_ref.summary().await
    }
}
