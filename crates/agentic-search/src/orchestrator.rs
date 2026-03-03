use anyhow::{Context, Result};
use serde::Deserialize;
use std::path::PathBuf;
use tokio::sync::mpsc;
use tracing::info;

use crate::deepseek::{DeepSeekClient, Message};
use crate::worker::Worker;

/// Team lead — mirrors the agent-teams pattern:
///   1. decompose  → ask DeepSeek to split the query into N independent angles
///   2. spawn      → launch one `tokio::task` per angle (each is a full `Worker` agent loop)
///   3. collect    → receive results via `mpsc` channel as workers finish
///   4. synthesize → ask DeepSeek to merge findings into one coherent answer
pub struct Orchestrator {
    client: DeepSeekClient,
    root: PathBuf,
    max_workers: usize,
    max_turns_per_worker: usize,
}

#[derive(Deserialize, Debug)]
struct SubQuery {
    angle: String,
    query: String,
}

struct WorkerResult {
    angle: String,
    findings: String,
}

impl Orchestrator {
    pub fn new(
        client: DeepSeekClient,
        root: PathBuf,
        max_workers: usize,
        max_turns_per_worker: usize,
    ) -> Self {
        Self { client, root, max_workers, max_turns_per_worker }
    }

    pub async fn run(&self, query: &str) -> Result<String> {
        // ── 1. Decompose ─────────────────────────────────────────────────────
        let sub_queries = self.decompose(query).await?;
        info!(
            "decomposed into {} parallel workers: {:?}",
            sub_queries.len(),
            sub_queries.iter().map(|s| &s.angle).collect::<Vec<_>>()
        );

        // ── 2. Spawn all workers concurrently ────────────────────────────────
        // Each worker owns a clone of the client (cheap — reqwest::Client is Arc-backed)
        // and sends its result back via mpsc when done.
        let (tx, mut rx) = mpsc::channel::<WorkerResult>(sub_queries.len());

        let mut handles = Vec::with_capacity(sub_queries.len());

        for sq in sub_queries {
            let client = self.client.clone();
            let root = self.root.clone();
            let tx = tx.clone();
            let max_turns = self.max_turns_per_worker;
            let angle = sq.angle;
            let sub_query = sq.query;

            let handle = tokio::spawn(async move {
                info!("[{angle}] worker started");
                let worker = Worker::new(root, client, max_turns, angle.clone());
                let findings = worker
                    .run(&sub_query)
                    .await
                    .unwrap_or_else(|e| format!("worker error: {e}"));
                let _ = tx.send(WorkerResult { angle, findings }).await;
            });

            handles.push(handle);
        }

        // Drop the original sender so the channel closes once all workers finish.
        drop(tx);

        // ── 3. Collect results (order depends on which worker finishes first) ─
        let mut all_findings: Vec<WorkerResult> = Vec::new();
        while let Some(result) = rx.recv().await {
            info!("[{}] findings received ({} chars)", result.angle, result.findings.len());
            all_findings.push(result);
        }

        for h in handles {
            let _ = h.await;
        }

        // ── 4. Synthesize ─────────────────────────────────────────────────────
        self.synthesize(query, &all_findings).await
    }

    /// Ask DeepSeek to break the query into `max_workers` independent search angles.
    /// Returns a JSON array: [{"angle": "...", "query": "..."}, ...]
    async fn decompose(&self, query: &str) -> Result<Vec<SubQuery>> {
        let system = format!(
            "You decompose a codebase search query into up to {max} parallel, independent \
             sub-queries. Each sub-query investigates a different angle simultaneously.\n\
             Respond ONLY with a valid JSON array (no markdown fences) of objects with:\n\
             - \"angle\": short label (e.g. \"Database layer\", \"API resolvers\")\n\
             - \"query\": focused natural-language search query for one worker\n\
             Make angles non-overlapping so workers don't duplicate work.",
            max = self.max_workers
        );

        let messages = vec![
            Message {
                role: "system".into(),
                content: Some(system),
                tool_calls: None,
                tool_call_id: None,
            },
            Message {
                role: "user".into(),
                content: Some(query.to_string()),
                tool_calls: None,
                tool_call_id: None,
            },
        ];

        let resp = self.client.chat(&messages, None).await?;
        let content = resp
            .choices
            .into_iter()
            .next()
            .context("empty decompose response")?
            .message
            .content
            .unwrap_or_default();

        // Strip markdown code fences if DeepSeek wraps in ```json ... ```
        let cleaned = content
            .trim()
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim();

        serde_json::from_str::<Vec<SubQuery>>(cleaned)
            .context("decompose response was not a valid JSON array of {angle, query} objects")
    }

    /// Merge all worker findings into one coherent answer.
    async fn synthesize(&self, original_query: &str, findings: &[WorkerResult]) -> Result<String> {
        let findings_text = findings
            .iter()
            .map(|f| format!("### {} angle\n{}", f.angle, f.findings))
            .collect::<Vec<_>>()
            .join("\n\n---\n\n");

        let system = "You are a synthesis agent. Multiple parallel workers each investigated a \
                      different angle of a codebase search query. Merge their findings into one \
                      concise, deduplicated answer with file:line references. \
                      Highlight the most important findings first. Avoid repetition.";

        let user = format!(
            "Original query: {original_query}\n\nParallel worker findings:\n\n{findings_text}"
        );

        let messages = vec![
            Message {
                role: "system".into(),
                content: Some(system.to_string()),
                tool_calls: None,
                tool_call_id: None,
            },
            Message {
                role: "user".into(),
                content: Some(user),
                tool_calls: None,
                tool_call_id: None,
            },
        ];

        let resp = self.client.chat(&messages, None).await?;
        resp.choices
            .into_iter()
            .next()
            .context("empty synthesis response")?
            .message
            .content
            .ok_or_else(|| anyhow::anyhow!("no content in synthesis response"))
    }
}
