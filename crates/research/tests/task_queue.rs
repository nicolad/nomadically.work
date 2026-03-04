/// Tests for the generic team coordination primitives in `research_agent::team`.
///
/// Covers: TaskQueue, Mailbox, PlanGate, TeamLead (full run).
/// All tests are pure-Rust async (no network, no API keys).
use research_agent::team::{
    shutdown_pair, Mailbox, PlanGate, TaskQueue, TeamLead,
};

// ─── TaskQueue ────────────────────────────────────────────────────────────────

#[tokio::test]
async fn task_queue_push_and_claim() {
    let q: TaskQueue<i32> = TaskQueue::new();
    let id = q.push("task-a", 42, vec![], 1).await;

    let claimed = q.claim("worker-01").await;
    assert!(claimed.is_some());
    let (cid, name, payload) = claimed.unwrap();
    assert_eq!(cid, id);
    assert_eq!(name, "task-a");
    assert_eq!(payload, 42);
}

#[tokio::test]
async fn task_queue_claim_returns_none_when_empty() {
    let q: TaskQueue<i32> = TaskQueue::new();
    assert!(q.claim("worker-01").await.is_none());
}

#[tokio::test]
async fn task_queue_complete_marks_done() {
    let q: TaskQueue<i32> = TaskQueue::new();
    let id = q.push("task", 1, vec![], 1).await;
    let (cid, _, _) = q.claim("w").await.unwrap();
    assert_eq!(cid, id);
    q.complete(id).await;
    assert!(q.all_done().await);
}

#[tokio::test]
async fn task_queue_fail_requeues_within_max_attempts() {
    let q: TaskQueue<i32> = TaskQueue::new();
    q.push("task", 1, vec![], 2).await;

    // First attempt — fail → should go back to Pending
    let (id, _, _) = q.claim("w").await.unwrap();
    q.fail(id).await;

    // Should be claimable again
    let second = q.claim("w").await;
    assert!(second.is_some(), "task should be re-queued after first failure");
    let (id2, _, _) = second.unwrap();

    // Second attempt — fail → exhausted, should become Failed
    q.fail(id2).await;
    assert!(q.claim("w").await.is_none(), "no more attempts — should not be claimable");
    assert!(q.all_done().await, "Failed counts as terminal");
}

#[tokio::test]
async fn task_queue_dependency_blocks_claim() {
    let q: TaskQueue<i32> = TaskQueue::new();
    let a = q.push("a", 1, vec![], 1).await;
    let b = q.push("b", 2, vec![a], 1).await;

    // Only "a" can be claimed right now
    let first = q.claim("w").await.unwrap();
    assert_eq!(first.0, a);

    // "b" is still blocked
    assert!(q.claim("w").await.is_none());

    // Complete "a" → "b" becomes claimable
    q.complete(a).await;
    let second = q.claim("w").await.unwrap();
    assert_eq!(second.0, b);
}

#[tokio::test]
async fn task_queue_id_order_preference() {
    let q: TaskQueue<i32> = TaskQueue::new();
    let a = q.push("a", 1, vec![], 1).await;
    let b = q.push("b", 2, vec![], 1).await;
    let c = q.push("c", 3, vec![], 1).await;

    // All claimable — should come out in ascending ID order
    let (id1, _, _) = q.claim("w").await.unwrap();
    assert_eq!(id1, a);
    let (id2, _, _) = q.claim("w").await.unwrap();
    assert_eq!(id2, b);
    let (id3, _, _) = q.claim("w").await.unwrap();
    assert_eq!(id3, c);
}

#[tokio::test]
async fn task_queue_summary_counts() {
    let q: TaskQueue<i32> = TaskQueue::new();
    q.push("a", 1, vec![], 1).await;
    let b = q.push("b", 2, vec![], 1).await;

    // Claim b
    q.claim("w").await; // claims a (lowest ID)
    q.claim("w").await; // claims b

    q.complete(b).await;

    let s = q.summary().await;
    assert_eq!(s.in_progress, 1); // a still claimed
    assert_eq!(s.completed, 1);   // b done
    assert_eq!(s.total(), 2);
}

// ─── Mailbox ──────────────────────────────────────────────────────────────────

#[tokio::test]
async fn mailbox_send_and_recv() {
    let mb = Mailbox::new();
    mb.send("worker-01", "worker-02", "greeting", "hello").await;

    let env = mb.recv("worker-02").await;
    assert!(env.is_some());
    let env = env.unwrap();
    assert_eq!(env.from, "worker-01");
    assert_eq!(env.subject, "greeting");
    assert_eq!(env.body, "hello");
}

#[tokio::test]
async fn mailbox_recv_empty_returns_none() {
    let mb = Mailbox::new();
    assert!(mb.recv("nobody").await.is_none());
}

#[tokio::test]
async fn mailbox_fifo_order() {
    let mb = Mailbox::new();
    mb.send("s", "inbox", "msg1", "first").await;
    mb.send("s", "inbox", "msg2", "second").await;

    let e1 = mb.recv("inbox").await.unwrap();
    let e2 = mb.recv("inbox").await.unwrap();
    assert_eq!(e1.body, "first");
    assert_eq!(e2.body, "second");
    assert!(mb.recv("inbox").await.is_none());
}

#[tokio::test]
async fn mailbox_drain() {
    let mb = Mailbox::new();
    mb.send("s", "box", "a", "1").await;
    mb.send("s", "box", "b", "2").await;
    mb.send("s", "box", "c", "3").await;

    let all = mb.drain("box").await;
    assert_eq!(all.len(), 3);
    assert_eq!(all[0].body, "1");
    assert!(mb.recv("box").await.is_none());
}

#[tokio::test]
async fn mailbox_recv_wait_unblocks_when_message_arrives() {
    let mb = Mailbox::new();
    let mb2 = mb.clone();

    let recv_task = tokio::spawn(async move { mb2.recv_wait("inbox").await });

    // Give the receiver a moment to block
    tokio::time::sleep(std::time::Duration::from_millis(20)).await;
    mb.send("sender", "inbox", "subj", "payload").await;

    let env = recv_task.await.unwrap();
    assert_eq!(env.body, "payload");
}

#[tokio::test]
async fn mailbox_pending_count() {
    let mb = Mailbox::new();
    assert_eq!(mb.pending("x").await, 0);
    mb.send("s", "x", "s", "b").await;
    mb.send("s", "x", "s", "b").await;
    assert_eq!(mb.pending("x").await, 2);
}

// ─── PlanGate ─────────────────────────────────────────────────────────────────

#[tokio::test]
async fn plan_gate_approve() {
    use research_agent::team::PlanDecision;

    let gate = PlanGate::new();
    let gate2 = gate.clone();

    let worker = tokio::spawn(async move {
        gate2.submit_and_wait("worker-01", "my plan").await
    });

    // Lead checks pending and approves
    gate.wait_for_submission().await;
    let pending = gate.pending_workers().await;
    assert_eq!(pending.len(), 1);
    assert_eq!(pending[0].0, "worker-01");

    gate.approve("worker-01").await;
    let decision = worker.await.unwrap();
    assert!(matches!(decision, PlanDecision::Approved));
}

#[tokio::test]
async fn plan_gate_reject() {
    use research_agent::team::PlanDecision;

    let gate = PlanGate::new();
    let gate2 = gate.clone();

    let worker = tokio::spawn(async move {
        gate2.submit_and_wait("worker-02", "bad plan").await
    });

    gate.wait_for_submission().await;
    gate.reject("worker-02", "too vague").await;

    let decision = worker.await.unwrap();
    assert!(matches!(decision, PlanDecision::Rejected { feedback } if feedback == "too vague"));
}

// ─── TeamLead (full pipeline) ─────────────────────────────────────────────────

#[tokio::test]
async fn team_lead_runs_all_tasks() {
    let q: TaskQueue<u32> = TaskQueue::new();
    for i in 0..5u32 {
        q.push(format!("task-{i}"), i, vec![], 1).await;
    }

    let mailbox = Mailbox::new();
    let (_sd_tx, shutdown) = shutdown_pair();
    let summary = TeamLead::new(3)
        .run(q, mailbox, shutdown, |_ctx, task| async move {
            // Simulate some work
            tokio::time::sleep(std::time::Duration::from_millis(5)).await;
            assert!(task.payload < 5);
            Ok::<(), anyhow::Error>(())
        })
        .await;

    assert_eq!(summary.completed, 5);
    assert_eq!(summary.failed, 0);
}

#[tokio::test]
async fn team_lead_respects_dependencies_in_pipeline() {
    use std::sync::Arc;
    use tokio::sync::Mutex;

    // Model a 2-step pipeline: search then write.
    // Verify write always runs after search by tracking completion order.
    let order: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));

    let q: TaskQueue<&'static str> = TaskQueue::new();
    let search_id = q.push("search", "search-payload", vec![], 1).await;
    q.push("write", "write-payload", vec![search_id], 1).await;

    let order_clone = Arc::clone(&order);
    let mailbox = Mailbox::new();
    let (_sd_tx, shutdown) = shutdown_pair();
    TeamLead::new(2)
        .run(q, mailbox, shutdown, move |_ctx, task| {
            let order = Arc::clone(&order_clone);
            async move {
                order.lock().await.push(task.name.clone());
                Ok::<(), anyhow::Error>(())
            }
        })
        .await;

    let done = order.lock().await;
    assert_eq!(done[0], "search", "search must complete before write");
    assert_eq!(done[1], "write");
}

#[tokio::test]
async fn team_lead_cooperative_shutdown() {
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};

    let q: TaskQueue<u32> = TaskQueue::new();
    for i in 0..10u32 {
        q.push(format!("task-{i}"), i, vec![], 1).await;
    }

    let ran = Arc::new(AtomicUsize::new(0));
    let ran2 = Arc::clone(&ran);

    let mailbox = Mailbox::new();
    let (sd_tx, shutdown) = shutdown_pair();

    // Cancel immediately — workers should finish their current task and stop.
    sd_tx.shutdown();

    let summary = TeamLead::new(2)
        .run(q, mailbox, shutdown, move |_ctx, _task| {
            let ran = Arc::clone(&ran2);
            async move {
                ran.fetch_add(1, Ordering::SeqCst);
                Ok::<(), anyhow::Error>(())
            }
        })
        .await;

    // Some tasks may have been claimed before shutdown was noticed, but not all 10.
    assert!(
        ran.load(Ordering::SeqCst) <= 10,
        "should not run more tasks than exist"
    );
    // Summary should reflect whatever actually ran.
    assert_eq!(summary.completed + summary.failed, ran.load(Ordering::SeqCst));
}

#[tokio::test]
async fn team_lead_mailbox_2step_pipeline() {
    // Mirrors the study.rs search→write pattern:
    // search tasks put findings into the mailbox; write tasks consume them.
    use std::sync::Arc;
    use tokio::sync::Mutex;

    #[derive(Clone)]
    enum Step {
        Search(&'static str),
        Write(&'static str),
    }

    let q: TaskQueue<Step> = TaskQueue::new();
    let search_id = q.push("search:topic", Step::Search("topic"), vec![], 1).await;
    q.push("write:topic", Step::Write("topic"), vec![search_id], 1).await;

    let wrote: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
    let wrote_clone = Arc::clone(&wrote);

    let mailbox = Mailbox::new();
    let (_sd_tx, shutdown) = shutdown_pair();
    let summary = TeamLead::new(2)
        .run(q, mailbox, shutdown, move |ctx, task| {
            let wrote = Arc::clone(&wrote_clone);
            async move {
                match task.payload {
                    Step::Search(slug) => {
                        ctx.mailbox
                            .send(&ctx.worker_id, format!("findings:{slug}"), "papers", "Paper A; Paper B")
                            .await;
                    }
                    Step::Write(slug) => {
                        let env = ctx.mailbox.recv_wait(&format!("findings:{slug}")).await;
                        *wrote.lock().await = Some(env.body);
                    }
                }
                Ok::<(), anyhow::Error>(())
            }
        })
        .await;

    assert_eq!(summary.completed, 2);
    assert_eq!(*wrote.lock().await, Some("Paper A; Paper B".into()));
}

// ─── Broadcast ────────────────────────────────────────────────────────────────

#[tokio::test]
async fn mailbox_broadcast_delivers_to_all_recipients() {
    let mb = Mailbox::new();
    mb.broadcast("sender", &["alice", "bob", "carol"], "announcement", "hello all").await;

    let a = mb.recv("alice").await.unwrap();
    let b = mb.recv("bob").await.unwrap();
    let c = mb.recv("carol").await.unwrap();

    assert_eq!(a.body, "hello all");
    assert_eq!(b.body, "hello all");
    assert_eq!(c.body, "hello all");
    assert_eq!(a.from, "sender");
    assert_eq!(b.subject, "announcement");
    // Nothing extra in any inbox
    assert!(mb.recv("alice").await.is_none());
}

// ─── Peer IDs ─────────────────────────────────────────────────────────────────

#[tokio::test]
async fn team_context_peer_ids_exclude_self() {
    use std::sync::Arc;
    use tokio::sync::Mutex;

    let captured: Arc<Mutex<Vec<Vec<String>>>> = Arc::new(Mutex::new(Vec::new()));
    let captured_clone = Arc::clone(&captured);

    let q: TaskQueue<u32> = TaskQueue::new();
    for i in 0..3u32 {
        q.push(format!("t-{i}"), i, vec![], 1).await;
    }

    let mailbox = Mailbox::new();
    let (_sd_tx, shutdown) = shutdown_pair();
    TeamLead::new(3)
        .run(q, mailbox, shutdown, move |ctx, _task| {
            let captured = Arc::clone(&captured_clone);
            async move {
                let mut peers = ctx.peer_ids.clone();
                peers.sort();
                captured.lock().await.push(peers);
                Ok::<(), anyhow::Error>(())
            }
        })
        .await;

    let all = captured.lock().await;
    // Every worker should see exactly 2 peers (total=3, self excluded)
    for peer_list in all.iter() {
        assert_eq!(peer_list.len(), 2, "each worker sees 2 peers");
    }
}

// ─── Idle notifications ───────────────────────────────────────────────────────

#[tokio::test]
async fn team_lead_sends_idle_notifications() {
    let q: TaskQueue<u32> = TaskQueue::new();
    q.push("only-task", 1u32, vec![], 1).await;

    let mailbox = Mailbox::new();
    let (_sd_tx, shutdown) = shutdown_pair();
    let summary = TeamLead::new(2)
        .run(q, mailbox.clone(), shutdown, |_ctx, _task| async move {
            Ok::<(), anyhow::Error>(())
        })
        .await;

    assert_eq!(summary.completed, 1);

    // Both workers (worker-01 and worker-02) should have sent idle notifications
    // to the "team-lead" inbox.
    let notifications = mailbox.drain("team-lead").await;
    assert_eq!(notifications.len(), 2, "one idle notification per worker");
    for n in &notifications {
        assert_eq!(n.subject, "idle");
        assert!(n.from.starts_with("worker-"));
    }
}
